from celery import shared_task
from django.utils import timezone
from django.db import transaction
from .models import UserDonationSettings, Transaction, DonationType
from payments.models import SavedCard
from payments.paystack import Paystack # We need to add charge_authorization to Paystack class
from decimal import Decimal
import logging

logger = logging.getLogger(__name__)

import uuid

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
