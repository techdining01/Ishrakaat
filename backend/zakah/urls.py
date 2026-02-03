from django.urls import path
from .views import NisabView

urlpatterns = [
    path('nisab/', NisabView.as_view(), name='nisab_rates'),
]
