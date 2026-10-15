-- Complete a reminder occurrence without starting focus or changing its Google event.
create or replace function hilo_private.hilo_reminder_action(request_id uuid,activity_id uuid,occurrence date,kind text,action text) returns void language plpgsql security definer set search_path='' as $$
declare uid uuid:=auth.uid();a public.hilo_activities;tz text;due timestamptz;k text;completed boolean;begin
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
revoke all on function hilo_private.hilo_reminder_action(uuid,uuid,date,text,text) from public,anon;
grant execute on function hilo_private.hilo_reminder_action(uuid,uuid,date,text,text) to authenticated;
