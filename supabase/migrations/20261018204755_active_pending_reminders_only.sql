create or replace function hilo_private.hilo_own_reminders() returns jsonb language sql stable security definer set search_path='' as $$
 select coalesce(jsonb_agg(jsonb_build_object('id',j.id,'activity_id',j.activity_id,'occurrence',j.occurrence,'kind',j.kind,'due_at',j.due_at,'state',j.state,'acknowledged',j.acknowledged,'snoozed',j.snoozed) order by j.due_at),'[]'::jsonb)
 from public.hilo_push_jobs j join public.hilo_activities a on a.id=j.activity_id join public.hilo_profiles p on p.id=j.owner
 where j.owner=(select auth.uid()) and (select hilo_private.trial_access()) and j.state='pending' and not j.acknowledged
 and a.payload->>'status'='pending' and a.payload->>'reminder'='true'
 and public.hilo_occurs(a.payload,j.occurrence) and j.revision=a.revision
 and not coalesce(a.payload->'completedDates','[]'::jsonb) ? j.occurrence::text
 and public.hilo_wants_reminder(p.settings,a.payload,j.kind);
$$;
