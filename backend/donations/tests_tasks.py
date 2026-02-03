from django.test import TestCase
from django.contrib.auth import get_user_model
from django.utils import timezone
from unittest.mock import patch, MagicMock
from decimal import Decimal
from .models import UserDonationSettings, Transaction
from .tasks import process_monthly_donations
from payments.models import SavedCard

User = get_user_model()

class MonthlyDonationTaskTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(username='taskuser', email='task@example.com', first_name='Task')
        self.settings = UserDonationSettings.objects.create(
            user=self.user,
            monthly_amount=Decimal('5000.00'),
            auto_deduct_from_box=True,
            auto_charge_card=True
        )
        self.user.money_box_balance = Decimal('0.00')
        self.user.save()

    def test_deduct_from_money_box(self):
        # Setup: Enough balance
        self.user.money_box_balance = Decimal('10000.00')
        self.user.save()
        
        process_monthly_donations()
        
        self.user.refresh_from_db()
        # Should be 10000 - 5000 = 5000
        self.assertEqual(self.user.money_box_balance, Decimal('5000.00'))
        
        # Check transaction
        tx = Transaction.objects.filter(user=self.user, transaction_type='DONATION').first()
        self.assertIsNotNone(tx)
        self.assertEqual(tx.amount, Decimal('5000.00'))
        self.assertIn("Auto-deducted from Money Box", tx.description)

    def test_already_donated(self):
        # Setup: Already donated this month
        Transaction.objects.create(
            user=self.user,
            amount=Decimal('5000.00'),
            transaction_type='DONATION',
            description="Manual Donation"
        )
        self.user.money_box_balance = Decimal('10000.00')
        self.user.save()
        
        process_monthly_donations()
        
        self.user.refresh_from_db()
        # Should NOT change
        self.assertEqual(self.user.money_box_balance, Decimal('10000.00'))

    @patch('donations.tasks.Paystack.charge_authorization')
    def test_charge_saved_card(self, mock_charge):
        # Setup: Insufficient balance
        self.user.money_box_balance = Decimal('100.00')
        self.user.save()
        
        # Setup: Saved Card
        SavedCard.objects.create(
            user=self.user,
            authorization_code='AUTH_123',
            card_type='visa',
            last4='4242',
            exp_month='12',
            exp_year='2030',
            email=self.user.email
        )
        
        # Mock Paystack success
        mock_charge.return_value = (True, {'status': 'success', 'reference': 'ref_auto_123'})
        
        process_monthly_donations()
        
        # Check transaction
        tx = Transaction.objects.filter(user=self.user, transaction_type='DONATION').first()
        self.assertIsNotNone(tx)
        self.assertIn("Auto-charged Card 4242", tx.description)
        
        # Money box should remain same
        self.user.refresh_from_db()
        self.assertEqual(self.user.money_box_balance, Decimal('100.00'))
