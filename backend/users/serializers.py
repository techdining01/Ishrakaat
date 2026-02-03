from django.contrib.auth import get_user_model
from rest_framework import serializers

User = get_user_model()

class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = [
            'id',
            'username',
            'email',
            'first_name',
            'last_name',
            'country',
            'state',
            'local_govt',
            'ward',
            'registration_number',
            'is_approved_by_admin',
            'money_box_balance',
            'virtual_account_number',
            'virtual_bank_name',
            'is_staff',
        ]
        read_only_fields = ['id', 'registration_number', 'is_approved_by_admin', 'is_staff', 'money_box_balance', 'virtual_account_number', 'virtual_bank_name']

class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True)

    class Meta:
        model = User
        fields = [
            'username',
            'email',
            'password',
            'first_name',
            'last_name',
            'country',
            'state',
            'local_govt',
            'ward',
        ]

    def create(self, validated_data):
        password = validated_data.pop('password')
        user = User.objects.create_user(**validated_data)
        user.set_password(password)
        user.save()
        return user
