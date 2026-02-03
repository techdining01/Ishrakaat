from rest_framework import serializers
from django.db import transaction
from .models import DonationType, UserDonationSettings, Transaction

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
        user = validated_data.pop('user', None)
        if not user:
            user = self.context['request'].user
            
        amount = validated_data['amount']
        transaction_type = validated_data['transaction_type']
        
        with transaction.atomic():
            # Create transaction
            trans = Transaction.objects.create(user=user, **validated_data)
            
            # Update user balance
            if transaction_type == 'DEPOSIT':
                user.money_box_balance += amount
            elif transaction_type in ['DONATION', 'WITHDRAWAL']:
                user.money_box_balance -= amount
            
            user.save()
            return trans
