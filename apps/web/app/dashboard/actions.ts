"use server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireUser } from "@/lib/auth/permissions";
import { configured } from "@/lib/config";
import { eventSchema, ticketTypeSchema } from "@/lib/utils/validation";
export async function saveEvent(input: unknown, id?: string) {
  if (!configured())
    return { error: "Demo mode: configure Supabase to save an event." };
  try {
    const values = eventSchema.parse(input);
    const { db } = await requireUser();
    const { organizer_id, ...update } = values;
    const result = id
      ? await db
          .from("events")
          .update(update)
          .eq("id", z.uuid().parse(id))
          .select("id")
          .single()
      : await db
          .from("events")
          .insert({ ...update, organizer_id })
          .select("id")
          .single();
    if (result.error) throw result.error;
    revalidatePath("/dashboard");
    return { id: result.data.id };
  } catch {
    return {
      error: "Unable to save. Check the fields and your organizer permissions.",
    };
  }
}
export async function saveTicketType(input: unknown, id?: string) {
  if (!configured())
    return { error: "Demo mode: configure Supabase to save ticket types." };
  try {
    const values = ticketTypeSchema.parse(input);
    const { db } = await requireUser();
    const { event_id, ...update } = values;
    const result = id
      ? await db
          .from("ticket_types")
          .update(update)
          .eq("id", z.uuid().parse(id))
          .select("id")
          .single()
      : await db
          .from("ticket_types")
          .insert({ ...update, event_id })
          .select("id")
          .single();
    if (result.error) throw result.error;
    revalidatePath("/dashboard");
    return { id: result.data.id };
  } catch {
    return {
      error: "Unable to save. Capacity must cover sold and reserved tickets.",
    };
  }
}
export async function createOrganizer(input: unknown) {
  if (!configured())
    return { error: "Demo mode: configure Supabase to create an organizer." };
  try {
    const values = z
      .object({
        name: z.string().trim().min(2).max(120),
        slug: z
          .string()
          .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
          .max(100),
      })
      .parse(input);
    const { db, user } = await requireUser();
    const result = await db
      .from("organizers")
      .insert({ ...values, owner_user_id: user.id })
      .select("id")
      .single();
    if (result.error) throw result.error;
    revalidatePath("/dashboard");
    return { id: result.data.id };
  } catch {
    return {
      error: "Unable to create organizer. Try a unique lowercase slug.",
    };
  }
}
export async function deleteRecord(
  table: "events" | "ticket_types",
  id: string,
) {
  try {
    if (!configured()) return { error: "Demo mode: changes are disabled." };
    z.enum(["events", "ticket_types"]).parse(table);
    z.uuid().parse(id);
    const { db } = await requireUser();
    const result = await db
      .from(table)
      .delete()
      .eq("id", id)
      .select("id")
      .single();
    if (result.error) throw result.error;
    revalidatePath("/dashboard");
    return { success: true };
  } catch {
    return {
      error:
        "Only unused ticket types and draft events without orders can be deleted.",
    };
  }
}
export async function saveMember(input: unknown) {
  try {
    if (!configured()) return { error: "Demo mode: changes are disabled." };
    const values = z
      .object({
        organizer_id: z.uuid(),
        user_id: z.uuid(),
        role: z.enum(["admin", "manager", "staff"]),
      })
      .parse(input);
    const { db } = await requireUser();
    const existing = await db
      .from("organizer_members")
      .select("user_id")
      .eq("organizer_id", values.organizer_id)
      .eq("user_id", values.user_id)
      .maybeSingle();
    if (existing.error) throw existing.error;
    const result = existing.data
      ? await db
          .from("organizer_members")
          .update({ role: values.role })
          .eq("organizer_id", values.organizer_id)
          .eq("user_id", values.user_id)
          .select("user_id")
          .single()
      : await db
          .from("organizer_members")
          .insert(values)
          .select("user_id")
          .single();
    if (result.error) throw result.error;
    revalidatePath("/dashboard/settings");
    return { success: true };
  } catch {
    return {
      error:
        "Only the owner can add existing registered users or change non-owner roles.",
    };
  }
}
export async function removeMember(organizerId: string, userId: string) {
  try {
    const { db } = await requireUser();
    const result = await db
      .from("organizer_members")
      .delete()
      .eq("organizer_id", z.uuid().parse(organizerId))
      .eq("user_id", z.uuid().parse(userId))
      .select("user_id")
      .single();
    if (result.error) throw result.error;
    revalidatePath("/dashboard/settings");
    return { success: true };
  } catch {
    return { error: "Unable to remove this member." };
  }
}
