from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticatedOrReadOnly
from .models import ZakahNisab, ZakahReference, DashboardIslamicCard, NisabData
from .serializers import NisabDataSerializer, ZakahReferenceSerializer
from .services import fetch_and_update_nisab, scrape_and_update_islamic_cards
from django.core.cache import cache
from django.utils import timezone
from datetime import timedelta
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework import permissions
import logging

logger = logging.getLogger(__name__)


class NisabView(APIView):
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        print(">>> Entering NisabView.get")
        try:
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
                    logger.error(f"Error fetching nisab in NisabView: {e}")
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
        except Exception as e:
            logger.error(f"Critical error in NisabView.get: {e}")
            return Response({
                "currency": "NGN",
                "nisab_gold": 0,
                "nisab_silver": 0,
                "last_updated": timezone.now(),
                "error": str(e)
            }, status=status.HTTP_200_OK)


class ZakahReferenceView(APIView):
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        print(">>> Entering ZakahReferenceView.get")
        try:
            # Check if we have the essential references, otherwise trigger a refresh
            if not ZakahReference.objects.filter(key="hadd_theft").exists():
                try:
                    fetch_and_update_nisab()
                except Exception as e:
                    logger.error(f"Error refreshing Nisab in ZakahReferenceView: {e}")

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
        except Exception as e:
            logger.error(f"Critical error in ZakahReferenceView.get: {e}")
            return Response({"items": [], "error": str(e)}, status=status.HTTP_200_OK) # Return 200 to prevent crash


class IslamicDashboardCardsView(APIView):
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        print(">>> Entering IslamicDashboardCardsView.get")
        try:
            cards = DashboardIslamicCard.objects.all().order_by("order")
            
            # Trigger refresh if no cards exist
            if not cards.exists():
                try:
                    scrape_and_update_islamic_cards()
                    cards = DashboardIslamicCard.objects.all().order_by("order")
                except Exception as e:
                    logger.error(f"Error scraping cards in IslamicDashboardCardsView: {e}")
                
            data = []
            for card in cards:
                data.append({
                    "id": card.id,
                    "title": card.title,
                    "arabic_title": card.arabic_title,
                    "content": card.content,
                    "arabic_content": card.arabic_content,
                    "icon_name": card.icon_name,
                    "order": card.order
                })
            return Response({"cards": data}, status=status.HTTP_200_OK)
        except Exception as e:
            logger.error(f"Critical error in IslamicDashboardCardsView.get: {e}")
            return Response({"cards": [], "error": str(e)}, status=status.HTTP_200_OK)

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
    print(">>> Entering get_nisab_data (function)")
    try:
        # Check cache first - use cached data if available and fresh
        CACHE_KEY = 'nisab_data'
        CACHE_TIMEOUT = 3600  # 1 hour
        
        cached_data = cache.get(CACHE_KEY)
        if cached_data:
            return Response(cached_data, status=status.HTTP_200_OK)
        
        # Get the latest data from database
        nisab = NisabData.objects.filter(currency='NGN').order_by('-last_updated').first()
        
        # If no data exists or data is older than 1 hour, trigger async scrape
        should_scrape = False
        if not nisab:
            should_scrape = True
        elif timezone.now() - nisab.last_updated > timedelta(hours=1):
            should_scrape = True
        
        if should_scrape:
            # Dispatch to Celery asynchronously - don't wait for result
            from .tasks import scrape_daily_nisab_task
            scrape_daily_nisab_task.delay()
        
        if nisab and nisab.gold_price_per_gram:
            # Calculate nisab values (85g gold, 595g silver)
            gold_nisab = float(nisab.gold_price_per_gram) * 85
            silver_nisab = float(nisab.silver_price_per_gram) * 595 if nisab.silver_price_per_gram else 0
            
            data = {
                'gold_price_per_gram': float(nisab.gold_price_per_gram),
                'silver_price_per_gram': float(nisab.silver_price_per_gram) if nisab.silver_price_per_gram else 0,
                'gold_nisab': gold_nisab,
                'silver_nisab': silver_nisab,
                'gold_nisab_grams': 85,
                'silver_nisab_grams': 595,
                'last_updated': nisab.last_updated,
                'source': nisab.source,
                'zakat_al_fitr': 2000,  # Standard rate in NGN
            }
            # Cache the data for 1 hour
            cache.set(CACHE_KEY, data, CACHE_TIMEOUT)
            return Response(data, status=status.HTTP_200_OK)
        else:
            # Return fallback values while background scrape runs
            data = {
                'gold_price_per_gram': 0,
                'silver_price_per_gram': 0,
                'gold_nisab': 0,
                'silver_nisab': 0,
                'gold_nisab_grams': 85,
                'silver_nisab_grams': 595,
                'last_updated': timezone.now(),
                'source': 'DailyNisab',
                'zakat_al_fitr': 2000,
                'warning': 'Rates currently unavailable, background refresh in progress'
            }
            return Response(data, status=status.HTTP_200_OK)
    except Exception as e:
        import logging
        logging.error(f"Error in get_nisab_data: {str(e)}")
        # Return empty data with 200 instead of 500 to prevent frontend crash
        return Response({
            'gold_price_per_gram': 0,
            'silver_price_per_gram': 0,
            'gold_nisab': 0,
            'silver_nisab': 0,
            'last_updated': timezone.now(),
            'error': str(e)
        }, status=status.HTTP_200_OK)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def zakah_quick_pay(request):
    """Handle Zakah quick payments"""
    print(">>> Entering zakah_quick_pay")
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

@api_view(['GET'])
@permission_classes([IsAuthenticatedOrReadOnly])  # Allow read access without auth
def zakah_references_func(request):
    """Get Zakah references (function-based view)"""
    try:
        logger.info("zakah_references function called")
        return Response({"message": "zakah_references is working", "items": []}, status=status.HTTP_200_OK)
    except Exception as e:
        logger.error(f"Error in zakah_references function: {str(e)}")
        return Response({
            "error": f"Failed to fetch references: {str(e)}"
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
  
@api_view(['POST'])  
@permission_classes([IsAuthenticatedOrReadOnly])  
def calculate_livestock_zakat(request):  
    """Calculate Zakat on livestock (camels, cows, sheep/goats)."""  
    try:  
        camel_count = int(request.data.get('camels', 0))  
        cow_count = int(request.data.get('cows', 0))  
        sheep_count = int(request.data.get('sheep', 0))  
        from .services import calculate_livestock_zakat  
        result = calculate_livestock_zakat(camel_count, cow_count, sheep_count)  
        return Response({'success': True, 'camels': camel_count, 'cows': cow_count, 'sheep': sheep_count, 'result': result}, status=status.HTTP_200_OK)  
    except Exception as e:  
        return Response({'success': False, 'error': str(e)}, status=status.HTTP_400_BAD_REQUEST) 
  
@api_view(['POST'])  
@permission_classes([IsAuthenticatedOrReadOnly])  
def calculate_crop_zakat(request):  
    """Calculate Zakat on crops/fruits."""  
    try:  
        harvest_kg = float(request.data.get('harvest_kg', 0))  
        irrigation_type = request.data.get('irrigation_type', 'natural')  
        from .services import calculate_crop_zakat  
        result = calculate_crop_zakat(harvest_kg, irrigation_type)  
        return Response({'success': True, 'harvest_kg': harvest_kg, 'irrigation_type': irrigation_type, 'result': result}, status=status.HTTP_200_OK)  
    except Exception as e:  
        return Response({'success': False, 'error': str(e)}, status=status.HTTP_400_BAD_REQUEST) 
