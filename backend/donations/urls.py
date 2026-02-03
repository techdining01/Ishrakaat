from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import DonationTypeListView, UserDonationSettingsView, TransactionViewSet

router = DefaultRouter()
router.register(r'transactions', TransactionViewSet, basename='transaction')

urlpatterns = [
    path('campaigns/', DonationTypeListView.as_view(), name='campaign-list'),
    path('settings/', UserDonationSettingsView.as_view(), name='donation-settings'),
    path('', include(router.urls)),
]
