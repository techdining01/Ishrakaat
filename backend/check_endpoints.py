import requests
import json

base_url = "http://localhost:8000"
endpoints = [
    "/zakah/nisab/",
    "/zakah/references/",
    "/zakah/nisab/data/",
    "/zakah/cards/"
]

for endpoint in endpoints:
    print(f"\n--- Testing {endpoint} ---")
    try:
        response = requests.get(f"{base_url}{endpoint}")
        print(f"Status: {response.status_code}")
        try:
            print(f"Response: {json.dumps(response.json(), indent=2)}")
        except:
            print(f"Response (text): {response.text[:500]}")
    except Exception as e:
        print(f"Request failed: {e}")
