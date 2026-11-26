# Live adapters and public research

No frontend contract changed. Existing `sources`, report fields, origin flags and spending fields carry live output. Citations are 1-based `[1]`, `[2]` references to the ordered source array.

## Selection

- No research configuration or Tavily key: deterministic mock, as before.
- `JOAN_RESEARCH_PROVIDER=public`: real, keyless publisher fetches. Put up to five relevant HTTPS source URLs in the assignment. Without URLs, Hacker News Algolia supplies search metadata only, explicitly labeled leads, not article verification.
- `JOAN_RESEARCH_PROVIDER=tavily` and `TAVILY_API_KEY`: existing optional Tavily path.
- `JOAN_RESEARCH_PROVIDER=mock`: explicit deterministic fixtures.
- `JOAN_LLM_API_KEY`: OpenAI-compatible LLM; default base `https://api.deepseek.com`, default model `deepseek-chat`. Optional `JOAN_LLM_BASE_URL` and `JOAN_LLM_MODEL` override them.
- Otherwise `OPENAI_API_KEY` and optional `OPENAI_MODEL`: original OpenAI endpoint, default `gpt-4o-mini`.
- No LLM keys or partial provider configuration: mock only when entirely unconfigured; a configured base/model without its compatible API key fails closed at startup. Configured network failures never silently fall back to mocks.

Use process environment, not a tracked credential file. This does not change the assistant's conversation model. Research documents and assignment text are sent to the selected LLM service.

## Fetch boundaries

The publisher URL path is intentionally not a general URL proxy. Exact allowed hosts: `docs.celo.org`, `celo.org`, `blog.celo.org`, `en.wikipedia.org`, `hn.algolia.com`, `www.rfc-editor.org`, `www.nasa.gov`, `science.nasa.gov`. HTTPS only, no userinfo or alternate ports, with the same checks on every redirect. At most two redirects, 15 seconds for headers plus body across redirects, 512 KiB decoded response per source, five sources, text/HTML/JSON only. Long documents select bounded keyword-relevant passages with explicit omission markers. These heuristics can miss important context. JavaScript-rendered articles and arbitrary publisher domains are not supported.

Sources remain claims until justified in the draft, not automatically independent corroboration. The live draft validator requires citations in summary, every body paragraph and every `know` item, and rejects out-of-range references. Citation syntax is checked, not semantic entailment. Editors still need to check accuracy.

## Free runs and paid research

Set assignment budget to `0` for a wholly real free-source report with no mock Celo Buy purchase and no ledger debit. LLM usage may consume provider credits; it is not represented as USDC research purchases. A nonzero purchase budget can still enter the existing mock buyer unless a live buyer URL is set, in which case that adapter remains locked pending payment proof. A report containing mock research is still labeled demo data. Live public retrieval does not unlock payments or real wallet permissions.

## Reproduce the evidence

With the compatible LLM variables securely injected into the process environment:

```sh
npx tsx scripts/live-reports.ts
```

This runs two actual HTTP commissions, reads each exact report back, asserts live provenance and an empty paid-research ledger, and writes full JSON and Markdown reports plus a header-free, body-free provider request log to `evidence/live-20261126/`. It logs assignment requests, source requests, provider status and API report readback. It never logs authorization headers, provider request bodies or environment values. `JOAN_EVIDENCE_DIR` optionally selects another output directory.

The report evidence was produced with DeepSeek `deepseek-chat`, not fixtures. See `evidence/live-20261126/ASSESSMENT.md` for editorial limitations and the separate Sepolia blocker.
