
-- GatherOS operational data. Tenant identity is always resolved by auth.uid().
create table public.event_staff (
 id uuid primary key default gen_random_uuid(), event_id uuid not null references public.events(id) on delete cascade,
 user_id uuid not null references public.profiles(id), created_at timestamptz not null default now(), unique(event_id,user_id)
);
create table public.waitlist_entries (
 id uuid primary key default gen_random_uuid(), event_id uuid not null references public.events(id) on delete cascade,
 email text not null check(length(email)<255), name text not null, status text not null default 'waiting' check(status in ('waiting','notified')),
 created_at timestamptz not null default now(), unique(event_id,email)
);
create table public.event_documents (
 id uuid primary key default gen_random_uuid(), event_id uuid not null references public.events(id) on delete cascade,
 title text not null, content text not null check(length(content)<=100000), created_at timestamptz not null default now()
);
create table public.document_chunks (
 id uuid primary key default gen_random_uuid(), document_id uuid not null references public.event_documents(id) on delete cascade,
 ordinal integer not null, content text not null, created_at timestamptz not null default now(), unique(document_id,ordinal)
);
create table public.ai_conversations (
 id uuid primary key default gen_random_uuid(), event_id uuid not null references public.events(id) on delete cascade,
 user_id uuid not null references public.profiles(id), created_at timestamptz not null default now()
);
create table public.ai_messages (
 id uuid primary key default gen_random_uuid(), conversation_id uuid not null references public.ai_conversations(id) on delete cascade,
 role text not null check(role in ('user','assistant','tool')), content text not null, created_at timestamptz not null default now()
);
create table public.notifications (
 id uuid primary key default gen_random_uuid(), event_id uuid not null references public.events(id) on delete cascade,
 kind text not null, subject text not null, body text not null, status text not null default 'draft' check(status in ('draft','queued','sent','failed')),
 created_at timestamptz not null default now()
);
create table public.promo_codes (
 id uuid primary key default gen_random_uuid(), event_id uuid not null references public.events(id) on delete cascade,
 code text not null, percent_off integer not null check(percent_off between 1 and 100), max_redemptions integer not null check(max_redemptions>0),
 expires_at timestamptz not null, created_at timestamptz not null default now(), unique(event_id,code)
);
create table public.promo_code_redemptions (
 id uuid primary key default gen_random_uuid(), promo_code_id uuid not null references public.promo_codes(id),
 order_id uuid not null unique references public.orders(id), created_at timestamptz not null default now()
);
create index on public.event_staff(user_id);
create index on public.waitlist_entries(event_id,created_at);
create index on public.event_documents(event_id);
create index on public.document_chunks(document_id);
create index on public.ai_conversations(event_id);
create index on public.ai_messages(conversation_id);
create index on public.notifications(event_id);
create index on public.promo_codes(event_id);
-- Concept names from EventPilot; security-invoker views preserve the original RLS.
create view public.organizations with(security_invoker=true) as select id,name,slug,owner_user_id,created_at from public.organizers;
create view public.organization_members with(security_invoker=true) as select * from public.organizer_members;
create view public.payments with(security_invoker=true) as select * from public.payment_transactions;
grant select on public.organizations, public.organization_members to authenticated;

do $$ declare t text; begin
 foreach t in array array['event_staff','waitlist_entries','event_documents','notifications','promo_codes','ai_conversations'] loop
 execute format('alter table public.%I enable row level security',t);
 execute format('create policy ops_read on public.%I for select to authenticated using(private.event_role(event_id,array[''owner'',''admin'',''manager'']))',t);
 end loop;
end $$;
grant select on public.event_staff,public.waitlist_entries,public.event_documents,public.notifications,public.promo_codes,public.ai_conversations to authenticated;
grant insert(event_id,title,content) on public.event_documents to authenticated;
create policy doc_create on public.event_documents for insert to authenticated with check(private.event_role(event_id,array['owner','admin','manager']));
grant insert(event_id,kind,subject,body) on public.notifications to authenticated;
create policy notification_create on public.notifications for insert to authenticated with check(private.event_role(event_id,array['owner','admin','manager']));
grant insert(event_id,user_id),delete on public.event_staff to authenticated;
create policy staff_create on public.event_staff for insert to authenticated with check(private.event_role(event_id,array['owner','admin']));
create policy staff_delete on public.event_staff for delete to authenticated using(private.event_role(event_id,array['owner','admin']));
alter table public.document_chunks enable row level security;
alter table public.ai_messages enable row level security;
alter table public.promo_code_redemptions enable row level security;
grant select on public.document_chunks to authenticated;
create policy chunk_read on public.document_chunks for select to authenticated using(exists(select 1 from public.event_documents d where d.id=document_id and private.event_role(d.event_id,array['owner','admin','manager'])));

-- Event-specific staff grants supplement organization roles without finance access.
create or replace function private.event_role(p_event_id uuid, roles text[] default array['owner','admin','manager','staff']) returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.events where id=p_event_id and private.has_role(organizer_id,roles))
 or ('staff'=any(roles) and exists(select 1 from public.event_staff where event_id=p_event_id and user_id=(select auth.uid())));
$$;

create function public.join_waitlist(p_event_id uuid,p_email text,p_name text) returns uuid language plpgsql security definer set search_path='' as $$
declare result uuid; begin
 if not exists(select 1 from public.events where id=p_event_id and status='published') then raise exception 'event unavailable'; end if;
 if length(p_email)>254 or p_email !~ '^[^ @]+@[^ @]+\.[^ @]+$' or length(p_name) not between 1 and 100 then raise exception 'invalid input'; end if;
 insert into public.waitlist_entries(event_id,email,name) values(p_event_id,lower(trim(p_email)),p_name)
 on conflict(event_id,email) do update set email=excluded.email returning id into result;
 return result;
end $$;
revoke all on function public.join_waitlist(uuid,text,text) from public,anon,authenticated;
grant execute on function public.join_waitlist(uuid,text,text) to service_role;

create function public.event_operations(p_event_id uuid) returns jsonb language plpgsql security definer set search_path='' as $$
declare result jsonb; begin
 if not private.event_role(p_event_id,array['owner','admin','manager']) then raise exception 'forbidden' using errcode='42501'; end if;
 select jsonb_build_object(
 'event',(select to_jsonb(e)||jsonb_build_object('organization_name',(select name from public.organizers where id=e.organizer_id)) from public.events e where e.id=p_event_id),
 'inventory',coalesce((select jsonb_agg(to_jsonb(t) order by t.price_cents) from public.ticket_types t where t.event_id=p_event_id),'[]'::jsonb),
 'orders',coalesce((select jsonb_agg(jsonb_build_object('total_cents',o.total_cents,'refunded_cents',o.refunded_cents,'status',o.status,'created_at',o.created_at)) from public.orders o where o.event_id=p_event_id),'[]'::jsonb),
 'checkins',(select count(*) from public.check_ins c join public.tickets t on t.id=c.ticket_id join public.order_items i on i.id=t.order_item_id join public.orders o on o.id=i.order_id where o.event_id=p_event_id),
 'waitlist',coalesce((select jsonb_agg(to_jsonb(w) order by w.created_at) from public.waitlist_entries w where w.event_id=p_event_id),'[]'::jsonb),
 'documents',coalesce((select jsonb_agg(to_jsonb(d) order by d.created_at desc) from public.event_documents d where d.event_id=p_event_id),'[]'::jsonb),
 'drafts',coalesce((select jsonb_agg(to_jsonb(n) order by n.created_at desc) from public.notifications n where n.event_id=p_event_id),'[]'::jsonb)
 ) into result;
 return result;
end $$;
revoke all on function public.event_operations(uuid) from public,anon;
grant execute on function public.event_operations(uuid) to authenticated;

create function private.chunk_document() returns trigger language plpgsql set search_path='' as $$
begin
 insert into public.document_chunks(document_id,ordinal,content)
 select new.id,n,substring(new.content from n*800+1 for 1000) from generate_series(0,greatest(0,ceil(length(new.content)::numeric/800)::int-1)) n;
 return new;
end $$;
-- Runs as definer because callers cannot write arbitrary chunk/document associations.
alter function private.chunk_document() security definer;
create trigger chunk_document after insert on public.event_documents for each row execute function private.chunk_document();
grant all on public.waitlist_entries,public.event_documents,public.document_chunks,public.notifications,public.ai_conversations,public.ai_messages,public.event_staff,public.promo_codes,public.promo_code_redemptions to service_role;
