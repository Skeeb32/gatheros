
insert into auth.users(id,email,raw_user_meta_data) values('00000000-0000-4000-8000-000000000001','organizer@example.com','{"display_name":"Alex Morgan"}') on conflict do nothing;
insert into public.organizers(id,owner_user_id,name,slug) values('10000000-0000-4000-8000-000000000001','00000000-0000-4000-8000-000000000001','Fieldwork Collective','fieldwork') on conflict do nothing;
insert into public.events(id,organizer_id,title,slug,description,status,starts_at,ends_at,venue_name,city)
values('20000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000001','Future / Forward 2026','future-forward','A gathering for people building what comes next. One day of ideas, conversations, and unexpected connections.','published',now()+interval '18 days',now()+interval '18 days 8 hours','The Glasshouse','Indianapolis') on conflict do nothing;
insert into public.ticket_types(id,event_id,name,price_cents,quantity) values
('30000000-0000-4000-8000-000000000001','20000000-0000-4000-8000-000000000001','General admission',4900,240),
('30000000-0000-4000-8000-000000000002','20000000-0000-4000-8000-000000000001','VIP experience',12900,80),
('30000000-0000-4000-8000-000000000003','20000000-0000-4000-8000-000000000001','Community pass',0,40) on conflict do nothing;
do $$ declare n integer; typ uuid; price integer; oid uuid; iid uuid; aid uuid; tid uuid; begin
 for n in 1..244 loop
 typ:=case when n<=160 then '30000000-0000-4000-8000-000000000001'::uuid when n<=224 then '30000000-0000-4000-8000-000000000002'::uuid else '30000000-0000-4000-8000-000000000003'::uuid end;
 select price_cents into price from public.ticket_types where id=typ;
 insert into public.orders(event_id,buyer_email,buyer_first_name,buyer_last_name,subtotal_cents,total_cents,status,request_key,created_at,paid_at)
 values('20000000-0000-4000-8000-000000000001','guest'||n||'@example.com','Guest',n::text,price,price,'paid',gen_random_uuid(),now()-make_interval(days:=mod(n*11,28)),now()-make_interval(days:=mod(n*11,28))) returning id into oid;
 insert into public.order_items(order_id,ticket_type_id,quantity,unit_price_cents,total_cents) values(oid,typ,1,price,price) returning id into iid;
 insert into public.attendees(order_item_id,first_name,last_name,email) values(iid,'Guest',n::text,'guest'||n||'@example.com') returning id into aid;
 insert into public.tickets(order_item_id,attendee_id,ticket_code) values(iid,aid,replace(gen_random_uuid()::text,'-','')||replace(gen_random_uuid()::text,'-','')) returning id into tid;
 end loop;
 update public.ticket_types t set quantity_sold=(select count(*) from public.tickets k join public.order_items i on i.id=k.order_item_id where i.ticket_type_id=t.id);
end $$;
insert into public.waitlist_entries(event_id,name,email) select '20000000-0000-4000-8000-000000000001','Community member '||n,'waitlist'||n||'@example.com' from generate_series(1,12) n;
insert into public.event_documents(event_id,title,content) values
('20000000-0000-4000-8000-000000000001','Venue & arrival guide','The Glasshouse opens at 8:30 AM. VIP attendees enter through the north entrance on Market Street. General admission uses the main east entrance. Accessible entry is available at both doors. Parking is free in the west garage; validate your ticket at registration. Please bring your ticket QR code and a photo ID.'),
('20000000-0000-4000-8000-000000000001','Run of show','Doors open at 8:30 AM. The opening keynote starts at 9:30 AM in the main hall. Workshops begin at 11:00 AM. Lunch is served at 12:30 PM, with vegetarian and gluten-free options. The closing conversation is at 4:00 PM. Networking continues until 6:00 PM.');

-- Seed-only sample scans and partial refunds exercise the health dashboard.
insert into auth.users(id,email,raw_user_meta_data) values('00000000-0000-4000-8000-000000000004','staff@example.com','{"display_name":"Sam Rivera"}');
insert into public.event_staff(event_id,user_id) values('20000000-0000-4000-8000-000000000001','00000000-0000-4000-8000-000000000004');
insert into public.check_ins(ticket_id,checked_in_by,metadata)
select id,'00000000-0000-4000-8000-000000000004','{"seed":true}' from public.tickets order by created_at,id limit 8;
update public.tickets set status='used' where id in (select ticket_id from public.check_ins);
update public.orders set refunded_cents=1000,status='partially_refunded' where id in (select id from public.orders where total_cents>=1000 order by id limit 5);
