import type { Event } from "@/types/events";
export const demoEvents: Event[] = [
  {
    title: "Golden hour, good company.",
    slug: "golden-hour-social",
    description:
      "An evening for the people who turn strangers into friends. Join us for rooftop views, a live vinyl set, and a little something sparkling. Your ticket includes a welcome drink and all the good company you can handle.",
    venue_name: "The Rooftop at The Harrison",
    city: "Indianapolis",
    starts_at: "2027-06-18T22:00:00Z",
    organizers: { name: "Summer Socials", slug: "summer-socials" },
  },
  {
    title: "A seat at the long table.",
    slug: "supper-club",
    description:
      "Seasonal ingredients. Shared plates. New connections. Our neighborhood supper club brings everyone to the same table for a four-course evening.",
    venue_name: "Gather House",
    city: "Indianapolis",
    starts_at: "2027-06-25T23:00:00Z",
    organizers: { name: "Gather House", slug: "gather-house" },
  },
  {
    title: "Sunday, a little slower.",
    slug: "sunday-market",
    description:
      "Meet independent makers, find your next favorite coffee, and spend a slow Sunday with the neighborhood. A celebration of things made with care.",
    venue_name: "Canal Walk",
    city: "Indianapolis",
    starts_at: "2027-06-27T14:00:00Z",
    organizers: { name: "Local Assembly", slug: "local-assembly" },
  },
].map((e, i) => ({
  ...e,
  id: `10000000-0000-4000-8000-00000000000${i + 1}`,
  organizer_id: `20000000-0000-4000-8000-00000000000${i + 1}`,
  ends_at: null,
  timezone: "America/Indiana/Indianapolis",
  status: "published",
  ticket_types: [
    {
      id: `30000000-0000-4000-8000-00000000000${i + 1}`,
      event_id: `10000000-0000-4000-8000-00000000000${i + 1}`,
      name: "General admission",
      price_cents: [4000, 6500, 0][i],
      currency: "usd",
      quantity: 150,
      quantity_sold: [87, 42, 56][i],
      quantity_reserved: 0,
      status: "active",
    },
  ],
}));
