import { describe, it, expect } from "vitest";
import { metrics, type Operations } from "@/lib/ops/types";
import { retrieve } from "@/lib/ops/retrieval";
const data: Operations = {
  event: {
    id: "x",
    title: "Test",
    slug: "test",
    description: "",
    starts_at: "2026-10-10T12:00:00Z",
    venue_name: "Hall",
    city: "Indy",
    status: "published",
  },
  inventory: [
    {
      id: "v",
      name: "VIP",
      price_cents: 1000,
      quantity: 10,
      quantity_sold: 4,
      quantity_reserved: 1,
    },
  ],
  orders: [
    {
      status: "paid",
      total_cents: 1000,
      refunded_cents: 100,
      created_at: "2026-09-27T00:00:00Z",
    },
  ],
  checkins: 2,
  waitlist: [],
  documents: [],
  drafts: [],
};
describe("transparent event health", () => {
  it("subtracts refunds from recorded revenue", () =>
    expect(metrics(data).revenue).toBe(900));
  it("computes sell-through and check-in denominator", () => {
    expect(metrics(data).sellThrough).toBe(40);
    expect(metrics(data).checkinRate).toBe(50);
  });
  it("does not invent a velocity when there is no baseline", () =>
    expect(metrics(data, new Date("2026-09-28")).velocity).toBeNull());
  it("handles empty events without NaN", () => {
    const m = metrics({ ...data, inventory: [], orders: [] });
    expect(m.sellThrough).toBe(0);
    expect(m.refundRate).toBe(0);
  });
  it("excludes failed orders from revenue", () =>
    expect(
      metrics({ ...data, orders: [{ ...data.orders[0], status: "failed" }] })
        .revenue,
    ).toBe(0));
});
describe("honest lexical retrieval", () => {
  const docs = [
    {
      id: "1",
      title: "Arrival",
      content: "VIP entrance is on the north side.",
    },
  ];
  it("returns relevant source records", () =>
    expect(retrieve("Where is the VIP entrance?", docs)[0].id).toBe("1"));
  it("does not invent a source", () =>
    expect(retrieve("Lunch menu?", docs)).toEqual([]));
});
