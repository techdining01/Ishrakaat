from celery import shared_task
from django.utils import timezone
from django.db import transaction
from django.db.models import Sum
from django.conf import settings
from .models import UserDonationSettings, Transaction, DonationType
from payments.models import SavedCard
from payments.paystack import Paystack
from decimal import Decimal
import logging
import uuid
import requests
import math
import calendar
import json

logger = logging.getLogger(__name__)

def _days_left_in_month(dt):
    last_day = calendar.monthrange(dt.year, dt.month)[1]
    end = dt.replace(day=last_day, hour=23, minute=59, second=59, microsecond=999999)
    delta = end - dt
    return max(0, math.ceil(delta.total_seconds() / 86400))

def _compose_due_message(user, days_left, amount):
    name = user.first_name or user.username or "Friend"
    if days_left == 0:
        return f"{name}, your monthly donation is due today. Kindly donate."
    if days_left == 1:
        return f"{name}, your monthly donation is due in 1 day. Kindly donate."
    return f"{name}, your monthly donation is due in {days_left} days. Kindly donate."

def _send_telegram(text):
    token = getattr(settings, "TELEGRAM_BOT_TOKEN", None)
    chat_id = getattr(settings, "TELEGRAM_REMINDER_CHAT_ID", None)
    if not token or not chat_id:
        return False
    url = f"https://api.telegram.org/bot{token}/sendMessage"
    try:
        requests.post(url, json={"chat_id": chat_id, "text": text}, timeout=10)
        return True
    except Exception:
        return False

@shared_task
def process_monthly_donations():
    """
    Task to process monthly donations.
    Should be scheduled to run daily (e.g. at 1 AM).
    It checks if the user has already donated for the current month.
    """
    now = timezone.now()
    current_month = now.month
    current_year = now.year
    
    # Get all settings with enabled auto-deduct and amount > 0
    settings_list = UserDonationSettings.objects.filter(monthly_amount__gt=0).select_related('user')
    
    for settings in settings_list:
        user = settings.user
        amount = settings.monthly_amount
        
        # Check if already donated this month
        has_donated = Transaction.objects.filter(
            user=user,
            transaction_type='DONATION',
            created_at__month=current_month,
            created_at__year=current_year,
            amount__gte=amount 
        ).exists()
        
        if has_donated:
            continue
            
        # Try to deduct
        success = False
        
        # 1. Try Money Box
        if settings.auto_deduct_from_box:
            if user.money_box_balance >= amount:
                with transaction.atomic():
                    user.money_box_balance -= amount
                    user.save()
                    Transaction.objects.create(
                        user=user,
                        amount=amount,
                        transaction_type='DONATION',
                        description=f"Monthly Donation (Auto-deducted from Money Box) - {now.strftime('%B %Y')}"
                    )
                    success = True
                    logger.info(f"User {user.username}: Auto-deducted {amount} from Money Box")
        
        # 2. Try Saved Card (if Money Box failed or disabled)
        if not success and settings.auto_charge_card:
            # Get latest active card
            card = SavedCard.objects.filter(user=user, is_active=True).order_by('-created_at').first()
            if card:
                paystack = Paystack()
                amount_kobo = int(float(amount) * 100)
                ref = f"auto_{uuid.uuid4().hex}"
                
                status_bool, result = paystack.charge_authorization(
                    email=user.email,
                    amount=amount_kobo,
                    authorization_code=card.authorization_code,
                    reference=ref
                )
                
                if status_bool and result.get('status') == 'success':
                    # Payment successful
                    with transaction.atomic():
                        # Record the successful charge
                        Transaction.objects.create(
                            user=user,
                            amount=amount,
                            transaction_type='DONATION',
                            description=f"Monthly Donation (Auto-charged Card {card.last4}) - {now.strftime('%B %Y')}"
                        )
                        success = True
                        logger.info(f"User {user.username}: Auto-charged {amount} from Card {card.last4}")
                else:
                    logger.error(f"User {user.username}: Failed to charge card {card.last4}. Reason: {result}")
                
        if not success:
            logger.warning(f"User {user.username}: Failed to process monthly donation of {amount}")

@shared_task
def send_due_reminders():
    now = timezone.now()
    current_month = now.month
    current_year = now.year
    days_left = _days_left_in_month(now)
    if days_left > 7:
        return
    settings_list = UserDonationSettings.objects.filter(monthly_amount__gt=0).select_related('user')
    for settings in settings_list:
        user = settings.user
        amount = settings.monthly_amount
        has_donated = Transaction.objects.filter(
            user=user,
            transaction_type='DONATION',
            created_at__month=current_month,
            created_at__year=current_year,
            amount__gte=amount
        ).exists()
        if has_donated:
            continue
        # Compose with amount, link and verse
        base = _compose_due_message(user, days_left, amount)
        amount_str = f" Amount: ₦{float(amount):,.2f}."
        link = getattr(settings_module := settings, "APP_URL", None) or getattr(settings, "APP_URL", None) or "http://localhost:3000/dashboard"
        verse_ar = "مَّثَلُ ٱلَّذِينَ يُنفِقُونَ أَمْوَٰلَهُمْ فِى سَبِيلِ ٱللَّهِ كَمَثَلِ حَبَّةٍ أَنبَتَتْ سَبْعَ سَنَابِلَ"
        verse_en = "The example of those who spend their wealth in the way of Allah is like a seed that grows seven ears (Qur’an 2:261)."
        text = f"{base}{amount_str} Donate: {link}\n\n{verse_ar}\n{verse_en}"
        _send_telegram(text)
        # Try web push if library available
        try:
            from pywebpush import webpush, WebPushException  # type: ignore
            vapid_private = getattr(settings, "VAPID_PRIVATE_KEY", None)
            vapid_email = getattr(settings, "VAPID_CLAIMS", None) or "mailto:admin@example.com"
            if not vapid_private:
                continue
            from .models import PushSubscription
            subs = PushSubscription.objects.filter(user=user) | PushSubscription.objects.filter(user__isnull=True)
            payload = json.dumps({
                "title": "Monthly donation due",
                "body": f"{base}{amount_str}\n\n{verse_ar}\n{verse_en}",
                "icon": "/favicon.ico",
                "data": {"url": "/dashboard", "tag": "monthly-due"},
            })
            for sub in subs:
                try:
                    webpush(
                        subscription_info={
                            "endpoint": sub.endpoint,
                            "keys": {"p256dh": sub.p256dh, "auth": sub.auth},
                        },
                        data=payload,
                        vapid_private_key=vapid_private,
                        vapid_claims={"sub": vapid_email},
                    )
                except Exception:
                    # On failure, ignore; optionally remove gone subscriptions here.
                    pass
        except Exception:
            # pywebpush not available or misconfigured
            continue


@shared_task
def send_daily_inflow_outflow_to_google_sheet():
    now = timezone.now()
    start = now.replace(hour=0, minute=0, second=0, microsecond=0)
    end = start + timezone.timedelta(days=1)
    tx = Transaction.objects.filter(created_at__gte=start, created_at__lt=end)
    inflow_total = tx.filter(
        transaction_type__in=['DEPOSIT', 'DONATION']
    ).aggregate(Sum('amount'))['amount__sum'] or Decimal('0')
    outflow_total = tx.filter(
        transaction_type='WITHDRAWAL'
    ).aggregate(Sum('amount'))['amount__sum'] or Decimal('0')
    webhook = getattr(settings, "GOOGLE_SHEETS_WEBHOOK_URL", None)
    if not webhook:
        return
    payload = {
        "app": getattr(settings, "APP_NAME", "Ishrapay"),
        "date": start.date().isoformat(),
        "inflow": float(inflow_total),
        "outflow": float(outflow_total),
    }
    try:
        requests.post(webhook, json=payload, timeout=10)
    except Exception as exc:
        logger.error("Google sheet sync failed: %s", exc)
