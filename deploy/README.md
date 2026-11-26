# Public deployment

Verified 26 November 2026. No mainnet action or wallet key belongs to this service.

## Targets

* Web: https://joan-dispatch.vercel.app/
* API: https://joan-api.94-72-105-176.sslip.io/
* Vercel project: `joan-dispatch`, `prj_5lm9LQCGKV0SBS0YvleqpKPSUNu0`
* API service: `joan-agent.service`, running as `hermes`
* nginx site: `/etc/nginx/sites-available/joan-api`, enabled by symlink
* Service definition: `/etc/systemd/system/joan-agent.service`
* Protected environment: `/etc/joan/agent.env`, root:root, mode 0600
* Durable database: `/var/lib/joan/joan.sqlite`, hermes:hermes, mode 0600, parent mode 0700
* Listener: `127.0.0.1:4312`; only nginx exposes it publicly

The installed unit matches `joan-agent.service` in this directory. systemd creates the persistent state directory, starts at boot and restarts a crashed process after five seconds, with a five-start limit per five minutes. Logs go to the journal. This is a single-host service, not redundant hosting or an off-host backup. Operator checks:

```sh
systemctl is-active joan-agent
systemctl is-enabled joan-agent
sudo -n journalctl -u joan-agent --since '10 minutes ago' --no-pager
curl https://joan-api.94-72-105-176.sslip.io/health
```

## Runtime configuration

Only the compatible DeepSeek key was copied from the explicitly authorized source into the protected environment. No credential value appears here or in verification artifacts. Nonsecret configuration:

```text
JOAN_LLM_BASE_URL=https://api.deepseek.com
JOAN_LLM_MODEL=deepseek-chat
JOAN_RESEARCH_PROVIDER=public
JOAN_DB_PATH=/var/lib/joan/joan.sqlite
PORT=4312
JOAN_CORS_ORIGINS=https://joan-dispatch.vercel.app
JOAN_PUBLIC_LIMITS=1
JOAN_DAILY_COMMISSION_CAP=60
JOAN_DAILY_LLM_CAP=60
```

`ALTANA_SESSION_KEY`, `CELO_BUY_API_URL`, `JOAN_ADMIN_PRIVATE_KEY` and `JOAN_ALLOW_MAINNET` are absent. Wallet and payments therefore remain mock and live signing is disabled. A nonzero research budget can add a mock supplement; budget zero yields wholly live public retrieval/drafting without a purchase.

The two global daily counters are reserved synchronously in SQLite. Per-IP POST counters are also durable: three commission attempts and thirty control requests per fixed UTC hour. nginx overwrites `X-Real-IP`; never put a public proxy that forwards an untrusted incoming value in front of this listener. GET requests are not subject to the application POST quota. CORS is restricted to the production web origin, but clients without Origin can still use the public API. It is not authentication.

## Redeploy procedure

API source and dependencies are currently in the repository's `agent/` directory. Preserve `/var/lib/joan` and `/etc/joan`; neither is a build output. Run tests and build before the narrowly scoped service restart, then read back `/reports/:id`, `/ledger`, `/wallet` and `/permissions` to verify persistence. The server's startup log identifies `searchMode: live`, `llmMode: live`, `walletMode: mock`, `buyMode: mock` and `liveSigningEnabled: false` without logging secrets.

The Vite browser bundle must be built with:

```text
VITE_JOAN_API_URL=https://joan-api.94-72-105-176.sslip.io
```

The current production alias is stored above, not the disposable per-deployment URL. Deployment protection was disabled and read back as null for both SSO and password protection. No automation bypass was created. `web/.vercelignore` excludes test evidence and screenshots from future Vercel uploads.

HTTPS uses the dedicated Let's Encrypt certificate for the API hostname and the existing certbot renewal mechanism. nginx passed configuration testing; existing unrelated Pulse and Tab sites remained HTTP 200 after the reload. Shared nginx was reloaded, not restarted. Existing unrelated nginx warnings about protocol options and a duplicate MIME type were present; they did not prevent configuration validation.

## Evidence and limits

* `evidence/public-report.json`: actual UI commission response, exact readback equality asserted.
* `evidence/public-readback.json`: real public API snapshots.
* `evidence/restart.json`: exact pre/post service-restart equality and sanitized counter summary.
* `evidence/browser.json`: final public-browser results at 1440 and 390.
* `evidence/browser-first-pass.json`: preserved initial partial pass with the Vercel checkpoint failures.
* `evidence/first-attempt.json`: official RFC HTML failed the 512 KiB ceiling before any model call. The official RFC text succeeded.
* `evidence/agent-tests.txt`, `web-tests.txt`, `web-e2e.txt`: fresh local verification output.
* `../docs/screenshots/`: nine product/API desktop views plus separate responsive QA captures.

Two public commission executions occurred during verification: the size-bound failure and the successful text-source report. Only one reached the model draft invocation. The deployed SQLite counter readback confirmed that one invocation; there was no automatic model retry. Reports, ledger, wallet, permissions and counters were unchanged across a real service restart.

The final screenshot run used an existing Compute 2 SOCKS egress after Vercel challenged this server's IP. It used ordinary public HTTPS pages, without interception, auth headers or a Vercel automation bypass. The final run had no console errors, request failures or overflow at either width. An independent Compute 4 browser also loaded both widths with all images complete and zero logged errors. The temporary QA tunnel was closed and the previously hibernated Compute 4 box returned to hibernation after verification.

The independent extraction service also read both the web entry and `/health` without credentials. Public access is not a promise that Vercel will never challenge automated clients. Mainnet proofs, public repository publication, independent-user evidence, recorded video and portal submission remain separate completion gates.
