from django.conf import settings
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from django.shortcuts import get_object_or_404
from django.db import transaction
from django.utils import timezone
from django.utils.decorators import method_decorator
from django.views.decorators.csrf import csrf_exempt
from django.contrib.auth import get_user_model
from decimal import Decimal
import uuid
import hmac
import hashlib
import json

from .models import Payment, SavedCard
from .paystack import Paystack
from donations.models import Transaction

User = get_user_model()

class CreateVirtualAccountView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        user = request.user
        
        if user.virtual_account_number:
            return Response({
                "message": "User already has a virtual account",
                "account_number": user.virtual_account_number,
                "bank_name": user.virtual_bank_name
            }, status=status.HTTP_200_OK)
            
        paystack = Paystack()
        
        # 1. Create Customer if not exists
        if not user.paystack_customer_code:
            # Assuming phone number might be in user profile or just pass empty if not available
            # Standard User model doesn't have phone_number unless added.
            # Let's check if we have it or just pass None
            phone = getattr(user, 'phone_number', '') 
            
            success, data = paystack.create_customer(
                user.email, user.first_name, user.last_name, phone
            )
            if success:
                user.paystack_customer_code = data['customer_code']
                user.save()
            else:
                return Response({"error": "Failed to create Paystack customer"}, status=status.HTTP_400_BAD_REQUEST)
        
        # 2. Create Dedicated Account
        success, data = paystack.create_dedicated_account(user.paystack_customer_code)
        
        if success:
            # Handle Paystack response structure
            # data typically has 'bank' object and 'account_number'
            bank = data.get('bank', {})
            user.virtual_account_number = data.get('account_number')
            user.virtual_bank_name = bank.get('name', 'Paystack-Titan')
            user.save()
            
            return Response({
                "message": "Virtual account created successfully",
                "account_number": user.virtual_account_number,
                "bank_name": user.virtual_bank_name
            }, status=status.HTTP_201_CREATED)
        else:
            return Response({"error": "Failed to create virtual account", "details": data}, status=status.HTTP_400_BAD_REQUEST)

@method_decorator(csrf_exempt, name='dispatch')
class PaystackWebhookView(APIView):
    permission_classes = [] # Public endpoint, secured by signature

    def post(self, request):
        # 1. Verify Signature
        secret = settings.PAYSTACK_SECRET_KEY
        signature = request.headers.get('x-paystack-signature')
        
        if not signature:
            return Response(status=status.HTTP_400_BAD_REQUEST)
            
        # Verify HMAC
        # request.body is bytes
        digest = hmac.new(
            key=secret.encode('utf-8'),
            msg=request.body,
            digestmod=hashlib.sha512
        ).hexdigest()
        
        if digest != signature:
            return Response(status=status.HTTP_400_BAD_REQUEST)
            
        # 2. Process Event
        try:
            payload = json.loads(request.body)
        except json.JSONDecodeError:
            return Response(status=status.HTTP_400_BAD_REQUEST)
            
        event = payload.get('event')
        data = payload.get('data', {})
        
        if event == 'charge.success':
            reference = data.get('reference')
            amount_kobo = data.get('amount')
            amount = Decimal(amount_kobo) / 100
            email = data.get('customer', {}).get('email')
            
            # Check if we processed this already
            if Payment.objects.filter(reference=reference, status='SUCCESS').exists():
                return Response(status=status.HTTP_200_OK)
                
            # Find User
            try:
                user = User.objects.get(email=email)
            except User.DoesNotExist:
                # Log error or ignore
                return Response(status=status.HTTP_200_OK)
            
            # Use Atomic Transaction
            with transaction.atomic():
                # Update or Create Payment
                # DVA transfers create a new payment record here
                payment, created = Payment.objects.get_or_create(
                    reference=reference,
                    defaults={
                        'user': user,
                        'amount': amount,
                        'purpose': 'DEPOSIT', # Default for DVA/Webhook
                        'status': 'PENDING'
                    }
                )
                
                if payment.status != 'SUCCESS':
                    payment.status = 'SUCCESS'
                    payment.verified_at = timezone.now()
                    payment.save()
                    
                    # Credit User
                    user.money_box_balance = Decimal(str(user.money_box_balance)) + amount
                    user.save()
                    
                    # Create Transaction
                    Transaction.objects.create(
                        user=user,
                        amount=amount,
                        transaction_type='DEPOSIT',
                        description=f"Deposit via {data.get('channel', 'paystack')} (Ref: {reference})"
                    )
                    
                    # Handle Saved Card if applicable
                    auth = data.get('authorization', {})
                    if auth.get('reusable', False):
                         SavedCard.objects.get_or_create(
                            user=user,
                            authorization_code=auth['authorization_code'],
                            defaults={
                                'card_type': auth.get('card_type', 'Unknown'),
                                'last4': auth.get('last4', '0000'),
                                'exp_month': auth.get('exp_month', '00'),
                                'exp_year': auth.get('exp_year', '0000'),
                                'email': auth.get('email', user.email)
                            }
                        )
        
        return Response(status=status.HTTP_200_OK)

class InitializePaymentView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        user = request.user
        amount = request.data.get('amount')
        email = request.data.get('email', user.email)
        purpose = request.data.get('purpose', 'DEPOSIT')

        if not amount:
            return Response({"error": "Amount is required"}, status=status.HTTP_400_BAD_REQUEST)

        # Convert to kobo (Paystack expects kobo)
        amount_kobo = int(float(amount) * 100)
        
        # Generate unique reference
        ref = uuid.uuid4().hex

        # Save pending payment
        Payment.objects.create(
            user=user,
            amount=amount,
            reference=ref,
            purpose=purpose,
            status='PENDING'
        )

        paystack = Paystack()
        status_bool, result = paystack.initialize_payment(email, amount_kobo, ref)

        if status_bool:
            return Response({"status": "success", "data": result}, status=status.HTTP_200_OK)
        else:
            return Response({"error": "Payment initialization failed", "details": result}, status=status.HTTP_400_BAD_REQUEST)


class VerifyPaymentView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, reference):
        payment = get_object_or_404(Payment, reference=reference, user=request.user)
        
        if payment.status == 'SUCCESS':
            return Response({"message": "Payment already verified"}, status=status.HTTP_200_OK)

        paystack = Paystack()
        status_bool, result = paystack.verify_payment(reference)

        if status_bool and result['status'] == 'success':
            with transaction.atomic():
                # 1. Update Payment
                payment.status = 'SUCCESS'
                payment.verified_at = result['paid_at']
                payment.save()

                # 2. Handle Logic based on Purpose
                if payment.purpose == 'DEPOSIT':
                    request.user.money_box_balance = Decimal(str(request.user.money_box_balance)) + payment.amount
                    request.user.save()
                    
                    Transaction.objects.create(
                        user=request.user,
                        amount=payment.amount,
                        transaction_type='DEPOSIT',
                        description=f"Deposit via Paystack (Ref: {reference})"
                    )
                
                # 3. Save Card if Reusable (Line 7 Requirement)
                auth = result.get('authorization', {})
                if auth.get('reusable', False):
                    SavedCard.objects.get_or_create(
                        user=request.user,
                        authorization_code=auth['authorization_code'],
                        defaults={
                            'card_type': auth.get('card_type', 'Unknown'),
                            'last4': auth.get('last4', '0000'),
                            'exp_month': auth.get('exp_month', '00'),
                            'exp_year': auth.get('exp_year', '0000'),
                            'email': auth.get('email', request.user.email)
                        }
                    )

            return Response({"message": "Payment successful", "data": result}, status=status.HTTP_200_OK)
        else:
            payment.status = 'FAILED'
            payment.save()
            return Response({"error": "Verification failed"}, status=status.HTTP_400_BAD_REQUEST)
