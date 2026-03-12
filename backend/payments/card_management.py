"""
Card management utilities for saving and processing ATM cards
"""

import uuid
from django.conf import settings
from .paystack import Paystack

class CardManager:
    """Handle card saving and charging operations"""
    
    def __init__(self):
        self.paystack = Paystack()
    
    def save_card_from_transaction(self, user, authorization_code, email, card_type, last4, exp_month, exp_year):
        """
        Save card details from a successful transaction authorization
        This is the secure way - cards are saved via Paystack tokenization
        """
        from .models import SavedCard
        
        # Check if card already exists
        existing_card = SavedCard.objects.filter(
            user=user, 
            authorization_code=authorization_code
        ).first()
        
        if existing_card:
            return existing_card, "Card already saved"
        
        # Create new saved card
        card = SavedCard.objects.create(
            user=user,
            authorization_code=authorization_code,
            card_type=card_type,
            last4=last4,
            exp_month=exp_month,
            exp_year=exp_year,
            email=email
        )
        
        return card, "Card saved successfully"
    
    def charge_saved_card(self, user, amount, reference=None):
        """
        Charge a user's saved card
        """
        from .models import SavedCard
        
        # Get user's most recent active card
        card = SavedCard.objects.filter(
            user=user, 
            is_active=True
        ).order_by('-created_at').first()
        
        if not card:
            return False, "No saved card found"
        
        if not reference:
            reference = f"charge_{uuid.uuid4().hex}"
        
        amount_kobo = int(float(amount) * 100)
        
        try:
            status, result = self.paystack.charge_authorization(
                email=card.email,
                amount=amount_kobo,
                authorization_code=card.authorization_code,
                reference=reference,
            )
            
            if status and result.get("status") == "success":
                return True, result
            else:
                return False, result.get("message", "Payment failed")
                
        except Exception as e:
            return False, str(e)
    
    def get_saved_cards(self, user):
        """Get all saved cards for a user"""
        from .models import SavedCard
        return SavedCard.objects.filter(user=user, is_active=True).order_by('-created_at')
    
    def deactivate_card(self, user, card_id):
        """Deactivate a saved card"""
        from .models import SavedCard
        try:
            card = SavedCard.objects.get(id=card_id, user=user)
            card.is_active = False
            card.save()
            return True, "Card deactivated"
        except SavedCard.DoesNotExist:
            return False, "Card not found"
