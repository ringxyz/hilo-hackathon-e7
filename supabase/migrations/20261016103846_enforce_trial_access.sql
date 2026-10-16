-- Apply after the private list has been populated by the project owner.
do $$begin
 if not exists(select 1 from hilo_private.trial_emails where enabled) then raise exception 'Populate the private trial list before enforcing access';end if;
end;$$;
do $$declare t text;begin
 foreach t in array array['hilo_profiles','hilo_activities','hilo_sessions','hilo_captures','hilo_integrations','hilo_study_days','hilo_exams','hilo_push_subscriptions'] loop
  execute format('create policy trial_access_required on public.%I as restrictive for all to authenticated using ((select hilo_private.trial_access())) with check ((select hilo_private.trial_access()))',t);
 end loop;
end;$$;

-- These existing private service-table functions bypass RLS and must also check the list.
do $$declare f record;definition text;patched text;begin
 for f in select p.oid from pg_proc p where p.pronamespace='hilo_private'::regnamespace and p.proname in ('allow_request','hilo_take_ai_credit','hilo_reminder_action','hilo_reschedule_reminder') loop
  definition:=pg_get_functiondef(f.oid);
  patched:=regexp_replace(definition,'\mBEGIN\M','BEGIN PERFORM hilo_private.require_trial_access();','i');
  if patched=definition then raise exception 'Expected PL/pgSQL function body';end if;
  execute patched;
 end loop;
end;$$;
create or replace function hilo_private.hilo_own_reminders() returns jsonb language sql stable security definer set search_path='' as $$
 select coalesce(jsonb_agg(jsonb_build_object('id',j.id,'activity_id',j.activity_id,'occurrence',j.occurrence,'kind',j.kind,'due_at',j.due_at,'state',j.state,'acknowledged',j.acknowledged,'snoozed',j.snoozed) order by j.due_at),'[]'::jsonb)
 from public.hilo_push_jobs j join public.hilo_activities a on a.id=j.activity_id join public.hilo_profiles p on p.id=j.owner
 where j.owner=(select auth.uid()) and (select hilo_private.trial_access()) and not j.acknowledged
 and a.payload->>'status'='pending' and a.payload->>'reminder'='true'
 and not coalesce(a.payload->'completedDates','[]'::jsonb) ? j.occurrence::text
 and public.hilo_wants_reminder(p.settings,a.payload,j.kind);
$$;
revoke all on function hilo_private.hilo_own_reminders() from public,anon;
grant execute on function hilo_private.hilo_own_reminders() to authenticated;

-- Queue/claim are service-only. Suppress opted-out reminders before claiming a push lease.
create or replace function public.hilo_claim_reminders() returns setof public.hilo_push_jobs language sql security definer set search_path='' as $$
 with chosen as (
  select j.id from public.hilo_push_jobs j join public.hilo_activities a on a.id=j.activity_id join public.hilo_profiles p on p.id=j.owner
  join auth.users u on u.id=j.owner join hilo_private.trial_emails t on t.email=lower(btrim(u.email)) and t.enabled
  where ((j.state='pending' and j.next_attempt<=now()) or (j.state='sending' and j.leased_until<now()))
   and j.due_at between now()-interval '10 minutes' and now() and j.attempts<3
   and public.hilo_wants_reminder(p.settings,a.payload,j.kind)
  order by j.due_at limit 20 for update of j skip locked
 ) update public.hilo_push_jobs j set state='sending',attempts=j.attempts+1,leased_until=now()+interval '3 minutes'
 from chosen c where j.id=c.id returning j.*;
$$;
revoke all on function public.hilo_claim_reminders() from public,anon,authenticated;
grant execute on function public.hilo_claim_reminders() to service_role;
