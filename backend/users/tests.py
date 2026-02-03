from django.test import TestCase
from django.contrib.auth import get_user_model
from decimal import Decimal

User = get_user_model()

class UserRegistrationTests(TestCase):
    def test_user_creation_generates_registration_number(self):
        """Test that a new user gets a registration number automatically."""
        user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='password123',
            first_name='Ishrakaat'
        )
        
        # Check registration number format
        self.assertIsNotNone(user.registration_number)
        self.assertTrue(user.registration_number.startswith('Ishra'))
        self.assertIn('/', user.registration_number)
        
        # Check default admin approval
        self.assertFalse(user.is_approved_by_admin)
        
        # Check default money box
        self.assertEqual(user.money_box_balance, Decimal('0.00'))

    def test_registration_number_uniqueness(self):
        """Test that two users don't get the same registration number (unlikely but good to check)."""
        user1 = User.objects.create_user(username='u1', first_name='Ahmed')
        user2 = User.objects.create_user(username='u2', first_name='Ahmed')
        
        self.assertNotEqual(user1.registration_number, user2.registration_number)
