-- Editing a title/note/step must not invalidate an otherwise correct reminder.
-- A real schedule edit retires the old job; queue refresh replaces its same key.
create function hilo_private.hilo_refresh_job_revision() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if (old.payload->>'date',old.payload->>'time',old.payload->>'timezone',old.payload->>'travelMinutes',old.payload->>'kind',old.payload->>'recurrence',old.payload->>'reminder') is not distinct from (new.payload->>'date',new.payload->>'time',new.payload->>'timezone',new.payload->>'travelMinutes',new.payload->>'kind',new.payload->>'recurrence',new.payload->>'reminder') then
  update public.hilo_push_jobs set revision=new.revision where activity_id=new.id and owner=new.owner and revision=old.revision;
 else
  update public.hilo_push_jobs set acknowledged=true,state='handled',leased_until=null where activity_id=new.id and owner=new.owner and not acknowledged;
 end if;
 return new;
end $$;
revoke all on function hilo_private.hilo_refresh_job_revision() from public,anon,authenticated;
create trigger hilo_refresh_job_revision after update on public.hilo_activities for each row execute function hilo_private.hilo_refresh_job_revision();
do $patch$ declare definition text;begin
 select pg_get_functiondef('public.hilo_queue_reminders()'::regprocedure) into definition;
 if strpos(definition,'on conflict(activity_id,occurrence,kind) do nothing;')=0 then raise exception 'Queue contract changed';end if;
 definition:=replace(definition,'on conflict(activity_id,occurrence,kind) do nothing;', 'on conflict(activity_id,occurrence,kind) do update set revision=excluded.revision,due_at=excluded.due_at,next_attempt=excluded.due_at,state=excluded.state,acknowledged=false,snoozed=false,attempts=0,leased_until=null where hilo_push_jobs.revision<>excluded.revision;');
 execute definition;
end $patch$;
