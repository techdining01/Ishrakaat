from django.db import models


class ZakahNisab(models.Model):
    gold_price_usd = models.DecimalField(max_digits=10, decimal_places=2, help_text="Price per Ounce in USD")
    silver_price_usd = models.DecimalField(max_digits=10, decimal_places=2, help_text="Price per Ounce in USD")
    usd_ngn_rate = models.DecimalField(max_digits=10, decimal_places=2, help_text="Exchange rate USD to NGN")
    nisab_gold_ngn = models.DecimalField(max_digits=15, decimal_places=2)
    nisab_silver_ngn = models.DecimalField(max_digits=15, decimal_places=2)
    last_updated = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Nisab Rates (Updated: {self.last_updated.strftime('%Y-%m-%d %H:%M')})"


class ZakahReference(models.Model):
    key = models.CharField(max_length=64, unique=True)
    title = models.CharField(max_length=128)
    amount_ngn = models.DecimalField(max_digits=15, decimal_places=2)
    source_url = models.URLField(blank=True)
    last_updated = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.key}: {self.amount_ngn} NGN"


class DashboardIslamicCard(models.Model):
    title = models.CharField(max_length=128)
    arabic_title = models.CharField(max_length=128, blank=True)
    content = models.TextField()
    arabic_content = models.TextField(blank=True)
    icon_name = models.CharField(max_length=64, blank=True) # For frontend icons
    order = models.IntegerField(default=0)
    last_updated = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["order"]

    def __str__(self):
        return self.title
