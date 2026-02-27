from rest_framework import serializers
from django.db import transaction
from .models import (
    DonationType,
    UserDonationSettings,
    Transaction,
    WelfareFamilyNeedDonation,
    WaqfInterest,
)


class DonationTypeSerializer(serializers.ModelSerializer):
    class Meta:
        model = DonationType
        fields = '__all__'

class UserDonationSettingsSerializer(serializers.ModelSerializer):
    class Meta:
        model = UserDonationSettings
        fields = ['monthly_amount']


class TransactionSerializer(serializers.ModelSerializer):
    class Meta:
        model = Transaction
        fields = ['id', 'amount', 'transaction_type', 'donation_type', 'description', 'created_at']
        read_only_fields = ['created_at']

    def validate(self, attrs):
        user = self.context['request'].user
        amount = attrs.get('amount')
        transaction_type = attrs.get('transaction_type')

        if transaction_type in ['DONATION', 'WITHDRAWAL']:
            if user.money_box_balance < amount:
                raise serializers.ValidationError("Insufficient funds in Money Box.")
        
        return attrs

    def create(self, validated_data):
        # user might be in validated_data if passed via save(user=...)
        user = validated_data.pop("user", None)
        if not user:
            user = self.context["request"].user

        amount = validated_data["amount"]
        transaction_type = validated_data["transaction_type"]

        with transaction.atomic():
            trans = Transaction.objects.create(user=user, **validated_data)

            if transaction_type == "DEPOSIT":
                user.money_box_balance += amount
            elif transaction_type in ["DONATION", "WITHDRAWAL"]:
                user.money_box_balance -= amount

            user.save()
            return trans


class WelfareFamilyNeedDonationSerializer(serializers.ModelSerializer):
    class Meta:
        model = WelfareFamilyNeedDonation
        fields = ["id", "purpose", "amount", "created_at"]
        read_only_fields = ["id", "created_at"]


class WaqfInterestSerializer(serializers.ModelSerializer):
    class Meta:
        model = WaqfInterest
        fields = [
            "id",
            "waqf_category",
            "project_type",
            "contribution_method",
            "on_behalf_of",
            "preferred_date",
            "guest_name",
            "guest_email",
            "guest_phone",
            "additional_notes",
            "created_at",
        ]
        read_only_fields = ["id", "created_at"]

    def validate(self, data):
        # If user is not authenticated, guest fields are required
        request = self.context.get("request")
        user = request.user if request else None

        if not user or not user.is_authenticated:
            if not data.get("guest_name"):
                raise serializers.ValidationError({"guest_name": "Required for guest submissions."})
            if not data.get("guest_email"):
                raise serializers.ValidationError({"guest_email": "Required for guest submissions."})
            if not data.get("guest_phone"):
                raise serializers.ValidationError({"guest_phone": "Required for guest submissions."})
        
        return data
