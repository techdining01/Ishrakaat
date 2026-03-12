from rest_framework import serializers
from .models import NisabData, ZakahNisab, ZakahReference, DashboardIslamicCard


class NisabDataSerializer(serializers.ModelSerializer):
    """Serializer for NisabData model"""
    class Meta:
        model = NisabData
        fields = [
            'id',
            'currency',
            'gold_price_per_gram',
            'silver_price_per_gram',
            'source',
            'last_updated'
        ]


class ZakahNisabSerializer(serializers.ModelSerializer):
    """Serializer for ZakahNisab model"""
    class Meta:
        model = ZakahNisab
        fields = [
            'id',
            'gold_price_usd',
            'silver_price_usd',
            'usd_ngn_rate',
            'nisab_gold_ngn',
            'nisab_silver_ngn',
            'last_updated'
        ]


class ZakahReferenceSerializer(serializers.ModelSerializer):
    """Serializer for ZakahReference model"""
    class Meta:
        model = ZakahReference
        fields = [
            'id',
            'key',
            'title',
            'amount_ngn',
            'source_url',
            'last_updated'
        ]


class DashboardIslamicCardSerializer(serializers.ModelSerializer):
    """Serializer for DashboardIslamicCard model"""
    class Meta:
        model = DashboardIslamicCard
        fields = [
            'id',
            'title',
            'arabic_title',
            'content',
            'arabic_content',
            'icon_name',
            'order',
            'last_updated'
        ]
