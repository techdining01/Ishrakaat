from django.test import TestCase
from django.urls import reverse
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient
from rest_framework import status
from unittest.mock import patch
from .models import Payment, SavedCard

User = get_user_model()

class PaymentTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(
            username='testpaymentuser',
            email='test@example.com',
            password='password123',
            first_name='Test',
            last_name='User'
        )
        self.client.force_authenticate(user=self.user)
        self.init_url = reverse('initialize_payment')
        
    @patch('payments.paystack.Paystack.initialize_payment')
    def test_initialize_payment(self, mock_init):
        # Mock successful response
        mock_init.return_value = (True, {'authorization_url': 'https://paystack.com/checkout/xxx', 'reference': 'ref_12345'})
        
        data = {'amount': 5000} # 5000 Naira
        response = self.client.post(self.init_url, data)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('authorization_url', response.data['data'])
        # The view generates a UUID reference, so the response will contain that, 
        # NOT the fixed 'ref_12345' we returned in the mock (unless the view uses the return value).
        # Actually, the view returns 'result' from paystack. 
        # But the Payment object is created with the generated UUID BEFORE calling paystack.
        
        # Verify a payment was created
        payment = Payment.objects.filter(user=self.user, amount=5000).first()
        self.assertIsNotNone(payment)
        self.assertEqual(payment.status, 'PENDING')
        
        # Verify Paystack was called with the generated reference
        mock_init.assert_called_once()
        args, _ = mock_init.call_args
        # args[2] is the reference passed to initialize_payment
        generated_ref = args[2] 
        self.assertEqual(payment.reference, generated_ref)

    @patch('payments.paystack.Paystack.verify_payment')
    def test_verify_payment_success(self, mock_verify):
        # Create pending payment
        payment = Payment.objects.create(
            user=self.user,
            amount=5000,
            reference='ref_verify_success',
            status='PENDING'
        )
        
        # Mock successful verification
        mock_verify.return_value = (True, {
            'status': 'success',
            'paid_at': '2023-10-27T10:00:00.000Z',
            'authorization': {
                'authorization_code': 'AUTH_xxx',
                'card_type': 'visa',
                'last4': '4242',
                'exp_month': '12',
                'exp_year': '2025',
                'reusable': True
            }
        })
        
        verify_url = reverse('verify_payment', kwargs={'reference': 'ref_verify_success'})
        response = self.client.get(verify_url)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # Refresh payment
        payment.refresh_from_db()
        self.assertEqual(payment.status, 'SUCCESS')
        
        # Refresh user to check money box
        self.user.refresh_from_db()
        self.assertEqual(self.user.money_box_balance, 5000)
        
        # Check saved card
        self.assertTrue(SavedCard.objects.filter(user=self.user, authorization_code='AUTH_xxx').exists())

    @patch('payments.paystack.Paystack.verify_payment')
    def test_verify_payment_failed(self, mock_verify):
        payment = Payment.objects.create(
            user=self.user,
            amount=2000,
            reference='ref_verify_fail',
            status='PENDING'
        )
        
        mock_verify.return_value = (False, 'Verification failed')
        
        verify_url = reverse('verify_payment', kwargs={'reference': 'ref_verify_fail'})
        response = self.client.get(verify_url)
        
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        
        payment.refresh_from_db()
        self.assertEqual(payment.status, 'FAILED')
