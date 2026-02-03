from django.db import models
from django.conf import settings

class DonationType(models.Model):
    CATEGORY_CHOICES = (
        ('MONTHLY', 'Monthly Recurring'),
        ('IMPROMPTU', 'Impromptu / Emergency'),
        ('PROJECT', 'Specific Project'),
    )

    name = models.CharField(max_length=100)
    category = models.CharField(max_length=20, choices=CATEGORY_CHOICES, default='PROJECT')
    description = models.TextField(blank=True)
    is_mandatory = models.BooleanField(default=False)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    # For "impromptu" or "termly"
    deadline = models.DateTimeField(null=True, blank=True)
    target_amount = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)

    def __str__(self):
        return self.name

class UserDonationSettings(models.Model):
    user = models.OneToOneField(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='donation_settings')
    monthly_amount = models.DecimalField(max_digits=10, decimal_places=2, default=0.00)
    auto_deduct_from_box = models.BooleanField(default=True, help_text="Auto-deduct from Money Box")
    auto_charge_card = models.BooleanField(default=False, help_text="Auto-charge saved card if Money Box is insufficient")
    
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
