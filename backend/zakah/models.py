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
