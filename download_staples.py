import json
import sys
import time
from datetime import datetime
from pathlib import Path
from playwright.sync_api import sync_playwright

USER_NAME = sys.argv[1] if len(sys.argv) > 1 else "russ"
DATA_DIR = Path(USER_NAME)
STATE_FILE = DATA_DIR / "staples_auth_state.json"
CACHE_DIR = DATA_DIR / "cache"
DELAY_BETWEEN_REQUESTS = 1.0


def fetch_order_page(context, page_number, order_type="in-store"):
    url = "https://www.staples.com/sdc/ptd/api/mmxPTD/mmxSearchOrder"
    headers = {
        "accept": "application/json, text/plain, */*",
        "content-type": "application/json;charset=UTF-8",
        "origin": "https://www.staples.com",
        "referer": f"https://www.staples.com/ptd/myorders/{'instore' if order_type == 'in-store' else ''}",
    }

    if order_type == "in-store":
        payload = {
            "request": {
                "criteria": {"sortBy": "", "pageNumber": page_number, "pageSize": 25},
                "isRetailUS": True,
                "approvalOrdersOnly": False,
                "includeDeclinedOrders": False,
                "standAloneMode": False,
                "testOrdersOnly": False,
                "origin": "",
                "viewAllOrders": False,
                "isOrderManagementDisabled": False,
                "is3PP": False,
            }
        }
    else:  # online
        payload = {
            "request": {
                "criteria": {
                    "sortBy": "orderdate",
                    "sortOrder": "asc",
                    "pageNumber": page_number,
                    "esdOrdersOnly": False,
                    "autoRestockOrdersOnly": False,
                    "filterForOrdersWithBreakroomItems": False,
                    "pageSize": 25,
                },
                "isRetailUS": False,
                "approvalOrdersOnly": False,
                "includeDeclinedOrders": False,
                "standAloneMode": False,
                "testOrdersOnly": False,
                "origin": "",
                "viewAllOrders": False,
                "isOrderManagementDisabled": False,
                "is3PP": False,
            }
        }

    response = context.request.post(url, headers=headers, data=payload)
    if not response.ok:
        print(
            f"Failed to fetch {order_type} page {page_number}. Status: {response.status}"
        )
        return None
    try:
        return response.json()
    except Exception:
        print(f"Invalid JSON response for {order_type} page {page_number}")
        return None


def fetch_pos_details(context, tp_sid_key):
    url = f"https://www.staples.com/sdc/ptd/api/orderDetails/ptd/orderdetails?enterpriseCode=RetailUS&orderType=in-store_instore&tp_sid={tp_sid_key}&pgIntlO=Y"
    headers = {
        "accept": "application/json, text/plain, */*",
        "referer": "https://www.staples.com/ptd/myorders/instore",
    }
    response = context.request.get(url, headers=headers)
    if not response.ok:
        return None
    try:
        return response.json()
    except Exception:
        return None


def main():
    DATA_DIR.mkdir(exist_ok=True)
    CACHE_DIR.mkdir(exist_ok=True)

    date_str = datetime.now().strftime("%Y_%m_%d")
    instore_output = DATA_DIR / f"staples_instore_orders_with_detail_{date_str}.json"
    online_output = DATA_DIR / f"staples_online_orders_with_detail_{date_str}.json"

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=False, channel="chrome")
        context_args = {
            "viewport": {"width": 1280, "height": 800},
        }
        if STATE_FILE.exists():
            context_args["storage_state"] = str(STATE_FILE)

        context = browser.new_context(**context_args)
        page = context.new_page()

        print("Navigating to Staples to verify login state...")
        page.goto("https://www.staples.com/ptd/myorders/instore")
        page.wait_for_load_state("load")

        # Detect if login is needed: no saved state, URL redirect, or sign-in prompt on page
        needs_login = not STATE_FILE.exists()
        if not needs_login:
            needs_login = (
                "login" in page.url.lower()
                or "signin" in page.url.lower()
                or page.locator("text=Sign In").first.is_visible()
            )

        if needs_login:
            print("\n" + "=" * 50)
            print(f"STAPLES DOWNLOADER - USER: {USER_NAME}")
            print("Please log in to your Staples account.")
            print("1. Log in with your credentials.")
            print("2. Ensure you are on the Orders page.")
            print("3. PRESS ENTER in this terminal to continue.")
            print("=" * 50 + "\n")
            input(">>> PRESS ENTER after logging in <<<")
        else:
            print(f"\nSession valid for {USER_NAME}. Proceeding...")

        print("Capturing session state...")
        context.storage_state(path=str(STATE_FILE))

        print("\nUsing authenticated Playwright context to fetch orders...")
        for order_type in ["in-store", "online"]:
            print(f"\n--- Fetching {order_type.upper()} orders ---")
            current_page = 1
            total_pages = 1
            type_orders = []
            output_file = instore_output if order_type == "in-store" else online_output

            while current_page <= total_pages:
                try:
                    list_data = fetch_order_page(
                        context, current_page, order_type=order_type
                    )

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
                            with open(cache_file, "r") as f:
                                cached = json.load(f)
                            cached["_order_type"] = cached.get(
                                "_order_type", order_type
                            )
                            type_orders.append(cached)
                            continue

                        enriched = dict(order)
                        enriched["_order_type"] = order_type

                        if num.startswith("POS."):
                            key = order.get("keyForOrderDetails")
                            if key:
                                print(f"Fetching details for {num}...")
                                time.sleep(DELAY_BETWEEN_REQUESTS)
                                details = fetch_pos_details(context, key)
                                if details:
                                    try:
                                        enriched["_pos_detail"] = details[
                                            "ptdOrderDetails"
                                        ]["orderDetails"]["orderDetails"]
                                    except (KeyError, TypeError):
                                        enriched["_pos_detail"] = details

                        with open(cache_file, "w") as f:
                            json.dump(enriched, f, indent=2)
                        type_orders.append(enriched)

                    current_page += 1
                    time.sleep(DELAY_BETWEEN_REQUESTS)

                except Exception as e:
                    print(f"Error processing {order_type} page {current_page}: {e}")
                    break

            with open(output_file, "w") as f:
                json.dump(type_orders, f, indent=2)
            print(f"Saved {len(type_orders)} {order_type} orders to {output_file}")

        print("\nFinished successfully! Closing browser.")
        browser.close()


if __name__ == "__main__":
    main()
