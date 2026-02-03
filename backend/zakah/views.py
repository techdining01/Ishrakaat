from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticatedOrReadOnly
from .models import ZakahNisab
from .services import fetch_and_update_nisab
from django.utils import timezone
from datetime import timedelta

class NisabView(APIView):
    permission_classes = [IsAuthenticatedOrReadOnly]
    
    def get(self, request):
        # Check if we have data
        nisab = ZakahNisab.objects.first()
        
        # Auto-refresh if no data or data is older than 12 hours
        should_refresh = False
        if not nisab:
            should_refresh = True
        elif timezone.now() - nisab.last_updated > timedelta(hours=12):
            should_refresh = True
            
        if request.query_params.get('refresh') == 'true':
            should_refresh = True
            
        if should_refresh:
            nisab = fetch_and_update_nisab()
            
        if not nisab:
            # Try getting again in case fetch failed but we had old data
            nisab = ZakahNisab.objects.first()
            if not nisab:
                 return Response({"error": "Could not fetch Nisab rates"}, status=status.HTTP_503_SERVICE_UNAVAILABLE)
        
        data = {
            "currency": "NGN",
            "gold_price_usd_oz": nisab.gold_price_usd,
            "silver_price_usd_oz": nisab.silver_price_usd,
            "usd_ngn_rate": nisab.usd_ngn_rate,
            "nisab_gold": nisab.nisab_gold_ngn,
            "nisab_silver": nisab.nisab_silver_ngn,
            "last_updated": nisab.last_updated
        }
        
        return Response(data, status=status.HTTP_200_OK)
