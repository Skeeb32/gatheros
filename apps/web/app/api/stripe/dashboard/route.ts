import { NextResponse } from "next/server";
import { z } from "zod";
import { requireOrganizer } from "@/lib/auth/permissions";
import { stripe } from "@/lib/stripe/client";
import { apiError } from "@/lib/http";
export async function GET(request: Request) {
  try {
    const id = z
      .uuid()
      .parse(new URL(request.url).searchParams.get("organizerId"));
    const org = await requireOrganizer(id, ["owner"]);
    if (!org.stripe_account_id) throw new Error("Account not connected");
    const link = await stripe().accounts.createLoginLink(org.stripe_account_id);
    return NextResponse.json(
      { url: link.url },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return apiError(error);
  }
}
