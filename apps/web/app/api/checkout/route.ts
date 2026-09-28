import { rateLimit } from "@/lib/rate-limit";
import { NextResponse } from "next/server";
import { checkoutSchema } from "@/lib/utils/validation";
import { adminClient } from "@/lib/supabase/admin";
import { serverClient } from "@/lib/supabase/server";
import { checkOrigin, apiError } from "@/lib/http";
import { createCheckout } from "@/lib/stripe/checkout";
import { feeBps, configured, appUrl } from "@/lib/config";
import { sendTickets } from "@/lib/email/tickets";
export async function POST(request: Request) {
  try {
    checkOrigin(request);
    if (!configured())
      return NextResponse.json(
        {
          error:
            "This is a demo. Configure Supabase and Stripe to sell tickets.",
        },
        { status: 503 },
      );
    const input = checkoutSchema.parse(await request.json());
    await rateLimit("checkout", input.email, 10);
    const userDb = await serverClient();
    const {
      data: { user },
    } = await userDb.auth.getUser();
    const db = adminClient();
    const { data: reserved, error } = await db.rpc("reserve_order", {
      p_ticket_type_id: input.ticketTypeId,
      p_quantity: input.quantity,
      p_email: input.email.toLowerCase(),
      p_first: input.firstName,
      p_last: input.lastName,
      p_buyer: user?.id ?? null,
      p_request_key: input.requestKey,
      p_fee_bps: feeBps(),
    });
    if (error) {
      if (
        /inventory|sales_closed|not_ready|idempotency_conflict/.test(
          error.message,
        )
      )
        return NextResponse.json(
          {
            error:
              "These tickets are unavailable or the checkout details changed. Please refresh and try again.",
          },
          { status: 409 },
        );
      throw error;
    }
    // PostgREST represents table-composite RPC results as a row array.
    const o = Array.isArray(reserved)
      ? reserved.length === 1
        ? reserved[0]
        : null
      : reserved;
    if (!o?.id) throw new Error("Invalid reservation response");
    if (["paid", "partially_refunded", "refunded"].includes(o.status)) {
      return NextResponse.json({ url: `${appUrl()}/checkout/success` });
    }
    if (o.total_cents === 0) {
      const result = await db.rpc("finalize_order", {
        p_order_id: o.id,
        p_event_id: `free:${o.id}`,
        p_event_type: "free_order",
        p_session_id: null,
        p_payment_intent: null,
        p_amount: 0,
        p_currency: o.currency,
      });
      if (result.error) throw result.error;
      await sendTickets(o.id).catch((error) =>
        console.error("Email queued for retry", error.message),
      );
      return NextResponse.json({ url: `${appUrl()}/checkout/success` });
    }
    return NextResponse.json({ url: await createCheckout(o.id) });
  } catch (error) {
    return apiError(error);
  }
}
