from django.test import TestCase
from django.urls import reverse
from rest_framework.test import APIClient
from rest_framework import status
from unittest.mock import patch
from decimal import Decimal
from .models import ZakahNisab
from .services import fetch_and_update_nisab

class ZakahTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.nisab_url = reverse('nisab_rates')

    @patch('zakah.services.requests.get')
    def test_fetch_and_update_nisab(self, mock_get):
        # Mock responses
        # 1. Gold
        mock_resp_gold = mock_get.return_value
        mock_resp_gold.status_code = 200
        
        def side_effect(url, timeout=10):
            class MockResponse:
                def __init__(self, json_data, status_code):
                    self.json_data = json_data
                    self.status_code = status_code
                def json(self): return self.json_data
            
            if 'price/XAU' in url:
                return MockResponse({'price': 2000.0, 'symbol': 'XAU'}, 200)
            if 'price/XAG' in url:
                return MockResponse({'price': 25.0, 'symbol': 'XAG'}, 200)
            if 'exchangerate-api' in url:
                return MockResponse({'rates': {'NGN': 1000.0}}, 200)
            return MockResponse({}, 404)
            
        mock_get.side_effect = side_effect
        
        nisab = fetch_and_update_nisab()
        
        self.assertIsNotNone(nisab)
        self.assertEqual(nisab.gold_price_usd, Decimal('2000.0'))
        self.assertEqual(nisab.usd_ngn_rate, Decimal('1000.0'))
        
        # Calculation check
        # Gold Nisab = 85 * (2000 / 31.1035) * 1000
        expected_gold = Decimal('85') * (Decimal('2000') / Decimal('31.1035')) * Decimal('1000')
        # Allow some precision diff
        self.assertAlmostEqual(nisab.nisab_gold_ngn, expected_gold, delta=Decimal('1.0'))

    def test_nisab_view(self):
        # Create dummy data
        ZakahNisab.objects.create(
            gold_price_usd=2000,
            silver_price_usd=25,
            usd_ngn_rate=1000,
            nisab_gold_ngn=5465622.84,
            nisab_silver_ngn=478241.99
        )
        
        response = self.client.get(self.nisab_url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['currency'], 'NGN')
        self.assertEqual(float(response.data['gold_price_usd_oz']), 2000.0)
