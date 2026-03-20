
import os
import sys

# 1. Set up Django environment FIRST
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
import django
django.setup()

# 2. NOW import rest_framework and other django-related things
from rest_framework.test import APIClient
from django.contrib.auth import get_user_model

User = get_user_model()
client = APIClient()

# Get a real user from host
user = User.objects.filter(is_superuser=True).first()
if not user:
    user = User.objects.create_superuser('diag_admin', 'diag@test.com', 'password123')

print(f">>> Authenticating as {user.username}")
client.force_authenticate(user=user)

endpoints = [
    '/auth/me/',
    '/donations/settings/',
    '/zakah/nisab/',
    '/zakah/references/',
    '/zakah/cards/',
    '/payments/cards/',
    '/donations/campaigns/',
    '/zakah/nisab/data/',
]

for ep in endpoints:
    print(f"\n>>> [TESTING] {ep}")
    try:
        res = client.get(ep)
        print(f"Status: {res.status_code}")
        if res.status_code >= 400:
            print(f"Response Data: {str(res.data)[:500]}...")
    except Exception as e:
        print(f"EXCEPTION: {e}")
        import traceback
        traceback.print_exc()

print("\n>>> Finished")
