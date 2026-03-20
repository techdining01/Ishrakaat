from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    DonationTypeListView,
    DonationTypeDetailView,
    UserDonationSettingsView,
    TransactionViewSet,
    welfare_family_donation,
    zakah_quick_pay,
    WaqfInterestCreateView,
    push_subscribe,
    push_unsubscribe,
    AdminWaqfInterestListView,
    AdminWaqfInterestUpdateView,
    AdminWelfareDonationListView,
    AdminWelfareDonationUpdateView,
)
from .exports import (
    export_waqf_csv,
    export_waqf_pdf,
    export_welfare_csv,
    export_welfare_pdf,
)
from .api import inflow_outflow_stats, inflow_outflow_csv

router = DefaultRouter()
router.register(r"transactions", TransactionViewSet, basename="transaction")

urlpatterns = [
    path("campaigns/", DonationTypeListView.as_view(), name="campaign-list"),
    path("campaigns/<int:pk>/", DonationTypeDetailView.as_view(), name="campaign-detail"),
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
    path("push/subscribe/", push_subscribe, name="push-subscribe"),
    path("push/unsubscribe/", push_unsubscribe, name="push-unsubscribe"),
    
    # Admin Tracking
    path("admin/waqf-interests/", AdminWaqfInterestListView.as_view(), name="admin-waqf-list"),
    path("admin/waqf-interests/<int:pk>/", AdminWaqfInterestUpdateView.as_view(), name="admin-waqf-update"),
    path("admin/welfare-donations/", AdminWelfareDonationListView.as_view(), name="admin-welfare-list"),
    path("admin/welfare-donations/<int:pk>/", AdminWelfareDonationUpdateView.as_view(), name="admin-welfare-update"),
    
    # Exports
    path("admin/waqf-interests/export/csv/", export_waqf_csv, name="export-waqf-csv"),
    path("admin/waqf-interests/export/pdf/", export_waqf_pdf, name="export-waqf-pdf"),
    path("admin/welfare-donations/export/csv/", export_welfare_csv, name="export-welfare-csv"),
    path("admin/welfare-donations/export/pdf/", export_welfare_pdf, name="export-welfare-pdf"),
    
    path("", include(router.urls)),
]
