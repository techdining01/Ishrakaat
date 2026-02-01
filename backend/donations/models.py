from django.db import models
from django.conf import settings

class DonationType(models.Model):
    name = models.CharField(max_length=100)
    description = models.TextField(blank=True)
    is_mandatory = models.BooleanField(default=False)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    
    # For "impromptu" or "termly"
    deadline = models.DateTimeField(null=True, blank=True)
    target_amount = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)

    def __str__(self):
        return self.name

class UserDonationSettings(models.Model):
    user = models.OneToOneField(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='donation_settings')
    monthly_amount = models.DecimalField(max_digits=10, decimal_places=2, default=0.00)
    
    def __str__(self):
        return f"{self.user.username} - {self.monthly_amount}"

class Transaction(models.Model):
    TRANSACTION_TYPES = (
        ('DEPOSIT', 'Deposit to Money Box'),
        ('DONATION', 'Donation Payment'),
        ('WITHDRAWAL', 'Withdrawal'),
    )
    
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='transactions')
    amount = models.DecimalField(max_digits=12, decimal_places=2)
    transaction_type = models.CharField(max_length=20, choices=TRANSACTION_TYPES)
    donation_type = models.ForeignKey(DonationType, on_delete=models.SET_NULL, null=True, blank=True)
    description = models.CharField(max_length=255)
    created_at = models.DateTimeField(auto_now_add=True)
    
    def __str__(self):
        return f"{self.user.username} - {self.transaction_type} - {self.amount}"
