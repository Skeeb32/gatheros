
# Setup and deployment

## 1. Supabase

Create a Supabase project. Apply `packages/database/migrations/001_schema.sql` through `006_rate_limits.sql` in lexical order using the SQL editor or a privileged migration connection. Apply each file in a transaction. The `auth` and `storage` schemas already exist in Supabase.

**Never run `packages/database/tests/bootstrap.sql` on Supabase.** It supplies minimal contracts only for isolated integration tests and PGlite. `seed.sql` is likewise a local-development seed, not an auth provisioning mechanism for a hosted project.

Set public URL/anon key and server-only service-role key in the web environment. Set the canonical origin in `NEXT_PUBLIC_APP_URL`, configure that site URL and `/callback` redirect in Supabase Auth, and enable email/password authentication. Sign up, confirm email if required, create an organizer in Settings, then create an event and ticket types. Use a second account for staff testing. Upload a cover through the event editor; migration 004 creates the image bucket and scoped storage policies.

Roles: owners/admins manage settings; owners/admins/managers manage events; staff scan. Event-specific staff rows also permit scanning only that event. Attendees read their own orders. Column grants prevent clients rewriting tenant IDs, sold inventory, or Stripe account configuration. Operational financial RPCs explicitly exclude staff.

## 2. Stripe and Connect

Use test keys first. Set `STRIPE_SECRET_KEY`. Open organizer Settings and complete Connect Express onboarding; webhooks update account readiness. Purchases are blocked until the connected account is active.

Forward test events to `/api/webhooks/stripe` and set the endpoint signing secret as `STRIPE_WEBHOOK_SECRET`. Subscribe to:

- `checkout.session.completed`
- `checkout.session.async_payment_succeeded`
- `checkout.session.expired`
- `checkout.session.async_payment_failed`
- `charge.refunded`
- `account.updated`

Checkout uses server-side price snapshots, destination charges and an application fee; raw card information never enters this application. Supported currency is USD; card Checkout is enabled. Orders reserve inventory under a row lock. The success redirect is informational; only validated server fulfillment issues tickets. Free orders use the same finalization transaction without Stripe.

Refunds initiated in Stripe synchronize through `charge.refunded`. Partial refunds reduce revenue but preserve admission; full refunds revoke the order's tickets. There is no organizer refund-button UI.

Schedule an authenticated POST to `/api/jobs/reconcile` every few minutes using `Authorization: Bearer <CRON_SECRET>`. It resolves stale reservations through Stripe and retries ticket email delivery. Do not release payable sessions based only on a local timeout. Add a maintenance job to delete old `private.request_limits` rows after their window has expired.

## 3. Email

Set `RESEND_API_KEY` and `EMAIL_FROM` to a verified sender. Ticket delivery includes QR images, claims the order in the database, and uses an idempotency key. A delivery failure does not roll back a paid order; reconciliation retries it.

Operational reminders and announcements are stored as reviewable drafts in `notifications`. `lib/email/templates.ts` defines the templates and provider interface. Bulk campaigns, unsubscribe controls, and waitlist notification workers remain future work; the UI does not claim it sent anything.

## 4. FastAPI and OpenAI

Create a Python 3.12+ virtual environment in `apps/ai-service`, install `requirements.lock.txt`, and populate `.env` from `.env.example`. Start:

```bash
uvicorn app.main:app --host 127.0.0.1 --port 8000 --env-file .env
```

Set the web app's `AI_SERVICE_URL`. The service validates the forwarded user token with Supabase Auth, then calls `event_operations` with that same token. Every tool uses the resulting authorized event snapshot. No model argument can change the event or organization. The API does not accept user-provided SQL or URLs.

The configurable default is `gpt-4.1-mini`; choose a Responses-compatible tool-calling model available to your account. Outputs are bounded and stored-provider response retention is disabled with `store=false`. Do not treat retrieved documents as trusted instructions. Human review remains necessary for generated email drafts.

Without configured Supabase/AI service, the web copilot uses an explicitly labeled deterministic path. It reads actual event data and performs lexical document retrieval; it does not call OpenAI.

## 5. Optional pgvector retrieval

Apply `packages/database/optional/006_vectors.sql` to Supabase after core migrations. It adds a 1536-dimensional embedding column, HNSW cosine index, and an RLS-respecting event-scoped matching RPC.

1. Add text/Markdown documents in Knowledge. A database trigger creates overlapping 1,000-character chunks on an 800-character stride.
2. Set `OPENAI_API_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, and `OPENAI_EMBEDDING_MODEL=text-embedding-3-small` on the AI service.
3. POST `{"event_id":"<event-uuid>"}` to `/documents/index` with the organizer's Bearer token.
4. Set `RAG_MODE=vector` after indexing succeeds.

The indexer reads chunks under the user's RLS scope and writes embeddings only to those returned IDs using the service key. The current endpoint indexes at most 100 chunks per request; large corpora need a paginated background ingestion worker. Re-index after replacing documents or changing the embedding model. Vector integration is provided but was not exercised against a hosted project in this build.

## Deployment

### Node hosting / Vercel

Install from the monorepo root with `npm ci`; build with `npm run build`. The app directory is `apps/web`, and the runtime must include the workspace dependencies. Configure Supabase's public values at build time, all server secrets at runtime, and `GATHEROS_DEMO=false`. Production must use Supabase, not the embedded local demo.

### Docker and AWS

The root Dockerfile builds Next.js. Pass `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` as build arguments for a connected image. These are public project values, never service credentials. Server secrets are runtime environment values.

The AI Dockerfile installs the locked Python dependencies and runs as an unprivileged user. Push each image to ECR, deploy separate ECS/Fargate services, expose the web app behind an HTTPS ALB, and keep the AI service on private networking reachable only from the web service. Set `AI_SERVICE_URL` to its internal address. Inject server secrets from Secrets Manager. Use `/health` for AI health checks. Scale the connected web service freely; do not share a PGlite directory across processes.

Use WAF/API gateway limits in front of checkout/auth and the AI endpoint. The database enforces per-email checkout/waitlist limits and per-user web operations limits. FastAPI has an additional per-worker user rate guard; this is not a global distributed limit.

Configure CloudWatch structured infrastructure logs and alarms without logging JWTs, service keys, ticket QR tokens, or document bodies. Back up Postgres, exercise restore, schedule reconciliation, and test the full test-mode payment lifecycle before accepting money.

The included Compose file is a **local demo configuration**, not a production deployment manifest. Docker execution and cloud deployment were not performed in this environment.

## Primary documentation used

- [Next.js App Router installation](https://nextjs.org/docs/app/getting-started/installation)
- [Supabase server-side authentication](https://supabase.com/docs/guides/auth/server-side/creating-a-client)
- [Stripe Checkout fulfillment](https://docs.stripe.com/checkout/fulfillment)
- [OpenAI Responses function calling](https://developers.openai.com/api/docs/guides/function-calling)
