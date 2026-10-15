begin;
-- Use with BEGIN/ROLLBACK. No push delivery; isolated account and synthetic activities.
select set_config('hilo.res_owner',gen_random_uuid()::text,true),set_config('hilo.res_other',gen_random_uuid()::text,true),set_config('hilo.res_event',gen_random_uuid()::text,true),set_config('hilo.res_series',gen_random_uuid()::text,true),set_config('hilo.res_request',gen_random_uuid()::text,true);
insert into auth.users(id,aud,role) values(current_setting('hilo.res_owner')::uuid,'authenticated','authenticated'),(current_setting('hilo.res_other')::uuid,'authenticated','authenticated');
insert into public.hilo_profiles(id,settings) values(current_setting('hilo.res_owner')::uuid,'{"timezone":"Europe/Madrid","quietStart":"00:00","quietEnd":"00:00"}'),(current_setting('hilo.res_other')::uuid,'{}');
insert into public.hilo_activities(id,owner,payload) values
(current_setting('hilo.res_event')::uuid,current_setting('hilo.res_owner')::uuid,jsonb_build_object('title','Reschedule fixture','source','google','googleId','fixture-only','status','pending','kind','event','date',current_date-1,'time','19:00','timezone','Europe/Madrid','travelMinutes',30,'duration',20,'reminder',true,'recurrence','none')),
(current_setting('hilo.res_series')::uuid,current_setting('hilo.res_owner')::uuid,jsonb_build_object('title','Series fixture','source','hilo','status','pending','kind','task','date',current_date-1,'time','19:00','timezone','Europe/Madrid','duration',20,'reminder',false,'recurrence','daily'));
select set_config('request.jwt.claim.sub',current_setting('hilo.res_owner'),true);
set local role authenticated;
select set_config('hilo.res_ten',public.hilo_reschedule_reminder(current_setting('hilo.res_request')::uuid,current_setting('hilo.res_event')::uuid,current_date-1,'departure','10m')::text,true);
select set_config('hilo.res_idempotent',(public.hilo_reschedule_reminder(current_setting('hilo.res_request')::uuid,current_setting('hilo.res_event')::uuid,current_date-1,'departure','10m')=current_setting('hilo.res_ten')::jsonb)::text,true);
select set_config('hilo.res_ten_checks',(select jsonb_build_object('activity_moved',abs(extract(epoch from ((payload->>'startsAt')::timestamptz-now()))-600)<60,'google_override',payload->'scheduleOverride'->>'time'=payload->>'time','reminder_enabled',payload->>'reminder'='true')::text from public.hilo_activities where id=current_setting('hilo.res_event')::uuid),true);
select public.hilo_reschedule_reminder(gen_random_uuid(),current_setting('hilo.res_event')::uuid,(current_setting('hilo.res_ten')::jsonb->>'date')::date,'appointment','1h');
select set_config('hilo.res_hour',(select (abs(extract(epoch from ((payload->>'startsAt')::timestamptz-now()))-3600)<60)::text from public.hilo_activities where id=current_setting('hilo.res_event')::uuid),true);
select public.hilo_focus('start',current_setting('hilo.res_series')::uuid);
select set_config('hilo.res_clone',public.hilo_reschedule_reminder(gen_random_uuid(),current_setting('hilo.res_series')::uuid,current_date-1,'appointment','tomorrow')::text,true);
reset role;
select set_config('hilo.res_series_checks',(select jsonb_build_object('base_date_retained',payload->>'date'=(current_date-1)::text,'old_date_excluded',not public.hilo_occurs(payload,current_date-1),'future_unchanged',public.hilo_occurs(payload,current_date),'not_marked_done',not coalesce(payload->'completedDates','[]'::jsonb) ? (current_date-1)::text,'todays_focus_retained',exists(select 1 from public.hilo_sessions where owner=auth.uid() and payload->>'activityId'=current_setting('hilo.res_series')))::text from public.hilo_activities where id=current_setting('hilo.res_series')::uuid),true);
set local role authenticated;
select set_config('hilo.res_clone_checks',(select jsonb_build_object('one_off',payload->>'recurrence'='none','tomorrow_same_hour',payload->>'date'=((now() at time zone 'Europe/Madrid')::date+1)::text and payload->>'time'='19:00')::text from public.hilo_activities where id=(current_setting('hilo.res_clone')::jsonb->>'id')::uuid),true);
-- Retrying the old series card addresses its moved occurrence, without making another copy.
select public.hilo_reschedule_reminder(gen_random_uuid(),current_setting('hilo.res_series')::uuid,current_date-1,'appointment','1h');
select set_config('hilo.res_no_duplicate',(select (count(*)=3)::text from public.hilo_activities),true);
update public.hilo_profiles set settings='{"timezone":"Europe/Madrid","quietStart":"21:00","quietEnd":"08:00"}' where id=auth.uid();
update public.hilo_activities set payload=payload||'{"time":"21:30"}' where id=current_setting('hilo.res_event')::uuid;
select set_config('hilo.res_quiet',public.hilo_reschedule_reminder(gen_random_uuid(),current_setting('hilo.res_event')::uuid,(select (payload->>'date')::date from public.hilo_activities where id=current_setting('hilo.res_event')::uuid),'appointment','tomorrow')::text,true);
select set_config('hilo.res_quiet_checks',((current_setting('hilo.res_quiet')::jsonb->>'adjusted')::boolean and current_setting('hilo.res_quiet')::jsonb->>'time'='08:30' and current_setting('hilo.res_quiet')::jsonb->>'date'=((now() at time zone 'Europe/Madrid')::date+1)::text)::text,true);
update public.hilo_profiles set settings=jsonb_build_object('timezone','Europe/Madrid','quietStart',to_char((now()-interval '30 minutes') at time zone 'Europe/Madrid','HH24:MI'),'quietEnd',to_char((now()+interval '30 minutes') at time zone 'Europe/Madrid','HH24:MI')) where id=auth.uid();
select public.hilo_reschedule_reminder(gen_random_uuid(),current_setting('hilo.res_event')::uuid,(select (payload->>'date')::date from public.hilo_activities where id=current_setting('hilo.res_event')::uuid),'appointment','10m');
reset role;
select set_config('request.jwt.claim.sub',current_setting('hilo.res_other'),true);
set local role authenticated;
do $$begin
 begin perform public.hilo_reschedule_reminder(gen_random_uuid(),current_setting('hilo.res_event')::uuid,current_date,'appointment','10m');raise exception 'Cross-account reschedule allowed';exception when others then if sqlerrm<>'Activity unavailable' then raise;end if;end;
 perform set_config('hilo.res_cross','true',true);
end $$;
reset role;
select public.hilo_queue_reminders();
select jsonb_build_object('ten_minutes',current_setting('hilo.res_ten_checks')::jsonb,'one_hour',current_setting('hilo.res_hour')::boolean,'idempotent',current_setting('hilo.res_idempotent')::boolean,'series',current_setting('hilo.res_series_checks')::jsonb,'moved_occurrence',current_setting('hilo.res_clone_checks')::jsonb,'no_duplicate_clone',current_setting('hilo.res_no_duplicate')::boolean,'tomorrow_outside_quiet_hours',current_setting('hilo.res_quiet_checks')::boolean,'cross_account_denied',current_setting('hilo.res_cross')::boolean,'future_jobs_wait_through_current_quiet_hours',(select count(*)=2 and bool_and(j.state='pending') from public.hilo_push_jobs j where j.activity_id=current_setting('hilo.res_event')::uuid and not j.acknowledged),'pending_jobs_use_current_revision',(select bool_and(j.revision=a.revision) from public.hilo_push_jobs j join public.hilo_activities a on a.id=j.activity_id where j.owner=current_setting('hilo.res_owner')::uuid and j.state='pending')) as checks;

rollback;
