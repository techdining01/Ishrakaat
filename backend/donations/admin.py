from django.contrib import admin
from .models import DonationType, UserDonationSettings, Transaction, WaqfInterest

@admin.register(WaqfInterest)
class WaqfInterestAdmin(admin.ModelAdmin):
    list_display = ("get_name", "waqf_category", "project_type", "on_behalf_of", "contribution_method", "preferred_date", "created_at")
    list_filter = ("waqf_category", "contribution_method", "created_at")
    search_fields = ("user__username", "guest_name", "guest_email", "project_type", "on_behalf_of")

    def get_name(self, obj):
        return obj.user.username if obj.user else obj.guest_name
    get_name.short_description = "User/Guest"

@admin.register(DonationType)
class DonationTypeAdmin(admin.ModelAdmin):
    list_display = ('name', 'is_mandatory', 'is_active', 'deadline', 'target_amount')
    list_filter = ('is_active', 'is_mandatory')
    search_fields = ('name',)

@admin.register(UserDonationSettings)
class UserDonationSettingsAdmin(admin.ModelAdmin):
    list_display = ('user', 'monthly_amount')
    search_fields = ('user__username', 'user__email')

@admin.register(Transaction)
class TransactionAdmin(admin.ModelAdmin):
    list_display = ('user', 'transaction_type', 'amount', 'created_at', 'description')
    list_filter = ('transaction_type', 'created_at')
    search_fields = ('user__username', 'description')
