import { z } from "zod";
import { NextResponse } from "next/server";
import { requireOrganizer } from "@/lib/auth/permissions";
import { checkOrigin, apiError } from "@/lib/http";
import { stripe } from "@/lib/stripe/client";
import { adminClient } from "@/lib/supabase/admin";
import { appUrl } from "@/lib/config";
export async function POST(request: Request) {
  try {
    checkOrigin(request);
    const { organizerId } = z
      .object({ organizerId: z.uuid() })
      .parse(await request.json());
    const org = await requireOrganizer(organizerId, ["owner"]);
    const api = stripe();
    let accountId = org.stripe_account_id;
    if (!accountId) {
      const account = await api.accounts.create(
        {
          type: "express",
          capabilities: {
            card_payments: { requested: true },
            transfers: { requested: true },
          },
          metadata: { organizer_id: org.id },
        },
        { idempotencyKey: `connect:${org.id}` },
      );
      accountId = account.id;
      const { error } = await adminClient()
        .from("organizers")
        .update({ stripe_account_id: accountId })
        .eq("id", org.id);
      if (error) throw error;
    }
    const account = await api.accounts.retrieve(accountId);
    const updated = await adminClient()
      .from("organizers")
      .update({
        stripe_account_status:
          account.charges_enabled && account.payouts_enabled
            ? "active"
            : "pending",
      })
      .eq("id", org.id);
    if (updated.error) throw updated.error;
    const link = await api.accountLinks.create({
      account: accountId,
      type: "account_onboarding",
      refresh_url: `${appUrl()}/dashboard/settings`,
      return_url: `${appUrl()}/dashboard/settings`,
    });
    return NextResponse.json({ url: link.url });
  } catch (error) {
    return apiError(error);
  }
}
