# Joan: AI journalist (Celo Agents Open for Business)

Team: Itachi + ODK. Deadline 2026-12-07 09:00 GMT. ODK's brief = reference only, verify claims.

## Core (from ODK brief, condensed)
- Editor owns Altana wallet on Celo mainnet, grants Joan a session key: cap (~$10 USDC), allowlisted contracts, 24h expiry.
- Editor submits a real assignment. Joan researches public sources, buys extra research via Celo Buy x402 (X search, Reddit, YouTube transcripts, cents per call), separates facts from claims.
- Report: headline, summary, what we know, what remains unclear, sources, confidence (high/med/low), research spending. Label "AI-generated report. Prepared by Joan."
- Persistent spend ledger in SQLite: check allowance before each buy, no duplicate pays, fail closed if balance unknown, reconcile after restart.
- 3 demos: allowed purchase, blocked (app-level over-budget AND onchain unapproved destination, explain difference), revoke then Joan can't pay.
- Stack: TypeScript, SQLite, one LLM, Altana SDK, Celo Buy, ERC-8004, light dashboard (assignment, report, wallet, permissions + revoke).
- Timeline: Nov 24-25 prove Altana session key can pay a Celo Buy x402 call (first risk). Nov 26-29 journalism workflow. Nov 30-Dec 3 dashboard + controls + ERC-8004. Dec 4 review. Dec 5-6 real users + demo. Dec 7 submit early.
- Out of scope: newsroom platform, multiple agents, feed, subscriptions, mobile, multichain, custom contract, token.

## Team review (checked against RULES.md, 2026-11-23)
- Altana judging: execution 25, clear value 25, tagged traction 25 ("repeat use weighs more than one-off volume"), named person/real job 25. Brief underplays traction: need repeat assignments from 2-3 editors, not one.
- x402 settlements carry NO attribution tag (rules: register seller PayTo instead). Buy purchases won't count as Joan's tagged activity. Tagged traction must come from ordinary Altana txs, e.g. editor pays Joan per report from the wallet with ERC-8021 suffix. Tag must be appended before first counted tx, can't be credited later.
- Prior build-with-buy winners overlap: Assay (purchased X evidence), Growth Scout (paid social-data reports), Traction-Check (paid data, per-report receipts). Joan's difference must be journalism verification: originals vs repeated reports, "what remains unclear".
- Altana docs: x402 via ERC-1271 checker + Permit2; EIP-3009 smart-account validation on Celo unverified. Brief's day 1-2 proof is correct priority.
- Presentation: cinematic newspaper site with Joan's voice reading the edition (Itachi + ODK). Fits as report view + landing page at /, not a public news feed. Audio needs a click to start.
- Livestreams: Self Nov 24 14:00 GMT, Altana Nov 25 14:00 GMT.
- Optional 2nd track: Self ID (only verified humans can commission Joan) if cheap; Altana stays primary.
- Mainnet spend, registration, session grants need Itachi's OK.

## UI spec (Itachi, Pinterest "The Gazette" vintage editorial) = inspo/gazette-pinterest.jpeg
- Cream paper bg, dark brown serif type, rust/orange accent used sparingly, sepia photos with "PHOTO:" credit tags, rounded cards, thin rules.
- Screens map: Front Page (masthead, section tabs, lead story) / Dispatch (drop cap, byline, roman-numeral date) / Archives (clipping cards). "Add clipping" = commission Joan a story. Receipts shown as clippings/stamps.
- Mobile: horizontal swipe between stories (page turn), vertical scroll inside a story. Desktop: real broadsheet layout, not a phone mockup.
- Entrance: tap "Open today's edition" -> sound starts (autoplay blocked otherwise).
