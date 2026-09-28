"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  createOrganizer,
  saveMember,
  removeMember,
} from "@/app/dashboard/actions";
import { browserClient } from "@/lib/supabase/client";
export function Settings({
  organizers,
  members,
  userId,
  demo,
}: {
  organizers: { id: string; name: string; role: string }[];
  members: { organizer_id: string; user_id: string; role: string }[];
  userId: string;
  demo: boolean;
}) {
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const router = useRouter();
  async function stripeLink(id: string, dashboard = false) {
    if (demo) {
      setMessage("Configure Supabase and Stripe to connect payments.");
      return;
    }
    setBusy(true);
    try {
      const res = await fetch(
        dashboard
          ? `/api/stripe/dashboard?organizerId=${id}`
          : "/api/stripe/connect",
        dashboard
          ? {}
          : {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ organizerId: id }),
            },
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      location.assign(data.url);
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Unable to open Stripe",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="space-y-6 max-w-3xl">
      {message && (
        <p role="status" className="notice">
          {message}
        </p>
      )}
      <div className="panel">
        <h2 className="serif text-3xl mb-4">Your account</h2>
        <p className="text-xs muted break-all mb-4">
          User ID: {userId || "Demo account"}
        </p>
        <Button
          variant="outline"
          onClick={async () => {
            if (!demo) await browserClient().auth.signOut();
            location.assign("/");
          }}
        >
          Sign out
        </Button>
      </div>
      <form
        className="panel space-y-4"
        onSubmit={async (e) => {
          e.preventDefault();
          const d = new FormData(e.currentTarget);
          setBusy(true);
          const result = await createOrganizer({
            name: d.get("name"),
            slug: d.get("slug"),
          });
          setMessage(result.error || "Organizer created.");
          setBusy(false);
          router.refresh();
        }}
      >
        <h2 className="serif text-3xl">Create an organizer</h2>
        <label>
          Name
          <input name="name" required minLength={2} />
        </label>
        <label>
          Public URL slug
          <input name="slug" required pattern="[a-z0-9]+(-[a-z0-9]+)*" />
        </label>
        <Button disabled={busy}>Create organizer</Button>
      </form>
      {organizers.map((o) => (
        <section key={o.id} className="panel space-y-5">
          <h2 className="serif text-3xl">{o.name}</h2>
          <p className="text-sm muted">Your role: {o.role}</p>
          {o.role === "owner" && (
            <>
              <div className="flex flex-wrap gap-3">
                <Button disabled={busy} onClick={() => stripeLink(o.id)}>
                  Connect / continue Stripe setup
                </Button>
                <Button
                  variant="outline"
                  onClick={() => stripeLink(o.id, true)}
                >
                  Open Stripe dashboard
                </Button>
              </div>
              <p className="text-xs muted">
                Payment readiness updates from Stripe webhooks. Complete both
                charges and payouts setup before selling paid tickets.
              </p>
              <form
                className="space-y-4 border-t border-border pt-5"
                onSubmit={async (e) => {
                  e.preventDefault();
                  const d = new FormData(e.currentTarget);
                  const result = await saveMember({
                    organizer_id: o.id,
                    user_id: d.get("user_id"),
                    role: d.get("role"),
                  });
                  setMessage(result.error || "Member saved.");
                  router.refresh();
                }}
              >
                <h3 className="font-semibold">Add or update a team member</h3>
                <label>
                  Registered user ID
                  <input
                    name="user_id"
                    required
                    placeholder="Ask the member for the User ID in their settings"
                  />
                </label>
                <label>
                  Role
                  <select name="role">
                    <option>staff</option>
                    <option>manager</option>
                    <option>admin</option>
                  </select>
                </label>
                <Button variant="outline">Save member</Button>
              </form>
            </>
          )}
          {members
            .filter((m) => m.organizer_id === o.id)
            .map((m) => (
              <div
                key={m.user_id}
                className="flex gap-4 items-center justify-between text-xs"
              >
                <span className="break-all">
                  {m.user_id} · {m.role}
                </span>
                {o.role === "owner" && m.role !== "owner" && (
                  <button
                    className="text-primary"
                    onClick={async () => {
                      const r = await removeMember(o.id, m.user_id);
                      setMessage(r.error || "Member removed.");
                      router.refresh();
                    }}
                  >
                    Remove
                  </button>
                )}
              </div>
            ))}
        </section>
      ))}
    </div>
  );
}
