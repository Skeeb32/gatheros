create function private.has_role(p_organizer_id uuid, roles text[] default array['owner','admin','manager','staff']) returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.organizer_members where organizer_id=p_organizer_id and user_id=(select auth.uid()) and role=any(roles));
$$;
create function private.event_role(p_event_id uuid, roles text[] default array['owner','admin','manager','staff']) returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.events where id=p_event_id and private.has_role(organizer_id,roles));
$$;
create function private.can_read_order(p_order_id uuid) returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.orders where id=p_order_id and (buyer_user_id=(select auth.uid()) or private.event_role(event_id,array['owner','admin','manager'])));
$$;
create function private.can_read_item(p_item_id uuid) returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.order_items where id=p_item_id and private.can_read_order(order_id));
$$;
grant usage on schema private to anon,authenticated;
grant execute on function private.has_role(uuid,text[]),private.event_role(uuid,text[]),private.can_read_order(uuid),private.can_read_item(uuid) to anon,authenticated;

-- Revoke default Supabase grants, then deliberately expose only the required operations/columns.
revoke all on all tables in schema public from anon,authenticated;
grant select on public.profiles,public.organizer_members,public.orders,public.order_items,public.attendees,public.tickets,public.check_ins to authenticated;
grant select on public.events,public.event_images,public.ticket_types to anon,authenticated;
grant select(id,owner_user_id,name,slug,description,logo_url,website_url,created_at,updated_at) on public.organizers to anon,authenticated;
grant insert(owner_user_id,name,slug,description,logo_url,website_url) on public.organizers to authenticated;
grant update(name,description,logo_url,website_url) on public.organizers to authenticated;
grant update(first_name,last_name,display_name,avatar_url,phone) on public.profiles to authenticated;
grant insert(organizer_id,user_id,role),update(role),delete on public.organizer_members to authenticated;
grant insert(organizer_id,title,slug,description,status,starts_at,ends_at,timezone,venue_name,address_line_1,address_line_2,city,state,postal_code,country,cover_image_url) on public.events to authenticated;
-- organizer_id is immutable for browser clients, even if a user belongs to both tenants.
grant update(title,slug,description,status,starts_at,ends_at,timezone,venue_name,address_line_1,address_line_2,city,state,postal_code,country,cover_image_url),delete on public.events to authenticated;
grant insert(event_id,name,description,price_cents,currency,quantity,sales_start,sales_end,status) on public.ticket_types to authenticated;
grant update(name,description,price_cents,quantity,sales_start,sales_end,status),delete on public.ticket_types to authenticated;
grant insert(event_id,storage_path,alt_text,sort_order),update(storage_path,alt_text,sort_order),delete on public.event_images to authenticated;

alter table public.profiles enable row level security;
alter table public.organizers enable row level security;
alter table public.organizer_members enable row level security;
alter table public.events enable row level security;
alter table public.event_images enable row level security;
alter table public.ticket_types enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.attendees enable row level security;
alter table public.tickets enable row level security;
alter table public.check_ins enable row level security;
alter table public.payment_transactions enable row level security;
alter table public.stripe_webhook_events enable row level security;

create policy profile_read on public.profiles for select to authenticated using(id=auth.uid());
create policy profile_update on public.profiles for update to authenticated using(id=auth.uid()) with check(id=auth.uid());
create policy organizer_read on public.organizers for select to anon,authenticated using(true);
create policy organizer_create on public.organizers for insert to authenticated with check(owner_user_id=auth.uid() and stripe_account_id is null and stripe_account_status='pending');
create policy organizer_update on public.organizers for update to authenticated using(private.has_role(id,array['owner','admin'])) with check(private.has_role(id,array['owner','admin']));
create policy member_read on public.organizer_members for select to authenticated using(private.has_role(organizer_id));
create policy member_create on public.organizer_members for insert to authenticated with check(private.has_role(organizer_id,array['owner']) and role <> 'owner');
create policy member_update on public.organizer_members for update to authenticated using(private.has_role(organizer_id,array['owner']) and role <> 'owner') with check(private.has_role(organizer_id,array['owner']) and role <> 'owner');
create policy member_delete on public.organizer_members for delete to authenticated using(private.has_role(organizer_id,array['owner']) and role <> 'owner');
create policy event_read on public.events for select to anon,authenticated using(status='published' or private.has_role(organizer_id));
create policy event_create on public.events for insert to authenticated with check(private.has_role(organizer_id,array['owner','admin','manager']));
create policy event_update on public.events for update to authenticated using(private.has_role(organizer_id,array['owner','admin','manager'])) with check(private.has_role(organizer_id,array['owner','admin','manager']));
create policy event_delete on public.events for delete to authenticated using(status='draft' and private.has_role(organizer_id,array['owner','admin','manager']));
create policy type_read on public.ticket_types for select to anon,authenticated using(private.event_role(event_id) or (status='active' and exists(select 1 from public.events where id=event_id and status='published')));
create policy type_create on public.ticket_types for insert to authenticated with check(private.event_role(event_id,array['owner','admin','manager']));
create policy type_update on public.ticket_types for update to authenticated using(private.event_role(event_id,array['owner','admin','manager'])) with check(private.event_role(event_id,array['owner','admin','manager']));
create policy type_delete on public.ticket_types for delete to authenticated using(private.event_role(event_id,array['owner','admin','manager']) and quantity_sold=0 and quantity_reserved=0);
create policy image_read on public.event_images for select to anon,authenticated using(exists(select 1 from public.events where id=event_id));
create policy image_create on public.event_images for insert to authenticated with check(private.event_role(event_id,array['owner','admin','manager']));
create policy image_update on public.event_images for update to authenticated using(private.event_role(event_id,array['owner','admin','manager'])) with check(private.event_role(event_id,array['owner','admin','manager']));
create policy image_delete on public.event_images for delete to authenticated using(private.event_role(event_id,array['owner','admin','manager']));
create policy order_read on public.orders for select to authenticated using(private.can_read_order(id));
create policy item_read on public.order_items for select to authenticated using(private.can_read_order(order_id));
create policy attendee_read on public.attendees for select to authenticated using(private.can_read_item(order_item_id));
create policy ticket_read on public.tickets for select to authenticated using(private.can_read_item(order_item_id));
create policy checkin_read on public.check_ins for select to authenticated using(exists(select 1 from public.tickets t where t.id=ticket_id));
