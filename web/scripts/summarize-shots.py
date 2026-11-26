"""Summarise scripts/shots.py output (JSON on stdin or in a file) and build contact sheets under shots/."""
import json, sys, os, glob
src = sys.argv[1]
d = json.load(open(src))
bad = []
for k, v in d.items():
    if k.endswith("-errors") or k == "reduced-errors":
        print(k, v)
        if v: bad.append(k)
    elif isinstance(v, dict) and "doc" in v:
        ok = v["doc"] <= v["win"] and v["body"] <= v["win"] and not v["wide"]
        print(k, "doc", v["doc"], "win", v["win"], "wide", v["wide"], "OK" if ok else "OVERFLOW")
        if not ok: bad.append(k)
print({k: v for k, v in d.items() if "swipe" in k or "hash" in k})
print("PROBLEMS:", bad or "none")

try:
    from PIL import Image
except ImportError:
    print("PIL missing, no contact sheets"); sys.exit(0)
OUT = "/opt/hermes/projects/hackathon-sprint/joan/web/shots"
for tag, width, cols, name in [("m", 390, 5, "sheet-mobile.png"), ("d", 1440, 3, "sheet-desktop.png")]:
    files = sorted(glob.glob(f"{OUT}/e2e/{tag}-*.png"))
    if not files: continue
    tw = 390 if tag == "m" else 720
    thumbs = []
    for f in files:
        im = Image.open(f).convert("RGB")
        th = int(im.height * tw / im.width)
        thumbs.append(im.resize((tw, th)))
    rowh = max(t.height for t in thumbs)
    rows = (len(thumbs) + cols - 1) // cols
    pad = 16
    sheet = Image.new("RGB", (cols * (tw + pad) + pad, rows * (rowh + pad) + pad), (243, 238, 229))
    for i, t in enumerate(thumbs):
        sheet.paste(t, (pad + (i % cols) * (tw + pad), pad + (i // cols) * (rowh + pad)))
    sheet.save(f"{OUT}/{name}")
    print("sheet", name, sheet.size, len(thumbs), "shots")
