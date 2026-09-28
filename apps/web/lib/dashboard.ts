import "server-only";
import { serverClient } from "@/lib/supabase/server";
import { configured } from "@/lib/config";
import { demoEvents } from "@/lib/demo";
import type { Event } from "@/types/events";
export async function dashboardData() {
  if (!configured())
    return {
      events: demoEvents,
      organizers: demoEvents.map((e) => ({
        id: e.organizer_id,
        name: e.organizers.name,
        role: "owner",
      })),
      orders: [] as {
        id: string;
        buyer_email: string;
        total_cents: number;
        status: string;
        created_at: string;
        event_id: string;
      }[],
    };
  const db = await serverClient();
  const {
    data: { user },
  } = await db.auth.getUser();
  const { data: members, error: memberError } = await db
    .from("organizer_members")
    .select("organizer_id,role,organizers(id,name)")
    .eq("user_id", user!.id);
  if (memberError) throw memberError;
  const ids = (members || []).map((m) => m.organizer_id);
  if (!ids.length) return { events: [] as Event[], organizers: [], orders: [] };
  const [events, orders] = await Promise.all([
    db
      .from("events")
      .select("*,organizers(name,slug),ticket_types(*)")
      .in("organizer_id", ids)
      .order("starts_at"),
    db
      .from("orders")
      .select("id,buyer_email,total_cents,status,created_at,event_id")
      .order("created_at", { ascending: false })
      .limit(500),
  ]);
  if (events.error) throw events.error;
  if (orders.error) throw orders.error;
  const eventIds = new Set(events.data.map((e) => e.id));
  return {
    events: events.data as unknown as Event[],
    organizers: (members || []).map((m) => ({
      ...(m.organizers as unknown as { id: string; name: string }),
      role: m.role,
    })),
    orders: orders.data.filter((o) => eventIds.has(o.event_id)),
  };
}
