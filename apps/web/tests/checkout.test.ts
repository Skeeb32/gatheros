import { it, expect, vi, beforeEach } from "vitest";
const mocks = vi.hoisted(() => ({
  rpc: vi.fn(),
  rate: vi.fn(),
  checkout: vi.fn(),
  email: vi.fn(),
  getUser: vi.fn(),
}));
vi.mock("@/lib/rate-limit", () => ({ rateLimit: mocks.rate }));
vi.mock("@/lib/supabase/admin", () => ({
  adminClient: () => ({ rpc: mocks.rpc }),
}));
vi.mock("@/lib/supabase/server", () => ({
  serverClient: async () => ({ auth: { getUser: mocks.getUser } }),
}));
vi.mock("@/lib/stripe/checkout", () => ({ createCheckout: mocks.checkout }));
vi.mock("@/lib/email/tickets", () => ({ sendTickets: mocks.email }));
import { POST } from "@/app/api/checkout/route";
const body = {
  ticketTypeId: "10000000-0000-4000-8000-000000000001",
  quantity: 2,
  email: "buyer@example.com",
  firstName: "Test",
  lastName: "Buyer",
  requestKey: "20000000-0000-4000-8000-000000000001",
  price: 1,
  buyerUserId: "fake",
};
const request = (origin = "http://localhost:3000") =>
  new Request("http://localhost:3000/api/checkout", {
    method: "POST",
    headers: { origin, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
beforeEach(() => {
  vi.resetAllMocks();
  mocks.rate.mockResolvedValue(undefined);
  process.env.NEXT_PUBLIC_SUPABASE_URL = "https://test.supabase.co";
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "test";
  process.env.NEXT_PUBLIC_APP_URL = "http://localhost:3000";
  mocks.getUser.mockResolvedValue({ data: { user: { id: "real-user" } } });
  mocks.rpc.mockResolvedValue({
    data: { id: "order", total_cents: 8800 },
    error: null,
  });
  mocks.checkout.mockResolvedValue("https://checkout.stripe.com/test");
});
it("rejects cross-origin checkout", async () => {
  expect((await POST(request("https://evil.example"))).status).toBe(403);
  expect(mocks.rpc).not.toHaveBeenCalled();
});
it("uses verified identity and database pricing rather than submitted prices", async () => {
  const response = await POST(request());
  expect(response.status).toBe(200);
  expect(mocks.rpc).toHaveBeenCalledWith(
    "reserve_order",
    expect.objectContaining({ p_buyer: "real-user", p_quantity: 2 }),
  );
  expect(mocks.rpc.mock.calls[0][1]).not.toHaveProperty("price");
  expect(mocks.checkout).toHaveBeenCalledWith("order");
});
it("inventory failure never creates a Stripe session", async () => {
  mocks.rpc.mockResolvedValue({ error: { message: "insufficient_inventory" } });
  expect((await POST(request())).status).toBe(409);
  expect(mocks.checkout).not.toHaveBeenCalled();
});
it("free orders finalize without Stripe and queue ticket emails", async () => {
  mocks.rpc
    .mockResolvedValueOnce({
      data: { id: "free-order", total_cents: 0, currency: "usd" },
      error: null,
    })
    .mockResolvedValueOnce({ error: null });
  mocks.email.mockResolvedValue(undefined);
  expect((await POST(request())).status).toBe(200);
  expect(mocks.rpc).toHaveBeenCalledWith(
    "finalize_order",
    expect.objectContaining({ p_amount: 0, p_order_id: "free-order" }),
  );
  expect(mocks.checkout).not.toHaveBeenCalled();
  expect(mocks.email).toHaveBeenCalledWith("free-order");
});

it("handles PostgREST table-composite row arrays", async () => {
  mocks.rpc.mockResolvedValueOnce({
    data: [{ id: "array-order", total_cents: 4400, status: "pending" }],
    error: null,
  });
  expect((await POST(request())).status).toBe(200);
  expect(mocks.checkout).toHaveBeenCalledWith("array-order");
});
it("a completed checkout retry returns confirmation without another session", async () => {
  mocks.rpc.mockResolvedValueOnce({
    data: [{ id: "paid-order", total_cents: 4400, status: "paid" }],
    error: null,
  });
  expect((await POST(request())).status).toBe(200);
  expect(mocks.checkout).not.toHaveBeenCalled();
});

it("rate-limited checkout cannot reserve inventory",async()=>{
 mocks.rate.mockRejectedValue(new Error("Too many requests. Please wait a minute."));
 expect((await POST(request())).status).toBe(429);
 expect(mocks.rpc).not.toHaveBeenCalled();
 expect(mocks.checkout).not.toHaveBeenCalled();
});
