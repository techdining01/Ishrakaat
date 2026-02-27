from datetime import timedelta
import csv

from django.conf import settings
from django.db.models import Sum
from django.http import HttpResponse
from django.utils import timezone
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAdminUser
from rest_framework.response import Response

from .models import Transaction


def _inflow_outflow_by_date(user, days):
    now = timezone.now()
    start_date = now - timedelta(days=days)
    tx = Transaction.objects.filter(created_at__gte=start_date)
    if user.admin_level == "STATE":
        tx = tx.filter(user__state=user.state)
    elif user.admin_level == "LOCAL_GOVT":
        tx = tx.filter(user__state=user.state, user__local_govt=user.local_govt)
    elif user.admin_level == "WARD":
        tx = tx.filter(
            user__state=user.state,
            user__local_govt=user.local_govt,
            user__ward=user.ward,
        )
    by_date = (
        tx.values("created_at__date", "transaction_type")
        .order_by("created_at__date")
        .annotate(total=Sum("amount"))
    )
    labels = []
    inflow = []
    outflow = []
    seen = set()
    for row in by_date:
        date = row["created_at__date"].isoformat()
        if date not in seen:
            labels.append(date)
            seen.add(date)
            inflow.append(0)
            outflow.append(0)
    index_by_date = {d: i for i, d in enumerate(labels)}
    for row in by_date:
        date = row["created_at__date"].isoformat()
        idx = index_by_date[date]
        amount = float(row["total"])
        t_type = row["transaction_type"]
        if t_type in ["DEPOSIT", "DONATION"]:
            inflow[idx] += amount
        elif t_type == "WITHDRAWAL":
            outflow[idx] += amount
    return labels, inflow, outflow


@api_view(["GET"])
@permission_classes([IsAdminUser])
def inflow_outflow_stats(request):
    user = request.user
    days = int(request.query_params.get("days") or 30)
    labels, inflow, outflow = _inflow_outflow_by_date(user, days)
    return Response({"labels": labels, "inflow": inflow, "outflow": outflow})


@api_view(["GET"])
@permission_classes([IsAdminUser])
def inflow_outflow_csv(request):
    user = request.user
    days = int(request.query_params.get("days") or 30)
    labels, inflow, outflow = _inflow_outflow_by_date(user, days)
    app_name = getattr(settings, "APP_NAME", "Ishrakaat")
    filename = f"{app_name.lower().replace(' ', '_')}_daily_report.csv"
    response = HttpResponse(content_type="text/csv")
    response["Content-Disposition"] = f'attachment; filename="{filename}"'
    writer = csv.writer(response)
    writer.writerow([app_name, f"Last {days} days"])
    writer.writerow(["Date", "Inflow", "Outflow"])
    for idx, date in enumerate(labels):
        writer.writerow([date, inflow[idx], outflow[idx]])
    return response
