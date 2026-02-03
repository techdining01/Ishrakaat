from django.contrib import admin
from .models import DonationType, UserDonationSettings, Transaction

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
