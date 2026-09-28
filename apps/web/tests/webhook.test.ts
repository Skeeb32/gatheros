import { it, expect, vi, beforeEach } from "vitest";
const mocks = vi.hoisted(() => ({
  constructEvent: vi.fn(),
  processWebhook: vi.fn(),
}));
vi.mock("@/lib/stripe/client", () => ({
  stripe: () => ({ webhooks: { constructEvent: mocks.constructEvent } }),
}));
vi.mock("@/lib/stripe/webhooks", () => ({
  processWebhook: mocks.processWebhook,
}));
import { POST } from "@/app/api/webhooks/stripe/route";
beforeEach(() => {
  vi.clearAllMocks();
  process.env.STRIPE_WEBHOOK_SECRET = "whsec_test";
});
it("rejects unsigned webhook without touching business logic", async () => {
  const r = await POST(
    new Request("http://localhost/api/webhooks/stripe", {
      method: "POST",
      body: "{}",
    }),
  );
  expect(r.status).toBe(400);
  expect(mocks.processWebhook).not.toHaveBeenCalled();
});
it("rejects invalid signatures", async () => {
  mocks.constructEvent.mockImplementation(() => {
    throw new Error("invalid");
  });
  const r = await POST(
    new Request("http://localhost/api/webhooks/stripe", {
      method: "POST",
      body: "{}",
      headers: { "stripe-signature": "invalid" },
    }),
  );
  expect(r.status).toBe(400);
  expect(mocks.processWebhook).not.toHaveBeenCalled();
});
it("passes the original raw body to signature verification", async () => {
  const event = { id: "evt_1", type: "checkout.session.completed" };
  mocks.constructEvent.mockReturnValue(event);
  const r = await POST(
    new Request("http://localhost/api/webhooks/stripe", {
      method: "POST",
      body: '{ "raw": true }',
      headers: { "stripe-signature": "test" },
    }),
  );
  expect(r.status).toBe(200);
  expect(mocks.constructEvent).toHaveBeenCalledWith(
    '{ "raw": true }',
    "test",
    "whsec_test",
  );
  expect(mocks.processWebhook).toHaveBeenCalledWith(event);
});
it("returns 500 so Stripe retries transaction failures", async () => {
  mocks.constructEvent.mockReturnValue({ id: "evt_1" });
  mocks.processWebhook.mockRejectedValueOnce(
    new Error("temporary database outage"),
  );
  const r = await POST(
    new Request("http://localhost/api/webhooks/stripe", {
      method: "POST",
      body: "{}",
      headers: { "stripe-signature": "test" },
    }),
  );
  expect(r.status).toBe(500);
});
