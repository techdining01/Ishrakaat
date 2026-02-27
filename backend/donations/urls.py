from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    DonationTypeListView,
    UserDonationSettingsView,
    TransactionViewSet,
    welfare_family_donation,
    zakah_quick_pay,
    WaqfInterestCreateView,
)
from .api import inflow_outflow_stats, inflow_outflow_csv

router = DefaultRouter()
router.register(r"transactions", TransactionViewSet, basename="transaction")

urlpatterns = [
    path("campaigns/", DonationTypeListView.as_view(), name="campaign-list"),
    path("settings/", UserDonationSettingsView.as_view(), name="donation-settings"),
    path("waqf/interest/", WaqfInterestCreateView.as_view(), name="waqf-interest"),
    path(
        "stats/inflow-outflow/",
        inflow_outflow_stats,
        name="donation-inflow-outflow",
    ),
    path(
        "stats/inflow-outflow.csv",
        inflow_outflow_csv,
        name="donation-inflow-outflow-csv",
    ),
    path(
        "welfare/family/",
        welfare_family_donation,
        name="welfare-family-donation",
    ),
    path(
        "zakah/pay/",
        zakah_quick_pay,
        name="zakah-quick-pay",
    ),
    path("", include(router.urls)),
]
