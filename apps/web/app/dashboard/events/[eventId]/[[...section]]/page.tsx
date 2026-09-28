import Link from "next/link";
import { notFound } from "next/navigation";
import { dashboardData } from "@/lib/dashboard";
import { configured } from "@/lib/config";
import { serverClient } from "@/lib/supabase/server";
import { EventForm } from "@/components/dashboard/event-form";
import { TicketForm } from "@/components/dashboard/ticket-form";
import { Scanner } from "@/components/check-in/scanner";
import { DeleteEvent } from "@/components/dashboard/delete-event";
import { ImageUpload } from "@/components/dashboard/image-upload";
import { money } from "@/lib/utils/money";
export default async function EventManager({
  params,
}: {
  params: Promise<{ eventId: string; section?: string[] }>;
}) {
  const { eventId, section } = await params;
  const tab = section?.[0] || "overview";
  if (section && section.length > 1) notFound();
  if (
    ![
      "overview",
      "edit",
      "tickets",
      "orders",
      "attendees",
      "check-in",
      "settings",
    ].includes(tab)
  )
    notFound();
  const { events, organizers, orders } = await dashboardData();
  const event = events.find((e) => e.id === eventId);
  if (!event) notFound();
  const role = organizers.find((o) => o.id === event.organizer_id)?.role;
  const staff = role === "staff";
  if (staff && !["overview", "check-in"].includes(tab)) notFound();
  let attendees: {
    id: string;
    first_name: string;
    last_name: string;
    email: string;
  }[] = [];
  if (tab === "attendees" && configured()) {
    const db = await serverClient();
    const result = await db
      .from("attendees")
      .select(
        "id,first_name,last_name,email,order_items!inner(orders!inner(event_id))",
      )
      .eq("order_items.orders.event_id", eventId);
    if (result.error) throw result.error;
    attendees = result.data;
  }
  return (
    <>
      <p className="eyebrow text-primary mb-3">{event.organizers.name}</p>
      <h1 className="serif text-5xl mb-7">{event.title}</h1>
      <nav className="flex gap-5 overflow-auto border-b border-border pb-4 mb-8 text-sm">
        {(staff
          ? ["overview", "check-in"]
          : [
              "overview",
              "edit",
              "tickets",
              "orders",
              "attendees",
              "check-in",
              "settings",
            ]
        ).map((t) => (
          <Link
            key={t}
            href={`/dashboard/events/${eventId}/${t === "overview" ? "" : t}`}
            className={`capitalize whitespace-nowrap ${tab === t ? "text-primary font-bold" : "muted"}`}
          >
            {t.replace("-", " ")}
          </Link>
        ))}
      </nav>
      {tab === "overview" && (
        <div className="panel space-y-5">
          <span className={`status status-${event.status}`}>
            {event.status}
          </span>
          <p className="muted leading-7">
            {event.description ||
              "Add a description to introduce your experience."}
          </p>
          <p>
            {event.venue_name} · {event.city}
          </p>
          {event.status === "published" && (
            <Link
              href={`/e/${event.organizers.slug}/${event.slug}`}
              className="text-primary inline-block"
            >
              View public event →
            </Link>
          )}
        </div>
      )}
      {tab === "edit" && <EventForm event={event} organizers={organizers} />}
      {tab === "tickets" && (
        <div className="grid lg:grid-cols-2 gap-6">
          {event.ticket_types.map((t) => (
            <TicketForm key={t.id} eventId={eventId} ticket={t} />
          ))}
          <TicketForm eventId={eventId} />
        </div>
      )}
      {tab === "orders" && (
        <div className="panel table-wrap">
          <table>
            <thead>
              <tr>
                <th>Order</th>
                <th>Buyer</th>
                <th>Status</th>
                <th>Total</th>
              </tr>
            </thead>
            <tbody>
              {orders
                .filter((o) => o.event_id === eventId)
                .map((o) => (
                  <tr key={o.id}>
                    <td>{o.id.slice(0, 8)}</td>
                    <td>{o.buyer_email}</td>
                    <td>{o.status}</td>
                    <td>{money(o.total_cents)}</td>
                  </tr>
                ))}
            </tbody>
          </table>
          {!orders.some((o) => o.event_id === eventId) && (
            <p className="muted py-6">No orders yet.</p>
          )}
        </div>
      )}
      {tab === "attendees" && (
        <div className="panel table-wrap">
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
              </tr>
            </thead>
            <tbody>
              {attendees.map((a) => (
                <tr key={a.id}>
                  <td>
                    {a.first_name} {a.last_name}
                  </td>
                  <td>{a.email}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {!attendees.length && <p className="muted py-6">No attendees yet.</p>}
        </div>
      )}
      {tab === "check-in" && <Scanner eventId={eventId} demo={!configured()} />}
      {tab === "settings" && (
        <div className="space-y-6">
          <ImageUpload eventId={eventId} demo={!configured()} />
          <DeleteEvent id={eventId} />
        </div>
      )}
    </>
  );
}
