"""Exercise language selection in a real browser with an isolated, empty API.

Start `npm --prefix ui run dev`, then run this with the engine's Python environment:
    engine/.venv/Scripts/python ui/scripts/check-translations.py
No real accounts or organizations are used or changed.
"""
from pathlib import Path
import json
import re

from playwright.sync_api import sync_playwright


def main():
    artifacts = Path(__file__).resolve().parents[2] / "build" / "translation-qa"
    artifacts.mkdir(parents=True, exist_ok=True)
    errors = []
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page(viewport={"width": 1440, "height": 900}, locale="vi-VN")
        page.on("pageerror", lambda error: errors.append(str(error)))

        def api(route):
            if route.request.url.split("?")[0].endswith("/runtime/limits"):
                data = {"running": 0, "waiting": 0, "maxConcurrent": 8}
            else:
                data = []
            route.fulfill(status=200, content_type="application/json", body=json.dumps(data))

        page.route("**/api/v1/**", api)
        page.goto("http://127.0.0.1:1420/settings")
        page.get_by_role("heading", name="Cài đặt", exact=True).wait_for()
        page.get_by_role("button", name="Ngôn ngữ", exact=True).click()
        page.get_by_role("menuitem", name="English", exact=True).click()
        page.get_by_role("heading", name="Settings", exact=True).wait_for()
        assert page.locator("html").get_attribute("lang") == "en"
        assert page.evaluate("localStorage.getItem('pantheon:locale')") == "en"
        page.reload()
        page.get_by_role("heading", name="Settings", exact=True).wait_for()
        page.get_by_role("button", name="Language", exact=True).click()
        page.get_by_role("menuitem", name="Tiếng Việt", exact=True).click()
        page.get_by_role("heading", name="Cài đặt", exact=True).wait_for()
        assert page.locator("html").get_attribute("lang") == "vi"
        assert page.evaluate("localStorage.getItem('pantheon:locale')") == "vi"
        assert not re.search(r"\b(?:settings|common|shell|org)\.[A-Za-z]\w*", page.locator("body").inner_text())
        page.screenshot(path=str(artifacts / "settings-vi-desktop.png"))
        page.set_viewport_size({"width": 390, "height": 844})
        page.get_by_role("button", name="Ngôn ngữ", exact=True).click()
        page.get_by_role("menuitem", name="English", exact=True).click()
        page.get_by_role("heading", name="Settings", exact=True).wait_for()
        page.screenshot(path=str(artifacts / "settings-en-phone.png"))
        assert not errors, errors
        browser.close()
    print("PASS: Vietnamese/English rendering, language picker, persistence after reload, document language, mobile selection, no browser exceptions")
    print(f"Screenshots: {artifacts}")


if __name__ == "__main__":
    main()
