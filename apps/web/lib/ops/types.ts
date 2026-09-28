export type Operations = {
  event: {
    organization_name?: string;
    id: string;
    title: string;
    slug: string;
    description: string;
    starts_at: string;
    venue_name: string;
    city: string;
    status: string;
  };
  inventory: {
    id: string;
    name: string;
    price_cents: number;
    quantity: number;
    quantity_sold: number;
    quantity_reserved: number;
  }[];
  orders: {
    total_cents: number;
    refunded_cents: number;
    status: string;
    created_at: string;
  }[];
  checkins: number;
  waitlist: {
    id: string;
    name: string;
    email: string;
    status: string;
    created_at: string;
  }[];
  documents: { id: string; title: string; content: string }[];
  drafts: { id: string; subject: string; body: string; status: string }[];
};
export function metrics(data: Operations, now = new Date()) {
  const sold = data.inventory.reduce((s, t) => s + t.quantity_sold, 0);
  const capacity = data.inventory.reduce((s, t) => s + t.quantity, 0);
  const paid = data.orders.filter((o) =>
    ["paid", "partially_refunded", "refunded"].includes(o.status),
  );
  const revenue = paid.reduce(
    (s, o) => s + o.total_cents - o.refunded_cents,
    0,
  );
  const recent = paid.filter(
    (o) => +new Date(o.created_at) > +now - 7 * 86400000,
  ).length;
  const previous = paid.filter(
    (o) =>
      +new Date(o.created_at) <= +now - 7 * 86400000 &&
      +new Date(o.created_at) > +now - 14 * 86400000,
  ).length;
  return {
    sold,
    capacity,
    revenue,
    orders: paid.length,
    sellThrough: capacity ? Math.round((sold / capacity) * 100) : 0,
    days: Math.max(
      0,
      Math.ceil((+new Date(data.event.starts_at) - +now) / 86400000),
    ),
    recent,
    previous,
    velocity: previous
      ? Math.round(((recent - previous) / previous) * 100)
      : null,
    refundRate: paid.length
      ? Math.round(
          (paid.filter((o) => o.refunded_cents > 0).length / paid.length) *
            1000,
        ) / 10
      : 0,
    checkinRate: sold ? Math.round((data.checkins / sold) * 100) : 0,
  };
}
