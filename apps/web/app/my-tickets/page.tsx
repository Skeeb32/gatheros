import { redirect } from "next/navigation";
import QRCode from "qrcode";
import { serverClient } from "@/lib/supabase/server";
import { configured } from "@/lib/config";
export const dynamic = "force-dynamic";
export default async function MyTickets() {
  if (!configured())
    return (
      <main className="shell py-20">
        <h1 className="serif text-5xl mb-6">Your next good memory.</h1>
        <p className="notice">
          Account tickets become available when Supabase is configured. Guest
          purchases are delivered by email.
        </p>
      </main>
    );
  const db = await serverClient();
  const {
    data: { user },
  } = await db.auth.getUser();
  if (!user) redirect("/login");
  const { data: orders, error } = await db
    .from("orders")
    .select(
      "id,status,events(title,venue_name,starts_at),order_items(tickets(*),ticket_types(name))",
    )
    .eq("buyer_user_id", user.id)
    .in("status", ["paid", "partially_refunded", "refunded"]);
  if (error) throw error;
  return (
    <main className="shell py-12">
      <h1 className="serif text-5xl mb-8">Your tickets.</h1>
      <div className="grid md:grid-cols-3 gap-6">
        {await Promise.all(
          (orders || []).flatMap((o) =>
            o.order_items.flatMap((item) =>
              item.tickets.map(async (ticket) => (
                <article key={ticket.id} className="panel text-center">
                  <h2 className="serif text-2xl">
                    {(o.events as unknown as { title: string })?.title}
                  </h2>
                  <p className="muted text-sm my-3">
                    {(item.ticket_types as unknown as { name: string })?.name}
                  </p>
                  {ticket.status === "valid" ? (
                    <img
                      src={await QRCode.toDataURL(ticket.ticket_code, {
                        width: 260,
                        margin: 4,
                      })}
                      width="260"
                      height="260"
                      alt="Your admission QR code"
                      className="mx-auto"
                    />
                  ) : (
                    <p className="notice my-8">{ticket.status}</p>
                  )}
                  <p className="text-xs muted">
                    Keep this code private. One scan per admission.
                  </p>
                </article>
              )),
            ),
          ),
        )}
      </div>
      {!orders?.length && (
        <p className="muted">
          No confirmed tickets yet. Guest tickets are sent to the email provided
          at checkout.
        </p>
      )}
    </main>
  );
}
