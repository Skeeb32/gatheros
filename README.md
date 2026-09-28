
<div align="center">
  <img src="docs/assets/hero.svg" alt="GatherOS — Great events don't happen by accident" width="100%" />
  <br/><br/>
  <a href="https://github.com/Skeeb32/gatheros/actions/workflows/ci.yml"><img src="https://github.com/Skeeb32/gatheros/actions/workflows/ci.yml/badge.svg" alt="GatherOS CI" /></a>
  <img src="https://img.shields.io/badge/Next.js-16-26372e?logo=nextdotjs&amp;logoColor=white" alt="Next.js 16" />
  <img src="https://img.shields.io/badge/TypeScript-strict-3178c6?logo=typescript&amp;logoColor=white" alt="TypeScript strict" />
  <img src="https://img.shields.io/badge/FastAPI-Python-009688?logo=fastapi&amp;logoColor=white" alt="FastAPI" />
  <img src="https://img.shields.io/badge/Postgres-RLS_%2B_pgvector-4169e1?logo=postgresql&amp;logoColor=white" alt="PostgreSQL RLS and pgvector" />
  <a href="LICENSE"><img src="https://img.shields.io/badge/license-MIT-a8bf81" alt="MIT license" /></a>
  <p><strong>The calm command center behind a memorable gathering.</strong></p>
  <p>Sell tickets. Understand momentum. Welcome guests.<br/>Ask your event a question—and see where the answer came from.</p>
  <p><a href="#try-it-in-two-minutes">Run locally</a> · <a href="#see-the-product">Product tour</a> · <a href="docs/ENGINEERING.md">Engineering tour</a> · <a href="docs/SETUP.md">Connect services</a> · <a href="docs/VERIFICATION.md">Verification</a></p>
</div>

## See the product

**Actual application screenshots, backed by a seeded PostgreSQL database.** The local operations demo persists document uploads, inventory edits, email drafts, and waitlist registrations. It never simulates a successful payment or pretends to call an LLM.

![GatherOS operations dashboard with revenue, inventory, event health and copilot](docs/assets/dashboard.png)

<details>
<summary><strong>A short tour: overview → inventory → knowledge → grounded answer</strong></summary>

![GatherOS walkthrough captured from the running application](docs/assets/walkthrough.gif)

</details>

<details>
<summary><strong>Made for the phone at the venue, too</strong></summary>

<img src="docs/assets/mobile.png" width="330" alt="GatherOS mobile operations dashboard" />

</details>

## Why this project matters

A ticket purchase looks simple. The system behind it isn't. Two people want the last seat. A payment webhook arrives twice. Staff scan the same QR code at two entrances. An organizer asks the AI about somebody else's event.

**GatherOS makes those boundaries the centerpiece.** It connects product design, full-stack delivery, relational modeling, concurrency, authorization, payments, and grounded AI in one reviewable project. The dashboard is useful because its numbers come from the same ledger that issues the tickets.

| Engineering problem | Where to look |
|---|---|
| Sell the last ticket exactly once | [Row-locked reservation & fulfillment](packages/database/migrations/003_functions.sql) and [real concurrency tests](apps/web/scripts/test-db.mjs) |
| Keep one organization's data away from another | [RLS and column grants](packages/database/migrations/002_rls.sql), plus [event-scoped operations](packages/database/migrations/005_operations.sql) |
| Let AI use data without granting arbitrary database access | [FastAPI tool registry and authorization boundary](apps/ai-service/app/main.py) |
| Explain the numbers rather than invent a score | [Health formulas](apps/web/lib/ops/types.ts) |
| Recover when payments succeed but email delivery fails | [Idempotent fulfillment](apps/web/lib/stripe/webhooks.ts) and [reconciliation job](apps/web/app/api/jobs/reconcile/route.ts) |
| Ship a useful demo without third-party credentials | [Embedded PostgreSQL adapter](apps/web/lib/ops/local.ts) running the core migrations and RLS |

## What you can do

- **Operate an event:** revenue and sales charts, sold/available/reserved inventory, waitlists, check-in and refund rates, and days to go. No fabricated conversion rate or AI health score.
- **Manage the business:** Supabase sign-up/login/password reset, organizer settings, event creation and editing, publication, ticket types, storage-backed event images, and staff role management.
- **Sell and admit:** server-priced Stripe Checkout, Connect Express onboarding, application fees, free tickets, transaction-safe inventory holds, signed and idempotent webhooks, refund synchronization, QR ticket emails, attendee tickets, and atomic check-in.
- **Build event knowledge:** upload UTF-8 text/Markdown, chunk documents transactionally, retrieve source passages, and enable OpenAI embeddings with pgvector.
- **Work with a copilot:** ask about ticket inventory, revenue, admissions, sales history, waitlists, or venue information; draft a reminder without sending it automatically.

### Honest implementation boundaries

| Mode / feature | Status |
|---|---|
| Local operations demo | Working PostgreSQL-backed writes; one explicitly seeded organizer; loopback only |
| Marketplace demo | Read-only sample storefront; payment and event-management mutations require connected services |
| Supabase authentication, event management, checkout, QR delivery/check-in | Implemented; requires your Supabase/Stripe/email configuration |
| OpenAI Responses tool loop | Implemented and contract-tested; requires credentials; not live-provider tested in this build |
| RAG | Local lexical retrieval works; optional embedding indexing and pgvector SQL are included; hosted vector path needs deployment validation |
| Operational email campaigns | Editable persisted drafts and provider contract/templates; bulk sending worker is not implemented |
| Promo codes | Normalized schema scaffold; redemption/Checkout wiring is not implemented |
| Platform administration | Server-only administrative boundary; no platform-admin console |
| PDF/DOCX document extraction, conversational history UI, conversion attribution | Not implemented; text/Markdown and single-turn copilot are supported |

The [spec coverage map](docs/SPEC-COVERAGE.md) tracks the original EventPilot brief without claiming unfinished work as complete.

## Try it in two minutes

Requires **Node.js 22.12+**. No API keys or Docker needed for the local operations demo.

```bash
git clone https://github.com/Skeeb32/gatheros.git
cd gatheros
npm ci
npm run dev
```

Open **http://localhost:3000/operations**. First launch creates an embedded PostgreSQL database and seeds an organizer, staff member, event, three ticket types, 244 orders/tickets, sample scans/refunds, 12 waitlist entries, and two event documents.

Try this sequence:

1. Ask **“How many VIP tickets are left?”**
2. Ask **“Where should VIP attendees enter?”** and inspect the source.
3. Open **Knowledge**, upload a `.txt` or `.md`, and query its contents.
4. Generate a reminder, edit it, and save it under **Email drafts**.
5. Adjust ticket capacity. PostgreSQL rejects values below sold + reserved inventory.
6. Visit **Event page** and join the waitlist; return to see the new record.

Data persists in `apps/web/.gatheros/`, which Git ignores. To reset your local demo, stop the app and remove that directory. Never do this to a database you need to keep. Only run one web process against an embedded database directory.

For a production-build preview:

```bash
npm run build
GATHEROS_DEMO=true npm start
```

Or use `docker compose up --build`. The provided Compose file binds the demo to your loopback interface. Do not publish demo mode to the internet.

## Architecture

```mermaid
flowchart LR
  User[Organizer / attendee / staff] --> Web[Next.js App Router]
  Web --> Auth[Supabase Auth]
  Web --> DB[(PostgreSQL + RLS)]
  Web --> Storage[Supabase Storage]
  Web --> Stripe[Stripe Checkout + Connect]
  Stripe --> Hook[Signed webhook]
  Hook --> Tx[Atomic fulfillment + ticket issuance]
  Tx --> DB
  Tx --> Email[Resend / QR ticket delivery]
  Web --> AI[FastAPI copilot]
  AI --> Gate[Verify JWT + authorize event]
  Gate --> Tools[Explicit event-scoped tools]
  Tools --> DB
  AI --> OpenAI[OpenAI Responses]
  AI --> RAG[Document retrieval + citations]
  RAG --> Vector[(pgvector)]
```

**Local demo:** the operations adapter uses PGlite, a real embedded PostgreSQL engine, and executes the same core schema, grants, policies, and functions. It impersonates a fixed seed organizer only inside the local adapter. Connected production requests use verified Supabase sessions and RLS; they never trust a client-provided organizer ID.

```text
apps/
  web/                 Next.js UI, server actions, API routes, Vitest/Playwright
  ai-service/          FastAPI, bounded Responses tool loop, retrieval, Pytest
packages/
  database/            SQL migrations, security policies, fixtures, local seed
    optional/          pgvector migration
    tests/             Isolated Supabase contract fixtures
  # Shared UI primitives live in apps/web/components/ui to avoid empty packages.
docs/                  Setup, decisions, security boundaries, visual tour
.github/workflows/     Build, audit, PostgreSQL, browser and Python checks
```

## How the copilot stays grounded

```mermaid
sequenceDiagram
  participant O as Organizer
  participant W as Next.js
  participant A as FastAPI
  participant D as Supabase / RLS
  participant M as OpenAI
  O->>W: Ask about an event
  W->>D: Verify session + event access
  W->>A: Forward user JWT, event ID, question
  A->>D: Verify user + authorized event snapshot
  A->>M: Question + strict tool definitions
  M->>A: Choose an allowed tool (no tenant/SQL arguments)
  A->>M: Scoped tool result / document excerpts
  M->>A: Grounded answer
  A->>O: Answer, tool trace, source citations
```

Tools cover `get_event_stats`, `get_ticket_inventory`, `get_revenue_stats`, `get_sales_history`, `get_ticket_type_stats`, `get_checkin_stats`, `get_waitlist`, `get_attendee_count`, `generate_email_draft`, and `search_event_documents`.

Tool outputs omit attendee contact details. The model cannot select a tenant, execute SQL, send emails, or mutate inventory. The loop has a four-round budget, strict empty argument schemas, bounded output, provider timeouts, and `store=false`. Retrieved content is treated as untrusted evidence.

## Configuration

Copy `apps/web/.env.example` to `apps/web/.env.local` for connected mode. Set `GATHEROS_DEMO=false`. Copy `apps/ai-service/.env.example` to `apps/ai-service/.env` for the Python service.

| Variable | Service | Purpose |
|---|---|---|
| `NEXT_PUBLIC_APP_URL` | Web | Exact canonical origin and redirects |
| `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Web | Public Supabase project values; protected by RLS |
| `SUPABASE_SERVICE_ROLE_KEY` | Web / optional AI indexer | Privileged server operations; never public |
| `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` | Web | Server payments and webhook verification |
| `PLATFORM_FEE_BPS` | Web | Platform fee basis points; default 1000 |
| `RESEND_API_KEY`, `EMAIL_FROM` | Web | Verified ticket-email sender |
| `CRON_SECRET` | Web | Protects scheduled reconciliation |
| `AI_SERVICE_URL` | Web | Internal FastAPI base URL |
| `SUPABASE_URL`, `SUPABASE_ANON_KEY` | AI | JWT verification and RLS-scoped access |
| `OPENAI_API_KEY`, `OPENAI_MODEL` | AI | OpenAI provider; model is configurable |
| `OPENAI_EMBEDDING_MODEL`, `RAG_MODE` | AI | 1536-dimensional embeddings; `lexical` or `vector` |
| `GATHEROS_DEMO` | Web | Explicit local-only preview switch for production builds |

See [SETUP.md](docs/SETUP.md) for migrations, Stripe webhook events, Connect onboarding, email, OpenAI, indexing, and deployment.

## Testing

```bash
npm test                     # Domain, webhook, checkout, health and retrieval tests
npm run build                # Production compile and strict TypeScript check

# Use an isolated local PostgreSQL admin connection. Runner creates/drops its own DB.
TEST_DATABASE_URL=postgresql://postgres:postgres@localhost:5432/postgres npm run test:db

npx playwright install chromium
npm run test:e2e              # Desktop + mobile, starts the production build

cd apps/ai-service
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.lock.txt
python -m pytest -q
uvicorn app.main:app --reload --env-file .env
```

GitHub Actions runs dependency audit, unit tests, real PostgreSQL authorization/concurrency tests, the production build, browser flows, and Python tests. [Verification details and limits](docs/VERIFICATION.md) distinguish local evidence from hosted integration checks.

## Deployment

Use Supabase for Auth/Postgres/Storage, a Node host for Next.js, and a container host for FastAPI. AWS ECS/Fargate with an ALB and Secrets Manager is documented in the [deployment guide](docs/SETUP.md#deployment). The Dockerfiles are included; this repository does not create cloud resources or spend cloud credits.

Before accepting real orders, validate Stripe test-mode checkout, duplicate/expired webhooks, refunds, ticket email delivery, RLS under real sessions, and the hosted embedding path. Configure a global gateway rate limit, monitoring, database backups, and reconciliation scheduling.

## Project notes

Built from the [EventPilot brief](docs/EVENTPILOT-SPEC.md), with the event operations and AI layer added to the author's [Gather ticketing foundation](https://github.com/Skeeb32/gather). GatherOS is a separate monorepo with its own UI, seed data, FastAPI service, migrations, tests, and release documentation.

Designed and engineered as a portfolio project by **Shaqib Habib**. [MIT licensed](LICENSE).
