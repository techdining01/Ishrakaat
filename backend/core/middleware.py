from django.http import JsonResponse
from django.utils.deprecation import MiddlewareMixin
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.exceptions import InvalidToken
import jwt
from rest_framework_simplejwt.settings import api_settings
from django.contrib.auth import get_user_model
from asgiref.sync import iscoroutinefunction, markcoroutinefunction

User = get_user_model()

class JWTRefreshMiddleware:
    """
    Middleware to automatically refresh JWT tokens and handle authentication gracefully
    """
    sync_capable = True
    async_capable = True
    
    def __init__(self, get_response):
        self.get_response = get_response
        if iscoroutinefunction(self.get_response):
            markcoroutinefunction(self)

    def _should_skip(self, request):
        return not request.path.startswith('/api/') or '/auth/' in request.path

    def _process_token(self, request, response):
        if response is None:
            return response
            
        auth_header = request.META.get('HTTP_AUTHORIZATION', '')
        if not auth_header.startswith('Bearer '):
            return response
            
        token = auth_header.split(' ')[1]
        try:
            payload = jwt.decode(token, api_settings.SIGNING_KEY, algorithms=[api_settings.ALGORITHM])
            import time
            if payload['exp'] - time.time() < 3600:
                user = User.objects.get(id=payload['user_id'])
                refresh = RefreshToken.for_user(user)
                response['X-New-Access-Token'] = str(refresh.access_token)
        except Exception:
            pass
        return response

    def __call__(self, request):
        if iscoroutinefunction(self.get_response):
            return self.__acall__(request)
        
        # Sync branch
        if self._should_skip(request):
            return self.get_response(request)
            
        response = self.get_response(request)
        return self._process_token(request, response)

    async def __acall__(self, request):
        if self._should_skip(request):
            return await self.get_response(request)
            
        response = await self.get_response(request)
        return self._process_token(request, response)
