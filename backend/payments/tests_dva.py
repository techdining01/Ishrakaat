from django.test import TestCase, Client
from django.contrib.auth import get_user_model
from django.urls import reverse
from unittest.mock import patch, MagicMock
from decimal import Decimal
import json
import hmac
import hashlib
from django.conf import settings
from .models import Payment
from donations.models import Transaction

User = get_user_model()

class DedicatedAccountTests(TestCase):
    def setUp(self):
        self.client = Client()
        self.user = User.objects.create_user(
            username='dvauser', 
            email='dva@example.com', 
            password='password123',
            first_name='DVA',
            last_name='User'
        )
        self.create_dva_url = reverse('create_virtual_account')
        self.webhook_url = reverse('paystack_webhook')

    @patch('payments.views.Paystack')
    def test_create_virtual_account_success(self, MockPaystack):
        # Mock Paystack instance
        mock_instance = MockPaystack.return_value
        
        # Mock create_customer
        mock_instance.create_customer.return_value = (True, {'customer_code': 'CUS_123'})
        
        # Mock create_dedicated_account
        mock_instance.create_dedicated_account.return_value = (True, {
            'bank': {'name': 'Wema Bank', 'id': 1},
            'account_name': 'DVA User',
            'account_number': '1234567890'
        })
        
        self.client.force_login(self.user)
        response = self.client.post(self.create_dva_url)
        
        self.assertEqual(response.status_code, 201)
        self.assertEqual(response.data['account_number'], '1234567890')
        
        # Verify user updated
        self.user.refresh_from_db()
        self.assertEqual(self.user.paystack_customer_code, 'CUS_123')
        self.assertEqual(self.user.virtual_account_number, '1234567890')
        self.assertEqual(self.user.virtual_bank_name, 'Wema Bank')

    def test_webhook_charge_success(self):
        # Create payload
        payload = {
            "event": "charge.success",
            "data": {
                "reference": "ref_dva_transfer_123",
                "amount": 500000, # 5000 NGN
                "channel": "dedicated_account",
                "customer": {
                    "email": self.user.email,
                    "customer_code": "CUS_123"
                },
                "authorization": {
                    "authorization_code": "AUTH_123",
                    "card_type": "bank_transfer", # DVA usually shows this or similar
                    "last4": "1234",
                    "exp_month": "12",
                    "exp_year": "2030",
                    "reusable": False # Usually false for transfers
                }
            }
        }
        
        body = json.dumps(payload).encode('utf-8')
        
        # Generate Signature
        secret = settings.PAYSTACK_SECRET_KEY
        signature = hmac.new(
            key=secret.encode('utf-8'),
            msg=body,
            digestmod=hashlib.sha512
        ).hexdigest()
        
        headers = {
            'HTTP_X_PAYSTACK_SIGNATURE': signature,
            'CONTENT_TYPE': 'application/json'
        }
        
        response = self.client.post(self.webhook_url, data=payload, content_type='application/json', **headers)
        
        self.assertEqual(response.status_code, 200)
        
        # Verify Payment Created
        payment = Payment.objects.get(reference="ref_dva_transfer_123")
        self.assertEqual(payment.amount, Decimal('5000.00'))
        self.assertEqual(payment.status, 'SUCCESS')
        
        # Verify User Credited
        self.user.refresh_from_db()
        self.assertEqual(self.user.money_box_balance, Decimal('5000.00'))
        
        # Verify Transaction
        tx = Transaction.objects.filter(user=self.user).first()
        self.assertIsNotNone(tx)
        self.assertEqual(tx.amount, Decimal('5000.00'))
        self.assertIn("dedicated_account", tx.description)

    def test_webhook_invalid_signature(self):
        response = self.client.post(self.webhook_url, data={}, content_type='application/json', **{'HTTP_X_PAYSTACK_SIGNATURE': 'wrong'})
        self.assertEqual(response.status_code, 400)
