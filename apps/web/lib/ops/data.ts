import "server-only";
import { configured } from "@/lib/config";
import { serverClient } from "@/lib/supabase/server";
import { localQuery, DEMO_EVENT } from "./local";
import type { Operations } from "./types";
export async function operations(eventId?: string): Promise<Operations> {
  if (!configured())
    return (
      await localQuery<{ data: Operations }>(
        "select public.event_operations($1) as data",
        [eventId || DEMO_EVENT],
      )
    )[0].data;
  const db = await serverClient();
  const {
    data: { user },
  } = await db.auth.getUser();
  if (!user) throw new Error("unauthorized");
  if (!eventId) {
    const { data: members } = await db
      .from("organizer_members")
      .select("organizer_id")
      .eq("user_id", user.id)
      .in("role", ["owner", "admin", "manager"]);
    const { data: events } = await db
      .from("events")
      .select("id")
      .in(
        "organizer_id",
        (members || []).map((m) => m.organizer_id),
      )
      .order("starts_at")
      .limit(1);
    eventId = events?.[0]?.id;
  }
  if (!eventId)
    throw new Error("Create an event in the Events workspace to begin.");
  const { data, error } = await db.rpc("event_operations", {
    p_event_id: eventId,
  });
  if (error) throw new Error("Event unavailable or access denied");
  return data;
}
