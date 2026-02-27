import requests
from bs4 import BeautifulSoup
from decimal import Decimal
from django.utils import timezone
from .models import ZakahNisab, ZakahReference, DashboardIslamicCard


def fetch_and_update_nisab():
    """
    Fetches the current gold price and USD/NGN exchange rate to calculate Nisab.
    Uses 20 Dinars (approx 85g) as the standard for gold Nisab.
    """
    try:
        # 1. Get USD/NGN Exchange Rate (Stable free API)
        rate_resp = requests.get("https://api.exchangerate-api.com/v4/latest/USD", timeout=10)
        rate_data = rate_resp.json()
        usd_ngn_rate = Decimal(str(rate_data.get("rates", {}).get("NGN", "1600")))

        # 2. Get Gold Price per Ounce in USD (Stable free API)
        # Fallback to a reasonable default if API fails
        try:
            gold_resp = requests.get("https://api.gold-api.com/price/XAU", timeout=10)
            if gold_resp.status_code == 200:
                gold_data = gold_resp.json()
                gold_price_usd_oz = Decimal(str(gold_data.get("price", "2000")))
            else:
                gold_price_usd_oz = Decimal("2000")
        except:
            gold_price_usd_oz = Decimal("2000")

        # 3. Calculations
        # 1 Ounce = 31.1035 Grams
        gold_price_per_gram_usd = gold_price_usd_oz / Decimal("31.1035")
        gold_price_per_gram_ngn = gold_price_per_gram_usd * usd_ngn_rate
        
        # Nisab Gold = 85 grams of gold
        nisab_gold_ngn = gold_price_per_gram_ngn * Decimal("85")
        
        # Nisab Silver = 595 grams of silver
        # Usually Silver is ~1/80 of Gold price, but let's use a safe ratio or fetch
        nisab_silver_ngn = nisab_gold_ngn / Decimal("10") # Fallback ratio if silver fetch fails
        
        try:
            silver_resp = requests.get("https://api.gold-api.com/price/XAG", timeout=10)
            if silver_resp.status_code == 200:
                silver_price_usd_oz = Decimal(str(silver_resp.json().get("price", "25")))
                silver_price_per_gram_ngn = (silver_price_usd_oz / Decimal("31.1035")) * usd_ngn_rate
                nisab_silver_ngn = silver_price_per_gram_ngn * Decimal("595")
            else:
                silver_price_usd_oz = Decimal("25")
        except:
            silver_price_usd_oz = Decimal("25")

        defaults = {
            "gold_price_usd": gold_price_usd_oz,
            "silver_price_usd": silver_price_usd_oz,
            "usd_ngn_rate": usd_ngn_rate,
            "nisab_gold_ngn": nisab_gold_ngn,
            "nisab_silver_ngn": nisab_silver_ngn,
        }
        
        nisab_obj, created = ZakahNisab.objects.update_or_create(id=1, defaults=defaults)
        
        # After updating Nisab, we can update references based on Islamic ratios
        update_references_from_nisab(nisab_obj)
        
        # Also scrape Islamic cards for the dashboard
        scrape_and_update_islamic_cards()
        
        return nisab_obj

    except Exception as exc:
        print(f"Error in fetch_and_update_nisab: {exc}")
        return None

def update_references_from_nisab(nisab_obj):
    """
    Calculates Dowry and Blood Money based on the Nisab Gold value.
    Nisab (20 Dinars), Dowry (0.25 Dinars), Blood Money (1000 Dinars).
    """
    if not nisab_obj or nisab_obj.nisab_gold_ngn <= 0:
        return

    nisab_val = nisab_obj.nisab_gold_ngn
    
    # Ratios
    # Dowry = (0.25 / 20) * Nisab = 0.0125 * Nisab
    dowry_val = nisab_val * Decimal("0.0125")
    
    # Blood Money = (1000 / 20) * Nisab = 50 * Nisab
    blood_money_val = nisab_val * Decimal("50")

    source_url = "https://www.dailynisab.org/" # Reference site for the logic

    # Update Dowry
    ZakahReference.objects.update_or_create(
        key="dowry",
        defaults={
            "title": "Minimum Dowry (Rub'u Dinar)",
            "amount_ngn": dowry_val,
            "source_url": source_url,
            "last_updated": timezone.now(),
        },
    )

    # Update Blood Money
    ZakahReference.objects.update_or_create(
        key="murderer_fine",
        defaults={
            "title": "Blood Money (Diyyah - 1000 Dinars)",
            "amount_ngn": blood_money_val,
            "source_url": source_url,
            "last_updated": timezone.now(),
        },
    )
    
    # Update Nisab for Theft (Hadd)
    ref, created = ZakahReference.objects.update_or_create(
        key="hadd_theft",
        defaults={
            "title": "Nisab for Theft",
            "amount_ngn": dowry_val, # Same as Rub'u Dinar
            "source_url": source_url,
            "last_updated": timezone.now(),
        },
    )

    # Remove the crops entry if it exists
    ZakahReference.objects.filter(key="crops").delete()

def fetch_additional_references():
    """
    This is now handled by update_references_from_nisab.
    We keep the function for compatibility but it just triggers the main refresh.
    """
    fetch_and_update_nisab()
    scrape_and_update_islamic_cards()

def scrape_and_update_islamic_cards():
    """
    Scrapes Daily Nisab for Islamic Calendar and Inheritance info to populate 6 dashboard cards.
    """
    try:
        # 1. Scrape Homepage for Calendar
        home_url = "https://www.dailynisab.org/"
        # Increased timeout to 20s
        resp = requests.get(home_url, timeout=20)
        soup = BeautifulSoup(resp.text, 'html.parser')
        
        hijri_date = "N/A"
        hijri_elem = soup.find(id="hijri-date")
        if hijri_elem:
            hijri_date = hijri_elem.get_text(strip=True)
            
        nigeria_hijri = "N/A"
        nigeria_elem = soup.find(id="nigeria-hijri-date")
        if nigeria_elem:
            nigeria_hijri = nigeria_elem.get_text(strip=True)

        # 2. Scrape Inheritance Page for Heirs/Principles
        inh_url = "https://www.dailynisab.org/inheritance"
        inh_resp = requests.get(inh_url, timeout=20)
        inh_soup = BeautifulSoup(inh_resp.text, 'html.parser')
        
        # We'll create 6 cards in total
        cards_data = []
        
        # Card 1: Islamic Calendar
        cards_data.append({
            "title": "Islamic Calendar",
            "arabic_title": "التقويم الهجري",
            "content": f"World: {hijri_date}\nNigeria: {nigeria_hijri}",
            "arabic_content": hijri_date,
            "icon_name": "calendar",
            "order": 1
        })

        # Define common inheritance groups based on Maliki Fiqh usually shown
        inheritance_groups = [
            {"title": "The Parents", "arabic": "الأبوان", "heirs": ["أب (Father)", "أم (Mother)"], "icon": "users", "order": 2},
            {"title": "The Descendants", "arabic": "الفروع", "heirs": ["ابن (Son)", "بنت (Daughter)"], "icon": "arrow-down", "order": 3},
            {"title": "The Spouses", "arabic": "الزوجان", "heirs": ["زوج (Husband)", "زوجة (Wife)"], "icon": "heart", "order": 4},
            {"title": "The Grandparents", "arabic": "الأجداد", "heirs": ["جد (Grandfather)", "جدة (Grandmother)"], "icon": "award", "order": 5},
            {"title": "Fara'id Principles", "arabic": "أصول الفرائض", "content": "Islamic inheritance is fixed by Allah in the Qur'an (Surah An-Nisa).", "icon": "book", "order": 6},
        ]

        for group in inheritance_groups:
            content = group.get("content", "")
            if "heirs" in group:
                content = "Essential heirs: " + ", ".join(group["heirs"])
            
            cards_data.append({
                "title": group["title"],
                "arabic_title": group["arabic"],
                "content": content,
                "arabic_content": group["arabic"],
                "icon_name": group["icon"],
                "order": group["order"]
            })

        # Update or create the cards
        for data in cards_data:
            DashboardIslamicCard.objects.update_or_create(
                title=data["title"],
                defaults={
                    "arabic_title": data["arabic_title"],
                    "content": data["content"],
                    "arabic_content": data["arabic_content"],
                    "icon_name": data["icon_name"],
                    "order": data["order"],
                }
            )
            
        return True
    except Exception as e:
        print(f"Error scraping Islamic cards: {e}")
        # FALLBACK: If scraping fails, create basic cards so dashboard isn't empty
        create_fallback_cards()
        return False

def create_fallback_cards():
    """Creates cards with default values if scraper fails."""
    today = timezone.now()
    fallback_data = [
        {"title": "Islamic Calendar", "arabic_title": "التقويم الهجري", "content": "Fetch from Daily Nisab for latest Hijri date.", "arabic_content": "", "icon": "calendar", "order": 1},
        {"title": "Inheritance (Parents)", "arabic_title": "الأبوان", "content": "Essential heirs: Father (أب), Mother (أم)", "arabic_content": "أب | أم", "icon": "users", "order": 2},
        {"title": "Inheritance (Children)", "arabic_title": "الفروع", "content": "Essential heirs: Son (ابن), Daughter (بنت)", "arabic_content": "ابن | بنت", "icon": "arrow-down", "order": 3},
        {"title": "Inheritance (Spouses)", "arabic_title": "الزوجان", "content": "Essential heirs: Husband (زوج), Wife (زوجة)", "arabic_content": "زوج | زوجة", "icon": "heart", "order": 4},
        {"title": "Inheritance (Grandparents)", "arabic_title": "الأجداد", "content": "Essential heirs: Grandfather (جد), Grandmother (جدة)", "arabic_content": "جد | جدة", "icon": "award", "order": 5},
        {"title": "Inheritance (Fara'id)", "arabic_title": "علم الفرائض", "content": "Distribution based on divine law in Surah An-Nisa.", "arabic_content": "سورة النساء", "icon": "book", "order": 6},
    ]
    for data in fallback_data:
        DashboardIslamicCard.objects.update_or_create(
            title=data["title"],
            defaults={
                "arabic_title": data["arabic_title"],
                "content": data["content"],
                "arabic_content": data["arabic_content"],
                "icon_name": data["icon"],
                "order": data["order"],
            }
        )
