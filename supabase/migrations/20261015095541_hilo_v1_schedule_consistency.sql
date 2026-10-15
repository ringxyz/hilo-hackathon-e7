-- Keep pending delivery aligned with edits, without treating a closed notification as handled.
create function hilo_private.reconcile_reminders() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if (new.payload->'date',new.payload->'time',new.payload->'timezone',new.payload->'travelMinutes',new.payload->'reminder',new.payload->'status',new.payload->'recurrence',new.payload->'completedDates')
 is distinct from (old.payload->'date',old.payload->'time',old.payload->'timezone',old.payload->'travelMinutes',old.payload->'reminder',old.payload->'status',old.payload->'recurrence',old.payload->'completedDates') then
  -- The next cron computes the new schedule. Explicitly handled occurrences stay handled.
  delete from public.hilo_push_jobs where activity_id=new.id and owner=new.owner and state<>'handled';
 else
  update public.hilo_push_jobs set revision=new.revision where activity_id=new.id and owner=new.owner;
 end if;
 return new;
end $$;
revoke all on function hilo_private.reconcile_reminders() from public,anon,authenticated;
create trigger hilo_reconcile_reminders after update on public.hilo_activities for each row execute function hilo_private.reconcile_reminders();

-- Focus only needs the caller's existing table/RLS privileges.
alter function public.hilo_focus(text,uuid,text) security invoker;

-- Service-table operations stay outside the exposed schema; public RPCs are invoker wrappers.
alter function public.hilo_own_reminders() set schema hilo_private;
alter function public.hilo_reminder_action(uuid,uuid,date,text,text) set schema hilo_private;
alter function public.hilo_take_ai_credit() set schema hilo_private;
create function public.hilo_own_reminders() returns jsonb language sql stable security invoker set search_path='' as $$select hilo_private.hilo_own_reminders();$$;
create function public.hilo_reminder_action(request_id uuid,activity_id uuid,occurrence date,kind text,action text) returns void language sql security invoker set search_path='' as $$select hilo_private.hilo_reminder_action(request_id,activity_id,occurrence,kind,action);$$;
create function public.hilo_take_ai_credit() returns boolean language sql security invoker set search_path='' as $$select hilo_private.hilo_take_ai_credit();$$;
revoke all on function public.hilo_own_reminders(),public.hilo_reminder_action(uuid,uuid,date,text,text),public.hilo_take_ai_credit() from public,anon;
grant execute on function public.hilo_own_reminders(),public.hilo_reminder_action(uuid,uuid,date,text,text),public.hilo_take_ai_credit() to authenticated;

create function hilo_private.clear_reminder_receipts() returns void language sql security definer set search_path='' as $$delete from public.hilo_reminder_actions where owner=auth.uid();$$;
revoke all on function hilo_private.clear_reminder_receipts() from public,anon;
grant execute on function hilo_private.clear_reminder_receipts() to authenticated;
create or replace function public.hilo_delete_own_data() returns void language plpgsql security invoker set search_path='' as $$begin
 perform hilo_private.clear_reminder_receipts();
 delete from public.hilo_sessions where owner=auth.uid();
 delete from public.hilo_captures where owner=auth.uid();
 delete from public.hilo_activities where owner=auth.uid();
 delete from public.hilo_integrations where owner=auth.uid();
 delete from public.hilo_study_days where owner=auth.uid();
 delete from public.hilo_exams where owner=auth.uid();
 delete from public.hilo_push_subscriptions where owner=auth.uid();
 delete from public.hilo_profiles where id=auth.uid();
end $$;
