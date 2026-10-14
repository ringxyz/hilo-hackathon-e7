-- Persisted, atomic rate limits. Clients cannot reset counters or choose their identity.
create schema if not exists hilo_private;
revoke all on schema hilo_private from public, anon;
grant usage on schema hilo_private to authenticated;
create table hilo_private.request_limits (
  owner uuid not null references auth.users(id) on delete cascade,
  bucket text not null check (bucket in ('write','ai')),
  minute bigint not null,
  hits integer not null,
  primary key(owner,bucket)
);
alter table hilo_private.request_limits enable row level security;
revoke all on hilo_private.request_limits from public,anon,authenticated;
create function hilo_private.allow_request(bucket text) returns boolean
language plpgsql security definer set search_path = '' as $$
declare who uuid := auth.uid(); current_minute bigint := floor(extract(epoch from clock_timestamp())/60); used integer; cap integer;
begin
  if who is null then raise exception 'Authentication required'; end if;
  if bucket not in ('write','ai') or bucket is null then raise exception 'Invalid bucket'; end if;
  cap := case when bucket='ai' then 6 else 60 end;
  insert into hilo_private.request_limits as limits(owner,bucket,minute,hits)
  values(who,bucket,current_minute,1)
  on conflict(owner,bucket) do update set minute=excluded.minute,
    hits=case when limits.minute=excluded.minute then least(limits.hits+1,10000) else 1 end
  returning hits into used;
  return used<=cap;
end; $$;
revoke all on function hilo_private.allow_request(text) from public,anon;
grant execute on function hilo_private.allow_request(text) to authenticated;
create function public.hilo_allow_request(bucket text) returns boolean
language sql security invoker set search_path='' as $$select hilo_private.allow_request(bucket);$$;
revoke all on function public.hilo_allow_request(text) from public,anon;
grant execute on function public.hilo_allow_request(text) to authenticated;
