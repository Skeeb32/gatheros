"use client";
import { useState } from "react";
import Link from "next/link";
import { ArrowUpRight, MapPin, Search, CalendarDays } from "lucide-react";
import type { Event } from "@/types/events";
import { EventArt } from "./art";
import { money } from "@/lib/utils/money";
export function Discovery({ events }: { events: Event[] }) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("All experiences");
  const visible = events.filter(
    (e) =>
      `${e.title} ${e.city} ${e.venue_name} ${e.description}`
        .toLowerCase()
        .includes(query.toLowerCase()) &&
      (filter !== "Free to join" ||
        e.ticket_types.some((t) => t.price_cents === 0)),
  );
  return (
    <section id="discover" className="shell py-14">
      <div className="flex flex-wrap items-end justify-between gap-6">
        <div>
          <p className="eyebrow text-primary mb-3">Find your next plan</p>
          <h2 className="serif text-4xl md:text-5xl">Out there. Together.</h2>
        </div>
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-4 top-3.5 muted" size={17} />
          <input
            aria-label="Search events"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search events or places"
            style={{ paddingLeft: 42, borderRadius: 30 }}
          />
        </div>
      </div>
      <div className="flex gap-2 my-7">
        {["All experiences", "Free to join"].map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`rounded-full border px-5 py-2.5 text-xs ${filter === f ? "bg-foreground text-white border-foreground" : "border-border"}`}
          >
            {f}
          </button>
        ))}
      </div>
      <div className="grid md:grid-cols-3 gap-7">
        {visible.map((event, i) => {
          const date = new Date(event.starts_at);
          const price = event.ticket_types.length
            ? Math.min(...event.ticket_types.map((t) => t.price_cents))
            : null;
          return (
            <Link
              className="event-card group"
              key={event.id}
              href={`/e/${event.organizers.slug}/${event.slug}`}
            >
              <div className="relative">
                <EventArt variant={i} className="h-64 rounded-2xl" />
                <div className="absolute left-4 top-4 bg-background rounded-xl px-3 py-2 text-center">
                  <p className="eyebrow !text-[9px]">
                    {date.toLocaleString("en-US", {
                      month: "short",
                      timeZone: event.timezone,
                    })}
                  </p>
                  <p className="text-xl font-bold">
                    {date.toLocaleString("en-US", {
                      day: "2-digit",
                      timeZone: event.timezone,
                    })}
                  </p>
                </div>
                <span className="absolute right-4 bottom-4 rounded-full bg-background px-3 py-1.5 text-xs font-semibold">
                  {price === null
                    ? "Coming soon"
                    : price === 0
                      ? "Free"
                      : `From ${money(price)}`}
                </span>
              </div>
              <p className="eyebrow muted mt-5 mb-2 !text-[9px]">
                {event.organizers.name}
              </p>
              <h3 className="serif text-[28px] flex items-center justify-between gap-3">
                {event.title}
                <ArrowUpRight className="text-primary shrink-0" size={21} />
              </h3>
              <p className="flex gap-2 items-center muted text-xs mt-3">
                <MapPin size={13} />
                {event.venue_name} · {event.city}
              </p>
              <p className="flex gap-2 items-center muted text-xs mt-2">
                <CalendarDays size={13} />
                {date.toLocaleString("en-US", {
                  weekday: "short",
                  hour: "numeric",
                  minute: "2-digit",
                  timeZone: event.timezone,
                })}
              </p>
            </Link>
          );
        })}
      </div>
      {!visible.length && (
        <p className="panel muted mt-6">
          No events match your search. Try another place or check back soon.
        </p>
      )}
    </section>
  );
}
