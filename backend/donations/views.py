from rest_framework import generics, permissions, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from .models import DonationType, UserDonationSettings, Transaction
from .serializers import (
    DonationTypeSerializer, 
    UserDonationSettingsSerializer, 
    TransactionSerializer
)

class DonationTypeListView(generics.ListCreateAPIView):
    serializer_class = DonationTypeSerializer
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]

    def get_queryset(self):
        if self.request.user.is_staff:
            return DonationType.objects.all()
        return DonationType.objects.filter(is_active=True)

    def perform_create(self, serializer):
        if not self.request.user.is_staff:
             raise permissions.PermissionDenied("Only admins can create campaigns.")
        serializer.save()

class UserDonationSettingsView(generics.RetrieveUpdateAPIView):
    serializer_class = UserDonationSettingsSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_object(self):
        obj, created = UserDonationSettings.objects.get_or_create(user=self.request.user)
        return obj

class TransactionViewSet(viewsets.ModelViewSet):
    serializer_class = TransactionSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Transaction.objects.filter(user=self.request.user).order_by('-created_at')

    def perform_create(self, serializer):
        # The actual creation logic including balance update is in the serializer
        serializer.save(user=self.request.user)
