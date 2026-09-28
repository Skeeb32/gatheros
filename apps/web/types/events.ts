export type TicketType = {
  id: string;
  event_id: string;
  name: string;
  description?: string;
  price_cents: number;
  currency: string;
  quantity: number;
  quantity_sold: number;
  quantity_reserved: number;
  status: string;
};
export type Event = {
  id: string;
  organizer_id: string;
  title: string;
  slug: string;
  description: string;
  starts_at: string;
  ends_at: string | null;
  timezone: string;
  venue_name: string;
  city: string;
  status: string;
  cover_image_url?: string;
  organizers: { name: string; slug: string };
  ticket_types: TicketType[];
};
