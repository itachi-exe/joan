#!/usr/bin/env python3
"""Generate Joan's sepia press photos with the grok CLI, in parallel."""
import subprocess, sys
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

D = Path(__file__).resolve().parent.parent / "public" / "img"
D.mkdir(parents=True, exist_ok=True)
STYLE = ("Authentic 1920s archival press photograph, warm sepia toned silver gelatin print, fine film grain, "
         "soft vignette, photorealistic, natural faces and hands. No text, no captions, no logos, no watermark, no borders.")
JOBS = {
 "joan": ("Portrait of a sharp, composed woman journalist in her early 30s in a 1920s newspaper office, seated at a black typewriter, "
          "sleeves rolled, pencil behind ear, stacks of newspapers and a desk lamp, looking up at the camera with a calm knowing expression.", "3:4 portrait"),
 "street": ("Busy city street in 1924, men in overcoats and fedoras and women in cloche hats crossing, vintage automobiles, "
            "tall brick buildings fading into morning haze, a newsboy on the corner.", "4:3 landscape"),
 "waterworks": ("A grand 1920s municipal water pumping station interior, huge iron pipes and valves, brass gauges, one engineer in overalls "
                "inspecting a valve, light through tall arched windows.", "4:3 landscape"),
 "workshop": ("A 1920s electrical workshop, rows of early battery cells and wiring on long wooden benches, two technicians in aprons "
              "examining a battery under hanging bulbs.", "4:3 landscape"),
 "press": ("A 1920s newspaper printing press room, a large rotary press with paper rolls, a pressman in a folded paper hat checking a "
           "freshly printed sheet.", "4:3 landscape"),
 "typewriter": ("Close-up still life of a vintage typewriter with a blank sheet of paper loaded, a fountain pen, round reading glasses and a "
                "cup of coffee on a worn wooden desk, morning window light.", "1:1 square"),
}
only = set(sys.argv[1:])

def run(name):
    desc, aspect = JOBS[name]
    out = D / f"{name}.jpg"
    prompt = (f"Use your image_gen tool to create ONE image and save it to {out} . {desc} {STYLE} Aspect ratio {aspect}. "
              "Then print the path. Do not ask questions.")
    r = subprocess.run(["grok", "-p", prompt, "--output-format", "json", "--always-approve", "--no-subagents",
                        "--disable-web-search", "--max-turns", "8", "--cwd", str(D)],
                       capture_output=True, text=True, timeout=290)
    return name, r.returncode, out.exists() and out.stat().st_size

with ThreadPoolExecutor(6) as ex:
    for name, rc, size in ex.map(run, [n for n in JOBS if not only or n in only]):
        print(name, "rc", rc, "bytes", size)
