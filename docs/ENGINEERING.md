
# Engineering tour

## Read this in ten minutes

1. `packages/database/migrations/003_functions.sql`: reservation, fulfillment, refund, expiration and admission state transitions.
2. `apps/web/scripts/test-db.mjs`: actual Postgres sessions switch between users and roles; concurrent connections contend for the last seat and the same ticket.
3. `packages/database/migrations/005_operations.sql`: explicit organizer-only metrics and document access, plus event-specific staff permissions.
4. `apps/ai-service/app/main.py`: verify the session, authorize the event, provide a narrow tool registry, return evidence.
5. `apps/web/components/operations-workspace.tsx`: the product experience around the data.

## Money and inventory invariants

Money is stored as integer cents. The server snapshots ticket prices into order items. Browser prices are display-only. `sold + reserved <= capacity` is a database constraint. Reservation locks the ticket type and stores a unique request key; idempotency reuse with different buyer details is rejected. Checkout session creation also uses Stripe idempotency.

Paid fulfillment locks the order, validates amount/currency, records the webhook and issues tickets in one transaction. Duplicate delivery cannot issue duplicates. An expired/cancelled order cannot be resurrected by a late payment event. Refund synchronization is monotonic; full refunds invalidate tickets. A unique check-in row plus a ticket lock prevents double admission.

## Tenant isolation

RLS is applied to public tables and private helpers have fixed empty search paths. Organization membership comes from `auth.uid()`, never form input. Column grants independently prevent changes to tenant identifiers, sold counts and payment account columns. The service role is used only for narrow server workflows; it is never exposed to clients.

Organization staff and event-specific staff can check in guests. They cannot invoke the operational financial snapshot. The snapshot function is security-definer and checks ownership before reading rows. Negative tests cover cross-tenant documents, chunks, orders, drafts and metric access.

## Health formulas

- Sell-through = issued inventory / configured capacity.
- Available = capacity − sold − reserved.
- Net recorded revenue = paid/refunded order totals − recorded refunds. Totals include any checkout platform fee; this is not an organizer payout statement.
- Velocity = change in paid-order count between the most recent seven days and the preceding seven days. No baseline produces `null`, not an invented percentage.
- Check-in rate = recorded admissions / sold inventory.
- Refund rate = paid/refunded orders with a positive refund / all paid/refunded orders.

There is no arbitrary aggregate health score. The UI displays interpretable signals. It does not infer causation from changing sales.

## AI boundary

The model never receives the full event snapshot. Each tool returns a deliberately small projection; attendee emails and waitlist identities are omitted. Strict zero-argument tool schemas prevent a model from substituting another tenant. The event is fixed before the provider call. Tools are read-only; drafting does not send.

Lexical retrieval supports the keyless demo. Hosted RAG embeds document chunks and uses an event-filtered pgvector RPC with the caller's JWT. Source IDs/titles are included with responses. Retrieval quality and prompt-injection resilience need broader evaluation before a large-scale deployment; the narrow tool capability prevents model-driven writes regardless of prompt content.

## Intentional tradeoffs

- PGlite provides a frictionless database-backed local operations demo; hosted production uses Supabase.
- The inherited marketplace's no-key mode is read-only sample data, clearly distinguished from the persistent operations demo.
- Text/Markdown ingestion avoids pretending arbitrary PDF extraction is implemented.
- Shared shadcn-style primitives remain local to the web workspace rather than introducing empty UI/config packages.
- Database tables support conversational history and promo redemption, but those product flows are not falsely presented as finished.
- Large event snapshots and embedding ingestion need pagination/background workers before large-scale rollout.

## Provenance

Core ticketing, Auth, Stripe, check-in and their tests derive from the author's Gather project. GatherOS adds the monorepo, operations UI, local PostgreSQL demo, event-scoped documents and staff, waitlists, AI architecture, deployment files and expanded tests. See the original EventPilot brief and coverage map for scope.
