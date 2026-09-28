
# EventPilot spec coverage

The original source is [EVENTPILOT-SPEC.md](EVENTPILOT-SPEC.md). This table distinguishes implemented code from scaffolding and live-service validation.

| Spec area | Delivery |
|---|---|
| 1. Authentication | Supabase signup/login/logout/reset, verified server sessions, profile/organizer settings; needs hosted Supabase |
| 2. Event management | Create/edit/publish events, storage images, ticket pricing and quantities; promo schema only |
| 3. Public pages | Canonical organizer-scoped routes and `/events/[slug]` alias; local seeded event page |
| 4. Purchasing | Stripe Checkout/free orders, reservations, atomic tickets, email/QR; credentials required |
| 5. Connect | Express onboarding, readiness webhooks, destination charges, fees |
| 6. Attendee | My tickets, QR codes, order context under RLS |
| 7. Staff | Organization roles plus event-specific staff authorization; existing-user staff management, no invitation-email flow |
| 8. Check-in | Camera/manual token input, event validation, one-time admission and actor timestamp |
| 9. Analytics | Real ledger revenue, orders, sales by day, ticket mix, refunds and check-ins; no conversion attribution |
| 10. Waitlist | Public registration, uniqueness and ordered organizer list; notification sending not implemented |
| 11. Email | Real confirmation delivery/retry, templates/provider contract, persisted operational drafts; no bulk campaign worker |
| 12. AI copilot | All named tools plus source retrieval, fixed event authorization, bounded Responses loop; live provider unverified |
| 13. Event health | Transparent metrics and baseline handling; no fabricated score or causal diagnosis |
| 14. RAG | Text/Markdown upload, SQL chunking, lexical retrieval, optional OpenAI embeddings and pgvector matching; hosted path unverified |
| 15. Database | All requested concepts, with organizations/organization_members/payments as security-invoker views over inherited tables |
| 16. Security | RLS, immutable tenant columns, Zod, signatures, scoped tools, shared database rate limits; gateway limits required for internet deployment |
| 17. Webhooks | Signature checks, transactional idempotency, failures/expiration/refunds and reconciliation |
| 18. Monorepo | Web and AI apps, database package, docs/tests/CI; UI primitives remain in web |
| 19. Quality | Build, unit, real Postgres concurrency/RLS, Python and desktop/mobile browser tests |
| 20. Seed | Local PostgreSQL organizer/staff/event, ticket types, orders, scans, partial refunds, waitlist and documents |
| 21. Documentation | README with real screenshots/GIF, diagrams, setup, environment, deployment, engineering decisions and verification |

Additional limits: no platform-admin UI, no PDF/DOCX extraction, no multi-turn history interface, no automated hosted/cloud provisioning. Stripe, Supabase Auth/Storage, Resend and OpenAI require external credentials and end-to-end staging validation.
