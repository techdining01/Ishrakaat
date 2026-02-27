from django.contrib.auth import get_user_model
from rest_framework import serializers
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from .models import AdminChatMessage

User = get_user_model()


class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = [
            "id",
            "profile_pic",
            "profile_picture",
            "username",
            "email",
            "first_name",
            "last_name",
            "country",
            "state",
            "local_govt",
            "ward",
            "registration_number",
            "is_approved_by_admin",
            "money_box_balance",
            "virtual_account_number",
            "virtual_bank_name",
            "is_staff",
            "admin_level",
        ]
        read_only_fields = [
            "id",
            "registration_number",
            "is_approved_by_admin",
            "is_staff",
            "money_box_balance",
            "virtual_account_number",
            "virtual_bank_name",
            "admin_level",
        ]


class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True)

    class Meta:
        model = User
        fields = [
            "id",
            "username",
            "email",
            "password",
            "first_name",
            "last_name",
            "country",
            "state",
            "local_govt",
            "ward",
        ]
        read_only_fields = ["id"]

    def create(self, validated_data):
        password = validated_data.pop("password")
        user = User.objects.create_user(**validated_data)
        user.set_password(password)
        user.save()
        return user


class ApprovedUserTokenObtainPairSerializer(TokenObtainPairSerializer):
    def validate(self, attrs):
        data = super().validate(attrs)
        if not (
            self.user.is_superuser
            or self.user.is_staff
            or self.user.is_approved_by_admin
        ):
            raise serializers.ValidationError("Account not yet approved by admin.")
        return data


class AdminChatMessageSerializer(serializers.ModelSerializer):
    sender_name = serializers.CharField(source="sender.username", read_only=True)
    recipient_id = serializers.IntegerField(
        write_only=True, required=False, allow_null=True
    )
    recipient_name = serializers.CharField(
        source="recipient.username", read_only=True, allow_null=True
    )

    class Meta:
        model = AdminChatMessage
        fields = [
            "id",
            "sender_name",
            "recipient_id",
            "recipient_name",
            "scope",
            "state",
            "local_govt",
            "ward",
            "message_type",
            "content",
            "created_at",
        ]
        read_only_fields = [
            "id",
            "sender_name",
            "recipient_name",
            "scope",
            "state",
            "local_govt",
            "ward",
            "created_at",
        ]

    def create(self, validated_data):
        recipient_id = validated_data.pop("recipient_id", None)
        if recipient_id:
            try:
                validated_data["recipient"] = User.objects.get(pk=recipient_id)
            except User.DoesNotExist:
                raise serializers.ValidationError({"recipient_id": "Recipient not found"})
        return super().create(validated_data)
