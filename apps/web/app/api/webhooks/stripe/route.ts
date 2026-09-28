import { NextResponse } from "next/server";
import { stripe } from "@/lib/stripe/client";
import { required } from "@/lib/config";
import { processWebhook } from "@/lib/stripe/webhooks";
export const runtime = "nodejs";
export async function POST(request: Request) {
  const signature = request.headers.get("stripe-signature");
  if (!signature)
    return NextResponse.json({ error: "Missing signature" }, { status: 400 });
  let event;
  try {
    event = stripe().webhooks.constructEvent(
      await request.text(),
      signature,
      required("STRIPE_WEBHOOK_SECRET"),
    );
  } catch {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }
  try {
    await processWebhook(event);
    return NextResponse.json({ received: true });
  } catch (error) {
    console.error(
      "Webhook processing failed",
      event.id,
      error instanceof Error ? error.message : "unknown",
    );
    return NextResponse.json(
      { error: "Processing failed; retry required" },
      { status: 500 },
    );
  }
}
