from decimal import Decimal
import uuid

from rest_framework import generics, permissions, viewsets, status
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.response import Response
from django.db import transaction as db_transaction
from django.utils import timezone
from django.db.models import Q

from .models import (
    DonationType,
    UserDonationSettings,
    Transaction,
    WelfareFamilyNeedDonation,
    WaqfInterest,
)
from .serializers import (
    DonationTypeSerializer,
    UserDonationSettingsSerializer,
    TransactionSerializer,
    WelfareFamilyNeedDonationSerializer,
    WaqfInterestSerializer,
    PushSubscriptionSerializer,
)
from payments.models import SavedCard
from payments.paystack import Paystack


class WaqfInterestCreateView(generics.CreateAPIView):
    queryset = WaqfInterest.objects.all()
    serializer_class = WaqfInterestSerializer
    permission_classes = [permissions.AllowAny] # Allow guests to submit

    def perform_create(self, serializer):
        if self.request.user.is_authenticated:
            serializer.save(user=self.request.user)
        else:
            serializer.save()


class DonationTypeListView(generics.ListCreateAPIView):
    serializer_class = DonationTypeSerializer
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]

    def get_queryset(self):
        qs = DonationType.objects.all() if self.request.user.is_staff else DonationType.objects.filter(is_active=True)
        if not self.request.user.is_staff:
            now = timezone.now()
            qs = qs.filter(Q(deadline__isnull=True) | Q(deadline__gt=now))
        return qs

    def perform_create(self, serializer):
        if not self.request.user.is_staff:
             raise permissions.PermissionDenied("Only admins can create campaigns.")
        
        # If we are in the Waqf section, set category to PROJECT automatically
        # or keep the default logic. For now, we just ensure staff can create.
        serializer.save()


class DonationTypeDetailView(generics.DestroyAPIView):
    queryset = DonationType.objects.all()
    serializer_class = DonationTypeSerializer
    permission_classes = [permissions.IsAdminUser]


@api_view(["POST"])
@permission_classes([permissions.AllowAny])
def push_subscribe(request):
    """
    Save or update a push subscription for the current user (if authenticated) or guest.
    Expected body: { endpoint, keys: { p256dh, auth } }
    """
    data = request.data or {}
    endpoint = data.get("endpoint")
    keys = data.get("keys") or {}
    p256dh = keys.get("p256dh")
    auth_key = keys.get("auth")
    if not endpoint or not p256dh or not auth_key:
        return Response({"detail": "Invalid subscription payload."}, status=status.HTTP_400_BAD_REQUEST)
    from .models import PushSubscription
    sub, created = PushSubscription.objects.update_or_create(
        endpoint=endpoint,
        defaults={
            "user": request.user if request.user.is_authenticated else None,
            "p256dh": p256dh,
            "auth": auth_key,
        },
    )
    return Response(PushSubscriptionSerializer(sub).data, status=status.HTTP_201_CREATED if created else status.HTTP_200_OK)


@api_view(["DELETE"])
@permission_classes([permissions.AllowAny])
def push_unsubscribe(request):
    """
    Remove a push subscription by endpoint.
    Body: { endpoint }
    """
    from .models import PushSubscription
    endpoint = (request.data or {}).get("endpoint")
    if not endpoint:
        return Response({"detail": "endpoint required"}, status=status.HTTP_400_BAD_REQUEST)
    PushSubscription.objects.filter(endpoint=endpoint).delete()
    return Response(status=status.HTTP_204_NO_CONTENT)

class UserDonationSettingsView(generics.RetrieveUpdateAPIView):
    serializer_class = UserDonationSettingsSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_object(self):
        obj, created = UserDonationSettings.objects.get_or_create(
            user=self.request.user
        )
        return obj


class TransactionViewSet(viewsets.ModelViewSet):
    serializer_class = TransactionSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Transaction.objects.filter(user=self.request.user).order_by(
            "-created_at"
        )

    def perform_create(self, serializer):
        user = self.request.user
        amount = serializer.validated_data.get('amount', 0)
        
        # Check if user has sufficient funds
        if user.money_box_balance < amount:
            from rest_framework.exceptions import ValidationError
            raise ValidationError("Insufficient funds in Money Box.")
        
        # Deduct from money box and save transaction
        with db_transaction.atomic():
            user.money_box_balance -= amount
            user.save()
            serializer.save(user=user)
            
        # Log the transaction for debugging
        print(f"Transaction created: User {user.username}, Amount {amount}, New Balance: {user.money_box_balance}")


@api_view(["POST"])
@permission_classes([permissions.IsAuthenticated])
def welfare_family_donation(request):
    user = request.user
    purpose = request.data.get("purpose")
    amount_raw = request.data.get("amount")

    if purpose not in dict(WelfareFamilyNeedDonation.PURPOSE_CHOICES):
        return Response(
            {"detail": "Invalid purpose."}, status=status.HTTP_400_BAD_REQUEST
        )

    try:
        amount = Decimal(str(amount_raw))
    except Exception:
        return Response(
            {"detail": "Enter a valid amount."}, status=status.HTTP_400_BAD_REQUEST
        )

    if amount <= 0:
        return Response(
            {"detail": "Amount must be greater than zero."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    if user.money_box_balance < amount:
        return Response(
            {"detail": "Insufficient funds in Money Box."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    with db_transaction.atomic():
        default_type, _ = DonationType.objects.get_or_create(
            name="Family welfare support",
            defaults={
                "category": "IMPROMPTU",
                "description": "Support for needy families (food, school, shelter, clothing).",
                "is_mandatory": False,
                "is_active": True,
            },
        )

        tx = Transaction.objects.create(
            user=user,
            amount=amount,
            transaction_type="DONATION",
            donation_type=default_type,
            description=f"Family need - {purpose.lower()}",
        )

        WelfareFamilyNeedDonation.objects.create(
            user=user,
            transaction=tx,
            purpose=purpose,
            amount=amount,
        )

        user.money_box_balance -= amount
        user.save()
        
        # Log the welfare donation for debugging
        print(f"Welfare donation: User {user.username}, Purpose {purpose}, Amount {amount}, New Balance: {user.money_box_balance}")

    serializer = WelfareFamilyNeedDonationSerializer(
        WelfareFamilyNeedDonation.objects.get(pk=tx.welfare_family_records.first().pk)
    )
    return Response(serializer.data, status=status.HTTP_201_CREATED)


@api_view(["POST"])
@permission_classes([permissions.IsAuthenticated])
def zakah_quick_pay(request):
    user = request.user
    amount_raw = request.data.get("amount")
    method = request.data.get("method")
    note = request.data.get("note") or "Zakah payment"

    try:
        amount = Decimal(str(amount_raw))
    except Exception:
        return Response(
            {"detail": "Enter a valid amount."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    if amount <= 0:
        return Response(
            {"detail": "Amount must be greater than zero."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    if method == "MONEY_BOX":
        if user.money_box_balance < amount:
            return Response(
                {"detail": "Insufficient funds in Money Box."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        with db_transaction.atomic():
            Transaction.objects.create(
                user=user,
                amount=amount,
                transaction_type="DONATION",
                description=f"{note} (Money Box)",
            )
            user.money_box_balance -= amount
            user.save()

        return Response(
            {"detail": "Zakah paid from Money Box."},
            status=status.HTTP_201_CREATED,
        )

    if method == "CARD":
        card = (
            SavedCard.objects.filter(user=user, is_active=True)
            .order_by("-created_at")
            .first()
        )
        if not card:
            return Response(
                {"detail": "No saved card found. Make a deposit first to save a card."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        paystack = Paystack()
        amount_kobo = int(float(amount) * 100)
        ref = f"zakah_{uuid.uuid4().hex}"

        try:
            status_bool, result = paystack.charge_authorization(
                email=user.email,
                amount=amount_kobo,
                authorization_code=card.authorization_code,
                reference=ref,
            )
        except Exception as e:
            print(f"Paystack charge error: {e}")
            return Response(
                {"detail": "Payment processing failed. Please try again."},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

        if not status_bool or result.get("status") != "success":
            print(f"Paystack charge failed: {result}")
            return Response(
                {"detail": f"Card charge failed: {result.get('message', 'Unknown error')}."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        with db_transaction.atomic():
            Transaction.objects.create(
                user=user,
                amount=amount,
                transaction_type="DONATION",
                description=f"{note} (Card {card.last4})",
            )

        return Response(
            {"detail": "Zakah paid using saved card."},
            status=status.HTTP_201_CREATED,
        )

    return Response(
        {"detail": "Invalid payment method."},
        status=status.HTTP_400_BAD_REQUEST,
    )
