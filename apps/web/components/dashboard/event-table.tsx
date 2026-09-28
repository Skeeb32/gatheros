import Link from "next/link";
import type { Event } from "@/types/events";
export function EventTable({ events }: { events: Event[] }) {
  return (
    <div className="panel !p-0 table-wrap">
      <table>
        <thead>
          <tr>
            <th>Experience</th>
            <th>Status</th>
            <th>Date</th>
            <th>Tickets sold</th>
            <th>Available</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {events.map((e) => (
            <tr key={e.id}>
              <td>
                <Link
                  href={`/dashboard/events/${e.id}`}
                  className="font-semibold"
                >
                  {e.title}
                </Link>
                <p className="muted text-xs mt-1">{e.organizers.name}</p>
              </td>
              <td>
                <span className={`status status-${e.status}`}>{e.status}</span>
              </td>
              <td>
                {new Date(e.starts_at).toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                  timeZone: e.timezone,
                })}
              </td>
              <td>
                {e.ticket_types.reduce((s, t) => s + t.quantity_sold, 0)} /{" "}
                {e.ticket_types.reduce((s, t) => s + t.quantity, 0)}
              </td>
              <td>
                {e.ticket_types.reduce(
                  (s, t) =>
                    s + t.quantity - t.quantity_sold - t.quantity_reserved,
                  0,
                )}
              </td>
              <td>
                <Link
                  href={`/dashboard/events/${e.id}`}
                  className="text-primary"
                >
                  Manage →
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {!events.length && (
        <p className="p-8 muted">
          Your first event starts here. Create an organizer in Settings, then
          add an event.
        </p>
      )}
    </div>
  );
}
