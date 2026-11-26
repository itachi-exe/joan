# Joan live-site demo

The finished film is local-only at `docs/demo/joan-demo.mp4`. It is intentionally gitignored and has not been uploaded. The owner chooses its hosting location.

## Exact delivery

- Duration: 114.137 seconds (1 minute 54 seconds).
- Size: 8,499,111 bytes, below 100 MB.
- Picture: H.264, 1440 × 900, 30 frames per second, 3,422 frames.
- Sound: ElevenLabs narration, voice `JBFqnCBsd6RMkjVDRZzb`, AAC stereo, 48 kHz. Eight cached synthesis calls; no music or product audio mixed underneath.
- SHA-256: `a92f5e0d120c6e24499ff41e6d1b6a138146c0bba37802725a051fe2f716ff6c`.
- Live target: https://joan-dispatch.vercel.app/
- Live API: https://joan-api.94-72-105-176.sslip.io/

## Real workflow

Playwright recorded the live site at 1440 × 900, without mocked responses or asset interception. The cut uses static gazette-style title cards and plain cuts, not motion graphics or reconstructed UI. It opens the edition, shows the front page, commissions a fresh report, reads the dispatch and original-source attribution, shows its zero research bill, revokes the shared mock session, demonstrates the refusal message, and regrants with API-confirmed state.

The fresh assignment checks RFC 9110 for HTTP 429, HTTP 503 and Retry-After. The completed report was read back exactly from the public API and verified to have `origin: live`, `demoData: false`, live sources, zero research spending and no purchases. One real model-backed commission was made. The subsequent revoked commission was rejected by the existing permission precheck. No wallet, mainnet, proof runner or signing operation was performed.

The real model response took about eight seconds; it is retained, not sped up or represented by a seeded report. Unnecessary typing, pauses and navigation were cut. Narration is synchronized to the scene windows at its generated speed.

## Review and limits

- Full FFmpeg decode completed without errors.
- Native frame review covered the title, assignment, dispatch, confidence and sources, zero-spend section, mock Desk, explicit refusal, regrant confirmation and closing card. No sampled private account material or credentials were visible.
- Cached local Whisper transcription recovered the full narration including the final sentence. Speech timestamps were compared with the edited scene timeline and the refusal/regrant frames. This is technical audio/sync review, not a claim of human listening.
- The reusable cinematic gate confirmed duration, geometry, constant 30 fps, audio, loudness, true peak and nonblank sampled scenes. Its overall result was **failed** on two expected stylistic checks: four intentional reading pauses exceed its two-second silence limit, and the static closing title card is classified as a frozen tail. Those checks are not represented as passed; this cut has no music bed and uses plain static cards.
- The optional video-analysis tool rejected video input on its configured provider. Native image sampling and local audio transcription were used instead; no failed review was reported as a pass.
- The wallet and session controls are simulations. Mainnet ERC-8004 identity, x402 settlement, and actual session grant/revoke transaction proofs remain pending.
- The generated report headline is more categorical about 429 than its body. The body explicitly limits its conclusion to the retrieved excerpt. Editorial review remains required.
- Public video hosting, unauthenticated playback and portal submission remain pending.

The committed two-minute script and mainnet insert checklist are in [SUBMISSION.md](../../SUBMISSION.md).
