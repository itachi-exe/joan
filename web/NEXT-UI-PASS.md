# Joan UI: Wednesday pass (2026-11-25)

Itachi paused the UI work on Tue 2026-11-24 and asked for "a very nice improvement" on Wednesday. Owner: project maintainer.

## Where it stands
- Live: https://joan-gazette.vercel.app (Vercel project `joan-gazette`, deploy = copy `dist/` into a scratch dir, `vercel deploy --prod --name joan-gazette`)
- Last commit: `90d08ec` (v1.1)
- His verdict on v1: "Good for first version keep improving"
- Inspo: `../inspo/` (vintage gazette Pinterest UI: bold sans headlines, cream cards, sepia photos, rust accents)
- Screenshot harness: `scripts/shots.py` (system `/usr/bin/python3`, preview on :4174). Vercel's bot shield challenges this server's IP, so screenshot the local preview.

## Wednesday list (pick the biggest wins first)
1. Side-by-side diff against every inspo image: spacing, type scale, card radius, shadow depth. Fix the gaps.
2. Dispatch page: richer editorial furniture (pull quote, photo caption line, section ornament, end-of-story mark).
3. Desktop front page: fill the right column (Joan's ledger, a "wire" ticker of live checks, the 90s Joan teaser card).
4. Entrance: the sound-on moment (typewriter, paper rustle) plus a smoother handoff into the front page.
5. Motion: page-turn transition between dispatches, staggered card reveals on the front page.
6. Real content: replace the sample stories with real Joan outputs once the agent produces them.
7. Joan teaser post ("Joan back in the 90s") to ship alongside.

Check every change at 390px and 1440px. No horizontal overflow, no console errors. Send him the mobile and PC screenshot sheets.
