alter table public.hilo_reminder_actions add column result jsonb;

create or replace function public.hilo_occurs(a jsonb,d date) returns boolean language sql immutable set search_path='' as $$
 select not coalesce(a->'excludedDates','[]'::jsonb) ? d::text and a->>'date' is not null and d>=(a->>'date')::date and case coalesce(a->>'recurrence','none')
 when 'none' then d=(a->>'date')::date when 'daily' then true
 when 'weekly' then extract(isodow from d)=extract(isodow from (a->>'date')::date)
 when 'annual' then to_char(d,'MM-DD')=substring(a->>'date',6,5) else false end;
$$;

create function hilo_private.hilo_reschedule_reminder(request_id uuid,activity_id uuid,occurrence date,kind text,action text) returns jsonb language plpgsql security definer set search_path='' as $$
declare uid uuid:=auth.uid();a public.hilo_activities;settings jsonb;tz text;quiet_tz text;due timestamptz;quiet_due timestamptz;d date;t text;old_day date:=occurrence;old_id uuid:=activity_id;target uuid;travel int;k text;adjusted boolean:=false;outcome jsonb;s jsonb;stamp bigint:=floor(extract(epoch from clock_timestamp())*1000);begin
 if uid is null or request_id is null or occurrence is null or kind is null or action is null or kind not in ('appointment','departure') or action not in ('10m','1h','tomorrow') then raise exception 'Invalid reminder action';end if;
 select p.settings into settings from public.hilo_profiles p where p.id=uid for update;
 select * into a from public.hilo_activities where id=activity_id and owner=uid for update;
 if not found then raise exception 'Activity unavailable';end if;
 insert into public.hilo_reminder_actions(owner,request_id) values(uid,request_id) on conflict do nothing;
 if not found then select r.result into outcome from public.hilo_reminder_actions r where r.owner=uid and r.request_id=hilo_reschedule_reminder.request_id;if outcome is null then raise exception 'Invalid reminder action';end if;return outcome;end if;
 if a.payload->'rescheduledTo'->>occurrence::text is not null then
  target:=(a.payload->'rescheduledTo'->>occurrence::text)::uuid;
  select * into a from public.hilo_activities where id=target and owner=uid for update;
  if not found then raise exception 'Activity unavailable';end if;
  occurrence:=(a.payload->>'date')::date;
 end if;
 if not public.hilo_occurs(a.payload,occurrence) or a.payload->>'status'='done' or coalesce(a.payload->'completedDates','[]'::jsonb) ? occurrence::text then raise exception 'Activity unavailable';end if;
 tz:=coalesce(a.payload->>'timezone',settings->>'timezone','Europe/Madrid');quiet_tz:=coalesce(settings->>'timezone','Europe/Madrid');
 due:=case action when '10m' then date_trunc('minute',now())+interval '10 minutes' when '1h' then date_trunc('minute',now())+interval '1 hour' else (((now() at time zone tz)::date+1)+coalesce(nullif(a.payload->>'time','')::time,'09:00'::time)) at time zone tz end;
 travel:=case when a.payload->>'kind'='event' then coalesce((a.payload->>'travelMinutes')::int,30) else 0 end;
 -- Put both the activity reminder and a future departure outside quiet hours.
 for i in 1..4 loop
  quiet_due:=case when public.hilo_is_quiet(settings,due) then due when due-make_interval(mins=>travel)>now() and public.hilo_is_quiet(settings,due-make_interval(mins=>travel)) then due-make_interval(mins=>travel) else null end;
  exit when quiet_due is null;
  d:=(quiet_due at time zone quiet_tz)::date;
  if action<>'tomorrow' and (quiet_due at time zone quiet_tz)::time>=coalesce((settings->>'quietEnd')::time,'08:00'::time) then d:=d+1;end if;
  due:=(d+coalesce((settings->>'quietEnd')::time,'08:00'::time)) at time zone quiet_tz;
  if travel>0 then due:=due+make_interval(mins=>travel);end if;
  adjusted:=true;
 end loop;
 if public.hilo_is_quiet(settings,due) then raise exception 'Choose different quiet hours';end if;
 d:=(due at time zone tz)::date;t:=to_char(due at time zone tz,'HH24:MI');
 if coalesce(a.payload->>'recurrence','none')<>'none' then
  target:=gen_random_uuid();
  insert into public.hilo_activities(id,owner,payload) values(target,uid,(a.payload-'id'-'revision'-'googleId'-'googleEtag'-'sync'-'completedDates'-'excludedDates'-'rescheduledTo')||jsonb_build_object('recurrence','none','source','hilo','date',d,'time',t,'timezone',tz,'startsAt',due,'status','pending','reminder',true));
  update public.hilo_activities set payload=payload||jsonb_build_object('excludedDates',coalesce(payload->'excludedDates','[]'::jsonb)||jsonb_build_array(occurrence::text),'rescheduledTo',coalesce(payload->'rescheduledTo','{}'::jsonb)||jsonb_build_object(occurrence::text,target)),revision=revision+1,updated_at=now() where id=a.id and owner=uid;
  select payload into s from public.hilo_sessions where owner=uid and payload->>'activityId'=a.id::text;
  if occurrence=(now() at time zone tz)::date and s is not null then update public.hilo_sessions set payload=s||jsonb_build_object('activityId',target,'status','paused','startedAt',null,'elapsed',coalesce((s->>'elapsed')::int,0)+case when s->>'status'='running' then greatest(0,floor((stamp-(s->>'startedAt')::bigint)/1000))::int else 0 end) where owner=uid;end if;
  select * into a from public.hilo_activities where id=target and owner=uid;
 else
  target:=a.id;
  update public.hilo_activities set payload=a.payload||jsonb_build_object('date',d,'time',t,'timezone',tz,'startsAt',due,'reminder',true)||case when a.payload->>'source'='google' then jsonb_build_object('scheduleOverride',jsonb_build_object('date',d,'time',t,'startsAt',due)) else '{}'::jsonb end,revision=revision+1,updated_at=now() where id=a.id and owner=uid returning * into a;
  select payload into s from public.hilo_sessions where owner=uid and payload->>'activityId'=a.id::text;
  if s->>'status'='running' then update public.hilo_sessions set payload=s||jsonb_build_object('status','paused','startedAt',null,'elapsed',coalesce((s->>'elapsed')::int,0)+greatest(0,floor((stamp-(s->>'startedAt')::bigint)/1000))::int) where owner=uid;end if;
 end if;
 -- Retire the old occurrence and replace both reminder jobs at the new schedule.
 foreach k in array array['appointment','departure'] loop
  insert into public.hilo_push_jobs(owner,activity_id,occurrence,revision,due_at,kind,state,acknowledged) values(uid,old_id,old_day,a.revision,now(),k,'handled',true)
  on conflict on constraint hilo_push_once do update set state='handled',acknowledged=true,leased_until=null;
 end loop;
 foreach k in array array['appointment','departure'] loop
  if k='departure' and (a.payload->>'kind'<>'event' or travel=0) then continue;end if;
  quiet_due:=case k when 'departure' then due-make_interval(mins=>travel) else due end;
  insert into public.hilo_push_jobs(owner,activity_id,occurrence,revision,due_at,kind,state,acknowledged,snoozed,next_attempt) values(uid,target,d,a.revision,quiet_due,k,case when quiet_due<now() then 'handled' else 'pending' end,quiet_due<now(),true,quiet_due)
  on conflict on constraint hilo_push_once do update set revision=excluded.revision,due_at=excluded.due_at,next_attempt=excluded.next_attempt,state=excluded.state,acknowledged=excluded.acknowledged,snoozed=true,attempts=0,leased_until=null;
 end loop;
 outcome:=jsonb_build_object('id',target,'date',d,'time',t,'adjusted',adjusted,'option',action);
 update public.hilo_reminder_actions r set result=outcome where r.owner=uid and r.request_id=hilo_reschedule_reminder.request_id;
 return outcome;
end $$;
revoke all on function hilo_private.hilo_reschedule_reminder(uuid,uuid,date,text,text) from public,anon;
grant execute on function hilo_private.hilo_reschedule_reminder(uuid,uuid,date,text,text) to authenticated;
create function public.hilo_reschedule_reminder(request_id uuid,activity_id uuid,occurrence date,kind text,action text) returns jsonb language sql security invoker set search_path='' as $$select hilo_private.hilo_reschedule_reminder(request_id,activity_id,occurrence,kind,action);$$;
revoke all on function public.hilo_reschedule_reminder(uuid,uuid,date,text,text) from public,anon;
grant execute on function public.hilo_reschedule_reminder(uuid,uuid,date,text,text) to authenticated;

-- Future reminders created during quiet hours must wait until due, not expire early.
do $migration$ declare definition text;begin
 select pg_get_functiondef('public.hilo_queue_reminders()'::regprocedure) into definition;
 definition:=replace(definition,'or public.hilo_is_quiet(p.settings,now())','or (j.due_at<=now() and public.hilo_is_quiet(p.settings,now()))');
 execute definition;
end $migration$;

-- Keep the earlier RPC contract consistent with rescheduling.
create or replace function hilo_private.hilo_reminder_action(request_id uuid,activity_id uuid,occurrence date,kind text,action text) returns void language plpgsql security definer set search_path='' as $$
declare uid uuid:=auth.uid();a public.hilo_activities;tz text;due timestamptz;k text;completed boolean;begin
 if action in ('10m','1h','tomorrow') then perform hilo_private.hilo_reschedule_reminder(request_id,activity_id,occurrence,kind,action);return;end if;
 if uid is null or request_id is null or occurrence is null or kind is null or action is null or kind not in ('appointment','departure') or action not in ('10m','1h','tomorrow','start','done') then raise exception 'Invalid reminder action';end if;
 perform 1 from public.hilo_profiles where id=uid for update;
 select * into a from public.hilo_activities where id=activity_id and owner=uid for update;
 if not found or not public.hilo_occurs(a.payload,occurrence) then raise exception 'Activity unavailable';end if;
 insert into public.hilo_reminder_actions(owner,request_id) values(uid,request_id) on conflict do nothing;
 if not found then return;end if;
 completed:=a.payload->>'status'='done' or coalesce(a.payload->'completedDates','[]'::jsonb) ? occurrence::text;
 if action<>'done' and completed then raise exception 'Activity unavailable';end if;
 tz:=coalesce(a.payload->>'timezone','Europe/Madrid');
 if action in ('start','done') then
  if action='start' then perform public.hilo_focus('start',activity_id);
  else
   if not completed then
    if coalesce(a.payload->>'recurrence','none')='none' then a.payload:=a.payload||'{"status":"done"}';
    else a.payload:=a.payload||jsonb_build_object('completedDates',coalesce(a.payload->'completedDates','[]'::jsonb)||jsonb_build_array(occurrence::text));end if;
    update public.hilo_activities set payload=a.payload,revision=revision+1,updated_at=now() where id=a.id and owner=uid returning revision into a.revision;
   end if;
   -- Completing a past repetition must not stop today's work on the same series.
   if coalesce(a.payload->>'recurrence','none')='none' or occurrence=(now() at time zone tz)::date then
    delete from public.hilo_sessions where owner=uid and payload->>'activityId'=activity_id::text;
   end if;
  end if;
  foreach k in array array['appointment','departure'] loop
   insert into public.hilo_push_jobs(owner,activity_id,occurrence,revision,due_at,kind,state,acknowledged)
   values(uid,activity_id,occurrence,a.revision,now(),k,'handled',true)
   on conflict on constraint hilo_push_once do update set state='handled',acknowledged=true,leased_until=null;
  end loop;
 else
  if a.payload->>'reminder'<>'true' or a.payload->>'time' is null then raise exception 'Enable a timed reminder first';end if;
  due:=case action when '10m' then now()+interval '10 minutes' when '1h' then now()+interval '1 hour' else ((now() at time zone tz)+interval '1 day') at time zone tz end;
  insert into public.hilo_push_jobs(owner,activity_id,occurrence,revision,due_at,kind,state,snoozed,next_attempt)
  values(uid,activity_id,occurrence,a.revision,due,kind,'pending',true,due)
  on conflict on constraint hilo_push_once do update set due_at=excluded.due_at,next_attempt=excluded.next_attempt,revision=excluded.revision,state='pending',snoozed=true,acknowledged=false,attempts=0,leased_until=null;
 end if;
end $$;
