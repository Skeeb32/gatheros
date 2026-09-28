import "server-only";
import { createHash } from "node:crypto";
import { adminClient } from "@/lib/supabase/admin";
export async function rateLimit(scope: string, identity: string, limit = 20) {
  const key = createHash("sha256")
    .update(`${scope}:${identity.toLowerCase()}`)
    .digest("hex");
  const { data, error } = await adminClient().rpc("consume_rate_limit", {
    p_key: key,
    p_limit: limit,
  });
  if (error) throw new Error("Rate-limit service unavailable");
  if (!data) throw new Error("Too many requests. Please wait a minute.");
}
