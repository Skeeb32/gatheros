import "server-only";
import { stripe } from "./client";
import { appUrl } from "@/lib/config";
import { adminClient } from "@/lib/supabase/admin";
export async function createCheckout(orderId: string) {
  const db = adminClient();
  const { data: o, error } = await db
    .from("orders")
    .select(
      "*, order_items(*, ticket_types(name)), events(title, organizer_id)",
    )
    .eq("id", orderId)
    .single();
  if (error) throw error;
  if (o.status !== "pending") throw new Error("Order is no longer pending");
  const api = stripe();
  if (o.stripe_checkout_session_id) {
    const session = await api.checkout.sessions.retrieve(
      o.stripe_checkout_session_id,
    );
    if (!session.url) throw new Error("Checkout is closed");
    return session.url;
  }
  if (
    new Date(o.reservation_expires_at).getTime() <
    Date.now() + 30 * 60 * 1000
  )
    throw new Error("Checkout creation window elapsed; start a new checkout");
  const { data: org, error: orgError } = await db
    .from("organizers")
    .select("stripe_account_id,stripe_account_status")
    .eq("id", o.events.organizer_id)
    .single();
  if (
    orgError ||
    !org?.stripe_account_id ||
    org.stripe_account_status !== "active"
  )
    throw new Error("Organizer payments are not ready");
  const session = await api.checkout.sessions.create(
    {
      mode: "payment",
      payment_method_types: ["card"],
      customer_email: o.buyer_email,
      client_reference_id: o.id,
      metadata: { order_id: o.id },
      expires_at: Math.floor(
        new Date(o.reservation_expires_at).getTime() / 1000,
      ),
      line_items: [
        ...o.order_items.map(
          (item: {
            unit_price_cents: number;
            quantity: number;
            ticket_types: { name: string };
          }) => ({
            quantity: item.quantity,
            price_data: {
              currency: o.currency,
              unit_amount: item.unit_price_cents,
              product_data: {
                name: `${o.events.title} — ${item.ticket_types.name}`,
              },
            },
          }),
        ),
        ...(o.platform_fee_cents
          ? [
              {
                quantity: 1,
                price_data: {
                  currency: o.currency,
                  unit_amount: o.platform_fee_cents,
                  product_data: { name: "Booking fee" },
                },
              },
            ]
          : []),
      ],
      payment_intent_data: {
        application_fee_amount: o.platform_fee_cents,
        transfer_data: { destination: org.stripe_account_id },
        metadata: { order_id: o.id },
      },
      success_url: `${appUrl()}/checkout/success`,
      cancel_url: `${appUrl()}/checkout/cancel`,
    },
    { idempotencyKey: `checkout:${o.id}` },
  );
  const saved = await db
    .from("orders")
    .update({ stripe_checkout_session_id: session.id })
    .eq("id", o.id);
  if (saved.error) throw saved.error;
  if (!session.url) throw new Error("Missing checkout URL");
  return session.url;
}
