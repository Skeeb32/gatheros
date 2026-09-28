"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { saveTicketType, deleteRecord } from "@/app/dashboard/actions";
import { Button } from "@/components/ui/button";
import type { TicketType } from "@/types/events";
export function TicketForm({
  eventId,
  ticket,
}: {
  eventId: string;
  ticket?: TicketType;
}) {
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const router = useRouter();
  return (
    <form
      className="panel space-y-4"
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        const data = new FormData(e.currentTarget);
        const result = await saveTicketType(
          {
            event_id: eventId,
            name: data.get("name"),
            price_cents: Math.round(Number(data.get("price")) * 100),
            quantity: Number(data.get("quantity")),
            status: data.get("status"),
          },
          ticket?.id,
        );
        setMessage(result.error || "Ticket type saved.");
        setBusy(false);
        router.refresh();
      }}
    >
      <h3 className="serif text-2xl">
        {ticket ? "Edit ticket type" : "Add a ticket type"}
      </h3>
      <label>
        Name
        <input name="name" required defaultValue={ticket?.name} />
      </label>
      <div className="field-grid">
        <label>
          Price (USD)
          <input
            name="price"
            type="number"
            min="0"
            max="10000"
            step="0.01"
            defaultValue={(ticket?.price_cents || 0) / 100}
            required
          />
        </label>
        <label>
          Capacity
          <input
            name="quantity"
            type="number"
            min="1"
            max="100000"
            defaultValue={ticket?.quantity || 100}
            required
          />
        </label>
      </div>
      <label>
        Status
        <select name="status" defaultValue={ticket?.status || "active"}>
          <option>active</option>
          <option>paused</option>
          <option>sold_out</option>
        </select>
      </label>
      <div className="flex gap-3">
        <Button disabled={busy}>{busy ? "Saving…" : "Save tickets"}</Button>
        {ticket && (
          <Button
            type="button"
            variant="outline"
            onClick={async () => {
              const result = await deleteRecord("ticket_types", ticket.id);
              setMessage(result.error || "Deleted.");
              router.refresh();
            }}
          >
            Delete
          </Button>
        )}
      </div>
      {message && (
        <p className="notice" role="status">
          {message}
        </p>
      )}
    </form>
  );
}
