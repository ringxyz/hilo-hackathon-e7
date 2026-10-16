-- Isolated accounts and data, rolled back; no push is sent.
begin;
select set_config('hilo.done_owner',gen_random_uuid()::text,true),set_config('hilo.done_other',gen_random_uuid()::text,true),set_config('hilo.done_event',gen_random_uuid()::text,true),set_config('hilo.done_series',gen_random_uuid()::text,true),set_config('hilo.done_request',gen_random_uuid()::text,true);
insert into auth.users(id,aud,role) values(current_setting('hilo.done_owner')::uuid,'authenticated','authenticated'),(current_setting('hilo.done_other')::uuid,'authenticated','authenticated');
-- Confirm and allow only this transaction's synthetic identities.
update auth.users set email='fixture-'||id||'@hilo.invalid',email_confirmed_at=now() where id in (current_setting('hilo.done_owner')::uuid,current_setting('hilo.done_other')::uuid);
insert into hilo_private.trial_emails(email) select email from auth.users where id in (current_setting('hilo.done_owner')::uuid,current_setting('hilo.done_other')::uuid);
insert into public.hilo_profiles(id,settings) values(current_setting('hilo.done_owner')::uuid,'{"timezone":"Europe/Madrid"}'),(current_setting('hilo.done_other')::uuid,'{}');
insert into public.hilo_activities(id,owner,payload) values
(current_setting('hilo.done_event')::uuid,current_setting('hilo.done_owner')::uuid,jsonb_build_object('title','Isolated Google appointment','source','google','googleId','fixture-only','status','pending','kind','event','date',current_date-1,'time','19:00','timezone','Europe/Madrid','travelMinutes',30,'duration',20,'reminder',true,'recurrence','none')),
(current_setting('hilo.done_series')::uuid,current_setting('hilo.done_owner')::uuid,jsonb_build_object('title','Isolated daily series','source','hilo','status','pending','kind','task','date',current_date-1,'time','19:00','timezone','Europe/Madrid','duration',20,'reminder',true,'recurrence','daily'));
insert into public.hilo_push_jobs(owner,activity_id,occurrence,revision,due_at,kind,state) select a.owner,a.id,current_date-1,a.revision,now()-interval '1 day',k,'missed' from public.hilo_activities a cross join unnest(array['appointment','departure']) k where a.owner=current_setting('hilo.done_owner')::uuid;
select set_config('request.jwt.claim.sub',current_setting('hilo.done_owner'),true);
set local role authenticated;
select public.hilo_focus('start',current_setting('hilo.done_event')::uuid);
select public.hilo_reminder_action(current_setting('hilo.done_request')::uuid,current_setting('hilo.done_event')::uuid,current_date-1,'departure','done');
select set_config('hilo.done_revision',(select revision::text from public.hilo_activities where id=current_setting('hilo.done_event')::uuid),true);
select public.hilo_reminder_action(current_setting('hilo.done_request')::uuid,current_setting('hilo.done_event')::uuid,current_date-1,'departure','done');
select public.hilo_reminder_action(gen_random_uuid(),current_setting('hilo.done_event')::uuid,current_date-1,'appointment','done');
select set_config('hilo.done_single',(select jsonb_build_object('done',payload->>'status'='done','no_reopen_on_repeat',revision::text=current_setting('hilo.done_revision'),'google_id_preserved',payload->>'googleId'='fixture-only','focus_cleared',not exists(select 1 from public.hilo_sessions where owner=auth.uid()))::text from public.hilo_activities where id=current_setting('hilo.done_event')::uuid),true);
select public.hilo_focus('start',current_setting('hilo.done_series')::uuid);
select public.hilo_reminder_action(gen_random_uuid(),current_setting('hilo.done_series')::uuid,current_date-1,'appointment','done');
select set_config('hilo.done_series_result',(select jsonb_build_object('only_yesterday',payload->'completedDates'=jsonb_build_array((current_date-1)::text),'future_still_pending',payload->>'status'='pending','todays_focus_preserved',exists(select 1 from public.hilo_sessions where owner=auth.uid()))::text from public.hilo_activities where id=current_setting('hilo.done_series')::uuid),true);
select set_config('hilo.done_hidden',(public.hilo_own_reminders()='[]'::jsonb)::text,true);
reset role;
select set_config('request.jwt.claim.sub',current_setting('hilo.done_other'),true);
set local role authenticated;
do $$begin
 begin perform public.hilo_reminder_action(gen_random_uuid(),current_setting('hilo.done_event')::uuid,current_date-1,'appointment','done');raise exception 'Cross-account completion allowed';exception when others then if sqlerrm<>'Activity unavailable' then raise;end if;end;
 perform set_config('hilo.done_cross_account','true',true);
end $$;
reset role;
select public.hilo_queue_reminders();
select jsonb_build_object('one_off',current_setting('hilo.done_single')::jsonb,'recurring',current_setting('hilo.done_series_result')::jsonb,'reminders_hidden',current_setting('hilo.done_hidden')::boolean,'cross_account_denied',current_setting('hilo.done_cross_account')::boolean,'both_kinds_handled',(select count(*)=4 and bool_and(acknowledged and state='handled') from public.hilo_push_jobs where owner=current_setting('hilo.done_owner')::uuid and occurrence=current_date-1)) as checks;
rollback;
