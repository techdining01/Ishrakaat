from fastapi import FastAPI
from django.conf import settings
# Ensure Django is setup if running standalone (optional check)
# import os
# import django
# if not settings.configured:
#     os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
#     django.setup()

app = FastAPI(title="Ishrakaat API", description="FastAPI for high performance requests")

@app.get("/health")
def health_check():
    return {"status": "ok", "framework": "FastAPI"}
