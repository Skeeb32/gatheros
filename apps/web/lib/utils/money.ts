export function money(cents: number, currency = "usd") {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: cents % 100 === 0 ? 0 : 2,
  }).format(cents / 100);
}
export function calculateTotal(price: number, quantity: number, bps: number) {
  if (
    ![price, quantity, bps].every(Number.isSafeInteger) ||
    price < 0 ||
    quantity < 1 ||
    quantity > 10 ||
    bps < 0 ||
    bps > 5000
  )
    throw new Error("Invalid price, quantity, or fee");
  const subtotal = price * quantity;
  const fee = Math.round((subtotal * bps) / 10000);
  if (!Number.isSafeInteger(subtotal + fee))
    throw new Error("Amount too large");
  return { subtotal, fee, total: subtotal + fee };
}
