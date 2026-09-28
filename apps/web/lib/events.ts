import "server-only";
import { configured } from "@/lib/config";
import { serverClient } from "@/lib/supabase/server";
import { demoEvents } from "@/lib/demo";
import type { Event } from "@/types/events";
export async function getEvents() {
  if (!configured()) return demoEvents;
  const db = await serverClient();
  const { data, error } = await db
    .from("events")
    .select("*, organizers(name,slug), ticket_types(*)")
    .eq("status", "published")
    .gte("starts_at", new Date().toISOString())
    .order("starts_at");
  if (error) throw error;
  return data as unknown as Event[];
}
export async function getEvent(organizerSlug: string, eventSlug: string) {
  if (!configured())
    return demoEvents.find(
      (e) => e.slug === eventSlug && e.organizers.slug === organizerSlug,
    );
  const db = await serverClient();
  const { data, error } = await db
    .from("events")
    .select("*, organizers!inner(name,slug), ticket_types(*)")
    .eq("organizers.slug", organizerSlug)
    .eq("slug", eventSlug)
    .eq("status", "published")
    .maybeSingle();
  if (error) throw error;
  return data as unknown as Event | undefined;
}
