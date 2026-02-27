from django.urls import path
from rest_framework_simplejwt.views import TokenRefreshView
from .views import (
    RegisterView,
    ProfileView,
    AdminUserListView,
    AdminApproveUserView,
    AdminPromoteUserView,
    AdminChatListCreateView,
    ApprovedTokenObtainPairView,
)

urlpatterns = [
    path("register/", RegisterView.as_view()),
    path("token/", ApprovedTokenObtainPairView.as_view()),
    path("token/refresh/", TokenRefreshView.as_view()),
    path("me/", ProfileView.as_view()),
    path("admin/users/", AdminUserListView.as_view()),
    path("admin/users/<int:pk>/approve/", AdminApproveUserView.as_view()),
    path("admin/users/<int:pk>/promote/", AdminPromoteUserView.as_view()),
    path("admin/chat/messages/", AdminChatListCreateView.as_view()),
]
