import { rateLimit } from "@/lib/rate-limit";

import { NextResponse } from "next/server";
import { z } from "zod";
import { configured, appUrl } from "@/lib/config";
import { serverClient } from "@/lib/supabase/server";
import { operations } from "@/lib/ops/data";
import { localQuery } from "@/lib/ops/local";
const input = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("document"),
    eventId: z.uuid(),
    title: z.string().min(1).max(120),
    content: z.string().min(1).max(100000),
  }),
  z.object({
    action: z.literal("draft"),
    eventId: z.uuid(),
    subject: z.string().min(1).max(200),
    body: z.string().min(1).max(10000),
  }),
  z.object({
    action: z.literal("inventory"),
    eventId: z.uuid(),
    ticketId: z.uuid(),
    quantity: z.number().int().min(1).max(100000),
  }),
]);
export async function POST(req: Request) {
  try {
    if (req.headers.get("origin") !== new URL(appUrl()).origin)
      return NextResponse.json({ error: "Origin rejected" }, { status: 403 });
    if (
      !configured() &&
      !["localhost", "127.0.0.1", "[::1]"].includes(new URL(req.url).hostname)
    )
      return NextResponse.json(
        { error: "Demo writes are local only" },
        { status: 403 },
      );
    if (Number(req.headers.get("content-length") || 0) > 150000)
      return NextResponse.json({ error: "Payload too large" }, { status: 413 });
    if (configured()) {
      const db = await serverClient();
      const {
        data: { user },
      } = await db.auth.getUser();
      if (!user) throw new Error("unauthorized");
      await rateLimit("operations", user.id, 30);
    }
    const body = input.parse(await req.json());
    await operations(body.eventId);
    if (!configured()) {
      if (body.action === "document")
        await localQuery(
          "insert into public.event_documents(event_id,title,content) values($1,$2,$3)",
          [body.eventId, body.title, body.content],
        );
      if (body.action === "draft")
        await localQuery(
          "insert into public.notifications(event_id,kind,subject,body) values($1,'reminder',$2,$3)",
          [body.eventId, body.subject, body.body],
        );
      if (body.action === "inventory")
        await localQuery(
          "update public.ticket_types set quantity=$1 where id=$2 and event_id=$3 returning id",
          [body.quantity, body.ticketId, body.eventId],
        );
    } else {
      const db = await serverClient();
      const result =
        body.action === "document"
          ? await db
              .from("event_documents")
              .insert({
                event_id: body.eventId,
                title: body.title,
                content: body.content,
              })
          : body.action === "draft"
            ? await db
                .from("notifications")
                .insert({
                  event_id: body.eventId,
                  kind: "reminder",
                  subject: body.subject,
                  body: body.body,
                })
            : await db
                .from("ticket_types")
                .update({ quantity: body.quantity })
                .eq("id", body.ticketId)
                .eq("event_id", body.eventId);
      if (result.error)
        throw new Error(
          "Save failed. Check permissions and inventory constraints.",
        );
    }
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json(
      {
        error:
          e instanceof z.ZodError
            ? "Check the form fields"
            : "Unable to save. Check access and ensure capacity covers sold and reserved tickets.",
      },
      { status: 400 },
    );
  }
}
