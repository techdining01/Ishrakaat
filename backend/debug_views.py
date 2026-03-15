
import os
import django
import sys

# Set up Django environment
sys.path.append(os.getcwd())
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from zakah.views import NisabView, ZakahReferenceView, IslamicDashboardCardsView
from users.views import ProfileView
from donations.views import UserDonationSettingsView
from rest_framework.test import APIRequestFactory, force_authenticate
from django.contrib.auth import get_user_model

User = get_user_model()
factory = APIRequestFactory()

# Get or create a test user
user, _ = User.objects.get_or_create(username="testuser_diag", defaults={"email": "test@example.com"})

def test_view(view_class, path, authenticated=False):
    print(f"\n--- Testing {path} (Auth: {authenticated}) ---")
    request = factory.get(path)
    if authenticated:
        force_authenticate(request, user=user)
    
    view = view_class.as_view()
    try:
        response = view(request)
        print(f"Status: {response.status_code}")
        # Only print first 200 chars of data
        print(f"Data: {str(response.data)[:200]}...")
    except Exception as e:
        print(f"CRASH in view: {e}")
        import traceback
        traceback.print_exc()

# Test Zakah endpoints (Authenticated)
test_view(NisabView, '/zakah/nisab/', authenticated=True)
test_view(ZakahReferenceView, '/zakah/references/', authenticated=True)
test_view(IslamicDashboardCardsView, '/zakah/cards/', authenticated=True)

# Test Profile and Donation Settings
test_view(ProfileView, '/auth/me/', authenticated=True)
test_view(UserDonationSettingsView, '/donations/settings/', authenticated=True)

print("\n--- Diagnostic Finished ---")
