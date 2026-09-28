"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { saveEvent } from "@/app/dashboard/actions";
import { Button } from "@/components/ui/button";
import type { Event } from "@/types/events";
export function EventForm({
  organizers,
  event,
}: {
  organizers: { id: string; name: string }[];
  event?: Event;
}) {
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const router = useRouter();
  return (
    <form
      className="panel space-y-5 max-w-3xl"
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        const d = new FormData(e.currentTarget);
        try {
          const result = await saveEvent(
            {
              organizer_id: d.get("organizer_id"),
              title: d.get("title"),
              slug: d.get("slug"),
              description: d.get("description"),
              starts_at: new Date(
                String(d.get("starts_at")) + "Z",
              ).toISOString(),
              ends_at: d.get("ends_at")
                ? new Date(String(d.get("ends_at")) + "Z").toISOString()
                : null,
              timezone: d.get("timezone"),
              venue_name: d.get("venue_name"),
              city: d.get("city"),
              status: d.get("status"),
            },
            event?.id,
          );
          if (result.error) setMessage(result.error);
          else {
            router.push(`/dashboard/events/${result.id}`);
            router.refresh();
          }
        } catch {
          setMessage("Please enter valid event dates.");
        } finally {
          setBusy(false);
        }
      }}
    >
      <label>
        Organizer
        <select name="organizer_id" defaultValue={event?.organizer_id} required>
          {organizers.map((o) => (
            <option key={o.id} value={o.id}>
              {o.name}
            </option>
          ))}
        </select>
      </label>
      <label>
        Event title
        <input
          name="title"
          defaultValue={event?.title}
          minLength={3}
          maxLength={140}
          required
        />
      </label>
      <label>
        URL slug
        <input
          name="slug"
          defaultValue={event?.slug}
          placeholder="summer-rooftop-social"
          pattern="[a-z0-9]+(-[a-z0-9]+)*"
          required
        />
      </label>
      <label>
        The experience
        <textarea
          rows={5}
          name="description"
          defaultValue={event?.description}
        />
      </label>
      <p className="text-xs muted">
        Enter dates in UTC. The timezone below controls how attendees see them.
      </p>
      <div className="field-grid">
        <label>
          Starts (UTC)
          <input
            type="datetime-local"
            name="starts_at"
            defaultValue={event?.starts_at.slice(0, 16)}
            required
          />
        </label>
        <label>
          Ends (UTC)
          <input
            type="datetime-local"
            name="ends_at"
            defaultValue={event?.ends_at?.slice(0, 16)}
          />
        </label>
      </div>
      <label>
        Display timezone
        <input
          name="timezone"
          defaultValue={event?.timezone || "America/Indiana/Indianapolis"}
          required
        />
      </label>
      <div className="field-grid">
        <label>
          Venue
          <input name="venue_name" defaultValue={event?.venue_name} />
        </label>
        <label>
          City
          <input name="city" defaultValue={event?.city} />
        </label>
      </div>
      <label>
        Visibility
        <select name="status" defaultValue={event?.status || "draft"}>
          {["draft", "published", "cancelled", "completed"].map((s) => (
            <option key={s}>{s}</option>
          ))}
        </select>
      </label>
      <Button disabled={busy || !organizers.length}>
        {busy ? "Saving…" : "Save event"}
      </Button>
      {message && (
        <p role="alert" className="notice">
          {message}
        </p>
      )}
      {!organizers.length && (
        <p className="notice">Create an organizer in Settings first.</p>
      )}
    </form>
  );
}
