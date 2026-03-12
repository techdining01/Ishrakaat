from celery import shared_task
from .services import fetch_additional_references
import requests
from bs4 import BeautifulSoup
from decimal import Decimal
from django.conf import settings
from zakah.models import NisabData


@shared_task
def fetch_additional_references_task():
    fetch_additional_references()

@shared_task
def scrape_daily_nisab_task():
    """Scrape daily nisab values and save to database"""
    try:
        # Try multiple sources for nisab data
        sources = [
            "https://www.dailynisab.com.ng/",
            "https://islamic-relief.org.uk/zakah-calculator/",
            "https://www.zakahcalculator.org/",
            "https://www.islamic-relief.com/gold-silver-nisab/"
        ]
        
        headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
        
        gold_price = None
        silver_price = None
        source_used = None
        
        for url in sources:
            try:
                print(f"Trying to scrape: {url}")
                response = requests.get(url, headers=headers, timeout=30)
                response.raise_for_status()
                
                soup = BeautifulSoup(response.content, 'html.parser')
                
                # Look for nisab values in different formats
                text_content = soup.get_text().lower()
                
                # Try to find gold price
                import re
                
                # Look for patterns like "gold: $60.50" or "gold price 60.50"
                gold_patterns = [
                    r'gold[^\d]*([\d,]+\.?\d*)',
                    r'gold[^\d]*\$\s*([\d,]+\.?\d*)',
                    r'nisab[^\d]*gold[^\d]*([\d,]+\.?\d*)',
                ]
                
                for pattern in gold_patterns:
                    match = re.search(pattern, text_content)
                    if match:
                        gold_price = float(match.group(1).replace(',', ''))
                        print(f"Found gold price: {gold_price}")
                        break
                
                # Look for silver price
                silver_patterns = [
                    r'silver[^\d]*([\d,]+\.?\d*)',
                    r'silver[^\d]*\$\s*([\d,]+\.?\d*)',
                    r'nisab[^\d]*silver[^\d]*([\d,]+\.?\d*)',
                ]
                
                for pattern in silver_patterns:
                    match = re.search(pattern, text_content)
                    if match:
                        silver_price = float(match.group(1).replace(',', ''))
                        print(f"Found silver price: {silver_price}")
                        break
                
                if gold_price and silver_price:
                    source_used = url
                    break
                    
            except Exception as e:
                print(f"Failed to scrape {url}: {e}")
                continue
        
        if gold_price and silver_price:
            # Save to database
            nisab_data, created = NisabData.objects.update_or_create(
                currency='NGN',
                defaults={
                    'gold_price_per_gram': gold_price,
                    'silver_price_per_gram': silver_price,
                    'source': source_used,
                    'last_updated': timezone.now()
                }
            )
            
            print(f"Nisab updated: Gold=${gold_price}, Silver=${silver_price} from {source_used}")
            return f"Nisab updated successfully: Gold=${gold_price}, Silver=${silver_price}"
        else:
            return "Could not extract nisab values from any source"
            
    except requests.RequestException as e:
        print(f"Request error scraping nisab: {e}")
        return f"Failed to scrape nisab: {str(e)}"
    except Exception as e:
        print(f"Error scraping nisab: {e}")
        return f"Error scraping nisab: {str(e)}"

