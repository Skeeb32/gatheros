# Verification record

Verified locally on 2026-09-28 UTC (macOS; Node 22.12, Next.js 16.3.6, Python 3.14, real PostgreSQL). CI targets Node 22, Python 3.12 and PostgreSQL 17.

| Check | Result |
|---|---|
| Production Next.js build + strict TypeScript | Passed |
| Vitest unit/route tests | 34 passed |
| Real PostgreSQL integration tests | 50 passed |
| Pytest service/tool tests | 12 passed |
| Playwright desktop/mobile flows | 20 passed |
| npm dependency audit | 0 vulnerabilities |

**116 automated tests passed locally.** Build and audit are additional checks.

Database coverage includes tenant isolation, column-grant protections, owner/staff permissions, cross-tenant document/chunk access, scoped financial RPCs, last-seat concurrency, duplicate webhooks, underpayment rollback, checkout replay, reservation release, partial/full refunds, atomic admission, waitlist idempotency, database rate limits, and event-specific staff.

Browser flows verify both desktop and mobile: real metrics and cited venue retrieval, persisted document upload across reload, persisted human-reviewed email drafts, public waitlist signup, marketplace filtering, safe rejection of unconfigured payment/auth mutations, and absence of horizontal overflow.

AI tests cover verified-session and event-authorization failures, privacy-preserving tool projections, unknown tools, model argument rejection, and a mocked Responses function-call round trip. No OpenAI charges were incurred.

## Limits

- Supabase Auth/Storage, Stripe Connect/Checkout, Resend and OpenAI were not exercised with live credentials. Their integration code and local contract/security tests are included.
- Hosted pgvector indexing/retrieval is not end-to-end verified.
- Dockerfiles and Compose are supplied but were not executed because Docker Engine is not available here. AWS resources were not provisioned.
- A Starlette test-client deprecation warning is present; all Python tests pass.
- The local demo is intentionally single-user and must remain on loopback.
- CI status is shown by the live README badge; local verification is not a claim of a completed hosted run.

Screenshots and the GIF are captured from the running app, not generated product mockups. Regenerate with `DEMO_URL=http://127.0.0.1:3000 node scripts/capture-demo.mjs` after installing Playwright Chromium.
