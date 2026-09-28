export const configured = () =>
  Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  );
export function required(name: string) {
  const value = process.env[name];
  if (!value) throw new Error(`Missing ${name}`);
  return value;
}
export const appUrl = () =>
  process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
export function feeBps() {
  const bps = Number(process.env.PLATFORM_FEE_BPS ?? 1000);
  if (!Number.isInteger(bps) || bps < 0 || bps > 5000)
    throw new Error("Invalid PLATFORM_FEE_BPS");
  return bps;
}
