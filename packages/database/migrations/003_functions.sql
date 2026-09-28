-- All money/inventory changes run inside a single Postgres transaction.
create function public.reserve_order(p_ticket_type_id uuid,p_quantity integer,p_email text,p_first text,p_last text,p_buyer uuid,p_request_key uuid,p_fee_bps integer)
returns public.orders language plpgsql security definer set search_path='' as $$
declare t public.ticket_types; e public.events; o public.orders; item_id uuid; sub integer; fee integer;
begin
 perform pg_advisory_xact_lock(hashtextextended(p_request_key::text,0));
 select * into o from public.orders where request_key=p_request_key;
 if found then
   if o.buyer_email <> p_email or o.buyer_user_id is distinct from p_buyer or not exists(select 1 from public.order_items where order_id=o.id and ticket_type_id=p_ticket_type_id and quantity=p_quantity) then raise exception 'idempotency_conflict'; end if;
   return o;
 end if;
 if p_quantity < 1 or p_quantity > 10 or p_fee_bps < 0 or p_fee_bps > 5000 then raise exception 'invalid_quantity_or_fee'; end if;
 select * into t from public.ticket_types where id=p_ticket_type_id for update;
 if not found then raise exception 'ticket_type_not_found'; end if;
 select * into e from public.events where id=t.event_id for share;
 if e.status <> 'published' or e.starts_at <= now() or t.status <> 'active' or (t.sales_start is not null and t.sales_start > now()) or (t.sales_end is not null and t.sales_end <= now()) then raise exception 'sales_closed'; end if;
 if t.quantity-t.quantity_sold-t.quantity_reserved < p_quantity then raise exception 'insufficient_inventory'; end if;
 if t.price_cents > 0 and not exists(select 1 from public.organizers where id=e.organizer_id and stripe_account_status='active' and stripe_account_id is not null) then raise exception 'organizer_not_ready'; end if;
 sub := t.price_cents * p_quantity; fee := round(sub::numeric * p_fee_bps/10000)::integer;
 insert into public.orders(event_id,buyer_user_id,buyer_email,buyer_first_name,buyer_last_name,currency,subtotal_cents,platform_fee_cents,total_cents,request_key)
 values(e.id,p_buyer,p_email,p_first,p_last,t.currency,sub,fee,sub+fee,p_request_key) returning * into o;
 insert into public.order_items(order_id,ticket_type_id,quantity,unit_price_cents,total_cents) values(o.id,t.id,p_quantity,t.price_cents,sub) returning id into item_id;
 for i in 1..p_quantity loop
   insert into public.attendees(order_item_id,first_name,last_name,email) values(item_id,p_first,p_last,p_email);
 end loop;
 update public.ticket_types set quantity_reserved=quantity_reserved+p_quantity where id=t.id;
 return o;
end $$;

create function public.finalize_order(p_order_id uuid,p_event_id text,p_event_type text,p_session_id text,p_payment_intent text,p_amount integer,p_currency text)
returns boolean language plpgsql security definer set search_path='' as $$
declare o public.orders; item public.order_items; a public.attendees;
begin
 select * into o from public.orders where id=p_order_id for update;
 if not found then raise exception 'order_not_found'; end if;
 if o.total_cents <> p_amount or o.currency <> p_currency then raise exception 'payment_mismatch'; end if;
 if o.stripe_checkout_session_id is not null and o.stripe_checkout_session_id is distinct from p_session_id then raise exception 'session_mismatch'; end if;
 if exists(select 1 from public.stripe_webhook_events where id=p_event_id and processed_at is not null) then return false; end if;
 if o.status in ('paid','refunded','partially_refunded') then
   insert into public.stripe_webhook_events(id,type,processed_at) values(p_event_id,p_event_type,now()) on conflict(id) do nothing; return false;
 end if;
 if o.status <> 'pending' then raise exception 'order_not_pending'; end if;
 update public.orders set status='paid',paid_at=now(),stripe_checkout_session_id=p_session_id,stripe_payment_intent_id=p_payment_intent where id=o.id;
 for item in select * from public.order_items where order_id=o.id order by ticket_type_id loop
   update public.ticket_types set quantity_reserved=quantity_reserved-item.quantity,quantity_sold=quantity_sold+item.quantity where id=item.ticket_type_id;
   for a in select * from public.attendees where order_item_id=item.id loop
     insert into public.tickets(order_item_id,attendee_id,ticket_code) values(item.id,a.id,replace(gen_random_uuid()::text,'-','') || replace(gen_random_uuid()::text,'-',''));
   end loop;
 end loop;
 insert into public.payment_transactions(order_id,stripe_payment_intent_id,amount_cents,platform_fee_cents,currency,status) values(o.id,p_payment_intent,p_amount,o.platform_fee_cents,p_currency,'succeeded');
 insert into public.stripe_webhook_events(id,type,processed_at) values(p_event_id,p_event_type,now()) on conflict(id) do update set processed_at=now();
 return true;
end $$;

create function public.release_order(p_order_id uuid,p_event_id text,p_event_type text,p_session_id text)
returns void language plpgsql security definer set search_path='' as $$
declare o public.orders; item public.order_items;
begin
 select * into o from public.orders where id=p_order_id for update;
 if not found then raise exception 'order_not_found'; end if;
 if o.stripe_checkout_session_id is not null and o.stripe_checkout_session_id is distinct from p_session_id then raise exception 'session_mismatch'; end if;
 if o.status='pending' then
   for item in select * from public.order_items where order_id=o.id order by ticket_type_id loop
     update public.ticket_types set quantity_reserved=quantity_reserved-item.quantity where id=item.ticket_type_id;
   end loop;
   update public.orders set status='cancelled' where id=o.id;
 end if;
 insert into public.stripe_webhook_events(id,type,processed_at) values(p_event_id,p_event_type,now()) on conflict(id) do nothing;
end $$;

create function public.refund_order(p_payment_intent text,p_event_id text,p_refunded integer)
returns void language plpgsql security definer set search_path='' as $$
declare o public.orders;
begin
 select * into o from public.orders where stripe_payment_intent_id=p_payment_intent for update;
 if not found then raise exception 'order_not_finalized'; end if;
 if p_refunded < 0 or p_refunded > o.total_cents then raise exception 'invalid_refund'; end if;
 if p_refunded > o.refunded_cents then
   update public.orders set refunded_cents=p_refunded,status=case when p_refunded=total_cents then 'refunded' else 'partially_refunded' end where id=o.id;
   -- Partial monetary refunds do not identify individual admissions. Full refunds revoke all tickets.
   if p_refunded=o.total_cents then update public.tickets set status='refunded' where order_item_id in(select id from public.order_items where order_id=o.id); end if;
   update public.payment_transactions set status=case when p_refunded=o.total_cents then 'refunded' else 'partially_refunded' end where order_id=o.id;
 end if;
 insert into public.stripe_webhook_events(id,type,processed_at) values(p_event_id,'charge.refunded',now()) on conflict(id) do nothing;
end $$;

create function public.check_in_ticket(p_ticket_code text,p_event_id uuid)
returns jsonb language plpgsql security definer set search_path='' as $$
declare t public.tickets; ev uuid; person public.attendees; ticket_name text;
begin
 if auth.uid() is null or not private.event_role(p_event_id) then raise exception 'forbidden' using errcode='42501'; end if;
 select t1.* into t from public.tickets t1 join public.order_items oi on oi.id=t1.order_item_id join public.orders o on o.id=oi.order_id where t1.ticket_code=p_ticket_code and o.event_id=p_event_id for update of t1;
 if not found then return jsonb_build_object('success',false,'reason','ticket_not_found'); end if;
 if t.status <> 'valid' then return jsonb_build_object('success',false,'reason',case when t.status='used' then 'already_checked_in' else t.status end); end if;
 if not exists(select 1 from public.events where id=p_event_id and status in ('published','completed')) then return jsonb_build_object('success',false,'reason','event_not_open'); end if;
 insert into public.check_ins(ticket_id,checked_in_by) values(t.id,auth.uid());
 update public.tickets set status='used' where id=t.id;
 select * into person from public.attendees where id=t.attendee_id;
 select tt.name into ticket_name from public.ticket_types tt join public.order_items oi on oi.ticket_type_id=tt.id where oi.id=t.order_item_id;
 return jsonb_build_object('success',true,'name',person.first_name || ' ' || person.last_name,'ticketType',ticket_name);
end $$;

-- Postgres grants new functions to PUBLIC by default: lock down every privileged entry point.
revoke all on function public.reserve_order(uuid,integer,text,text,text,uuid,uuid,integer),public.finalize_order(uuid,text,text,text,text,integer,text),public.release_order(uuid,text,text,text),public.refund_order(text,text,integer),public.check_in_ticket(text,uuid) from public,anon,authenticated;
grant execute on function public.reserve_order(uuid,integer,text,text,text,uuid,uuid,integer),public.finalize_order(uuid,text,text,text,text,integer,text),public.release_order(uuid,text,text,text),public.refund_order(text,text,integer) to service_role;
grant execute on function public.check_in_ticket(text,uuid) to authenticated;
grant all on all tables in schema public to service_role;
