"use client";
import { useState } from "react";
export function WaitlistForm({ eventId }: { eventId: string }) {
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState("");
  return (
    <form
      className="space-y-3 mt-8 border-t pt-6"
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        const f = new FormData(e.currentTarget);
        try {
          const r = await fetch("/api/waitlist", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              eventId,
              name: f.get("name"),
              email: f.get("email"),
            }),
          });
          const d = await r.json();
          setStatus(
            r.ok
              ? "You’re on the list. The organizer has your interest."
              : d.error,
          );
        } catch {
          setStatus("Could not connect. Please try again.");
        } finally {
          setBusy(false);
        }
      }}
    >
      <h3 className="font-semibold">Stay in the loop</h3>
      <p className="text-sm muted">
        Join the waitlist for future ticket releases.
      </p>
      <label className="block text-sm">
        Your name
        <input
          name="name"
          required
          maxLength={100}
          className="w-full border rounded p-2 mt-1"
        />
      </label>
      <label className="block text-sm">
        Email
        <input
          name="email"
          type="email"
          required
          maxLength={254}
          className="w-full border rounded p-2 mt-1"
        />
      </label>
      <button disabled={busy} className="ops-button dark">
        {busy ? "Joining…" : "Join waitlist"}
      </button>
      <p role="status" className="text-sm">
        {status}
      </p>
    </form>
  );
}
