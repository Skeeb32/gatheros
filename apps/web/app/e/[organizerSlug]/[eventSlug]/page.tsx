import { WaitlistForm } from "@/components/waitlist-form";
import { notFound } from "next/navigation";
import Link from "next/link";
import { CalendarDays, MapPin, ArrowLeft } from "lucide-react";
import { EventGallery } from "@/components/events/gallery";
import { getEvent } from "@/lib/events";
import { configured, feeBps } from "@/lib/config";
import { EventArt } from "@/components/events/art";
import { PurchaseForm } from "@/components/checkout/purchase-form";
export const dynamic = "force-dynamic";
export default async function EventPage({
  params,
}: {
  params: Promise<{ organizerSlug: string; eventSlug: string }>;
}) {
  const p = await params;
  const event = await getEvent(p.organizerSlug, p.eventSlug);
  if (!event) notFound();
  return (
    <main className="shell py-8">
      <Link
        href="/explore#discover"
        className="text-xs muted flex items-center gap-2 mb-6"
      >
        <ArrowLeft size={14} />
        All experiences
      </Link>
      <EventArt className="h-64 md:h-90 rounded-2xl" />
      <div className="grid md:grid-cols-[1fr_380px] gap-12 py-10">
        <div>
          <p className="eyebrow text-primary mb-4">
            Hosted by {event.organizers.name}
          </p>
          <h1 className="serif text-5xl md:text-6xl">{event.title}</h1>
          <div className="space-y-4 my-8 text-sm">
            <p className="flex gap-3">
              <CalendarDays size={19} />
              {new Date(event.starts_at).toLocaleString("en-US", {
                dateStyle: "full",
                timeStyle: "short",
                timeZone: event.timezone,
              })}
            </p>
            <p className="flex gap-3">
              <MapPin size={19} />
              {event.venue_name} · {event.city}
            </p>
          </div>
          <EventGallery eventId={event.id} />
          <h2 className="serif text-3xl mb-4">A little about the experience</h2>
          <p className="muted leading-8 whitespace-pre-wrap">
            {event.description}
          </p>
        </div>
        <aside className="panel self-start">
          <PurchaseForm
            tickets={event.ticket_types.filter((t) => t.status === "active")}
            demo={!configured()}
            bps={feeBps()}
          />
          <WaitlistForm eventId={event.id} />
        </aside>
      </div>
    </main>
  );
}
