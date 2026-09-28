import { describe, it, expect } from "vitest";
import { calculateTotal, money } from "@/lib/utils/money";
import { checkoutSchema, eventSchema, safeNext } from "@/lib/utils/validation";
describe("server pricing", () => {
  it("adds a fee to integer-cent subtotal", () => {
    expect(calculateTotal(4000, 2, 1000)).toEqual({
      subtotal: 8000,
      fee: 800,
      total: 8800,
    });
  });
  it("rounds once per order and allows free admission", () => {
    expect(calculateTotal(333, 3, 1000)).toEqual({
      subtotal: 999,
      fee: 100,
      total: 1099,
    });
    expect(calculateTotal(0, 10, 1000).total).toBe(0);
  });
  it.each([
    [4000, 0, 1000],
    [4000, 11, 1000],
    [-1, 1, 1000],
    [1.5, 1, 1000],
    [4000, 1, 5001],
    [NaN, 1, 0],
    [Number.MAX_SAFE_INTEGER, 10, 1000],
  ])("rejects invalid amounts %j", (price, quantity, bps) => {
    expect(() => calculateTotal(price, quantity, bps)).toThrow();
  });
  it("formats cents without floating-point calculation", () => {
    expect(money(1099)).toBe("$10.99");
  });
});
describe("request validation", () => {
  it("strips client-controlled price and buyer identity", () => {
    const result = checkoutSchema.parse({
      ticketTypeId: "10000000-0000-4000-8000-000000000001",
      quantity: 2,
      email: "a@example.com",
      firstName: "A",
      lastName: "B",
      requestKey: "20000000-0000-4000-8000-000000000001",
      price: 1,
      buyerUserId: "attacker",
    });
    expect(result).not.toHaveProperty("price");
    expect(result).not.toHaveProperty("buyerUserId");
  });
  it.each(["https://evil.example", "//evil.example", "/\\evil.example"])(
    "blocks external callback redirects %s",
    (value) => {
      expect(safeNext(value)).toBe("/dashboard");
    },
  );
  it("allows local routes", () =>
    expect(safeNext("/my-tickets")).toBe("/my-tickets"));
  it("rejects impossible event dates", () => {
    expect(
      eventSchema.safeParse({
        organizer_id: "10000000-0000-4000-8000-000000000001",
        title: "Test event",
        slug: "test",
        description: "",
        starts_at: "2027-06-01T12:00:00Z",
        ends_at: "2027-06-01T11:00:00Z",
        timezone: "Mars/Olympus",
        venue_name: "",
        city: "",
        status: "draft",
      }).success,
    ).toBe(false);
  });
});
