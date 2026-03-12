from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticatedOrReadOnly
from .models import ZakahNisab, ZakahReference, DashboardIslamicCard, NisabData
from .serializers import NisabDataSerializer, ZakahReferenceSerializer
from .services import fetch_and_update_nisab, scrape_and_update_islamic_cards
from .tasks import scrape_daily_nisab_task
from django.utils import timezone
from datetime import timedelta
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
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

from rest_framework import viewsets
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated, IsAuthenticatedOrReadOnly
from rest_framework import permissions

class ZakahCardViewSet(viewsets.ModelViewSet):
    """ViewSet for Zakah cards"""
    queryset = ZakahReference.objects.all()
    serializer_class = ZakahReferenceSerializer
    permission_classes = [IsAuthenticated]


@api_view(['GET'])
@permission_classes([IsAuthenticatedOrReadOnly])  # Allow read access without auth
def get_nisab_data(request):
    """Get current nisab values for marquee - scraped from DailyNisab"""
    try:
        print("get_nisab_data function called")
        
        # Always try to scrape fresh data
        result = scrape_daily_nisab_task()
        print(f"Scraping result: {result}")
        
        # Get the latest data after scraping
        nisab = NisabData.objects.filter(currency='NGN').order_by('-last_updated').first()
        if nisab:
            data = {
                'gold_price_per_gram': float(nisab.gold_price_per_gram),
                'silver_price_per_gram': float(nisab.silver_price_per_gram),
                'last_updated': nisab.last_updated,
                'source': nisab.source
            }
            print(f"Returning nisab data: {data}")
            return Response(data, status=status.HTTP_200_OK)
        else:
            # If scraping failed, return fallback values instead of 503 to prevent frontend crash
            return Response({
                'gold_price_per_gram': 0,
                'silver_price_per_gram': 0,
                'last_updated': timezone.now(),
                'source': 'Fallback',
                'warning': 'Rates currently unavailable due to scraping failure'
            }, status=status.HTTP_200_OK)
    except Exception as e:
        print(f"Error in get_nisab_data: {str(e)}")
        return Response({
            'error': f'Failed to get nisab data: {str(e)}'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def zakah_quick_pay(request):
    """Handle Zakah quick payments"""
    from donations.models import SavedCard
    from payments.paystack import Paystack
    from decimal import Decimal
    import uuid
    
    try:
        amount = request.data.get('amount')
        method = request.data.get('method', 'MONEY_BOX')
        note = request.data.get('note', 'Zakah payment')
        
        if method == 'MONEY_BOX':
            # Handle money box payment
            user = request.user
            if user.money_box_balance < Decimal(amount):
                return Response({
                    'detail': 'Insufficient funds in Money Box'
                }, status=status.HTTP_400_BAD_REQUEST)
            
            # Process payment (simplified logic)
            user.money_box_balance -= Decimal(amount)
            user.save()
            
            return Response({
                'message': 'Zakah payment successful',
                'amount': amount,
                'method': method
            }, status=status.HTTP_200_OK)
            
        elif method == 'CARD':
            # Handle card payment
            card = SavedCard.objects.filter(user=request.user, is_active=True).first()
            if not card:
                return Response({
                    'detail': 'No saved card found'
                }, status=status.HTTP_400_BAD_REQUEST)
            
            paystack = Paystack()
            amount_kobo = int(float(amount) * 100)
            ref = f"zakah_{uuid.uuid4().hex}"
            
            status_bool, result = paystack.charge_authorization(
                email=request.user.email,
                amount=amount_kobo,
                authorization_code=card.authorization_code,
                reference=ref,
            )
            
            if status_bool and result.get("status") == "success":
                return Response({
                    'message': 'Zakah payment successful',
                    'amount': amount,
                    'method': method,
                    'reference': ref
                }, status=status.HTTP_200_OK)
            else:
                return Response({
                    'detail': f'Card charge failed: {result.get("message", "Unknown error")}'
                }, status=status.HTTP_400_BAD_REQUEST)
                
    except Exception as e:
        return Response({
            'detail': f'Payment processing failed: {str(e)}'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


from rest_framework import viewsets
class ZakahCardViewSet(viewsets.ModelViewSet):
    """ViewSet for Zakah cards"""
    queryset = ZakahReference.objects.all()
    serializer_class = ZakahReferenceSerializer
    permission_classes = [IsAuthenticated]


@api_view(['GET'])
@permission_classes([IsAuthenticatedOrReadOnly])  # Allow read access without auth
def zakah_references(request):
    """Get Zakah references"""
    from django.http import JsonResponse
    try:
        print("zakah_references function called")
        return JsonResponse({"message": "zakah_references is working", "items": []})
    except Exception as e:
        print(f"Error in zakah_references: {str(e)}")
        return JsonResponse({
            "error": f"Failed to fetch references: {str(e)}"
        }, status=500)
