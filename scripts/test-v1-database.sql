-- Isolated transactional fixtures. Nothing is committed, no push delivery is invoked.
begin;
select set_config('hilo.test_user',gen_random_uuid()::text,true),set_config('hilo.other_user',gen_random_uuid()::text,true),set_config('hilo.activity',gen_random_uuid()::text,true),set_config('hilo.request',gen_random_uuid()::text,true),set_config('hilo.snooze',gen_random_uuid()::text,true),set_config('hilo.foreign_activity',gen_random_uuid()::text,true);
insert into auth.users(id,aud,role) values(current_setting('hilo.test_user')::uuid,'authenticated','authenticated'),(current_setting('hilo.other_user')::uuid,'authenticated','authenticated');
insert into public.hilo_profiles(id,settings) values(current_setting('hilo.test_user')::uuid,'{"timezone":"Europe/Madrid","quietStart":"22:00","quietEnd":"08:00"}'),(current_setting('hilo.other_user')::uuid,'{}');
insert into public.hilo_activities(id,owner,payload) values(current_setting('hilo.foreign_activity')::uuid,current_setting('hilo.other_user')::uuid,'{"title":"Other isolated account","status":"pending","duration":20}');
select set_config('request.jwt.claim.sub',current_setting('hilo.test_user'),true);
set local role authenticated;
select public.hilo_capture(current_setting('hilo.request')::uuid,jsonb_build_array(jsonb_build_object('id',current_setting('hilo.activity'),'title','V1 isolated fixture','kind','event','date',(now() at time zone 'Europe/Madrid')::date,'time','19:30','timezone','Europe/Madrid','travelMinutes',30,'duration',20,'nextStep','Read one paragraph for 2 minutes','note','Original captured text','status','pending','source','hilo','recurrence','daily','reminder',true)));
select public.hilo_capture(current_setting('hilo.request')::uuid,'[{"id":"00000000-0000-4000-8000-000000000000","title":"Must never duplicate"}]');
select public.hilo_focus('start',current_setting('hilo.activity')::uuid);
update public.hilo_sessions set payload=payload||'{"elapsed":125}' where owner=auth.uid();
select public.hilo_focus('pause',null,'Second paragraph, line 3');
select public.hilo_focus('start',current_setting('hilo.activity')::uuid);
select set_config('hilo.persistence_results',(jsonb_build_object('capture_count',(select count(*) from public.hilo_activities),'original_text_preserved',(select payload->>'note'='Original captured text' from public.hilo_activities),'session_note',(select payload->>'note'='Second paragraph, line 3' from public.hilo_sessions),'elapsed_retained',(select (payload->>'elapsed')::int>=125 from public.hilo_sessions),'next_step_retained',(select payload->>'nextStep'='Read one paragraph for 2 minutes' from public.hilo_activities),'other_profile_invisible',(select count(*)=0 from public.hilo_profiles where id=current_setting('hilo.other_user')::uuid)))::text,true);
-- Rescheduling is verified in scripts/test-reschedule.sql (V1 follow-up).
select public.hilo_reminder_action(gen_random_uuid(),current_setting('hilo.activity')::uuid,(now() at time zone 'Europe/Madrid')::date,'appointment','start');
select set_config('hilo.start_results',(jsonb_build_object('handled_reminders_hidden',public.hilo_own_reminders()='[]'::jsonb,'focus_running',(select payload->>'status'='running' from public.hilo_sessions)))::text,true);
do $$begin
 begin perform public.hilo_focus('start',current_setting('hilo.foreign_activity')::uuid);raise exception 'Cross-account focus allowed';exception when others then if sqlerrm<>'Activity unavailable' then raise;end if;end;
 begin perform public.hilo_reminder_action(gen_random_uuid(),current_setting('hilo.foreign_activity')::uuid,current_date,'appointment','start');raise exception 'Cross-account reminder allowed';exception when others then if sqlerrm<>'Activity unavailable' then raise;end if;end;
 perform set_config('hilo.cross_account','true',true);
end $$;
reset role;
select set_config('hilo.schedule_results',(jsonb_build_object('two_tombstones',(select count(*)=2 and bool_and(acknowledged) from public.hilo_push_jobs where owner=current_setting('hilo.test_user')::uuid),'dst_before',('2026-10-24 09:00'::timestamp at time zone 'Europe/Madrid')='2026-10-24 07:00Z'::timestamptz,'dst_after',('2026-10-25 09:00'::timestamp at time zone 'Europe/Madrid')='2026-10-25 08:00Z'::timestamptz,'dst_fold_later',('2026-10-25 02:30'::timestamp at time zone 'Europe/Madrid')='2026-10-25 01:30Z'::timestamptz))::text,true);
select jsonb_build_object('persistence',current_setting('hilo.persistence_results')::jsonb,'start',current_setting('hilo.start_results')::jsonb,'schedule',current_setting('hilo.schedule_results')::jsonb,'cross_account_rpc_denied',current_setting('hilo.cross_account')::boolean) as checks;
rollback;
