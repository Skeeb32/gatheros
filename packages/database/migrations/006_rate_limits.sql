
create table private.request_limits(key text primary key,hits integer not null,window_start timestamptz not null);
create function public.consume_rate_limit(p_key text,p_limit integer default 20) returns boolean language plpgsql security definer set search_path='' as $$
declare n integer; begin
 insert into private.request_limits(key,hits,window_start) values(p_key,1,now())
 on conflict(key) do update set hits=case when private.request_limits.window_start<now()-interval '1 minute' then 1 else private.request_limits.hits+1 end,
 window_start=case when private.request_limits.window_start<now()-interval '1 minute' then now() else private.request_limits.window_start end returning hits into n;
 return n<=p_limit;
end $$;
revoke all on function public.consume_rate_limit(text,integer) from public,anon,authenticated;
grant execute on function public.consume_rate_limit(text,integer) to service_role;
