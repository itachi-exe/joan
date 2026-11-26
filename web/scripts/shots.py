import json, os, sys
from playwright.sync_api import sync_playwright

OUT = "/opt/hermes/projects/hackathon-sprint/joan/web/shots"
os.makedirs(OUT, exist_ok=True)
URL = "http://localhost:4174/"
EXE = "/opt/hermes/.cache/ms-playwright/chromium-1248/chrome-linux64/chrome"
results = {}

def overflow(page):
    return page.evaluate("""() => ({
      doc: document.documentElement.scrollWidth, win: window.innerWidth,
      body: document.body.scrollWidth,
      wide: [...document.querySelectorAll('body *')].filter(e => { const r = e.getBoundingClientRect(); return r.width > 0 && (r.right > window.innerWidth + 1) && !e.closest('.track') && !e.closest('.tabs') }).slice(0,5).map(e => e.className || e.tagName)
    })""")

with sync_playwright() as p:
    b = p.chromium.launch(executable_path=EXE, args=["--no-sandbox"])
    for name, vp, mobile in [("m", {"width": 390, "height": 844}, True), ("d", {"width": 1440, "height": 900}, False)]:
        ctx = b.new_context(viewport=vp, device_scale_factor=2 if mobile else 1, is_mobile=mobile, has_touch=mobile)
        page = ctx.new_page()
        errs = []
        page.on("pageerror", lambda e: errs.append(str(e)))
        page.on("console", lambda m: errs.append(m.text) if m.type == "error" else None)
        page.goto(URL); page.wait_for_timeout(3200)
        page.screenshot(path=f"{OUT}/{name}-1-entrance.png")
        page.click("text=Open today's edition"); page.wait_for_timeout(3600)
        results[f"{name}-after-open-hash"] = page.evaluate("location.hash")
        page.screenshot(path=f"{OUT}/{name}-2-front.png")
        results[f"{name}-front"] = overflow(page)
        page.screenshot(path=f"{OUT}/{name}-2b-front-full.png", full_page=False)
        # story
        page.goto(URL + "#/story/water-tariff"); page.reload(); page.wait_for_timeout(900)
        page.screenshot(path=f"{OUT}/{name}-3-dispatch.png")
        results[f"{name}-story"] = overflow(page)
        if mobile:
            # scroll inside the story vertically
            page.evaluate("document.querySelector('.panel').scrollTop = 900"); page.wait_for_timeout(300)
            page.screenshot(path=f"{OUT}/{name}-3b-dispatch-scrolled.png")
            page.evaluate("document.querySelector('.panel').scrollTop = 1800"); page.wait_for_timeout(300)
            page.screenshot(path=f"{OUT}/{name}-3c-dispatch-receipts.png")
            # swipe
            before = page.evaluate("document.getElementById('track').scrollLeft")
            cdp = ctx.new_cdp_session(page)
            def touch(x0, x1):
                cdp.send("Input.dispatchTouchEvent", {"type": "touchStart", "touchPoints": [{"x": x0, "y": 500}]})
                for k in range(1, 11):
                    cdp.send("Input.dispatchTouchEvent", {"type": "touchMove", "touchPoints": [{"x": x0 + (x1 - x0) * k / 10, "y": 500}]}); page.wait_for_timeout(16)
                cdp.send("Input.dispatchTouchEvent", {"type": "touchEnd", "touchPoints": []}); page.wait_for_timeout(1200)
            touch(330, 40)
            after = page.evaluate("document.getElementById('track').scrollLeft")
            results["m-swipe"] = {"scrollLeft_before": before, "after": after, "hash": page.evaluate("location.hash"), "width": page.evaluate("document.getElementById('track').clientWidth")}
            page.screenshot(path=f"{OUT}/{name}-3d-dispatch-swiped.png")
            touch(330, 40)
            results["m-swipe2-hash"] = page.evaluate("location.hash")
            touch(40, 330)
            results["m-swipe-back-hash"] = page.evaluate("location.hash")
        else:
            page.goto(URL + "#/story/battery-recall"); page.reload(); page.wait_for_timeout(600)
            page.screenshot(path=f"{OUT}/{name}-3b-dispatch-2.png")
            page.goto(URL + "#/story/water-tariff"); page.reload(); page.wait_for_timeout(600)
            page.evaluate("document.getElementById('screen').scrollTo(0, 560)"); page.wait_for_timeout(400)
            page.screenshot(path=f"{OUT}/{name}-3c-dispatch-body.png")
            page.evaluate("document.getElementById('screen').scrollTo(0, 5000)"); page.wait_for_timeout(400)
            page.screenshot(path=f"{OUT}/{name}-3d-dispatch-end.png")
        # archives
        page.goto(URL + "#/archives"); page.reload(); page.wait_for_timeout(700)
        page.screenshot(path=f"{OUT}/{name}-4-archives.png")
        results[f"{name}-archives"] = overflow(page)
        page.click(".clip.add"); page.wait_for_timeout(400)
        page.screenshot(path=f"{OUT}/{name}-4b-commission-form.png")
        page.fill("#assignment", "Check whether the claim about a transit fare cut is accurate")
        page.fill("#budget", "3.5")
        page.click("button[type=submit]"); page.wait_for_timeout(1500)
        results[f"{name}-stored"] = page.evaluate("localStorage.getItem('joan.commissions')")
        page.screenshot(path=f"{OUT}/{name}-4c-archives-after.png")
        # about
        page.goto(URL + "#/about"); page.reload(); page.wait_for_timeout(700)
        page.screenshot(path=f"{OUT}/{name}-5-about.png")
        results[f"{name}-about"] = overflow(page)
        results[f"{name}-errors"] = errs
        ctx.close()
    # silent / reduced motion
    ctx = b.new_context(viewport={"width": 390, "height": 844}, reduced_motion="reduce")
    page = ctx.new_page(); errs = []
    page.on("pageerror", lambda e: errs.append(str(e)))
    page.goto(URL); page.click("text=Open today's edition"); page.wait_for_timeout(300)
    results["reduced-motion-hash-after-300ms"] = page.evaluate("location.hash")
    results["reduced-errors"] = errs
    b.close()
print(json.dumps(results, indent=1))
