from celery import shared_task
from .services import fetch_additional_references
import requests
from bs4 import BeautifulSoup
from decimal import Decimal
from django.conf import settings
from django.utils import timezone
from zakah.models import NisabData
import re
import time
import logging

logger = logging.getLogger(__name__)


@shared_task
def fetch_additional_references_task():
    fetch_additional_references()


def scrape_with_selenium():
    """Scrape dailynisab.org using Selenium for JavaScript-rendered content"""
    from selenium import webdriver
    from selenium.webdriver.chrome.options import Options
    from selenium.webdriver.common.by import By
    from selenium.webdriver.support.ui import WebDriverWait
    from selenium.webdriver.support import expected_conditions as EC
    from webdriver_manager.chrome import ChromeDriverManager
    from selenium.webdriver.chrome.service import Service
    
    gold_price_per_gram_ngn = None
    silver_price_per_gram_ngn = None
    gold_nisab_ngn = None
    silver_nisab_ngn = None
    
    # Setup Chrome options for headless browsing
    chrome_options = Options()
    chrome_options.add_argument("--headless")
    chrome_options.add_argument("--no-sandbox")
    chrome_options.add_argument("--disable-dev-shm-usage")
    chrome_options.add_argument("--disable-gpu")
    chrome_options.add_argument("--window-size=1920,1080")
    chrome_options.add_argument("--user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36")
    chrome_options.add_argument("--accept-lang=en-US,en;q=0.9")
    
    driver = None
    try:
        logger.info("Setting up Selenium WebDriver...")
        # Use webdriver_manager to automatically download and setup ChromeDriver
        try:
            service = Service(ChromeDriverManager().install())
        except Exception as e:
            logger.error(f"Failed to install ChromeDriver: {e}")
            return None
        
        driver = webdriver.Chrome(service=service, options=chrome_options)
        
        logger.info("Navigating to dailynisab.org...")
        driver.get("https://www.dailynisab.org/")
        
        # Wait for page to fully load
        time.sleep(5)
        
        # Wait for any dynamic content to load
        try:
            WebDriverWait(driver, 15).until(
                EC.presence_of_element_located((By.TAG_NAME, "body"))
            )
        except Exception as e:
            logger.warning(f"Timeout waiting for page: {e}")
        
        # Get the page source after JavaScript execution
        page_source = driver.page_source
        logger.debug(f"Page source length: {len(page_source)} characters")
        
        soup = BeautifulSoup(page_source, 'html.parser')
        text_content = soup.get_text()
        
        logger.debug(f"Text content length: {len(text_content)} characters")
        
        # Search for price patterns in the page
        # dailynisab.org typically displays prices like "₦12,500/g" or similar
        
        # Look for gold price patterns
        gold_patterns = [
            r'Gold[^0-9]*([0-9,]+)\s*/\s*g',
            r'gold[^0-9]*([0-9,]+)\s*/\s*g',
            r'₦\s*([0-9,]+)\s*/\s*g.*gold',
            r'Gold.*?₦\s*([0-9,]+)',
            r'gold\s*price.*?₦\s*([0-9,]+)',
            r'([0-9,]{4,})\s*/\s*g.*gold',
            r'Gold[^₦]*₦\s*([0-9,]+)',
        ]
        
        for pattern in gold_patterns:
            match = re.search(pattern, text_content, re.IGNORECASE)
            if match:
                gold_price_per_gram_ngn = float(match.group(1).replace(',', ''))
                logger.debug(f"Found gold price per gram: ₦{gold_price_per_gram_ngn}")
                break
        
        # Look for silver price patterns
        silver_patterns = [
            r'Silver[^0-9]*([0-9,]+)\s*/\s*g',
            r'silver[^0-9]*([0-9,]+)\s*/\s*g',
            r'₦\s*([0-9,]+)\s*/\s*g.*silver',
            r'Silver.*?₦\s*([0-9,]+)',
            r'silver\s*price.*?₦\s*([0-9,]+)',
            r'([0-9,]{3,})\s*/\s*g.*silver',
            r'Silver[^₦]*₦\s*([0-9,]+)',
        ]
        
        for pattern in silver_patterns:
            match = re.search(pattern, text_content, re.IGNORECASE)
            if match:
                silver_price_per_gram_ngn = float(match.group(1).replace(',', ''))
                logger.debug(f"Found silver price per gram: ₦{silver_price_per_gram_ngn}")
                break
        
        # Look for gold nisab value (85g)
        gold_nisab_patterns = [
            r'Gold\s*Nisab[^0-9]*([0-9,]+)',
            r'Nisab.*?Gold[^0-9]*([0-9,]+)',
            r'85g.*?([0-9,]+)',
            r'([0-9,]{5,}).*?85g',
            r'85.*?([0-9,]{5,})',
        ]
        
        for pattern in gold_nisab_patterns:
            match = re.search(pattern, text_content, re.IGNORECASE)
            if match:
                gold_nisab_ngn = float(match.group(1).replace(',', ''))
                logger.debug(f"Found gold nisab: ₦{gold_nisab_ngn}")
                break
        
        # Look for silver nisab value (595g)
        silver_nisab_patterns = [
            r'Silver\s*Nisab[^0-9]*([0-9,]+)',
            r'Nisab.*?Silver[^0-9]*([0-9,]+)',
            r'595g.*?([0-9,]+)',
            r'([0-9,]{5,}).*?595g',
            r'595.*?([0-9,]{5,})',
        ]
        
        for pattern in silver_nisab_patterns:
            match = re.search(pattern, text_content, re.IGNORECASE)
            if match:
                silver_nisab_ngn = float(match.group(1).replace(',', ''))
                logger.debug(f"Found silver nisab: ₦{silver_nisab_ngn}")
                break
        
        # Try to find all price-like numbers and identify the right ones
        all_prices = re.findall(r'₦\s*([0-9,]+)', text_content)
        logger.debug(f"All prices found: {all_prices[:10]}")
        
        return {
            'gold_price_per_gram': gold_price_per_gram_ngn,
            'silver_price_per_gram': silver_price_per_gram_ngn,
            'gold_nisab': gold_nisab_ngn,
            'silver_nisab': silver_nisab_ngn,
            'source': 'dailynisab.org (Selenium)'
        }
        
    except Exception as e:
        logger.error(f"Selenium error: {e}")
        return None
    finally:
        if driver:
            driver.quit()
            logger.debug("Selenium driver closed")


def scrape_with_bs4_fallback():
    """Fallback scraping with BS4 and better patterns"""
    headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
    }
    
    try:
        response = requests.get("https://www.dailynisab.org/", headers=headers, timeout=30)
        response.raise_for_status()
        
        soup = BeautifulSoup(response.content, 'html.parser')
        text_content = soup.get_text()
        
        logger.debug(f"BS4 Text content preview: {text_content[:500]}")
        
        # Extract prices using multiple patterns
        gold_price = None
        silver_price = None
        
        # Look for any ₦ followed by numbers
        prices = re.findall(r'₦\s*([0-9,]+)', text_content)
        logger.debug(f"Prices found: {prices}")
        
        # Usually gold price is higher than silver price
        # Filter for reasonable prices (gold should be > 5000, silver > 50)
        numeric_prices = [int(p.replace(',', '')) for p in prices]
        
        for price in numeric_prices:
            if price > 5000 and not gold_price:
                gold_price = float(price)
                logger.debug(f"Gold price (BS4): ₦{gold_price}")
            elif price > 50 and price < 5000 and not silver_price:
                silver_price = float(price)
                logger.debug(f"Silver price (BS4): ₦{silver_price}")
        
        # Calculate nisab values
        gold_nisab = gold_price * 85 if gold_price else None
        silver_nisab = silver_price * 595 if silver_price else None
        
        return {
            'gold_price_per_gram': gold_price,
            'silver_price_per_gram': silver_price,
            'gold_nisab': gold_nisab,
            'silver_nisab': silver_nisab,
            'source': 'dailynisab.org (BS4)'
        }
        
    except Exception as e:
        logger.warning(f"BS4 fallback error: {e}")
        return None


import logging
logger = logging.getLogger(__name__)


@shared_task
def scrape_daily_nisab_task():
    """Scrape daily nisab values using Selenium since BS4 can't handle JS-rendered content"""
    try:
        usd_ngn_rate = None
        
        # First, get the USD/NGN exchange rate
        try:
            rate_response = requests.get(
                "https://api.exchangerate-api.com/v4/latest/USD",
                timeout=10
            )
            if rate_response.status_code == 200:
                rate_data = rate_response.json()
                usd_ngn_rate = rate_data.get('rates', {}).get('NGN', 1500)
                logger.info(f"USD/NGN rate: {usd_ngn_rate}")
        except Exception as e:
            logger.warning(f"Failed to get exchange rate: {e}")
            usd_ngn_rate = 1500
        
        # Try Selenium first
        logger.info("Attempting to scrape with Selenium...")
        selenium_result = scrape_with_selenium()
        
        gold_price_per_gram_ngn = None
        silver_price_per_gram_ngn = None
        gold_nisab_ngn = None
        silver_nisab_ngn = None
        source_used = None
        
        if selenium_result and (selenium_result.get('gold_price_per_gram') or selenium_result.get('silver_price_per_gram')):
            gold_price_per_gram_ngn = selenium_result.get('gold_price_per_gram')
            silver_price_per_gram_ngn = selenium_result.get('silver_price_per_gram')
            gold_nisab_ngn = selenium_result.get('gold_nisab')
            silver_nisab_ngn = selenium_result.get('silver_nisab')
            source_used = selenium_result.get('source')
            logger.info("Selenium scraping successful!")
        else:
            # Fallback to BS4
            logger.info("Selenium didn't find prices, trying BS4 fallback...")
            bs4_result = scrape_with_bs4_fallback()
            
            if bs4_result and (bs4_result.get('gold_price_per_gram') or bs4_result.get('silver_price_per_gram')):
                gold_price_per_gram_ngn = bs4_result.get('gold_price_per_gram')
                silver_price_per_gram_ngn = bs4_result.get('silver_price_per_gram')
                gold_nisab_ngn = bs4_result.get('gold_nisab')
                silver_nisab_ngn = bs4_result.get('silver_nisab')
                source_used = bs4_result.get('source')
                logger.info("BS4 fallback successful!")
            else:
                # Ultimate fallback - use market prices
                logger.warning("Using fallback market prices...")
                gold_price_per_gram_usd = 78.50
                silver_price_per_gram_usd = 0.92
                
                gold_price_per_gram_ngn = gold_price_per_gram_usd * usd_ngn_rate
                silver_price_per_gram_ngn = silver_price_per_gram_usd * usd_ngn_rate
                
                gold_nisab_ngn = gold_price_per_gram_ngn * 85
                silver_nisab_ngn = silver_price_per_gram_ngn * 595
                source_used = "fallback_market_calculation"
        
        # Calculate nisab if not already set
        if gold_price_per_gram_ngn and not gold_nisab_ngn:
            gold_nisab_ngn = gold_price_per_gram_ngn * 85
        if silver_price_per_gram_ngn and not silver_nisab_ngn:
            silver_nisab_ngn = silver_price_per_gram_ngn * 595
        
        # Save to database
        nisab_data, created = NisabData.objects.update_or_create(
            currency='NGN',
            defaults={
                'gold_price_per_gram': gold_price_per_gram_ngn,
                'silver_price_per_gram': silver_price_per_gram_ngn,
                'gold_nisab_ngn': gold_nisab_ngn,
                'silver_nisab_ngn': silver_nisab_ngn,
                'usd_ngn_rate': usd_ngn_rate,
                'source': source_used,
                'last_updated': timezone.now()
            }
        )
        
        logger.info(f"Nisab saved: Gold/g=₦{gold_price_per_gram_ngn}, Silver/g=₦{silver_price_per_gram_ngn}")
        return f"Nisab updated: Gold=₦{gold_price_per_gram_ngn}/g, Silver=₦{silver_price_per_gram_ngn}/g"
        
    except Exception as e:
        logger.error(f"Error in scrape_daily_nisab_task: {e}")
        return f"Error scraping nisab: {str(e)}"
