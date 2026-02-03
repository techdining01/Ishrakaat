from django.db import models
from django.conf import settings

class Payment(models.Model):
    STATUS_CHOICES = (
        ('PENDING', 'Pending'),
        ('SUCCESS', 'Success'),
        ('FAILED', 'Failed'),
    )
    
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='payments')
    amount = models.DecimalField(max_digits=12, decimal_places=2)
    reference = models.CharField(max_length=100, unique=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='PENDING')
    created_at = models.DateTimeField(auto_now_add=True)
    verified_at = models.DateTimeField(null=True, blank=True)
    
    # Metadata to track what this payment is for (Money Box Deposit vs Direct Donation)
    purpose = models.CharField(max_length=50, default='DEPOSIT') 
    
    def __str__(self):
        return f"{self.user.username} - {self.amount} - {self.status}"

class SavedCard(models.Model):
    """Stores tokenized card details for recurring payments (Line 7)."""
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='saved_cards')
    authorization_code = models.CharField(max_length=100)
    card_type = models.CharField(max_length=20)  # Visa, Mastercard
    last4 = models.CharField(max_length=4)
    exp_month = models.CharField(max_length=2)
    exp_year = models.CharField(max_length=4)
    email = models.EmailField()
    
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('user', 'authorization_code')
        
    def __str__(self):
        return f"{self.user.username} - {self.card_type} **** {self.last4}"
