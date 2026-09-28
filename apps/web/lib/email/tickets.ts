import "server-only";
import { Resend } from "resend";
import QRCode from "qrcode";
import { adminClient } from "@/lib/supabase/admin";
import { required } from "@/lib/config";
export function escapeHtml(value: string) {
  return value.replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ]!,
  );
}
export async function sendTickets(orderId: string) {
  const db = adminClient();
  const { data: o, error } = await db
    .from("orders")
    .select(
      "*, events(title, starts_at, timezone, venue_name), order_items(tickets(id,ticket_code,status))",
    )
    .eq("id", orderId)
    .single();
  if (error) throw error;
  if (o.email_sent_at || !["paid", "partially_refunded"].includes(o.status))
    return;
  const now = new Date().toISOString();
  const { data: claimed, error: claimError } = await db
    .from("orders")
    .update({ email_claimed_at: now })
    .eq("id", o.id)
    .is("email_sent_at", null)
    .or(
      `email_claimed_at.is.null,email_claimed_at.lt.${new Date(Date.now() - 10 * 60 * 1000).toISOString()}`,
    )
    .select("id");
  if (claimError) throw claimError;
  if (!claimed?.length) return;
  try {
    const tickets = o.order_items
      .flatMap(
        (item: {
          tickets: { id: string; ticket_code: string; status: string }[];
        }) => item.tickets,
      )
      .filter((t: { status: string }) => t.status === "valid");
    const attachments = await Promise.all(
      tickets.map(async (t: { ticket_code: string }, i: number) => ({
        filename: `ticket-${i + 1}.png`,
        content: await QRCode.toBuffer(t.ticket_code, {
          width: 600,
          margin: 4,
        }),
        contentId: `ticket-${i + 1}`,
      })),
    );
    const when = new Intl.DateTimeFormat("en-US", {
      dateStyle: "full",
      timeStyle: "short",
      timeZone: o.events.timezone,
    }).format(new Date(o.events.starts_at));
    const html = `<h1>You're going to ${escapeHtml(o.events.title)}</h1><p>${escapeHtml(when)} · ${escapeHtml(o.events.venue_name || "")}</p><p>Show one QR code per guest at the door. Each code admits one person, once. Keep your codes private.</p>${tickets.map((_: unknown, i: number) => `<h2>Ticket ${i + 1}</h2><img src="cid:ticket-${i + 1}" alt="Ticket ${i + 1} QR code" width="240"/>`).join("")}<p>Order ${escapeHtml(o.id)}</p>`;
    const resend = new Resend(required("RESEND_API_KEY"));
    const sent = await resend.emails.send(
      {
        from: required("EMAIL_FROM"),
        to: o.buyer_email,
        subject: `Your tickets: ${o.events.title}`,
        html,
        attachments,
      },
      { idempotencyKey: `tickets/${o.id}` },
    );
    if (sent.error) throw new Error(sent.error.message);
    const saved = await db
      .from("orders")
      .update({
        email_sent_at: new Date().toISOString(),
        email_claimed_at: null,
      })
      .eq("id", o.id);
    if (saved.error) throw saved.error;
  } catch (error) {
    await db
      .from("orders")
      .update({ email_claimed_at: null })
      .eq("id", o.id)
      .eq("email_claimed_at", now);
    throw error;
  }
}
