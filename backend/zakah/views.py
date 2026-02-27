from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticatedOrReadOnly
from .models import ZakahNisab, ZakahReference, DashboardIslamicCard
from .services import fetch_and_update_nisab, scrape_and_update_islamic_cards
from django.utils import timezone
from datetime import timedelta


from rest_framework import permissions

class NisabView(APIView):
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        nisab = ZakahNisab.objects.first()

        should_refresh = False
        if not nisab:
            should_refresh = True
        elif timezone.now() - nisab.last_updated > timedelta(hours=12):
            should_refresh = True

        if request.query_params.get("refresh") == "true":
            should_refresh = True

        if should_refresh:
            try:
                nisab = fetch_and_update_nisab()
            except Exception as e:
                nisab = None

        if not nisab:
            # If still no nisab, return a 200 with empty/zero values instead of 503
            # to prevent frontend "Request failed" crash
            return Response({
                "currency": "NGN",
                "gold_price_usd_oz": 0,
                "silver_price_usd_oz": 0,
                "usd_ngn_rate": 0,
                "nisab_gold": 0,
                "nisab_silver": 0,
                "last_updated": timezone.now(),
                "warning": "Rates currently unavailable"
            }, status=status.HTTP_200_OK)

        data = {
            "currency": "NGN",
            "gold_price_usd_oz": nisab.gold_price_usd,
            "silver_price_usd_oz": nisab.silver_price_usd,
            "usd_ngn_rate": nisab.usd_ngn_rate,
            "nisab_gold": nisab.nisab_gold_ngn,
            "nisab_silver": nisab.nisab_silver_ngn,
            "last_updated": nisab.last_updated,
        }
        return Response(data, status=status.HTTP_200_OK)


class ZakahReferenceView(APIView):
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        # Check if we have the essential references, otherwise trigger a refresh
        if not ZakahReference.objects.filter(key="hadd_theft").exists():
            try:
                fetch_and_update_nisab()
            except:
                pass

        # Explicitly exclude 'crops' and ensure we only show valid references
        qs = ZakahReference.objects.exclude(key="crops").order_by("key")
        items = []
        for ref in qs:
            items.append(
                {
                    "key": ref.key,
                    "title": ref.title,
                    "amount_ngn": ref.amount_ngn,
                    "source_url": ref.source_url,
                    "last_updated": ref.last_updated,
                }
            )
        return Response({"items": items}, status=status.HTTP_200_OK)


class IslamicDashboardCardsView(APIView):
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        cards = DashboardIslamicCard.objects.all().order_by("order")
        
        # Trigger refresh if no cards exist
        if not cards.exists():
            scrape_and_update_islamic_cards()
            cards = DashboardIslamicCard.objects.all().order_by("order")
            
        data = []
        for card in cards:
            data.append({
                "title": card.title,
                "arabic_title": card.arabic_title,
                "content": card.content,
                "arabic_content": card.arabic_content,
                "icon_name": card.icon_name,
                "order": card.order,
                "last_updated": card.last_updated
            })
            
        return Response({"cards": data}, status=status.HTTP_200_OK)
