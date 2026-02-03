from django.contrib import admin
from django.contrib.auth import get_user_model

User = get_user_model()

@admin.register(User)
class UserAdmin(admin.ModelAdmin):
    list_display = ('id', 'username', 'email', 'is_approved_by_admin', 'country', 'state', 'local_govt', 'ward', 'money_box_balance')
    list_filter = ('is_approved_by_admin', 'country', 'state')
    search_fields = ('username', 'email', 'registration_number')
