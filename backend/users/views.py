from rest_framework import generics, permissions, status
from rest_framework.views import APIView
from rest_framework.response import Response
from django.contrib.auth import get_user_model
from django.db.models import Q
from rest_framework_simplejwt.views import TokenObtainPairView
from rest_framework.exceptions import PermissionDenied
from rest_framework.parsers import JSONParser, MultiPartParser, FormParser
from .serializers import (
    RegisterSerializer,
    UserSerializer,
    ApprovedUserTokenObtainPairSerializer,
    AdminChatMessageSerializer,
)
from .models import AdminChatMessage

User = get_user_model()


class RegisterView(generics.CreateAPIView):
    serializer_class = RegisterSerializer
    permission_classes = [permissions.AllowAny]


class ApprovedTokenObtainPairView(TokenObtainPairView):
    serializer_class = ApprovedUserTokenObtainPairSerializer


class ProfileView(generics.RetrieveUpdateAPIView):
    serializer_class = UserSerializer
    permission_classes = [permissions.IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser, JSONParser]

    def get_object(self):
        return self.request.user


class AdminUserListView(generics.ListAPIView):
    serializer_class = UserSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        admin = self.request.user
        is_admin_level = getattr(admin, "admin_level", "NONE") != "NONE"
        if not (is_admin_level or admin.is_staff or admin.is_superuser):
            raise PermissionDenied("You are not an admin user.")
        qs = User.objects.all().order_by("id")
        if admin.admin_level == "NATIONAL":
            return qs
        if admin.admin_level == "STATE":
            return qs.filter(state=admin.state)
        if admin.admin_level == "LOCAL_GOVT":
            return qs.filter(state=admin.state, local_govt=admin.local_govt)
        if admin.admin_level == "WARD":
            return qs.filter(
                state=admin.state, local_govt=admin.local_govt, ward=admin.ward
            )
        return qs


class AdminApproveUserView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, pk):
        user = request.user
        is_admin_level = getattr(user, "admin_level", "NONE") != "NONE"
        if not (is_admin_level or user.is_staff or user.is_superuser):
            raise PermissionDenied("You are not an admin user.")
        try:
            user = User.objects.get(pk=pk)
        except User.DoesNotExist:
            return Response(
                {"error": "User not found"}, status=status.HTTP_404_NOT_FOUND
            )
        user.is_approved_by_admin = True
        user.save()
        return Response({"status": "approved"})


class AdminPromoteUserView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, pk):
        admin = request.user
        is_admin_level = getattr(admin, "admin_level", "NONE") != "NONE"
        if not (is_admin_level or admin.is_staff or admin.is_superuser):
            raise PermissionDenied("You are not an admin user.")
        level = request.data.get("level")
        valid_levels = ["WARD", "LOCAL_GOVT", "STATE", "NATIONAL"]
        if level not in valid_levels:
            return Response(
                {"error": "Invalid admin level."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if admin.admin_level not in ["STATE", "NATIONAL", "LOCAL_GOVT"]:
            return Response(
                {"error": "You do not have permission to promote admins."},
                status=status.HTTP_403_FORBIDDEN,
            )

        if admin.admin_level == "LOCAL_GOVT" and level != "WARD":
            return Response(
                {"error": "Local government admins can only promote ward admins."},
                status=status.HTTP_403_FORBIDDEN,
            )

        if admin.admin_level == "STATE" and level == "NATIONAL":
            return Response(
                {"error": "Only national admins can promote national admins."},
                status=status.HTTP_403_FORBIDDEN,
            )

        try:
            user = User.objects.get(pk=pk)
        except User.DoesNotExist:
            return Response(
                {"error": "User not found"}, status=status.HTTP_404_NOT_FOUND
            )

        filters = {"admin_level": level}

        if level == "WARD":
            if not user.state or not user.local_govt or not user.ward:
                return Response(
                    {
                        "error": "User must have state, local government and ward set before ward admin promotion."
                    },
                    status=status.HTTP_400_BAD_REQUEST,
                )
            filters.update(
                {
                    "state": user.state,
                    "local_govt": user.local_govt,
                    "ward": user.ward,
                }
            )
        elif level == "LOCAL_GOVT":
            if not user.state or not user.local_govt:
                return Response(
                    {
                        "error": "User must have state and local government set before local government admin promotion."
                    },
                    status=status.HTTP_400_BAD_REQUEST,
                )
            filters.update(
                {
                    "state": user.state,
                    "local_govt": user.local_govt,
                }
            )
        elif level == "STATE":
            if not user.state:
                return Response(
                    {"error": "User must have state set before state admin promotion."},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            filters.update({"state": user.state})

        if admin.admin_level == "STATE" and user.state != admin.state:
            return Response(
                {"error": "State admins can only promote users within their state."},
                status=status.HTTP_403_FORBIDDEN,
            )

        if admin.admin_level == "LOCAL_GOVT" and (
            user.state != admin.state or user.local_govt != admin.local_govt
        ):
            return Response(
                {
                    "error": "Local government admins can only promote users within their local government."
                },
                status=status.HTTP_403_FORBIDDEN,
            )

        if level != "NATIONAL":
            existing = User.objects.filter(**filters).exclude(pk=user.pk).first()
            if existing:
                return Response(
                    {
                        "error": "Another admin already exists for this locality at this level."
                    },
                    status=status.HTTP_400_BAD_REQUEST,
                )

        user.admin_level = level
        user.is_staff = True
        user.save()
        return Response({"status": "promoted", "admin_level": user.admin_level})


class AdminChatListCreateView(generics.ListCreateAPIView):
    serializer_class = AdminChatMessageSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        is_admin_level = getattr(user, "admin_level", "NONE") != "NONE"
        if not (is_admin_level or user.is_staff or user.is_superuser):
            raise PermissionDenied("You are not an admin user.")
        qs = AdminChatMessage.objects.filter(Q(sender=user) | Q(recipient=user))
        recipient_id = self.request.query_params.get("recipient")
        if recipient_id:
            qs = qs.filter(
                Q(sender=user, recipient_id=recipient_id)
                | Q(sender_id=recipient_id, recipient=user)
            )
        return qs

    def perform_create(self, serializer):
        user = self.request.user
        is_admin_level = getattr(user, "admin_level", "NONE") != "NONE"
        if not (is_admin_level or user.is_staff or user.is_superuser):
            raise PermissionDenied("You are not an admin user.")
        scope = user.admin_level if user.admin_level in ["STATE", "LOCAL_GOVT", "WARD", "NATIONAL"] else "STATE"
        serializer.save(
            sender=user,
            scope=scope,
            state=user.state,
            local_govt=user.local_govt,
            ward=user.ward,
        )
