Given your background in **React, Python, AWS, AI/LLMs, and event platforms**, I'd build something that is more than a CRUD app and gives you something impressive to show recruiters.

### Idea: AI Event Operations Copilot

Build a **mini Eventbrite + AI operations platform** where an organizer creates an event and the system helps manage everything around it.

**Core features:**

- Event creation and customizable event pages
- Ticket types, inventory, promo codes, refunds
- Stripe payments
- Attendee registration and QR-code check-in
- Organizer dashboard with revenue, attendance, and ticket analytics
- Email notifications
- Waitlist management
- Staff accounts with role-based permissions
- Supabase/Postgres + Row Level Security
- Stripe Connect for organizer payouts
- AI assistant that can answer questions about the event

The interesting part is the **AI layer**.

For example, an organizer could ask:

> "How many tickets do I have left for VIP?"

> "Which ticket type is selling the fastest?"

> "We're 10 days away and only 42% sold. What should I do?"

> "Write an email to attendees reminding them about the event."

> "Summarize our ticket sales this week."

The AI shouldn't just be a chatbot. Give it **tools/functions** it can call against your database:

```text
get_event_stats()
get_ticket_inventory()
get_attendee_count()
get_revenue()
get_sales_by_day()
get_waitlist()
create_email_draft()
```

That lets you demonstrate **tool calling + RAG/LLM integration + real application architecture**, rather than simply saying you know AI.

### Tech stack I'd give Codex

```text
Frontend:
Next.js
React
TypeScript
Tailwind
shadcn/ui

Backend:
Next.js API routes / server actions
Python FastAPI for AI services

Database:
Supabase
PostgreSQL
Supabase Auth
Supabase Storage
Row Level Security

Payments:
Stripe
Stripe Connect

AI:
OpenAI API
Tool calling
Embeddings
pgvector

Infrastructure:
Docker
AWS
GitHub Actions

Testing:
Vitest
Playwright
Pytest
```

### One feature I'd particularly add

Create an **Event Health Score** dashboard.

Not an arbitrary AI score, but a transparent set of metrics:

```text
EVENT HEALTH

Tickets Sold       68%
Sales Velocity     ↑ 14%
Revenue             $8,420
Days Until Event    18
Waitlist            37
Refund Rate         2.1%

Potential Issues
• VIP tickets are selling 2.4x faster than General Admission
• Sales have declined 18% over the last 7 days
• 37 people are currently on the waitlist

Suggested Actions
• Increase VIP inventory by 20
• Send reminder campaign to abandoned registrations
• Release 10 additional GA tickets
```

That gives you a **real full-stack + data + AI project** rather than another generic todo app.

### Prompt I'd give Codex

You can literally give Codex this:

Build a production-quality full-stack event ticketing platform called "EventPilot".

The application should function as a smaller-scale Eventbrite alternative for event organizers.

TECH STACK

Frontend:

- Next.js with App Router
- React
- TypeScript
- Tailwind CSS
- shadcn/ui

Backend:

- Next.js server actions/API routes for standard application operations
- Python FastAPI service for AI functionality

Database:

- Supabase PostgreSQL
- Supabase Auth
- Supabase Storage
- PostgreSQL Row Level Security
- pgvector

Payments:

- Stripe
- Stripe Connect Express accounts
- Stripe Checkout

AI:

- OpenAI API
- Tool/function calling
- pgvector for event/attendee document retrieval

TESTING:

- Vitest
- Playwright
- Pytest

INFRASTRUCTURE:

- Docker
- GitHub Actions
- Environment variables for all secrets
- Production-ready error handling and logging

CORE USER ROLES

1. Platform Admin
2. Event Organizer
3. Event Staff
4. Attendee

CORE FEATURES

1. Authentication

- Sign up
- Login
- Logout
- Password reset
- Organizer profile
- Role-based authorization

2. Event Management
   Organizers should be able to:

- Create events
- Edit events
- Publish/unpublish events
- Add event name, description, images, venue, address, date and time
- Configure capacity
- Configure ticket types
- Set ticket prices
- Set ticket inventory
- Create promo codes
- Create free tickets
- Create VIP tickets
- Create early-bird tickets

3. Public Event Pages

Create a public event URL such as:

/events/[event-slug]

The page should display:

- Event image
- Event description
- Date/time
- Location
- Ticket options
- Remaining inventory
- Organizer information
- Buy ticket button

The page should be responsive and polished.

4. Ticket Purchasing

Implement Stripe Checkout.

After successful payment:

- Create an order
- Create ticket records
- Associate tickets with the attendee
- Decrease ticket inventory
- Send confirmation email
- Generate a unique QR code for every ticket

Handle failed payments and abandoned checkouts safely.

5. Stripe Connect

Organizers should be able to connect their Stripe account.

Use Stripe Connect so that:

- Attendee pays through the platform
- Platform records the transaction
- Organizer receives their portion
- Platform can collect an application fee

Never store raw credit card information.

6. Attendee Dashboard

Attendees should be able to see:

- Upcoming events
- Past events
- Purchased tickets
- Order history
- QR codes
- Ticket details

7. Event Staff

Organizers should be able to invite staff members.

Staff can:

- View event attendees
- Scan tickets
- Check attendees in
- See check-in statistics

Staff should NOT be able to:

- Change ticket prices
- Access Stripe settings
- Delete events
- Change organizer settings

Implement these permissions using both application authorization and Supabase RLS.

8. QR CHECK-IN

Create a check-in interface that can scan a ticket QR code.

When scanned:

- Validate ticket
- Verify ticket belongs to the correct event
- Check whether ticket was already used
- Mark ticket as checked in
- Record timestamp and staff member

Return clear success/error states.

9. ORGANIZER DASHBOARD

Create a polished analytics dashboard showing:

- Total revenue
- Tickets sold
- Tickets remaining
- Orders
- Refunds
- Check-ins
- Conversion rate
- Sales by day
- Sales by ticket type

Include charts.

10. WAITLIST

When an event or ticket type sells out:

- Allow attendees to join a waitlist
- Record position
- Allow organizers to view the waitlist

When inventory becomes available:

- Allow organizers to notify people on the waitlist.

11. EMAIL SYSTEM

Create email templates for:

- Ticket confirmation
- Event reminder
- Ticket cancellation
- Waitlist notification
- Organizer announcements

Keep email sending behind an abstraction so the provider can be changed later.

12. AI EVENT OPERATIONS COPILOT

Create an AI assistant available inside the organizer dashboard.

The organizer should be able to ask questions such as:

"How many tickets have we sold?"

"How much revenue have we generated?"

"Which ticket type is selling fastest?"

"How many people have checked in?"

"How many VIP tickets remain?"

"Why did sales slow down this week?"

"Write an email reminding attendees about the event."

The AI must NOT have unrestricted database access.

Implement explicit tools/functions:

get_event_stats
get_ticket_inventory
get_revenue_stats
get_sales_history
get_ticket_type_stats
get_checkin_stats
get_waitlist
get_attendee_count
generate_email_draft

The AI should only access data belonging to the authenticated organizer's events.

13. EVENT HEALTH DASHBOARD

Create an Event Health section based on transparent metrics.

Display:

- Tickets sold percentage
- Sales velocity
- Revenue
- Days until event
- Check-in percentage
- Refund percentage
- Waitlist size

Identify notable changes in the metrics.

Do NOT make arbitrary claims or fabricate metrics.

14. AI RAG

Allow organizers to upload event-related documents such as:

- Venue information
- Event schedules
- FAQs
- Speaker information
- Vendor information

Extract and chunk the documents.

Generate embeddings and store them in pgvector.

Allow the AI assistant to answer questions using these documents.

Example:

"Where should VIP attendees enter?"

"What time does the keynote start?"

"What is the venue's parking policy?"

Include citations to the uploaded event documents when possible.

15. DATABASE

Design a normalized PostgreSQL schema including at minimum:

profiles
organizations
organization_members
events
event_staff
ticket_types
tickets
orders
order_items
payments
promo_codes
promo_code_redemptions
check_ins
waitlist_entries
event_documents
document_chunks
ai_conversations
ai_messages
notifications

Use UUID primary keys.

Add appropriate foreign keys, indexes, timestamps, constraints and unique indexes.

16. SECURITY

Security is extremely important.

Implement:

- Supabase RLS
- Organization-level authorization
- Event-level authorization
- Staff permissions
- Server-side validation
- Zod validation
- Stripe webhook signature verification
- Rate limiting for sensitive endpoints
- Never expose service-role credentials to the browser
- Never trust client-supplied organizer IDs
- Never allow an organizer to access another organization's events

17. STRIPE WEBHOOKS

Implement webhook handling for relevant Stripe events.

Make webhook processing idempotent.

Do not rely solely on the frontend redirect to confirm payment.

18. PROJECT STRUCTURE

Use a clean monorepo structure similar to:

/apps
/web
/ai-service

/packages
/database
/ui
/types
/config

/docs

/tests

19. DEVELOPMENT QUALITY

Do not create fake implementations simply to make the UI appear functional.

Every major button should connect to a real backend operation.

Create loading, empty, success and error states.

Use reusable components.

Use proper TypeScript types.

Use database transactions where appropriate.

Add meaningful tests for:

- Authentication
- Authorization
- Ticket purchasing
- Inventory
- Stripe webhook processing
- QR check-in
- RLS
- AI tool authorization

20. SEED DATA

Create a development seed script containing:

- One organizer
- One event
- Multiple ticket types
- Sample attendees
- Sample orders
- Sample check-ins
- Sample waitlist entries
- Sample event documents

21. DOCUMENTATION

Create a comprehensive README containing:

- Architecture
- Local setup
- Environment variables
- Supabase setup
- Stripe setup
- Stripe Connect setup
- OpenAI setup
- Database migrations
- Seed instructions
- Running tests
- Deployment instructions

IMPORTANT DEVELOPMENT RULES

Build the project incrementally.

First establish the database schema and authentication.

Then implement event management.

Then ticket purchasing and Stripe.

Then attendee/staff functionality.

Then analytics.

Then AI functionality.

After each major phase, run tests and fix errors before continuing.

Do not skip security or authorization.

Do not use mock data for functionality that should use the database.

If a design or implementation decision is ambiguous, choose the approach that is easiest to maintain, secure and deploy.

The final application should look and feel like a real SaaS product rather than a tutorial project.

**This would be a particularly strong portfolio project for you** because you can talk about it in interviews from several angles: full-stack architecture, PostgreSQL/RLS, Stripe payments, React/Next.js, Python/FastAPI, AWS, AI tool calling, RAG, testing, security, and real-world event operations.
