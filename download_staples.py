import json
import os
import time
from datetime import datetime
from pathlib import Path
from curl_cffi import requests
from playwright.sync_api import sync_playwright

# --- Configuration ---
USER_NAME = "russ"  # Change this for other accounts
DATA_DIR = Path(USER_NAME)
STATE_FILE = DATA_DIR / "staples_auth_state.json"
CACHE_DIR = DATA_DIR / "cache"
DATE_STR = datetime.now().strftime("%Y_%m_%d")

INSTORE_OUTPUT = DATA_DIR / f"staples_instore_orders_with_detail_{DATE_STR}.json"
ONLINE_OUTPUT = DATA_DIR / f"staples_online_orders_with_detail_{DATE_STR}.json"
DELAY_BETWEEN_REQUESTS = 1.0

def manual_login_and_save():
    """Opens a browser for manual login and captures state."""
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=False)
        context_args = {
            "user_agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            "viewport": {"width": 1280, "height": 800}
        }
        if STATE_FILE.exists():
            context_args["storage_state"] = str(STATE_FILE)
        context = browser.new_context(**context_args)
        page = context.new_page()

        print("\n" + "="*50)
        print(f"STAPLES DOWNLOADER - USER: {USER_NAME}")
        print("1. Log in if needed.")
        print("2. Ensure you are on the Orders page.")
        print("3. PRESS ENTER in this terminal to start.")
        print("="*50 + "\n")

        page.goto("https://www.staples.com/ptd/myorders/instore")
        input(">>> PRESS ENTER TO START EXTRACTION <<<")
        
        print("Capturing session state...")
        context.storage_state(path=str(STATE_FILE))
        playwright_cookies = context.cookies()
        cookie_dict = {c['name']: c['value'] for c in playwright_cookies}
        browser.close()
        return cookie_dict

def fetch_order_page(session, page_number, order_type="in-store"):
    url = "https://www.staples.com/sdc/ptd/api/mmxPTD/mmxSearchOrder"
    headers = {
        "accept": "application/json, text/plain, */*",
        "content-type": "application/json;charset=UTF-8",
        "origin": "https://www.staples.com",
        "referer": f"https://www.staples.com/ptd/myorders/{'instore' if order_type == 'in-store' else ''}"
    }
    
    if order_type == "in-store":
        payload = {
            "request": {
                "criteria": {"sortBy": "", "pageNumber": page_number, "pageSize": 25},
                "isRetailUS": True, "approvalOrdersOnly": False, "includeDeclinedOrders": False,
                "standAloneMode": False, "testOrdersOnly": False, "origin": "",
                "viewAllOrders": False, "isOrderManagementDisabled": False, "is3PP": False
            }
        }
    else:  # online
        payload = {
            "request": {
                "criteria": {
                    "sortBy": "orderdate", "sortOrder": "asc", "pageNumber": page_number,
                    "esdOrdersOnly": False, "autoRestockOrdersOnly": False,
                    "filterForOrdersWithBreakroomItems": False, "pageSize": 25
                },
                "isRetailUS": False, "approvalOrdersOnly": False, "includeDeclinedOrders": False,
                "standAloneMode": False, "testOrdersOnly": False, "origin": "",
                "viewAllOrders": False, "isOrderManagementDisabled": False, "is3PP": False
            }
        }

    response = session.post(url, headers=headers, json=payload)
    if response.status_code != 200:
        print(f"Failed to fetch {order_type} page {page_number}. Status: {response.status_code}")
        return None
    return response.json()

def fetch_pos_details(session, tp_sid_key):
    url = f"https://www.staples.com/sdc/ptd/api/orderDetails/ptd/orderdetails?enterpriseCode=RetailUS&orderType=in-store_instore&tp_sid={tp_sid_key}&pgIntlO=Y"
    headers = {"accept": "application/json, text/plain, */*", "referer": "https://www.staples.com/ptd/myorders/instore"}
    response = session.get(url, headers=headers)
    return response.json() if response.status_code == 200 else None

def main():
    DATA_DIR.mkdir(exist_ok=True)
    CACHE_DIR.mkdir(exist_ok=True)
    
    cookies = manual_login_and_save()

    print("\nInitializing curl_cffi session...")
    session = requests.Session(impersonate="chrome120")
    for k, v in cookies.items():
        session.cookies.set(k, v, domain=".staples.com")

    for order_type in ["in-store", "online"]:
        print(f"\n--- Fetching {order_type.upper()} orders ---")
        current_page = 1
        total_pages = 1
        type_orders = []
        output_file = INSTORE_OUTPUT if order_type == "in-store" else ONLINE_OUTPUT
        
        while current_page <= total_pages:
            list_data = fetch_order_page(session, current_page, order_type=order_type)
            if not list_data or "orderDetailsList" not in list_data:
                print(f"No {order_type} orders found or API error.")
                break
                
            if current_page == 1:
                total_results = list_data.get("totalResults", 0)
                total_pages = (total_results + 24) // 25
                print(f"Found {total_results} {order_type} orders.")

            orders = list_data.get("orderDetailsList", [])
            for order in orders:
                num = order.get("orderNumber", "")
                cache_file = CACHE_DIR / f"{num}.json"
                
                if cache_file.exists():
                    with open(cache_file, 'r') as f:
                        type_orders.append(json.load(f))
                    continue

                enriched = dict(order)
                enriched['_order_type'] = order_type
                
                if num.startswith("POS."):
                    key = order.get("keyForOrderDetails")
                    if key:
                        print(f"Fetching details for {num}...")
                        time.sleep(DELAY_BETWEEN_REQUESTS)
                        details = fetch_pos_details(session, key)
                        if details:
                            try:
                                enriched['_pos_detail'] = details['ptdOrderDetails']['orderDetails']['orderDetails']
                            except:
                                enriched['_pos_detail'] = details
                
                with open(cache_file, 'w') as f:
                    json.dump(enriched, f, indent=2)
                type_orders.append(enriched)

            current_page += 1
            time.sleep(DELAY_BETWEEN_REQUESTS)

        with open(output_file, 'w') as f:
            json.dump(type_orders, f, indent=2)
        print(f"Saved {len(type_orders)} {order_type} orders to {output_file}")

if __name__ == "__main__":
    main()
