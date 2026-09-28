import "server-only";
import { serverClient } from "@/lib/supabase/server";
import { adminClient } from "@/lib/supabase/admin";
export async function requireUser() {
  const db = await serverClient();
  const {
    data: { user },
  } = await db.auth.getUser();
  if (!user) throw new Error("unauthorized");
  return { db, user };
}
export async function requireOrganizer(id: string, roles = ["owner", "admin"]) {
  const { db, user } = await requireUser();
  const { data } = await db
    .from("organizer_members")
    .select("role")
    .eq("organizer_id", id)
    .eq("user_id", user.id)
    .single();
  if (!data || !roles.includes(data.role)) throw new Error("forbidden");
  const { data: organizer, error } = await adminClient()
    .from("organizers")
    .select("*")
    .eq("id", id)
    .single();
  if (error) throw error;
  return organizer;
}
