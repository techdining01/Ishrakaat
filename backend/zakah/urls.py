from django.urls import path
from .views import NisabView, ZakahReferenceView, IslamicDashboardCardsView

urlpatterns = [
    path("nisab/", NisabView.as_view(), name="nisab_rates"),
    path("references/", ZakahReferenceView.as_view(), name="zakah_references"),
    path("cards/", IslamicDashboardCardsView.as_view(), name="islamic_cards"),
]
