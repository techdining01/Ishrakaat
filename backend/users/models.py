import uuid
from django.db import models
from django.contrib.auth.models import AbstractUser


class User(AbstractUser):
    country = models.CharField(max_length=100, default="Nigeria")
    state = models.CharField(max_length=100, blank=True)
    local_govt = models.CharField(max_length=100, blank=True)
    ward = models.CharField(max_length=100, blank=True)
    profile_pic = models.FileField(upload_to="profile_pics/", blank=True, null=True)
    profile_picture = models.URLField(max_length=500, blank=True)

    registration_number = models.CharField(max_length=50, unique=True, blank=True)
    is_approved_by_admin = models.BooleanField(default=False)

    money_box_balance = models.DecimalField(
        max_digits=12, decimal_places=2, default=0.00
    )

    paystack_customer_code = models.CharField(max_length=50, blank=True, null=True)
    virtual_account_number = models.CharField(max_length=20, blank=True, null=True)
    virtual_bank_name = models.CharField(max_length=100, blank=True, null=True)

    ADMIN_LEVEL_CHOICES = [
        ("NONE", "Regular user"),
        ("WARD", "Ward admin"),
        ("LOCAL_GOVT", "Local government admin"),
        ("STATE", "State admin"),
        ("NATIONAL", "National admin"),
    ]

    admin_level = models.CharField(
        max_length=20, choices=ADMIN_LEVEL_CHOICES, default="NONE"
    )

    def save(self, *args, **kwargs):
        if not self.registration_number:
            prefix = self.first_name[:5] if self.first_name else "USER"
            unique_part = uuid.uuid4().hex[:6].upper()
            self.registration_number = f"{prefix}/{unique_part}"
        super().save(*args, **kwargs)

    def __str__(self):
        return self.username


class AdminChatMessage(models.Model):
    TEXT = "TEXT"
    CALL = "CALL"
    VIDEO = "VIDEO"
    CONFERENCE = "CONFERENCE"

    MESSAGE_TYPE_CHOICES = [
        (TEXT, "Text"),
        (CALL, "Call"),
        (VIDEO, "Video"),
        (CONFERENCE, "Conference"),
    ]

    SCOPE_CHOICES = [
        ("WARD", "Ward"),
        ("LOCAL_GOVT", "Local government"),
        ("STATE", "State"),
        ("NATIONAL", "National"),
    ]

    sender = models.ForeignKey(
        User, on_delete=models.CASCADE, related_name="sent_admin_messages"
    )
    recipient = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name="received_admin_messages",
        null=True,
        blank=True,
    )
    created_at = models.DateTimeField(auto_now_add=True)

    scope = models.CharField(max_length=20, choices=SCOPE_CHOICES, default="STATE")
    state = models.CharField(max_length=100, blank=True)
    local_govt = models.CharField(max_length=100, blank=True)
    ward = models.CharField(max_length=100, blank=True)

    message_type = models.CharField(
        max_length=20, choices=MESSAGE_TYPE_CHOICES, default=TEXT
    )
    content = models.TextField()

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.sender.username}: {self.content[:40]}"
