-- Atomic, optimistic replan. RLS and the existing trial allowlist remain in force.
create function public.hilo_replan_day(request_id uuid, items jsonb, snapshot jsonb, session_signature jsonb default null)
returns void language plpgsql security invoker set search_path='' as $$
declare item jsonb; a public.hilo_activities; current_snapshot jsonb; expected_snapshot jsonb; current_session jsonb; day text;
begin
 perform hilo_private.require_trial_access();
 if jsonb_typeof(items)<>'array' or jsonb_array_length(items) not between 1 and 100 then raise exception 'Invalid plan';end if;
 perform 1 from public.hilo_profiles where id=auth.uid() for update;
 if exists(select 1 from public.hilo_captures c where c.owner=auth.uid() and c.id=request_id) then return;end if;
 day:=to_char(now() at time zone coalesce((select p.settings->>'timezone' from public.hilo_profiles p where p.id=auth.uid()),'Europe/Madrid'),'YYYY-MM-DD');
 perform 1 from public.hilo_activities where owner=auth.uid() order by id for update;
 select coalesce(jsonb_agg(jsonb_build_object('id',id,'revision',revision) order by id),'[]'::jsonb) into current_snapshot from public.hilo_activities where owner=auth.uid();
 select coalesce(jsonb_agg(jsonb_build_object('id',(value->>'id')::uuid,'revision',(value->>'revision')::int) order by (value->>'id')::uuid),'[]'::jsonb) into expected_snapshot from jsonb_array_elements(snapshot);
 if current_snapshot is distinct from expected_snapshot then raise exception 'Agenda changed';end if;
 select payload into current_session from public.hilo_sessions where owner=auth.uid() for update;
 if coalesce(current_session,'null'::jsonb) is distinct from coalesce(session_signature,'null'::jsonb) then raise exception 'Focus changed';end if;
 for item in select value from jsonb_array_elements(items) loop
  select * into a from public.hilo_activities where id=(item->>'id')::uuid and owner=auth.uid();
  if not found or a.revision<>(item->>'revision')::int or a.payload->>'source'<>'hilo' or a.payload->>'kind'<>'task' or a.payload->>'recurrence'<>'none' or a.payload->>'status'='done' or a.payload->>'date'<>day or (current_session->>'status'='running' and a.id::text=current_session->>'activityId') then raise exception 'Activity changed';end if;
  if item->'payload'->>'date' is not null and (item->'payload'->>'date'<>day or coalesce(item->'payload'->>'time','') !~ '^([01][0-9]|2[0-3]):[0-5][0-9]$') then raise exception 'Invalid time';end if;
  if item->'payload'->>'date' is null and item->'payload'->>'time' is not null then raise exception 'Invalid Later task';end if;
  if not public.hilo_save_activity(a.id,a.revision,a.payload||jsonb_build_object('date',item->'payload'->'date','time',item->'payload'->'time','startsAt',item->'payload'->'startsAt','timezone',item->'payload'->'timezone','reminder',coalesce((item->'payload'->>'reminder')::boolean,false),'sync',case when a.payload->>'googleId' is not null then 'pending' else a.payload->>'sync' end),false) then raise exception 'Concurrent update';end if;
 end loop;
 insert into public.hilo_captures(id,owner) values(request_id,auth.uid());
end $$;
revoke all on function public.hilo_replan_day(uuid,jsonb,jsonb,jsonb) from public,anon;
grant execute on function public.hilo_replan_day(uuid,jsonb,jsonb,jsonb) to authenticated;

-- The parser offers up to 24 independent tasks; keep the transactional save aligned.
create or replace function public.hilo_capture(request_id uuid,items jsonb) returns void language plpgsql security invoker set search_path='' as $$
declare a jsonb;begin
 perform hilo_private.require_trial_access();
 if auth.uid() is null or jsonb_typeof(items)<>'array' or jsonb_array_length(items) not between 1 and 24 then raise exception 'Invalid capture';end if;
 insert into public.hilo_captures(id,owner) values(request_id,auth.uid()) on conflict do nothing;
 if not found then return;end if;
 for a in select value from jsonb_array_elements(items) loop
  insert into public.hilo_activities(id,owner,payload) values((a->>'id')::uuid,auth.uid(),a);
 end loop;
end $$;

-- Energy and the reviewed day are stored together; retries do not duplicate tasks.
create function public.hilo_capture_day_energy(request_id uuid,items jsonb,energy text)
returns void language plpgsql security invoker set search_path='' as $$
declare day date; existing int; proposed int;
begin
 perform hilo_private.require_trial_access();
 if energy not in ('low','medium','high') then raise exception 'Invalid energy';end if;
 perform 1 from public.hilo_profiles where id=auth.uid() for update;
 if exists(select 1 from public.hilo_captures c where c.owner=auth.uid() and c.id=request_id) then return;end if;
 day:=(now() at time zone coalesce((select p.settings->>'timezone' from public.hilo_profiles p where p.id=auth.uid()),'Europe/Madrid'))::date;
 if energy='low' then
  select count(*) into existing from public.hilo_activities a where a.owner=auth.uid() and a.payload->>'kind'='task' and public.hilo_occurs(a.payload,day) and a.payload->>'status'<>'done' and not coalesce(a.payload->'completedDates','[]'::jsonb) ? day::text;
  select count(*) into proposed from jsonb_array_elements(items) where value->>'kind'='task' and value->>'date'=day::text;
  if proposed>greatest(0,3-existing) then raise exception 'Low energy: keep up to three tasks today';end if;
 end if;
 perform public.hilo_capture_day(request_id,items);
 update public.hilo_profiles set settings=settings||jsonb_build_object('dayEnergy',jsonb_build_object('date',day::text,'value',energy)) where id=auth.uid();
end $$;
revoke all on function public.hilo_capture_day_energy(uuid,jsonb,text) from public,anon;
grant execute on function public.hilo_capture_day_energy(uuid,jsonb,text) to authenticated;
