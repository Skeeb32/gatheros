# Security

Do not put credentials, ticket QR tokens, attendee data, or private event documents in public issues. Report sensitive issues through the repository owner's private contact channel.

GatherOS uses verified Supabase sessions, RLS and column-level grants, transaction-bound reservations, signed Stripe webhooks, and event-scoped AI tools. Service keys stay on servers. Every external service must be configured before live transactions.

The local operations demo intentionally uses a single seeded organizer without login. Bind it to loopback; never deploy demo mode publicly. Production setup is covered in docs/SETUP.md. A gateway/WAF must enforce global IP limits in addition to database email limits and the AI service's per-user guard.
