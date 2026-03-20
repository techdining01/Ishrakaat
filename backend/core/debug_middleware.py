import traceback
from django.http import JsonResponse
from asgiref.sync import iscoroutinefunction, markcoroutinefunction

class GlobalDebugMiddleware:
    sync_capable = True
    async_capable = True

    def __init__(self, get_response):
        self.get_response = get_response
        if iscoroutinefunction(self.get_response):
            markcoroutinefunction(self)

    def _is_interesting(self, request):
        interesting_paths = ['/api/', '/zakah/', '/auth/', '/donations/', '/payments/']
        return any(path in request.path for path in interesting_paths)

    def __call__(self, request):
        if iscoroutinefunction(self.get_response):
            return self.__acall__(request)

        # Sync branch
        if not self._is_interesting(request):
            return self.get_response(request)

        print(f">>> [DEBUG REQUEST] {request.method} {request.path}")
        try:
            response = self.get_response(request)
            if response is not None and hasattr(response, 'status_code') and response.status_code >= 500:
                print(f">>> [DEBUG RESPONSE] {response.status_code} for {request.path}")
            return response
        except Exception as e:
            return self._handle_crash(request, e)

    async def __acall__(self, request):
        if not self._is_interesting(request):
            return await self.get_response(request)

        print(f">>> [DEBUG REQUEST] {request.method} {request.path}")
        try:
            response = await self.get_response(request)
            if response is not None and hasattr(response, 'status_code') and response.status_code >= 500:
                print(f">>> [DEBUG RESPONSE] {response.status_code} for {request.path}")
            return response
        except Exception as e:
            return self._handle_crash(request, e)

    def _handle_crash(self, request, e):
        print(f">>> [DEBUG CRASH] {request.path}: {e}")
        traceback.print_exc()
        return JsonResponse({
            "error": "GlobalDebugMiddleware caught a crash",
            "detail": str(e),
            "path": request.path,
            "traceback": traceback.format_exc()
        }, status=500)
