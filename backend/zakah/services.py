import requests
from bs4 import BeautifulSoup
from decimal import Decimal
from django.utils import timezone
from .models import ZakahNisab, ZakahReference, DashboardIslamicCard, NisabData


def fetch_and_update_nisab():
    """
    Fetches the current gold price and USD/NGN exchange rate to calculate Nisab.
    Uses multiple sources (Gold-API, Islamic Relief, ExchangeRate-API) for reliability.
    """
    try:
        # 1. Get USD/NGN Exchange Rate (Stable free API)
        usd_ngn_rate = Decimal("1600") # Default fallback
        try:
            rate_resp = requests.get("https://api.exchangerate-api.com/v4/latest/USD", timeout=10)
            if rate_resp.status_code == 200:
                rate_data = rate_resp.json()
                usd_ngn_rate = Decimal(str(rate_data.get("rates", {}).get("NGN", "1600")))
        except Exception as e:
            print(f"Exchange rate fetch failed: {e}")

        gold_price_usd_oz = Decimal("2000") # Default
        silver_price_usd_oz = Decimal("25")  # Default
        source_used = "Gold-API (Fallback Defaults)"

        # 2. Try Gold-API (Fast & usually stable)
        try:
            gold_resp = requests.get("https://api.gold-api.com/price/XAU", timeout=10)
            silver_resp = requests.get("https://api.gold-api.com/price/XAG", timeout=10)
            
            if gold_resp.status_code == 200:
                gold_price_usd_oz = Decimal(str(gold_resp.json().get("price", "2000")))
                source_used = "Gold-API"
            if silver_resp.status_code == 200:
                silver_price_usd_oz = Decimal(str(silver_resp.json().get("price", "25")))
        except Exception as e:
            print(f"Gold-API fetch failed: {e}")

        # 3. Try Scraper Fallback (Islamic Relief) if Gold-API fails significantly
        if gold_price_usd_oz == Decimal("2000"):
            ir_data = fetch_islamic_relief_nisab()
            if ir_data and ir_data.get('gold_price_per_gram_gbp'):
                # Convert GBP to USD (approx 1.25 rate if not fetched)
                gbp_usd = Decimal("1.25")
                gold_price_per_gram_usd = Decimal(str(ir_data['gold_price_per_gram_gbp'])) * gbp_usd
                gold_price_usd_oz = gold_price_per_gram_usd * Decimal("31.1035")
                
                if ir_data.get('silver_price_per_gram_gbp'):
                    silver_price_per_gram_usd = Decimal(str(ir_data['silver_price_per_gram_gbp'])) * gbp_usd
                    silver_price_usd_oz = silver_price_per_gram_usd * Decimal("31.1035")
                source_used = "Islamic Relief Scraper"

        # 4. Calculations
        # 1 Ounce = 31.1035 Grams
        gold_price_per_gram_usd = gold_price_usd_oz / Decimal("31.1035")
        gold_price_per_gram_ngn = gold_price_per_gram_usd * usd_ngn_rate
        
        # Nisab Gold = 85 grams of gold
        nisab_gold_ngn = gold_price_per_gram_ngn * Decimal("85")
        
        silver_price_per_gram_usd = silver_price_usd_oz / Decimal("31.1035")
        silver_price_per_gram_ngn = silver_price_per_gram_usd * usd_ngn_rate
        nisab_silver_ngn = silver_price_per_gram_ngn * Decimal("595")
        
        defaults = {
            "gold_price_usd": gold_price_usd_oz,
            "silver_price_usd": silver_price_usd_oz,
            "usd_ngn_rate": usd_ngn_rate,
            "nisab_gold_ngn": nisab_gold_ngn,
            "nisab_silver_ngn": nisab_silver_ngn,
        }
        
        nisab_obj, created = ZakahNisab.objects.update_or_create(id=1, defaults=defaults)
        
        # Save to NisabData for history
        NisabData.objects.create(
            currency="NGN",
            gold_price_per_gram=gold_price_per_gram_ngn,
            silver_price_per_gram=silver_price_per_gram_ngn,
            gold_nisab_ngn=nisab_gold_ngn,
            silver_nisab_ngn=nisab_silver_ngn,
            usd_ngn_rate=usd_ngn_rate,
            source=source_used,
            last_updated=timezone.now()
        )
        
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
    ZakahReference.objects.update_or_create(
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
    """Triggers a full refresh of Nisab and Islamic cards."""
    return fetch_and_update_nisab()


def fetch_islamic_relief_nisab():
    """
    Fetches nisab data from Islamic Relief Worldwide.
    Source: https://islamic-relief.org.uk/zakah-calculator/
    
    Islamic Relief provides comprehensive Zakat calculations including:
    - Gold and Silver nisab
    - Camel, Cow, Sheep calculations
    - Crop/Zakat al-Fitr calculations
    """
    try:
        # Fetch from Islamic Relief Zakat calculator page
        url = "https://islamic-relief.org.uk/zakah-calculator/"
        headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.5',
        }
        
        response = requests.get(url, headers=headers, timeout=30)
        response.raise_for_status()
        
        soup = BeautifulSoup(response.content, 'html.parser')
        text_content = soup.get_text()
        
        # Extract nisab values using regex patterns
        # Islamic Relief typically displays current nisab rates
        results = {
            'source': 'Islamic Relief Worldwide',
            'gold_nisab_gbp': None,
            'silver_nisab_gbp': None,
            'gold_price_per_gram_gbp': None,
            'silver_price_per_gram_gbp': None,
        }
        
        # Look for price patterns - Islamic Relief uses GBP
        # Pattern: £ or GBP followed by numbers
        import re
        
        # Find all monetary values
        gbp_prices = re.findall(r'£\s*([0-9,.]+)', text_content)
        
        # Filter for reasonable nisab values
        # Gold nisab (85g gold) typically around £3,000-5,000
        # Silver nisab (595g silver) typically around £300-500
        for price_str in gbp_prices:
            try:
                price = float(price_str.replace(',', ''))
                if 2000 <= price <= 8000 and not results.get('gold_nisab_gbp'):
                    results['gold_nisab_gbp'] = price
                elif 200 <= price <= 800 and not results.get('silver_nisab_gbp'):
                    results['silver_nisab_gbp'] = price
            except:
                continue
        
        # Calculate price per gram if we have nisab values
        if results.get('gold_nisab_gbp'):
            results['gold_price_per_gram_gbp'] = results['gold_nisab_gbp'] / 85
        if results.get('silver_nisab_gbp'):
            results['silver_price_per_gram_gbp'] = results['silver_nisab_gbp'] / 595
        
        return results
        
    except Exception as e:
        print(f"Error fetching from Islamic Relief: {e}")
        return None


def calculate_livestock_zakat(camel_count, cow_count, sheep_count):
    """
    Calculate Zakat on livestock (camel, cow, sheep) based on Islamic principles.
    Uses common Maliki/Shafi'i standards for Nisab and rates.
    """
    results = {
        'camel_zakat_desc': '',
        'cow_zakat_desc': '',
        'sheep_zakat_desc': '',
    }
    
    # Camel Zakat
    if camel_count < 5:
        results['camel_zakat_desc'] = "No Zakah on camels below 5."
    elif camel_count <= 9:
        results['camel_zakat_desc'] = "1 sheep."
    elif camel_count <= 14:
        results['camel_zakat_desc'] = "2 sheep."
    elif camel_count <= 19:
        results['camel_zakat_desc'] = "3 sheep."
    elif camel_count <= 24:
        results['camel_zakat_desc'] = "4 sheep."
    elif camel_count <= 35:
        results['camel_zakat_desc'] = "1 bint makhad (1-year female camel)."
    elif camel_count <= 45:
        results['camel_zakat_desc'] = "1 bint labun (2-year female camel)."
    elif camel_count <= 60:
        results['camel_zakat_desc'] = "1 hiqqah (3-year female camel)."
    elif camel_count <= 75:
        results['camel_zakat_desc'] = "1 jadha'ah (4-year female camel)."
    elif camel_count <= 90:
        results['camel_zakat_desc'] = "2 bint labun."
    elif camel_count <= 120:
        results['camel_zakat_desc'] = "2 hiqqah."
    else:
        # For Every 40 -> 1 bint labun, For Every 50 -> 1 hiqqah
        best_remainder = camel_count
        best_h = 0
        best_b = 0
        
        for h in range((camel_count // 50) + 1):
            remaining = camel_count - (h * 50)
            b = remaining // 40
            rem = remaining % 40
            
            if rem < best_remainder or (rem == best_remainder and (h + b) < (best_h + best_b)):
                best_remainder = rem
                best_h = h
                best_b = b
        
        parts = []
        if best_b > 0: parts.append(f"{best_b} bint labun")
        if best_h > 0: parts.append(f"{best_h} hiqqah")
        res_str = " and ".join(parts) if parts else "Consult detailed fiqh"
        if best_remainder > 0: res_str += f" (Remainder {best_remainder} ignored)"
        results['camel_zakat_desc'] = res_str

    # Cow Zakat
    if cow_count < 30:
        results['cow_zakat_desc'] = "No Zakah on cows below 30."
    else:
        # 30 -> 1 Tabi' (1yr), 40 -> 1 Musinnah (2yr)
        best_remainder = cow_count
        best_m = 0
        best_t = 0
        
        for m in range((cow_count // 40) + 1):
            remaining = cow_count - (m * 40)
            t = remaining // 30
            rem = remaining % 30
            
            if rem < best_remainder or (rem == best_remainder and (m + t) < (best_m + best_t)):
                best_remainder = rem
                best_m = m
                best_t = t
                
        parts = []
        if best_t > 0: parts.append(f"{best_t} tabi' (1-year female/male)")
        if best_m > 0: parts.append(f"{best_m} musinnah (2-year female)")
        res_str = " and ".join(parts) if parts else "Consult detailed fiqh"
        if best_remainder > 0: res_str += f" (Remainder {best_remainder} ignored)"
        results['cow_zakat_desc'] = res_str

    # Sheep Zakat
    if sheep_count < 40:
        results['sheep_zakat_desc'] = "No Zakah on sheep below 40."
    elif sheep_count <= 120:
        results['sheep_zakat_desc'] = "1 sheep."
    elif sheep_count <= 200:
        results['sheep_zakat_desc'] = "2 sheep."
    elif sheep_count <= 399:
        results['sheep_zakat_desc'] = "3 sheep."
    else:
        count = sheep_count // 100
        results['sheep_zakat_desc'] = f"{count} sheep (1 for every 100)."

    return results


def calculate_crop_zakat(harvest_amount_kg, irrigation_type='natural'):
    """
    Calculate Zakat on crops/fruits.
    
    irrigation_type: 'natural' (rain/watered by God) = 10%
                    'artificial' (irrigated/pump) = 5%
    
    Nisab for crops: 5 wasaq (approx 653 kg)
    - Below nisab: No Zakat due
    """
    NISAB_5_WASAQ_KG = 653  # Approximately 5 wasaq
    
    if harvest_amount_kg < NISAB_5_WASAQ_KG:
        return {
            'zakat_due': False,
            'harvest_kg': harvest_amount_kg,
            'zakat_kg': 0,
            'zakat_percentage': 0,
            'nisab_kg': NISAB_5_WASAQ_KG,
            'description': f'Below nisab ({NISAB_5_WASAQ_KG} kg). No Zakat due.'
        }
    
    if irrigation_type == 'natural':
        rate = 0.10  # 10%
    else:
        rate = 0.05  # 5%
    
    zakat_kg = harvest_amount_kg * rate
    
    return {
        'zakat_due': True,
        'harvest_kg': harvest_amount_kg,
        'zakat_kg': round(zakat_kg, 2),
        'zakat_percentage': int(rate * 100),
        'nisab_kg': NISAB_5_WASAQ_KG,
        'description': f'{irrigation_type.title()} irrigation: {int(rate*100)}% of {harvest_amount_kg}kg = {round(zakat_kg, 2)}kg'
    }

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
        
        hijri_date = "Unavailable"
        hijri_elem = soup.find(id="hijri-date")
        if hijri_elem:
            hijri_date = hijri_elem.get_text(strip=True)
            
        nigeria_hijri = "Not set"
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
        {"title": "Islamic Calendar", "arabic_title": "التقويم الهجري", "content": "Daily Hijri date updates automatically.", "arabic_content": "", "icon": "calendar", "order": 1},
        {"title": "Inheritance (Parents)", "arabic_title": "الأبوان", "content": "The Father (أب) and Mother (أم) are primary heirs in Islamic law.", "arabic_content": "أب | أم", "icon": "users", "order": 2},
        {"title": "Inheritance (Children)", "arabic_title": "الفروع", "content": "Sons (ابن) and Daughters (بنت) inherit based on fixed ratios.", "arabic_content": "ابن | بنت", "icon": "arrow-down", "order": 3},
        {"title": "Inheritance (Spouses)", "arabic_title": "الزوجان", "content": "The Husband (زوج) or Wife (زوجة) have reserved shares in the estate.", "arabic_content": "زوج | زوجة", "icon": "heart", "order": 4},
        {"title": "Inheritance (Grandparents)", "arabic_title": "الأجداد", "content": "Grandfathers and Grandmothers inherit if closer relatives are absent.", "arabic_content": "جد | جدة", "icon": "award", "order": 5},
        {"title": "Inheritance (Fara'id)", "arabic_title": "علم الفرائض", "content": "The Science of Inheritance ensures fair distribution for all heirs.", "arabic_content": "سورة النساء", "icon": "book", "order": 6},
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
