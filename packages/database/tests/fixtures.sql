insert into auth.users(id,email) values
('00000000-0000-4000-8000-000000000001','owner-a@example.com'),
('00000000-0000-4000-8000-000000000002','owner-b@example.com'),
('00000000-0000-4000-8000-000000000003','buyer@example.com'),
('00000000-0000-4000-8000-000000000004','staff@example.com');
insert into public.organizers(id,owner_user_id,name,slug,stripe_account_id,stripe_account_status) values
('10000000-0000-4000-8000-000000000001','00000000-0000-4000-8000-000000000001','A','a','acct_a','active'),
('10000000-0000-4000-8000-000000000002','00000000-0000-4000-8000-000000000002','B','b','acct_b','active');
insert into public.organizer_members(organizer_id,user_id,role) values('10000000-0000-4000-8000-000000000001','00000000-0000-4000-8000-000000000004','staff');
insert into public.events(id,organizer_id,title,slug,status,starts_at) values
('20000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000001','A public','same-slug','published',now()+interval '30 days'),
('20000000-0000-4000-8000-000000000002','10000000-0000-4000-8000-000000000002','B draft','same-slug','draft',now()+interval '30 days'),
('20000000-0000-4000-8000-000000000003','10000000-0000-4000-8000-000000000001','A draft','draft','draft',now()+interval '30 days');
insert into public.ticket_types(id,event_id,name,price_cents,quantity) values
('30000000-0000-4000-8000-000000000001','20000000-0000-4000-8000-000000000001','General',4000,3),
('30000000-0000-4000-8000-000000000002','20000000-0000-4000-8000-000000000002','Private',1000,10);
insert into storage.objects(bucket_id,name) values('event-images','20000000-0000-4000-8000-000000000001/public.png'),('event-images','20000000-0000-4000-8000-000000000002/private.png');
