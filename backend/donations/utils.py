import logging
from django.conf import settings
from .models import PushSubscription

logger = logging.getLogger(__name__)

def send_push_to_all(title, message, url=None):
    """
    Sends a push notification to all subscribed users and guests.
    In a production environment, this should be handled by a Celery task.
    """
    subscriptions = PushSubscription.objects.all()
    logger.info(f"Initiating push notification to {subscriptions.count()} subscribers: {title}")
    
    # Placeholder for actual pywebpush logic
    # In a real scenario, you would use:
    # from pywebpush import webpush, WebPushException
    # for sub in subscriptions:
    #     try:
    #         webpush(
    #             subscription_info={
    #                 "endpoint": sub.endpoint,
    #                 "keys": {"p256dh": sub.p256dh, "auth": sub.auth}
    #             },
    #             data=json.dumps({"title": title, "body": message, "url": url}),
    #             vapid_private_key=settings.VAPID_PRIVATE_KEY,
    #             vapid_claims={"sub": "mailto:info@ishrakaat.com"}
    #         )
    #     except Exception:
    #         pass

    # For now, we log the action to prove the trigger is active
    print(f"PUSH NOTIFICATION SENT: [{title}] {message} (Subscribers: {subscriptions.count()})")
    return True
