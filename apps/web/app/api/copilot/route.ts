import { rateLimit } from "@/lib/rate-limit";

import { NextResponse } from "next/server";
import { z } from "zod";
import { operations } from "@/lib/ops/data";
import { metrics } from "@/lib/ops/types";
import { retrieve } from "@/lib/ops/retrieval";
import { configured, appUrl } from "@/lib/config";
import { serverClient } from "@/lib/supabase/server";
export async function POST(req: Request) {
  try {
    if (req.headers.get("origin") !== new URL(appUrl()).origin)
      return NextResponse.json({ error: "Origin rejected" }, { status: 403 });
    if (configured()) {
      const db = await serverClient();
      const {
        data: { user },
      } = await db.auth.getUser();
      if (!user) throw new Error("unauthorized");
      await rateLimit("copilot", user.id, 20);
    }
    const { eventId, message } = z
      .object({ eventId: z.uuid(), message: z.string().min(1).max(2000) })
      .parse(await req.json());
    const data = await operations(eventId);
    if (configured() && process.env.AI_SERVICE_URL) {
      const db = await serverClient();
      const { data: session } = await db.auth.getSession();
      const response = await fetch(`${process.env.AI_SERVICE_URL}/chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.session?.access_token}`,
        },
        body: JSON.stringify({ event_id: eventId, message }),
        signal: AbortSignal.timeout(45000),
      });
      if (!response.ok)
        throw new Error("AI service unavailable. Please try again.");
      return NextResponse.json(await response.json());
    }
    const m = metrics(data);
    const q = message.toLowerCase();
    const docs = retrieve(message, data.documents);
    let answer = "";
    let tool = "get_event_stats";
    let draft: { subject: string; body: string } | undefined;
    if (/email|remind|draft/.test(q)) {
      tool = "generate_email_draft";
      draft = {
        subject: `See you at ${data.event.title}`,
        body: `Hello,\n\nWe look forward to welcoming you to ${data.event.title} at ${data.event.venue_name} on ${new Date(data.event.starts_at).toLocaleDateString("en-US", { timeZone: "UTC" })}. Please have your ticket QR code ready at the entrance.\n\nSee you there,\nThe organizing team`,
      };
      answer =
        "Here is an editable reminder draft. Review it before saving; nothing has been sent.";
    } else if (/inventory|remaining|left|tickets?/.test(q)) {
      tool = "get_ticket_inventory";
      answer = data.inventory
        .filter(
          (t) => !q.includes("vip") || t.name.toLowerCase().includes("vip"),
        )
        .map(
          (t) =>
            `${t.name}: ${t.quantity - t.quantity_sold - t.quantity_reserved} available of ${t.quantity}; ${t.quantity_sold} sold.`,
        )
        .join("\n");
    } else if (/revenue|money/.test(q)) {
      tool = "get_revenue_stats";
      answer = `Net recorded revenue is $${(m.revenue / 100).toLocaleString("en-US")} across ${m.orders} paid orders. This subtracts recorded refunds and includes checkout fees.`;
    } else if (/check.?in/.test(q)) {
      tool = "get_checkin_stats";
      answer = `${data.checkins} attendees checked in (${m.checkinRate}% of issued tickets).`;
    } else if (/waitlist/.test(q)) {
      tool = "get_waitlist";
      answer = `${data.waitlist.length} people are on this event's waitlist.`;
    } else if (docs.length) {
      tool = "search_event_documents";
      answer = docs.map((d, i) => `[${i + 1}] ${d.content}`).join("\n\n");
    } else {
      answer = `${m.sold} of ${m.capacity} tickets are sold (${m.sellThrough}%). There are ${m.days} days until the event. ${m.recent} paid orders were recorded in the last seven days${m.velocity === null ? "; there is no prior-week baseline" : `, a ${m.velocity}% change versus the previous seven days`}. These figures do not establish why sales changed.`;
    }
    return NextResponse.json({
      answer,
      tool,
      mode: "deterministic",
      citations:
        tool === "search_event_documents"
          ? docs.map((d, i) => ({ title: d.title, id: d.id, index: i + 1 }))
          : [],
      draft,
    });
  } catch {
    return NextResponse.json(
      {
        error:
          "Unable to answer. Check event access and service configuration.",
      },
      { status: 400 },
    );
  }
}
