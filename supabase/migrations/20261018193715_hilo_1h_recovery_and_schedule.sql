-- One calculation for preview and commit. No account data is rewritten.
create or replace function public.hilo_schedule_target(a jsonb,s jsonb,occurrence date,action text,at_time timestamptz) returns jsonb language plpgsql stable security invoker set search_path='' as $$
declare tz text:=coalesce(a->>'timezone',s->>'timezone','Europe/Madrid');quiet_tz text:=coalesce(s->>'timezone','Europe/Madrid');scheduled timestamptz;base timestamptz;due timestamptz;quiet_due timestamptz;d date;travel int;fixed_future boolean;adjusted boolean:=false;begin
 if action not in ('10m','1h','tomorrow') then raise exception 'Invalid reminder action';end if;
 scheduled:=case when nullif(a->>'time','') is not null then (occurrence+(a->>'time')::time) at time zone tz else null end;
 fixed_future:=a->>'kind'='event' and scheduled>at_time;
 base:=case when fixed_future then scheduled else date_trunc('minute',at_time) end;
 due:=case action when '10m' then base+interval '10 minutes' when '1h' then base+interval '1 hour' else (((base at time zone tz)::date+1)+coalesce(nullif(a->>'time','')::time,'09:00'::time)) at time zone tz end;
 travel:=case when a->>'kind'='event' then coalesce((a->>'travelMinutes')::int,30) else 0 end;
 for i in 1..8 loop
  quiet_due:=case when public.hilo_is_quiet(s,due) then due when due-make_interval(mins=>travel)>at_time and public.hilo_is_quiet(s,due-make_interval(mins=>travel)) then due-make_interval(mins=>travel) else null end;
  exit when quiet_due is null;
  d:=(quiet_due at time zone quiet_tz)::date;
  if coalesce((s->>'quietStart')::time,'22:00')>coalesce((s->>'quietEnd')::time,'08:00') and (quiet_due at time zone quiet_tz)::time>=coalesce((s->>'quietStart')::time,'22:00') then d:=d+1;end if;
  due:=greatest(due,((d+coalesce((s->>'quietEnd')::time,'08:00')) at time zone quiet_tz)+make_interval(mins=>travel));adjusted:=true;
 end loop;
 if public.hilo_is_quiet(s,due) or (travel>0 and due-make_interval(mins=>travel)>at_time and public.hilo_is_quiet(s,due-make_interval(mins=>travel))) then raise exception 'Choose different quiet hours';end if;
 return jsonb_build_object('startsAt',due,'date',(due at time zone tz)::date,'time',to_char(due at time zone tz,'HH24:MI'),'zone',tz,'adjusted',adjusted,'fixedFuture',coalesce(fixed_future,false),'departure',case when travel>0 then jsonb_build_object('date',((due-make_interval(mins=>travel)) at time zone tz)::date,'time',to_char((due-make_interval(mins=>travel)) at time zone tz,'HH24:MI')) else null end);
end $$;
revoke all on function public.hilo_schedule_target(jsonb,jsonb,date,text,timestamptz) from public,anon;
grant execute on function public.hilo_schedule_target(jsonb,jsonb,date,text,timestamptz) to authenticated,service_role;

-- Retain the transaction, ownership checks, idempotency and recurrence splitting.
do $patch$ declare definition text;start_at int;end_at int;begin
 select pg_get_functiondef('hilo_private.hilo_reschedule_reminder(uuid,uuid,date,text,text)'::regprocedure) into definition;
 start_at:=strpos(definition,' due:=case action');end_at:=strpos(definition,' d:=(due at time zone tz)::date;');
 if start_at=0 or end_at<=start_at then raise exception 'Reschedule function changed; patch aborted';end if;
 definition:=substring(definition,1,start_at-1)||$new$
 outcome:=public.hilo_schedule_target(a.payload,settings,occurrence,action,now());
 due:=(outcome->>'startsAt')::timestamptz;adjusted:=(outcome->>'adjusted')::boolean;
 travel:=case when a.payload->>'kind'='event' then coalesce((a.payload->>'travelMinutes')::int,30) else 0 end;
 $new$||substring(definition,end_at);
 definition:=replace(definition,'''reminder'',true','''reminder'',coalesce((a.payload->>''reminder'')::boolean,false)');
 definition:=replace(definition,'if k=''departure'' and (a.payload->>''kind''<>''event'' or travel=0)', 'if a.payload->>''reminder''<>''true'' then exit;end if; if k=''departure'' and (a.payload->>''kind''<>''event'' or travel=0)');
 execute definition;
end $patch$;

create function hilo_private.hilo_reschedule_preview(activity_id uuid,occurrence date,action text) returns jsonb language plpgsql stable security definer set search_path='' as $$
declare a public.hilo_activities;s jsonb;target uuid;begin
 if auth.uid() is null or not (select hilo_private.trial_access()) then raise exception 'Access denied';end if;
 select * into a from public.hilo_activities x where x.id=activity_id and x.owner=auth.uid();
 if not found then raise exception 'Activity unavailable';end if;
 target:=(a.payload->'rescheduledTo'->>occurrence::text)::uuid;
 if target is not null then select * into a from public.hilo_activities x where x.id=target and x.owner=auth.uid();occurrence:=(a.payload->>'date')::date;end if;
 if a.payload->>'status'='done' or coalesce(a.payload->'completedDates','[]'::jsonb)?occurrence::text or not public.hilo_occurs(a.payload,occurrence) then raise exception 'Activity unavailable';end if;
 select settings into s from public.hilo_profiles where id=auth.uid();
 return public.hilo_schedule_target(a.payload,s,occurrence,action,now());
end $$;
create function public.hilo_reschedule_preview(activity_id uuid,occurrence date,action text) returns jsonb language sql stable security invoker set search_path='' as $$select hilo_private.hilo_reschedule_preview(activity_id,occurrence,action);$$;

create function hilo_private.hilo_reschedule_confirm(request_id uuid,activity_id uuid,occurrence date,kind text,action text,expected_due timestamptz) returns jsonb language plpgsql security definer set search_path='' as $$
declare preview jsonb;previous jsonb;begin
 if auth.uid() is null or not (select hilo_private.trial_access()) then raise exception 'Access denied';end if;
 perform 1 from public.hilo_profiles where id=auth.uid() for update;
 select result into previous from public.hilo_reminder_actions r where r.owner=auth.uid() and r.request_id=hilo_reschedule_confirm.request_id;
 if previous is not null then return previous;end if;
 -- Serialise with activity edits as well as replans and duplicate submissions.
 perform 1 from public.hilo_activities where id=activity_id and owner=auth.uid() for update;
 preview:=hilo_private.hilo_reschedule_preview(activity_id,occurrence,action);
 if expected_due is null or (preview->>'startsAt')::timestamptz<>expected_due then raise exception 'El horario cambió. Revisa la nueva propuesta antes de guardar.';end if;
 return hilo_private.hilo_reschedule_reminder(request_id,activity_id,occurrence,kind,action);
end $$;
create function public.hilo_reschedule_confirm(request_id uuid,activity_id uuid,occurrence date,kind text,action text,expected_due timestamptz) returns jsonb language sql security invoker set search_path='' as $$select hilo_private.hilo_reschedule_confirm(request_id,activity_id,occurrence,kind,action,expected_due);$$;
revoke all on function hilo_private.hilo_reschedule_preview(uuid,date,text),public.hilo_reschedule_preview(uuid,date,text),hilo_private.hilo_reschedule_confirm(uuid,uuid,date,text,text,timestamptz),public.hilo_reschedule_confirm(uuid,uuid,date,text,text,timestamptz) from public,anon;
grant execute on function hilo_private.hilo_reschedule_preview(uuid,date,text),public.hilo_reschedule_preview(uuid,date,text),hilo_private.hilo_reschedule_confirm(uuid,uuid,date,text,text,timestamptz),public.hilo_reschedule_confirm(uuid,uuid,date,text,text,timestamptz) to authenticated;

-- Stale occurrences are no longer presented as current reminders. Jobs are already
-- unique on (activity_id,occurrence,kind); keep that database invariant unchanged.
do $patch$ declare definition text;begin
 select pg_get_functiondef('hilo_private.hilo_own_reminders()'::regprocedure) into definition;
 definition:=replace(definition,'and not coalesce(a.payload->''completedDates''', 'and public.hilo_occurs(a.payload,j.occurrence) and j.revision=a.revision and not coalesce(a.payload->''completedDates''');
 execute definition;
end $patch$;
