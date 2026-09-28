import "server-only";
import type Stripe from "stripe";
import { stripe } from "./client";
import { adminClient } from "@/lib/supabase/admin";
import { sendTickets } from "@/lib/email/tickets";
export async function fulfillSession(
  session: Stripe.Checkout.Session,
  eventId: string,
  eventType: string,
) {
  if (session.payment_status !== "paid") return;
  const orderId = session.metadata?.order_id;
  if (!orderId) throw new Error("Missing order metadata");
  const db = adminClient();
  const pi =
    typeof session.payment_intent === "string"
      ? session.payment_intent
      : (session.payment_intent?.id ?? null);
  const { error } = await db.rpc("finalize_order", {
    p_order_id: orderId,
    p_event_id: eventId,
    p_event_type: eventType,
    p_session_id: session.id,
    p_payment_intent: pi,
    p_amount: session.amount_total,
    p_currency: session.currency,
  });
  if (error) throw error;
  if (pi) {
    const intent = await stripe().paymentIntents.retrieve(pi, {
      expand: ["latest_charge"],
    });
    const charge = intent.latest_charge as Stripe.Charge | null;
    if (charge && typeof charge !== "string") {
      const id = (v: unknown) =>
        typeof v === "string" ? v : ((v as { id?: string })?.id ?? null);
      const saved = await db
        .from("payment_transactions")
        .update({
          stripe_charge_id: charge.id,
          stripe_transfer_id: id(charge.transfer),
          stripe_application_fee_id: id(charge.application_fee),
        })
        .eq("stripe_payment_intent_id", pi);
      if (saved.error) throw saved.error;
    }
  }
  await sendTickets(orderId);
}
export async function processWebhook(event: Stripe.Event) {
  const db = adminClient();
  const api = stripe();
  switch (event.type) {
    case "checkout.session.completed":
    case "checkout.session.async_payment_succeeded": {
      const incoming = event.data.object as Stripe.Checkout.Session;
      const session = await api.checkout.sessions.retrieve(incoming.id);
      await fulfillSession(session, event.id, event.type);
      break;
    }
    case "checkout.session.expired":
    case "checkout.session.async_payment_failed": {
      const session = await api.checkout.sessions.retrieve(
        (event.data.object as Stripe.Checkout.Session).id,
      );
      if (session.payment_status === "paid") {
        await fulfillSession(session, event.id, event.type);
        break;
      }
      if (session.status !== "expired") break;
      if (session.metadata?.order_id) {
        const { error } = await db.rpc("release_order", {
          p_order_id: session.metadata.order_id,
          p_event_id: event.id,
          p_event_type: event.type,
          p_session_id: session.id,
        });
        if (error) throw error;
      }
      break;
    }
    case "payment_intent.succeeded": {
      const sessions = await api.checkout.sessions.list({
        payment_intent: (event.data.object as Stripe.PaymentIntent).id,
        limit: 1,
      });
      if (sessions.data[0])
        await fulfillSession(sessions.data[0], event.id, event.type);
      break;
    }
    case "payment_intent.payment_failed":
      break; // Checkout can still be retried; retain inventory until session expiration.
    case "charge.refunded": {
      const charge = await api.charges.retrieve(
        (event.data.object as Stripe.Charge).id,
      );
      const pi =
        typeof charge.payment_intent === "string"
          ? charge.payment_intent
          : charge.payment_intent?.id;
      if (pi) {
        const { error } = await db.rpc("refund_order", {
          p_payment_intent: pi,
          p_event_id: event.id,
          p_refunded: charge.amount_refunded,
        });
        if (error) throw error;
      }
      break;
    }
    case "account.updated": {
      const account = await api.accounts.retrieve(
        (event.data.object as Stripe.Account).id,
      );
      const { error } = await db
        .from("organizers")
        .update({
          stripe_account_status:
            account.charges_enabled && account.payouts_enabled
              ? "active"
              : "pending",
        })
        .eq("stripe_account_id", account.id);
      if (error) throw error;
      break;
    }
  }
  const { error } = await db.from("stripe_webhook_events").upsert({
    id: event.id,
    type: event.type,
    processed_at: new Date().toISOString(),
  });
  if (error) throw error;
}
