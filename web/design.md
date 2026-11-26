# Joan: Wednesday design direction

## Reference Notes
The supplied reference is the specification: `../inspo/gazette-pinterest.jpeg` (1200 × 900). It contains front page, dispatch and archive phone compositions. OCR confirms The Gazette masthead, World/Opinion/Culture tabs, large multiline sans headlines, serif dispatch body, dated archival clippings. No other inspiration image exists in this directory. Do not substitute dark SaaS references for this explicit owner direction.

## Direction
- Product: a research desk that commissions, publishes and accounts for AI journalism.
- Character: archival, exact, candid.
- World: cream newsprint, brown ink, rust printer's stamps.
- Moments: the portrait entrance and perforated spending slips.
- Signature: every finding has its source, every purchase its receipt.

## Audit and changes
Existing gazette art direction is deliberate, not slop. Preserve Raleway/Old Standard/Courier and the cream palette as explicit supplied-reference exceptions to default dark tokens. Existing Wednesday furniture and sound synthesis were already present; keep them and extend them to API reports. Fix missing persisted integration, misleading provenance, desktop sidebar crowding, tiny tap targets and stale prototype copy. Quiet the perpetual wire status pulse.

Spacing: 16px mobile gutters, 24px desktop grid gaps, 24px desk panels. Palette: ink #3a281c, paper #f3eee5, rust #a94d25, translucent brown rules. Muted ink darkened to #786653. Card radius stays 16px with 12px inset photographs; receipt slips stay square. Heading tracking tightened only for large editorial moments; existing uppercase gazette furniture is intentional.

## Screens and states
Entrance → front → dispatch → archives/commission → research desk; About and 90s feature remain navigable. Loading and empty archive/front states are distinct from API-offline labelled samples. Reports, balance, grant, revoke and spending are server-backed. Pending commission IDs persist in browser storage; retries reuse them. Mock report/source provenance stays visible. No signing or real spending.

## Review artifacts
`shots/wednesday/` holds every main flow at 390 and 1440, plus mobile/desktop sheets. `shots/comparisons/` pairs all three reference compositions with corresponding screens and includes the full supplied image. Browser geometry, image loading, OCR and contrast are measurable review gates. Aesthetic parity remains subject to owner visual approval; no image-model review is claimed.

## Motion and accessibility
Use cubic-bezier(.22,1,.36,1), staggered front-page reveals, page turns and typed entrance. Honor reduced motion. Keyboard arrows navigate dispatches; dialog controls have labels; shared focus rings remain; navigation and receipt controls have 44px minimum height. No UI emoji.

## Safety and scope
No deploy, board mutation, external message, credential, wallet creation, signature or real payment. The blocked UI demo explicitly grants a $0.001 mock cap and receives the real API's `sdk_spend_limit_exceeded` refusal on a $0.005 quote. This is client-side SDK policy, not an invented onchain revert. The SDK versus simulated execute distinction is spelled out separately. Core executable demos verify those distinct layers.
