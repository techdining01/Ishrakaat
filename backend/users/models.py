import uuid
from django.db import models
from django.contrib.auth.models import AbstractUser

class User(AbstractUser):
    # Location details
    country = models.CharField(max_length=100, default='Nigeria')
    state = models.CharField(max_length=100, blank=True)
    local_govt = models.CharField(max_length=100, blank=True)
    ward = models.CharField(max_length=100, blank=True)
    
    # Custom fields
    registration_number = models.CharField(max_length=50, unique=True, blank=True)
    is_approved_by_admin = models.BooleanField(default=False)
    
    # "Money box" balance could be here or in a separate model.
    # User asked for "Money box, where user can save excess fund"
    money_box_balance = models.DecimalField(max_digits=12, decimal_places=2, default=0.00)
    
    def save(self, *args, **kwargs):
        if not self.registration_number:
            # f"{user.first_name}[:5]/uuid[:6]hex().upper()
            prefix = self.first_name[:5] if self.first_name else "USER"
            unique_part = uuid.uuid4().hex[:6].upper()
            self.registration_number = f"{prefix}/{unique_part}"
        super().save(*args, **kwargs)

    def __str__(self):
        return self.username
