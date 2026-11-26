import json
from playwright.sync_api import sync_playwright
EXE = "/opt/hermes/.cache/ms-playwright/chromium-1248/chrome-linux64/chrome"
URL = "http://localhost:4174/"
with sync_playwright() as p:
    b = p.chromium.launch(executable_path=EXE, args=["--no-sandbox"])
    ctx = b.new_context(viewport={"width": 390, "height": 844}, device_scale_factor=2, is_mobile=True, has_touch=True)
    page = ctx.new_page()
    for h in ["#/front", "#/story/water-tariff", "#/archives", "#/about"]:
        page.goto(URL + h); page.wait_for_timeout(700)
        r = page.evaluate("""() => [...document.querySelectorAll('body *')].filter(e => e.getBoundingClientRect().right > 391 && getComputedStyle(e).display!=='none').slice(0,12).map(e => e.tagName+'.'+e.className+' '+Math.round(e.getBoundingClientRect().right))""")
        print(h, page.evaluate("document.documentElement.scrollWidth"), r)
    page.goto(URL + "#/story/water-tariff"); page.wait_for_timeout(700)
    print(page.evaluate("""() => { const t=document.getElementById('track'); return [t.scrollWidth, t.clientWidth, getComputedStyle(t).overflowX, getComputedStyle(t).display] }"""))
    # programmatic scroll to verify snap
    page.evaluate("document.getElementById('track').scrollTo({left: 390, behavior:'instant'})"); page.wait_for_timeout(500)
    print(page.evaluate("location.hash"))
    b.close()
