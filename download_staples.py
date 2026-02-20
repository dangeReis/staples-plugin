import json
import os
import time
from pathlib import Path
from curl_cffi import requests
from playwright.sync_api import sync_playwright

# --- Configuration ---
STATE_FILE = "staples_auth_state.json"
CACHE_DIR = Path(".staples_cache")
OUTPUT_FILE = "staples_orders_extract.json"
DELAY_BETWEEN_REQUESTS = 1.0  # Seconds to wait between API calls to avoid rate limits

def get_auth_cookies():
    """
    Checks if we have valid saved cookies. If not, opens a headful Playwright browser,
    lets the user log in manually, captures the state, and returns the cookies.
    """
    has_state = os.path.exists(STATE_FILE)
    
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=False)
        
        # Load existing state if we have it
        context_args = {
            "user_agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            "viewport": {"width": 1280, "height": 800}
        }
        if has_state:
            context_args["storage_state"] = STATE_FILE
            
        context = browser.new_context(**context_args)
        page = context.new_page()

        print("Checking session validity...")
        page.goto("https://www.staples.com/ptd/myorders/instore")
        
        # If we get redirected to login, wait for user to authenticate
        if "login" in page.url.lower():
            print("\n" + "="*50)
            print("Session expired or missing.")
            print("Please log in manually in the opened browser window...")
            print("The script will resume automatically once you reach the Order History page.")
            print("Take your time to solve CAPTCHAs or 2FA if required.")
            print("="*50 + "\n")

            # Wait indefinitely for the URL to change to the orders page
            page.wait_for_url("**/ptd/myorders**", timeout=0)
            print("Login detected! Capturing session...")
            
            # Save the new state
            context.storage_state(path=STATE_FILE)
            print(f"Session saved securely to {STATE_FILE}.")

        # Extract cookies from the Playwright context to use with curl_cffi
        playwright_cookies = context.cookies()
        
        # Convert to dictionary format for curl_cffi requests
        cookie_dict = {c['name']: c['value'] for c in playwright_cookies}
        
        browser.close()
        return cookie_dict

def fetch_order_page(session, page_number):
    """Fetch a page of in-store orders using curl_cffi."""
    url = "https://www.staples.com/sdc/ptd/api/mmxPTD/mmxSearchOrder"
    
    headers = {
        "accept": "application/json, text/plain, */*",
        "content-type": "application/json;charset=UTF-8",
        "origin": "https://www.staples.com",
        "referer": "https://www.staples.com/ptd/myorders/instore"
    }
    
    payload = {
        "request": {
            "criteria": {
                "sortBy": "",
                "pageNumber": page_number,
                "pageSize": 25
            },
            "isRetailUS": True,
            "approvalOrdersOnly": False,
            "includeDeclinedOrders": False,
            "standAloneMode": False,
            "testOrdersOnly": False,
            "origin": "",
            "viewAllOrders": False,
            "isOrderManagementDisabled": False,
            "is3PP": False
        }
    }

    response = session.post(url, headers=headers, json=payload)
    if response.status_code != 200:
        print(f"Failed to fetch page {page_number}. Status: {response.status_code}")
        return None
        
    return response.json()

def fetch_pos_details(session, tp_sid_key):
    """Fetch rich details for a POS order using curl_cffi."""
    url = f"https://www.staples.com/sdc/ptd/api/orderDetails/ptd/orderdetails?enterpriseCode=RetailUS&orderType=in-store_instore&tp_sid={tp_sid_key}&pgIntlO=Y"
    
    headers = {
        "accept": "application/json, text/plain, */*",
        "referer": "https://www.staples.com/ptd/myorders/instore"
    }
    
    response = session.get(url, headers=headers)
    if response.status_code == 200:
        return response.json()
    else:
        print(f"Failed to fetch details. Status: {response.status_code}")
        return None

def main():
    CACHE_DIR.mkdir(exist_ok=True)
    all_orders = []

    # 1. Get authenticated cookies using Playwright for the login flow
    cookies = get_auth_cookies()

    # 2. Create a curl_cffi session with Chrome impersonation
    print("\nInitializing curl_cffi session...")
    session = requests.Session(impersonate="chrome120")
    session.cookies.update(cookies)

    # 3. Fetch the first page to determine total pages
    print("Fetching initial order history data...")
    list_data = fetch_order_page(session, 1)
    
    if not list_data or "orderDetailsList" not in list_data:
        print("CRITICAL: Failed to fetch orders even with valid session. Staples API might have changed or session is invalid.")
        return

    total_results = list_data.get("totalResults", 0)
    total_pages = (total_results + 24) // 25
    print(f"Found {total_results} total orders ({total_pages} pages).")

    current_page = 1

    # 4. Iterate through all pages
    while current_page <= total_pages:
        try:
            if current_page > 1:
                list_data = fetch_order_page(session, current_page)

            orders = list_data.get("orderDetailsList", [])
            if not orders:
                break

            for order in orders:
                order_number = order.get("orderNumber", "")
                cache_file = CACHE_DIR / f"{order_number}.json"
                
                # Check cache first to avoid redundant API calls
                if cache_file.exists():
                    with open(cache_file, 'r') as f:
                        all_orders.append(json.load(f))
                    continue

                # Not cached, prepare to enrich and save
                enriched_order = dict(order)
                
                # If it's an In-Store (POS) order, fetch the deep details
                if order_number.startswith("POS."):
                    key = order.get("keyForOrderDetails")
                    if key:
                        print(f"Fetching deep details for POS order: {order_number}...")
                        time.sleep(DELAY_BETWEEN_REQUESTS) # Respectful rate limiting
                        
                        detail_data = fetch_pos_details(session, key)
                        if detail_data:
                            try:
                                # Extract inner orderDetails object securely
                                inner_details = detail_data['ptdOrderDetails']['orderDetails']['orderDetails']
                                enriched_order['_pos_detail'] = inner_details
                            except KeyError:
                                # Fallback if Staples changes their JSON schema slightly
                                enriched_order['_pos_detail'] = detail_data
                
                # Save the enriched order to the local cache folder
                with open(cache_file, 'w') as f:
                    json.dump(enriched_order, f, indent=2)
                
                all_orders.append(enriched_order)

            print(f"Processed page {current_page}/{total_pages}...")
            current_page += 1
            time.sleep(DELAY_BETWEEN_REQUESTS)

        except Exception as e:
            print(f"Error on page {current_page}: {e}")
            break

    # 5. Final aggregation
    print(f"\nSuccessfully extracted {len(all_orders)} total orders.")
    
    # Save to a final bulk JSON file
    with open(OUTPUT_FILE, 'w') as f:
        json.dump(all_orders, f, indent=2)
        
    print(f"Saved final merged extract to '{OUTPUT_FILE}'")

if __name__ == "__main__":
    main()
