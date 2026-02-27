import sys
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
        page = context.new_page()

        print("Navigating to an online order details page...")

        # We will intercept and print all API calls made to orderDetails
        page.on(
            "request",
            lambda request: print(">>", request.method, request.url)
            if "orderdetails" in request.url.lower() or "order" in request.url.lower()
            else None,
        )

        url = "https://www.staples.com/ptd/orderdetails?orderNo=9934770369&tp_sid=U3RNREdrdjNvMGRKcTZhUDJVb1FKc1ZTejYrVVhMUkNta09yRWVaOVUvdXpoWkVrdXBFN2g2ZnlLZkZHRTlLS3FhN2NQWA=="
        page.goto(url)

        print("Page opened! Waiting for API calls...")
        page.wait_for_timeout(5000)

        browser.close()


if __name__ == "__main__":
    main()
