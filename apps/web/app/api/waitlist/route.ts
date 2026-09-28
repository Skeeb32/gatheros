import { NextResponse } from "next/server";
import { z } from "zod";
import { configured } from "@/lib/config";
import { checkOrigin } from "@/lib/http";
import { adminClient } from "@/lib/supabase/admin";
import { localDb } from "@/lib/ops/local";
import { rateLimit } from "@/lib/rate-limit";
export async function POST(req: Request) {
  try {
    checkOrigin(req);
    const b = z
      .object({
        eventId: z.uuid(),
        name: z.string().min(1).max(100),
        email: z.email().max(254),
      })
      .parse(await req.json());
    if (configured()) {
      await rateLimit("waitlist", b.email, 5);
      const { error } = await adminClient().rpc("join_waitlist", {
        p_event_id: b.eventId,
        p_email: b.email,
        p_name: b.name,
      });
      if (error) throw error;
    } else {
      if (
        !["localhost", "127.0.0.1", "[::1]"].includes(new URL(req.url).hostname)
      )
        return NextResponse.json({ error: "Local demo only" }, { status: 403 });
      const db = await localDb();
      await db.query("select public.join_waitlist($1,$2,$3)", [
        b.eventId,
        b.email,
        b.name,
      ]);
    }
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json(
      {
        error: "Unable to join. Check your details and try again in a minute.",
      },
      { status: 400 },
    );
  }
}
