from django.http import JsonResponse
from django.utils.deprecation import MiddlewareMixin
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.exceptions import InvalidToken
import jwt
from rest_framework_simplejwt.settings import api_settings
from django.contrib.auth import get_user_model

User = get_user_model()

class JWTRefreshMiddleware(MiddlewareMixin):
    """
    Middleware to automatically refresh JWT tokens and handle authentication gracefully
    """
    
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        # Skip for non-API requests or auth endpoints
        if not request.path.startswith('/api/') or '/auth/' in request.path:
            return self.get_response(request)
            
        print(f">>> JWTRefreshMiddleware: checking path {request.path}")
            
        # Get the token from Authorization header
        auth_header = request.META.get('HTTP_AUTHORIZATION', '')
        if not auth_header.startswith('Bearer '):
            return self.get_response(request)
            
        token = auth_header.split(' ')[1]
        
        try:
            # Check if token is expired and refresh if needed
            payload = jwt.decode(token, api_settings.SIGNING_KEY, algorithms=[api_settings.ALGORITHM])
            
            # If token will expire in less than 1 hour, try to refresh
            import time
            if payload['exp'] - time.time() < 3600:
                user = User.objects.get(id=payload['user_id'])
                refresh = RefreshToken.for_user(user)
                new_access = str(refresh.access_token)
                
                response = self.get_response(request)
                response['X-New-Access-Token'] = new_access
                return response
                
        except (jwt.ExpiredSignatureError, jwt.InvalidTokenError, InvalidToken):
            # Token is invalid, let the frontend handle it
            pass
        except Exception:
            # Any other error, continue normally
            pass
            
        return self.get_response(request)
