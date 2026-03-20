import csv
import io
from django.http import HttpResponse
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAdminUser
from reportlab.lib.pagesizes import A4
from reportlab.lib import colors
from reportlab.lib.units import cm
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle

from .models import WaqfInterest, WelfareFamilyNeedDonation


def _pdf_response(filename):
    response = HttpResponse(content_type="application/pdf")
    response["Content-Disposition"] = f'attachment; filename="{filename}"'
    return response


def _build_pdf_table(buffer, title, headers, rows, accent_color):
    doc = SimpleDocTemplate(buffer, pagesize=A4,
                            leftMargin=1.5*cm, rightMargin=1.5*cm,
                            topMargin=2*cm, bottomMargin=2*cm)
    styles = getSampleStyleSheet()
    elements = []

    title_style = ParagraphStyle("title", parent=styles["Heading1"],
                                 textColor=accent_color, spaceAfter=10)
    elements.append(Paragraph(title, title_style))
    elements.append(Spacer(1, 0.4*cm))

    table_data = [headers] + rows
    col_count = len(headers)
    col_width = (A4[0] - 3*cm) / col_count

    t = Table(table_data, colWidths=[col_width] * col_count, repeatRows=1)
    t.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), accent_color),
        ("TEXTCOLOR",  (0, 0), (-1, 0), colors.white),
        ("FONTNAME",   (0, 0), (-1, 0), "Helvetica-Bold"),
        ("FONTSIZE",   (0, 0), (-1, -1), 8),
        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor("#F8FAFC")]),
        ("GRID",       (0, 0), (-1, -1), 0.5, colors.HexColor("#E2E8F0")),
        ("PADDING",    (0, 0), (-1, -1), 6),
        ("VALIGN",     (0, 0), (-1, -1), "MIDDLE"),
    ]))
    elements.append(t)
    doc.build(elements)


# ─── Waqf CSV ────────────────────────────────────────────────────────────────

@api_view(["GET"])
@permission_classes([IsAdminUser])
def export_waqf_csv(request):
    response = HttpResponse(content_type="text/csv")
    response["Content-Disposition"] = 'attachment; filename="waqf_interests.csv"'
    writer = csv.writer(response)
    writer.writerow(["ID", "User", "Email", "Category", "Project Type",
                     "Method", "On Behalf Of", "Date", "Status", "Admin Notes", "Created At"])
    for item in WaqfInterest.objects.all().order_by("-created_at"):
        writer.writerow([
            item.id,
            item.user.username if item.user else item.guest_name,
            item.user.email if item.user else item.guest_email,
            item.waqf_category,
            item.project_type,
            item.contribution_method,
            item.on_behalf_of or "",
            item.preferred_date or "",
            item.status,
            item.admin_notes or "",
            item.created_at.strftime("%Y-%m-%d %H:%M"),
        ])
    return response


# ─── Waqf PDF ────────────────────────────────────────────────────────────────

@api_view(["GET"])
@permission_classes([IsAdminUser])
def export_waqf_pdf(request):
    buffer = io.BytesIO()
    headers = ["#", "Submitter", "Category", "Project", "Method", "Status", "Date"]
    rows = []
    for item in WaqfInterest.objects.all().order_by("-created_at"):
        rows.append([
            str(item.id),
            item.user.username if item.user else item.guest_name,
            item.waqf_category,
            item.project_type,
            item.contribution_method,
            item.status,
            item.created_at.strftime("%Y-%m-%d"),
        ])
    _build_pdf_table(buffer, "Waqf Interest Report", headers, rows,
                     colors.HexColor("#10B981"))
    response = HttpResponse(buffer.getvalue(), content_type="application/pdf")
    response["Content-Disposition"] = 'attachment; filename="waqf_report.pdf"'
    return response


# ─── Welfare CSV ──────────────────────────────────────────────────────────────

@api_view(["GET"])
@permission_classes([IsAdminUser])
def export_welfare_csv(request):
    response = HttpResponse(content_type="text/csv")
    response["Content-Disposition"] = 'attachment; filename="welfare_tracking.csv"'
    writer = csv.writer(response)
    writer.writerow(["ID", "User", "Email", "Purpose", "Amount",
                     "Status", "Admin Notes", "Created At"])
    for item in WelfareFamilyNeedDonation.objects.all().order_by("-created_at"):
        writer.writerow([
            item.id,
            item.user.username,
            item.user.email,
            item.purpose,
            item.amount,
            item.status,
            item.admin_notes or "",
            item.created_at.strftime("%Y-%m-%d %H:%M"),
        ])
    return response


# ─── Welfare PDF ──────────────────────────────────────────────────────────────

@api_view(["GET"])
@permission_classes([IsAdminUser])
def export_welfare_pdf(request):
    buffer = io.BytesIO()
    headers = ["#", "Beneficiary", "Purpose", "Amount (₦)", "Status", "Date"]
    rows = []
    for item in WelfareFamilyNeedDonation.objects.all().order_by("-created_at"):
        rows.append([
            str(item.id),
            item.user.username,
            item.purpose,
            f"{item.amount:,.0f}",
            item.status,
            item.created_at.strftime("%Y-%m-%d"),
        ])
    _build_pdf_table(buffer, "Welfare Disbursement Report", headers, rows,
                     colors.HexColor("#84CC16"))
    response = HttpResponse(buffer.getvalue(), content_type="application/pdf")
    response["Content-Disposition"] = 'attachment; filename="welfare_report.pdf"'
    return response
