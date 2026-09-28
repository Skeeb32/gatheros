import { z } from "zod";
export const checkoutSchema = z.object({
  ticketTypeId: z.uuid(),
  quantity: z.number().int().min(1).max(10),
  email: z.email().max(254),
  firstName: z.string().trim().min(1).max(80),
  lastName: z.string().trim().min(1).max(80),
  requestKey: z.uuid(),
});
export const eventSchema = z
  .object({
    organizer_id: z.uuid(),
    title: z.string().trim().min(3).max(140),
    slug: z
      .string()
      .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
      .max(100),
    description: z.string().max(10000),
    starts_at: z.iso.datetime({ offset: true }),
    ends_at: z.iso.datetime({ offset: true }).nullable(),
    timezone: z.string().refine((v) => {
      try {
        new Intl.DateTimeFormat("en-US", { timeZone: v });
        return true;
      } catch {
        return false;
      }
    }),
    venue_name: z.string().max(200),
    city: z.string().max(100),
    status: z.enum(["draft", "published", "cancelled", "completed"]),
  })
  .refine((v) => !v.ends_at || new Date(v.ends_at) > new Date(v.starts_at), {
    message: "End must be after start",
  });
export const ticketTypeSchema = z.object({
  event_id: z.uuid(),
  name: z.string().trim().min(1).max(100),
  price_cents: z.number().int().min(0).max(1000000),
  quantity: z.number().int().min(1).max(100000),
  status: z.enum(["active", "paused", "sold_out"]),
});
export function safeNext(value: string | null) {
  return value?.startsWith("/") &&
    !value.startsWith("//") &&
    !value.includes("\\")
    ? value
    : "/dashboard";
}
