import sys
import json
from bs4 import BeautifulSoup
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

        # Test an online order
        url = "https://www.staples.com/ptd/orderdetails?orderNo=9934770369&tp_sid=U3RNREdrdjNvMGRKcTZhUDJVb1FKc1ZTejYrVVhMUkNta09yRWVaOVUvdXpoWkVrdXBFN2g2ZnlLZkZHRTlLS3FhN2NQWA=="

        headers = {
            "accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
            "referer": "https://www.staples.com/ptd/myorders",
        }

        response = context.request.get(url, headers=headers)

        html = response.text()
        soup = BeautifulSoup(html, "html.parser")
        next_data = soup.find("script", id="__NEXT_DATA__")

        if next_data:
            data = json.loads(next_data.string)
            try:
                state = data.get("props", {}).get("initialStateOrStore", {})
                print("Keys in initialStateOrStore:", list(state.keys()))
                if "orderDetailsState" in state:
                    order_details = state["orderDetailsState"]
                    print("\nFound orderDetailsState!")
                    print(json.dumps(order_details, indent=2)[:1000])
            except Exception as e:
                print("Error parsing props:", e)
        else:
            print("No __NEXT_DATA__ found.")

        browser.close()


if __name__ == "__main__":
    main()
