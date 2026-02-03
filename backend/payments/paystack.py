import requests
from django.conf import settings

class Paystack:
    PAYSTACK_SECRET_KEY = settings.PAYSTACK_SECRET_KEY
    BASE_URL = 'https://api.paystack.co'

    def verify_payment(self, ref, *args, **kwargs):
        path = f"/transaction/verify/{ref}"
        
        headers = {
            "Authorization": f"Bearer {self.PAYSTACK_SECRET_KEY}",
            "Content-Type": "application/json",
        }
        
        url = self.BASE_URL + path
        response = requests.get(url, headers=headers)

        if response.status_code == 200:
            response_data = response.json()
            return response_data['status'], response_data['data']
        
        response_data = response.json()
        return response_data['status'], response_data['message']

    def create_customer(self, email, first_name, last_name, phone):
        path = "/customer"
        headers = {
            "Authorization": f"Bearer {self.PAYSTACK_SECRET_KEY}",
            "Content-Type": "application/json",
        }
        data = {
            "email": email,
            "first_name": first_name,
            "last_name": last_name,
            "phone": phone
        }
        
        url = self.BASE_URL + path
        response = requests.post(url, headers=headers, json=data)
        
        if response.status_code in [200, 201]:
            response_data = response.json()
            return True, response_data['data']
        
        return False, response.json().get('message', 'Failed to create customer')

    def create_dedicated_account(self, customer_code):
        path = "/dedicated_account"
        headers = {
            "Authorization": f"Bearer {self.PAYSTACK_SECRET_KEY}",
            "Content-Type": "application/json",
        }
        data = {
            "customer": customer_code
        }
        
        url = self.BASE_URL + path
        response = requests.post(url, headers=headers, json=data)
        
        if response.status_code in [200, 201]:
            response_data = response.json()
            return True, response_data['data']
            
        return False, response.json().get('message', 'Failed to create dedicated account')

    def initialize_payment(self, email, amount, reference=None, callback_url=None):
        """
        amount should be in Kobo (Naira * 100)
        """
        path = "/transaction/initialize"
        headers = {
            "Authorization": f"Bearer {self.PAYSTACK_SECRET_KEY}",
            "Content-Type": "application/json",
        }
        
        data = {
            "email": email,
            "amount": amount,
        }
        if reference:
            data['reference'] = reference
        if callback_url:
            data['callback_url'] = callback_url
            
        url = self.BASE_URL + path
        response = requests.post(url, headers=headers, json=data)

        if response.status_code == 200:
            response_data = response.json()
            return response_data['status'], response_data['data']

        response_data = response.json()
        return response_data['status'], response_data['message']

    def charge_authorization(self, email, amount, authorization_code, reference=None):
        """
        Charge a recurring payment using authorization code
        amount should be in Kobo
        """
        path = "/transaction/charge_authorization"
        headers = {
            "Authorization": f"Bearer {self.PAYSTACK_SECRET_KEY}",
            "Content-Type": "application/json",
        }
        
        data = {
            "email": email,
            "amount": amount,
            "authorization_code": authorization_code
        }
        if reference:
            data['reference'] = reference
            
        url = self.BASE_URL + path
        response = requests.post(url, headers=headers, json=data)

        if response.status_code == 200:
            response_data = response.json()
            return response_data['status'], response_data['data']

        response_data = response.json()
        return response_data['status'], response_data['message']
