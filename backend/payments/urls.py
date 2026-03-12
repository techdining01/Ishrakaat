from django.urls import path
from .views import InitializePaymentView, VerifyPaymentView, CreateVirtualAccountView, PaystackWebhookView, SaveCardView, DeleteCardView

urlpatterns = [
    path('initialize/', InitializePaymentView.as_view(), name='initialize_payment'),
    path('verify/<str:reference>/', VerifyPaymentView.as_view(), name='verify_payment'),
    path('create-virtual-account/', CreateVirtualAccountView.as_view(), name='create_virtual_account'),
    path('webhook/', PaystackWebhookView.as_view(), name='paystack_webhook'),
    # Card management URLs
    path('cards/save/', SaveCardView.as_view(), name='save-card'),
    path('cards/', SaveCardView.as_view(), name='list-cards'),
    path('cards/<int:card_id>/delete/', DeleteCardView.as_view(), name='delete-card'),
]
