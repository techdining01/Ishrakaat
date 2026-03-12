from django.urls import path
from rest_framework.routers import DefaultRouter
from .views import (
    NisabView, 
    ZakahReferenceView,
    IslamicDashboardCardsView,
    get_nisab_data,
    zakah_quick_pay,
    zakah_references
)
from .test_views import test_zakah_references

# Direct test function
def direct_test(request):
    from django.http import JsonResponse
    return JsonResponse({"message": "Direct test working - zakah app loaded"})

router = DefaultRouter()
# router.register(r"cards", ZakahCardViewSet, basename="zakah-card")

urlpatterns = [
    path("", direct_test, name="direct-test"),
    path("nisab/", NisabView.as_view(), name="nisab"),
    path("nisab/data/", get_nisab_data, name="nisab-data"),
    path("zakah/pay/", zakah_quick_pay, name="zakah-quick-pay"),
    path("zakah/references/", zakah_references, name="zakah-references"),
    path("zakah/references/test/", test_zakah_references, name="test-zakah-references"),
    path("cards/", IslamicDashboardCardsView.as_view(), name="islamic-cards"),
]
