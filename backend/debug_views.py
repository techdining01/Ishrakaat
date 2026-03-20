
import os
import django
import sys

# Set up Django environment
sys.path.append(os.getcwd())
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from rest_framework.test import APIClient
from django.contrib.auth import get_user_model

User = get_user_model()
client = APIClient()

# Get or create a test user
user, _ = User.objects.get_or_create(username="testuser_diag", defaults={"email": "test@example.com"})

def test_endpoint(path, authenticated=False):
    print(f"\n--- Testing {path} (Auth: {authenticated}) ---")
    if authenticated:
        client.force_authenticate(user=user)
    else:
        client.force_authenticate(user=None)
    
    try:
        response = client.get(path)
        print(f"Status: {response.status_code}")
        # Only print first 200 chars of data
        print(f"Data: {str(response.data)[:200]}...")
    except Exception as e:
        print(f"CRASH during request: {e}")
        import traceback
        traceback.print_exc()

# Test Zakah endpoints
test_endpoint('/zakah/nisab/', authenticated=False)
test_endpoint('/zakah/nisab/', authenticated=True)
test_endpoint('/zakah/references/', authenticated=True)
test_endpoint('/zakah/cards/', authenticated=True)

# Test Profile and Donation Settings
test_endpoint('/auth/me/', authenticated=True)
test_endpoint('/donations/settings/', authenticated=True)

print("\n--- Diagnostic Finished ---")
