from django.test import TestCase
from django.contrib.auth import get_user_model
from .models import DonationType, Transaction

User = get_user_model()

class DonationLogicTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(username='donor', first_name='Donor')

    def test_impromptu_donation_creation(self):
        """Test creating an Impromptu donation type (Line 10-11 requirement)."""
        emergency_donation = DonationType.objects.create(
            name="Flood Relief",
            category="IMPROMPTU",
            target_amount=1000000.00,
            is_mandatory=False
        )
        
        self.assertEqual(emergency_donation.category, "IMPROMPTU")
        self.assertEqual(emergency_donation.target_amount, 1000000.00)

    def test_monthly_donation_creation(self):
        """Test creating a Monthly donation type."""
        monthly_dues = DonationType.objects.create(
            name="Monthly Upkeep",
            category="MONTHLY",
            is_mandatory=True
        )
        self.assertEqual(monthly_dues.category, "MONTHLY")

    def test_transaction_recording(self):
        """Test recording a donation transaction."""
        donation = DonationType.objects.create(name="General", category="PROJECT")
        
        tx = Transaction.objects.create(
            user=self.user,
            amount=5000.00,
            transaction_type='DONATION',
            donation_type=donation,
            description="Payment for General Project"
        )
        
        self.assertEqual(tx.user, self.user)
        self.assertEqual(tx.amount, 5000.00)
        self.assertEqual(tx.transaction_type, 'DONATION')
