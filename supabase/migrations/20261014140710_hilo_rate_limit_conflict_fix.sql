create or replace function hilo_private.allow_request(bucket text) returns boolean
language plpgsql security definer set search_path = '' as $$
declare who uuid := auth.uid(); current_minute bigint := floor(extract(epoch from clock_timestamp())/60); used integer; cap integer;
begin
  if who is null then raise exception 'Authentication required'; end if;
  if bucket not in ('write','ai') or bucket is null then raise exception 'Invalid bucket'; end if;
  cap := case when bucket='ai' then 6 else 60 end;
  insert into hilo_private.request_limits as limits(owner,bucket,minute,hits)
  values(who,bucket,current_minute,1)
  on conflict on constraint request_limits_pkey do update set minute=excluded.minute,
    hits=case when limits.minute=excluded.minute then least(limits.hits+1,10000) else 1 end
  returning hits into used;
  return used<=cap;
end; $$;
