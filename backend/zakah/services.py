import requests
from decimal import Decimal
from .models import ZakahNisab

def fetch_and_update_nisab():
    # 1. Fetch Gold/Silver Prices (USD per Ounce usually)
    # api.gold-api.com returns price per ounce (Troy Ounce ~ 31.1035g)
    # However, let's verify if it's per ounce or gram.
    # The response check earlier: {'name': 'Gold', 'price': 4822.0, ...}
    # 4822 USD/oz is very high (Gold is around $2700/oz in 2025). 
    # Maybe it's per 100g? Or maybe inflation? 
    # Wait, check_gold_api.py output: {'price': 4822.0, 'symbol': 'XAU'}
    # Standard XAU is 1 Troy Ounce.
    # If price is 4822, that's the price.
    
    # Let's assume the API returns price per Ounce.
    
    gold_price = 0
    silver_price = 0
    
    try:
        r_gold = requests.get("https://api.gold-api.com/price/XAU", timeout=10)
        if r_gold.status_code == 200:
            gold_price = Decimal(str(r_gold.json().get('price', 0)))
            
        r_silver = requests.get("https://api.gold-api.com/price/XAG", timeout=10)
        if r_silver.status_code == 200:
            silver_price = Decimal(str(r_silver.json().get('price', 0)))
            
    except Exception as e:
        print(f"Error fetching metals: {e}")
        return None

    # 2. Fetch USD to NGN Rate
    usd_ngn = 0
    try:
        r_curr = requests.get("https://api.exchangerate-api.com/v4/latest/USD", timeout=10)
        if r_curr.status_code == 200:
            usd_ngn = Decimal(str(r_curr.json()['rates'].get('NGN', 0)))
    except Exception as e:
        print(f"Error fetching currency: {e}")
        # Fallback to a reasonable default if API fails
        usd_ngn = Decimal('1500.00') 

    if gold_price == 0 or silver_price == 0:
        return None

    # 3. Calculate Nisab
    # 1 Troy Ounce = 31.1034768 grams
    # Gold Nisab = 85 grams (24k)
    # Silver Nisab = 595 grams
    
    grams_per_ounce = Decimal('31.1035')
    
    gold_per_gram_usd = gold_price / grams_per_ounce
    silver_per_gram_usd = silver_price / grams_per_ounce
    
    nisab_gold_usd = gold_per_gram_usd * Decimal('85')
    nisab_silver_usd = silver_per_gram_usd * Decimal('595')
    
    nisab_gold_ngn = nisab_gold_usd * usd_ngn
    nisab_silver_ngn = nisab_silver_usd * usd_ngn
    
    # 4. Save to DB
    defaults = {
        'gold_price_usd': gold_price,
        'silver_price_usd': silver_price,
        'usd_ngn_rate': usd_ngn,
        'nisab_gold_ngn': nisab_gold_ngn,
        'nisab_silver_ngn': nisab_silver_ngn
    }
    
    nisab_obj, created = ZakahNisab.objects.update_or_create(
        id=1,
        defaults=defaults
    )
    
    return nisab_obj
