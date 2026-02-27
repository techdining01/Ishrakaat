from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from asgiref.sync import sync_to_async
from django.db.models import Sum

app = FastAPI(title="Ishrakaat API", description="FastAPI for high performance requests")

# Add CORS middleware to FastAPI
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # For development; match Django's CORS_ALLOW_ALL_ORIGINS
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/health")
def health_check():
    return {"status": "ok", "framework": "FastAPI"}

@app.get("/api/fast/stats")
async def get_stats():
    # Import inside function to avoid early loading issues if not ready
    from donations.models import DonationType, Transaction
    from users.models import User

    # Use sync_to_async for Django ORM calls - wrap in lambdas for safety
    campaign_count = await sync_to_async(lambda: DonationType.objects.filter(is_active=True).count())()
    user_count = await sync_to_async(lambda: User.objects.count())()
    
    # Aggregation
    total_donated = await sync_to_async(
        lambda: Transaction.objects.filter(transaction_type='DONATION').aggregate(Sum('amount'))['amount__sum'] or 0
    )()

    return {
        "active_campaigns": campaign_count,
        "total_users": user_count,
        "total_donated": float(total_donated),
        "message": "Served via FastAPI (Lightning Fast)"
    }
