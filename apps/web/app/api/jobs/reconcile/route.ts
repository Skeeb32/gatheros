import type Stripe from "stripe";
import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { adminClient } from "@/lib/supabase/admin";
import { stripe } from "@/lib/stripe/client";
import { fulfillSession } from "@/lib/stripe/webhooks";
import { sendTickets } from "@/lib/email/tickets";
export const maxDuration = 60;
export async function POST(request: Request) {
  const expected = `Bearer ${process.env.CRON_SECRET || ""}`;
  const actual = request.headers.get("authorization") || "";
  if (
    !process.env.CRON_SECRET ||
    Buffer.byteLength(actual) !== Buffer.byteLength(expected) ||
    !timingSafeEqual(Buffer.from(actual), Buffer.from(expected))
  )
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const db = adminClient();
  const failures: string[] = [];
  const { data: pending, error } = await db
    .from("orders")
    .select("*")
    .eq("status", "pending")
    .lt(
      "reservation_expires_at",
      new Date(Date.now() - 5 * 60 * 1000).toISOString(),
    )
    .limit(25);
  if (error)
    return NextResponse.json(
      { error: "Database unavailable" },
      { status: 500 },
    );
  for (const o of pending || [])
    try {
      if (o.total_cents === 0) {
        const r = await db.rpc("finalize_order", {
          p_order_id: o.id,
          p_event_id: `free:${o.id}`,
          p_event_type: "free_order",
          p_session_id: null,
          p_payment_intent: null,
          p_amount: 0,
          p_currency: o.currency,
        });
        if (r.error) throw r.error;
        continue;
      }
      const api = stripe();
      let session: Stripe.Checkout.Session | null = o.stripe_checkout_session_id
        ? await api.checkout.sessions.retrieve(o.stripe_checkout_session_id)
        : null;
      if (!session) {
        for await (const candidate of api.checkout.sessions.list({
          created: {
            gte: Math.floor(new Date(o.created_at).getTime() / 1000) - 60,
            lte:
              Math.floor(new Date(o.reservation_expires_at).getTime() / 1000) +
              60,
          },
          limit: 100,
        })) {
          if (candidate.metadata?.order_id === o.id) {
            session = candidate;
            break;
          }
        }
      }
      if (session?.payment_status === "paid") {
        await fulfillSession(session, `reconcile:${session.id}`, "reconcile");
        continue;
      }
      if (session && session.status !== "expired") continue;
      const r = await db.rpc("release_order", {
        p_order_id: o.id,
        p_event_id: `expire:${o.id}`,
        p_event_type: "reconcile.expired",
        p_session_id: session?.id ?? null,
      });
      if (r.error) throw r.error;
    } catch {
      failures.push(o.id);
    }
  const { data: emails, error: emailError } = await db
    .from("orders")
    .select("id")
    .in("status", ["paid", "partially_refunded"])
    .is("email_sent_at", null)
    .limit(25);
  if (emailError) failures.push("email_query");
  for (const o of emails || [])
    try {
      await sendTickets(o.id);
    } catch {
      failures.push(o.id);
    }
  return NextResponse.json(
    { processed: pending?.length ?? 0, failures },
    { status: failures.length ? 500 : 200 },
  );
}
