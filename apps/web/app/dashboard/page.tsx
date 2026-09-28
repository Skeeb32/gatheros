import Link from "next/link";
import { Plus, ArrowUpRight } from "lucide-react";
import { dashboardData } from "@/lib/dashboard";
import { money } from "@/lib/utils/money";
import { EventTable } from "@/components/dashboard/event-table";
import { Button } from "@/components/ui/button";
export default async function Dashboard() {
  const { events, orders } = await dashboardData();
  const tickets = events.flatMap((e) => e.ticket_types);
  return (
    <>
      <div className="flex flex-wrap justify-between items-center gap-5 mb-9">
        <div>
          <p className="eyebrow muted mb-3">Your community, at a glance</p>
          <h1 className="serif text-5xl">Let’s make good things happen.</h1>
        </div>
        <Button asChild>
          <Link href="/dashboard/events/new">
            <Plus size={16} />
            Create event
          </Link>
        </Button>
      </div>
      <div className="grid sm:grid-cols-3 gap-5 mb-10">
        {[
          [
            "Published events",
            events.filter((e) => e.status === "published").length,
          ],
          ["Tickets sold", tickets.reduce((s, t) => s + t.quantity_sold, 0)],
          [
            "Recent paid order total",
            money(
              orders
                .filter((o) =>
                  ["paid", "partially_refunded"].includes(o.status),
                )
                .reduce((s, o) => s + o.total_cents, 0),
            ),
          ],
        ].map(([label, value]) => (
          <div className="panel" key={label}>
            <p className="text-xs muted mb-4">{label}</p>
            <p className="serif text-4xl">{value}</p>
          </div>
        ))}
      </div>
      <div className="flex justify-between items-center mb-5">
        <h2 className="serif text-3xl">Your experiences</h2>
        <Link
          href="/dashboard/events"
          className="text-xs text-primary flex gap-2"
        >
          All events
          <ArrowUpRight size={14} />
        </Link>
      </div>
      <EventTable events={events} />
      <p className="text-xs muted mt-4">
        Order totals cover the latest 500 visible orders and include booking
        fees. Payout details are available in Stripe.
      </p>
    </>
  );
}
