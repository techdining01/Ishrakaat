import os
from django.core.asgi import get_asgi_application

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')

# Initialize Django ASGI application early to ensure AppRegistry is populated
django_app = get_asgi_application()

# Import FastAPI app after Django setup
from api.main import app as fastapi_app

async def application(scope, receive, send):
    if scope['type'] == 'http':
        path = scope['path']
        # Route /api, /docs, /openapi.json to FastAPI
        # Note: You might want to mount FastAPI at /api in its own definition to handle stripping prefix if needed.
        # But for now, let's assume FastAPI handles these paths.
        if path.startswith('/api') or path.startswith('/docs') or path.startswith('/openapi.json'):
            await fastapi_app(scope, receive, send)
            return
    
    # Fallback to Django for Admin, Auth, and other paths
    await django_app(scope, receive, send)
