import sys
import json
from pathlib import Path
from playwright.sync_api import sync_playwright


def main():
    state_file = Path("russ2/staples_auth_state.json")

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=False, channel="chrome")
        context_args = {"viewport": {"width": 1280, "height": 800}}
        if state_file.exists():
            context_args["storage_state"] = str(state_file)

        context = browser.new_context(**context_args)

        url1 = "https://www.staples.com/sdc/ptd/api/orderDetails/ptd/orderdetails?enterpriseCode=RetailUS&tp_sid=U3RNREdrdjNvMGRKcTZhUDJVb1FKc1ZTejYrVVhMUkNta09yRWVaOVUvdXpoWkVrdXBFN2g2ZnlLZkZHRTlLS3FhN2NQWA==&pgIntlO=Y"
        url2 = "https://www.staples.com/sdc/ptd/api/orderDetails/ptd/orderdetails?enterpriseCode=RetailUS&orderNo=9934770369&tp_sid=U3RNREdrdjNvMGRKcTZhUDJVb1FKc1ZTejYrVVhMUkNta09yRWVaOVUvdXpoWkVrdXBFN2g2ZnlLZkZHRTlLS3FhN2NQWA==&pgIntlO=Y"

        headers = {
            "accept": "application/json, text/plain, */*",
            "referer": "https://www.staples.com/ptd/myorders",
        }

        response1 = context.request.get(url1, headers=headers)
        print("URL1 status:", response1.status)
        try:
            print(json.dumps(response1.json())[:500])
        except Exception:
            pass

        response2 = context.request.get(url2, headers=headers)
        print("URL2 status:", response2.status)
        try:
            print(json.dumps(response2.json())[:500])
        except Exception:
            pass

        browser.close()


if __name__ == "__main__":
    main()
