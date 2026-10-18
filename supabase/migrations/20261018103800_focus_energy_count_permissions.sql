-- Energy and the reviewed day are stored together; retries do not duplicate tasks.
create or replace function public.hilo_capture_day_energy(request_id uuid,items jsonb,energy text)
returns void language plpgsql security invoker set search_path='' as $$
declare day date; existing int; proposed int;
begin
 perform hilo_private.require_trial_access();
 if energy not in ('low','medium','high') then raise exception 'Invalid energy';end if;
 perform 1 from public.hilo_profiles where id=auth.uid() for update;
 if exists(select 1 from public.hilo_captures c where c.owner=auth.uid() and c.id=request_id) then return;end if;
 day:=(now() at time zone coalesce((select p.settings->>'timezone' from public.hilo_profiles p where p.id=auth.uid()),'Europe/Madrid'))::date;
 if energy='low' then
  select count(*) into existing from public.hilo_activities a where a.owner=auth.uid() and a.payload->>'kind'='task' and (a.payload->>'date')::date<=day and (a.payload->>'date'=day::text or a.payload->>'recurrence'='daily' or (a.payload->>'recurrence'='weekly' and extract(dow from (a.payload->>'date')::date)=extract(dow from day)) or (a.payload->>'recurrence'='annual' and right(a.payload->>'date',5)=right(day::text,5))) and not coalesce(a.payload->'excludedDates','[]'::jsonb) ? day::text and a.payload->>'status'<>'done' and not coalesce(a.payload->'completedDates','[]'::jsonb) ? day::text;
  select count(*) into proposed from jsonb_array_elements(items) where value->>'kind'='task' and value->>'date'=day::text;
  if proposed>greatest(0,3-existing) then raise exception 'Low energy: keep up to three tasks today';end if;
 end if;
 perform public.hilo_capture_day(request_id,items);
 update public.hilo_profiles set settings=settings||jsonb_build_object('dayEnergy',jsonb_build_object('date',day::text,'value',energy)) where id=auth.uid();
end $$;
revoke all on function public.hilo_capture_day_energy(uuid,jsonb,text) from public,anon;
grant execute on function public.hilo_capture_day_energy(uuid,jsonb,text) to authenticated;

