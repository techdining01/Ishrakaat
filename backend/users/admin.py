from django.contrib import admin
from django.contrib.auth import get_user_model
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from .models import AdminChatMessage

User = get_user_model()


@admin.register(User)
class UserAdmin(BaseUserAdmin):
    list_display = (
        "id",
        "username",
        "email",
        "is_approved_by_admin",
        "admin_level",
        "country",
        "state",
        "local_govt",
        "ward",
        "money_box_balance",
    )
    list_display_links = ("id", "username")
    list_filter = (
        "is_approved_by_admin",
        "admin_level",
        "country",
        "state",
        "is_staff",
        "is_superuser",
        "is_active",
    )
    search_fields = ("username", "email", "registration_number")
    list_editable = (
        "email",
        "is_approved_by_admin",
        "admin_level",
        "country",
        "state",
        "local_govt",
        "ward",
        "money_box_balance",
    )
    ordering = ("-date_joined",)

    fieldsets = BaseUserAdmin.fieldsets + (
        (
            "Ishrakaat details",
            {
                "fields": (
                    "country",
                    "state",
                    "local_govt",
                    "ward",
                    "admin_level",
                    "is_approved_by_admin",
                    "registration_number",
                    "money_box_balance",
                    "paystack_customer_code",
                    "virtual_account_number",
                    "virtual_bank_name",
                )
            },
        ),
    )


@admin.register(AdminChatMessage)
class AdminChatMessageAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "sender",
        "scope",
        "state",
        "local_govt",
        "ward",
        "message_type",
        "created_at",
    )
    list_filter = ("scope", "message_type", "state", "local_govt")
