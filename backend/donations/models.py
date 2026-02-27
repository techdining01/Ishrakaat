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


class WelfareFamilyNeedDonation(models.Model):
    PURPOSE_CHOICES = (
        ("FOOD", "Food"),
        ("SCHOOL", "School package"),
        ("SHELTER", "Shelter / house rent"),
        ("CLOTHING", "Clothing"),
    )

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="welfare_family_donations",
    )
    transaction = models.ForeignKey(
        "Transaction",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="welfare_family_records",
    )
    purpose = models.CharField(max_length=20, choices=PURPOSE_CHOICES)
    amount = models.DecimalField(max_digits=12, decimal_places=2)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.user.username} - {self.purpose} - {self.amount}"


class WaqfInterest(models.Model):
    WAQF_CATEGORIES = (
        ('MASJID', 'Masjid and Centres'),
        ('KNOWLEDGE', 'Knowledge and Scholarships'),
        ('INCOME', 'Income Generating Projects'),
    )
    
    METHOD_CHOICES = (
        ('EXECUTE', 'Execute in my name (Project Request)'),
        ('HANDOVER', 'Hand over / Surrender asset to Ishrakaat'),
    )

    # Optional user if logged in
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, 
        on_delete=models.SET_NULL, 
        null=True, 
        blank=True,
        related_name="waqf_interests"
    )
    
    # Required for guests
    guest_name = models.CharField(max_length=100, blank=True)
    guest_email = models.EmailField(blank=True)
    guest_phone = models.CharField(max_length=20, blank=True)

    waqf_category = models.CharField(max_length=20, choices=WAQF_CATEGORIES)
    project_type = models.CharField(max_length=100, help_text="e.g. Land, Borehole, Books")
    contribution_method = models.CharField(max_length=20, choices=METHOD_CHOICES)
    
    on_behalf_of = models.CharField(max_length=100, blank=True, help_text="Name to be associated with the project")
    
    preferred_date = models.DateField(help_text="Target date for project or handover")
    additional_notes = models.TextField(blank=True)
    
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        name = self.user.username if self.user else self.guest_name or "Guest"
        return f"Waqf Interest: {name} - {self.waqf_category}"
