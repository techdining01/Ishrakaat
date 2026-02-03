from django.urls import path
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView
from .views import RegisterView, ProfileView, AdminUserListView, AdminApproveUserView

urlpatterns = [
    path('register/', RegisterView.as_view()),
    path('token/', TokenObtainPairView.as_view()),
    path('token/refresh/', TokenRefreshView.as_view()),
    path('me/', ProfileView.as_view()),
    path('admin/users/', AdminUserListView.as_view()),
    path('admin/users/<int:pk>/approve/', AdminApproveUserView.as_view()),
]
