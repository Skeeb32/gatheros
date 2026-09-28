import { z } from "zod";
import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/permissions";
import { checkOrigin, apiError } from "@/lib/http";
export async function POST(request: Request) {
  try {
    checkOrigin(request);
    const input = z
      .object({
        ticketCode: z.string().regex(/^[a-f0-9]{64}$/),
        eventId: z.uuid(),
      })
      .parse(await request.json());
    const { db } = await requireUser();
    const { data, error } = await db.rpc("check_in_ticket", {
      p_ticket_code: input.ticketCode,
      p_event_id: input.eventId,
    });
    if (error) {
      if (error.code === "42501") throw new Error("forbidden");
      throw error;
    }
    return NextResponse.json(data);
  } catch (error) {
    return apiError(error);
  }
}
