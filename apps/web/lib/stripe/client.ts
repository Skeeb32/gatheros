import "server-only";
import Stripe from "stripe";
import { required } from "@/lib/config";
export function stripe() {
  return new Stripe(required("STRIPE_SECRET_KEY"), { maxNetworkRetries: 2 });
}
