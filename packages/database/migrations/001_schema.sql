create schema if not exists private;
create extension if not exists pgcrypto;
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  first_name text,
  last_name text,
  display_name text,
  avatar_url text,
  phone text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.organizers (
  id uuid primary key default gen_random_uuid(),

  owner_user_id uuid not null
    references public.profiles(id),

  name text not null,
  slug text not null unique,
  description text,
  logo_url text,
  website_url text,

  stripe_account_id text unique,
  stripe_account_status text not null default 'pending',

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.organizer_members (
  organizer_id uuid not null
    references public.organizers(id) on delete cascade,

  user_id uuid not null
    references public.profiles(id) on delete cascade,

  role text not null
    check (role in ('owner', 'admin', 'manager', 'staff')),

  created_at timestamptz not null default now(),

  primary key (organizer_id, user_id)
);

create table public.events (
  id uuid primary key default gen_random_uuid(),

  organizer_id uuid not null
    references public.organizers(id) on delete cascade,

  title text not null,
  slug text not null,

  description text,

  status text not null default 'draft'
    check (status in (
      'draft',
      'published',
      'cancelled',
      'completed'
    )),

  starts_at timestamptz not null,
  ends_at timestamptz,

  timezone text not null default 'America/New_York',

  venue_name text,
  address_line_1 text,
  address_line_2 text,
  city text,
  state text,
  postal_code text,
  country text default 'US',

  cover_image_url text,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  unique (organizer_id, slug)
);

create table public.event_images (
  id uuid primary key default gen_random_uuid(),

  event_id uuid not null
    references public.events(id) on delete cascade,

  storage_path text not null,
  alt_text text,

  sort_order integer not null default 0,

  created_at timestamptz not null default now()
);

create table public.ticket_types (
  id uuid primary key default gen_random_uuid(),

  event_id uuid not null
    references public.events(id) on delete cascade,

  name text not null,
  description text,

  price_cents integer not null
    check (price_cents >= 0),

  currency text not null default 'usd',

  quantity integer not null
    check (quantity > 0),

  quantity_sold integer not null default 0
    check (quantity_sold >= 0),

  sales_start timestamptz,
  sales_end timestamptz,

  status text not null default 'active'
    check (status in ('active', 'paused', 'sold_out')),

  created_at timestamptz not null default now(),

  check (quantity_sold <= quantity)
);

create table public.orders (
  id uuid primary key default gen_random_uuid(),

  event_id uuid not null
    references public.events(id),

  buyer_user_id uuid
    references public.profiles(id),

  buyer_email text not null,
  buyer_first_name text,
  buyer_last_name text,

  currency text not null default 'usd',

  subtotal_cents integer not null,
  platform_fee_cents integer not null default 0,
  tax_cents integer not null default 0,
  total_cents integer not null,

  status text not null default 'pending'
    check (status in (
      'pending',
      'paid',
      'failed',
      'cancelled',
      'refunded',
      'partially_refunded'
    )),

  stripe_checkout_session_id text unique,
  stripe_payment_intent_id text unique,

  created_at timestamptz not null default now(),
  paid_at timestamptz
);

create table public.order_items (
  id uuid primary key default gen_random_uuid(),

  order_id uuid not null
    references public.orders(id) on delete cascade,

  ticket_type_id uuid not null
    references public.ticket_types(id),

  quantity integer not null
    check (quantity > 0),

  unit_price_cents integer not null,

  total_cents integer not null
);

create table public.attendees (
  id uuid primary key default gen_random_uuid(),

  order_item_id uuid not null
    references public.order_items(id) on delete cascade,

  first_name text not null,
  last_name text not null,
  email text not null,

  created_at timestamptz not null default now()
);

create table public.tickets (
  id uuid primary key default gen_random_uuid(),

  order_item_id uuid not null
    references public.order_items(id),

  attendee_id uuid
    references public.attendees(id),

  ticket_code text not null unique,

  status text not null default 'valid'
    check (status in (
      'valid',
      'used',
      'cancelled',
      'refunded'
    )),

  created_at timestamptz not null default now()
);

create table public.check_ins (
  id uuid primary key default gen_random_uuid(),

  ticket_id uuid not null unique
    references public.tickets(id),

  checked_in_by uuid
    references public.profiles(id),

  checked_in_at timestamptz not null default now(),

  metadata jsonb
);

create table public.payment_transactions (
  id uuid primary key default gen_random_uuid(),

  order_id uuid not null
    references public.orders(id),

  stripe_payment_intent_id text,
  stripe_charge_id text,
  stripe_application_fee_id text,
  stripe_transfer_id text,

  amount_cents integer not null,
  platform_fee_cents integer not null default 0,

  currency text not null,

  status text not null,

  created_at timestamptz not null default now()
);

create table public.stripe_webhook_events (
  id text primary key,
  type text not null,
  processed_at timestamptz,
  created_at timestamptz not null default now()
);

-- Reservations stay held until Stripe confirms expiration; local clocks never release payable sessions.
alter table public.ticket_types add column quantity_reserved integer not null default 0 check(quantity_reserved >= 0);
alter table public.ticket_types add constraint inventory_limit check(quantity_sold + quantity_reserved <= quantity);
alter table public.orders add column request_key uuid not null unique;
alter table public.orders add column reservation_expires_at timestamptz not null default (now() + interval '35 minutes');
alter table public.orders add column email_sent_at timestamptz;
alter table public.orders add column email_claimed_at timestamptz;
alter table public.orders add column refunded_cents integer not null default 0;
alter table public.orders add constraint amounts_valid check(subtotal_cents >= 0 and platform_fee_cents >= 0 and tax_cents >= 0 and total_cents = subtotal_cents + platform_fee_cents + tax_cents);
alter table public.ticket_types add constraint currency_supported check(currency = 'usd');
alter table public.events add constraint valid_event_dates check(ends_at is null or ends_at > starts_at);
alter table public.order_items add constraint item_amount_valid check(unit_price_cents >= 0 and total_cents = quantity * unit_price_cents);
create unique index one_transaction_per_payment on public.payment_transactions(stripe_payment_intent_id) where stripe_payment_intent_id is not null;
create index on public.organizer_members(user_id);
create index on public.events(organizer_id);
create index on public.ticket_types(event_id);
create index on public.orders(event_id);
create index on public.orders(buyer_user_id);
create index on public.order_items(order_id);
create index on public.tickets(order_item_id);
create index on public.attendees(order_item_id);

create function private.create_profile() returns trigger language plpgsql security definer set search_path = '' as $$
begin
 insert into public.profiles(id,display_name) values(new.id,coalesce(new.raw_user_meta_data->>'display_name',''));
 return new;
end $$;
create trigger create_profile after insert on auth.users for each row execute function private.create_profile();
create function private.add_owner() returns trigger language plpgsql security definer set search_path = '' as $$
begin
 insert into public.organizer_members(organizer_id,user_id,role) values(new.id,new.owner_user_id,'owner'); return new;
end $$;
create trigger add_owner after insert on public.organizers for each row execute function private.add_owner();
