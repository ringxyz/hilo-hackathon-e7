-- Disposable records and every change are rolled back. No notifications or emails.
begin;
create temporary table hilo_qa_ids(a uuid,b uuid,activity uuid,capture uuid,extra uuid);
insert into hilo_qa_ids values(gen_random_uuid(),gen_random_uuid(),gen_random_uuid(),gen_random_uuid(),gen_random_uuid());
grant select on hilo_qa_ids to authenticated,anon;
insert into auth.users(id,email) select a,'hilo-qa-a-'||a||'@example.invalid' from hilo_qa_ids union all select b,'hilo-qa-b-'||b||'@example.invalid' from hilo_qa_ids;
update auth.users set email_confirmed_at=now() where id in(select a from hilo_qa_ids union all select b from hilo_qa_ids);
insert into hilo_private.trial_emails(email) select email from auth.users where id in(select a from hilo_qa_ids union all select b from hilo_qa_ids);
insert into public.hilo_profiles(id,settings) select a,'{"timezone":"UTC","quietStart":"00:00","quietEnd":"00:00"}'::jsonb from hilo_qa_ids union all select b,'{}'::jsonb from hilo_qa_ids;
insert into public.hilo_activities(id,owner,payload) select activity,a,jsonb_build_object('id',activity,'source','hilo','title','QA only','status','pending','date',to_char(now() at time zone 'UTC','YYYY-MM-DD'),'time',to_char((now()-interval '1 minute') at time zone 'UTC','HH24:MI'),'recurrence','daily','reminder',true) from hilo_qa_ids;
insert into public.hilo_study_days(id,owner,payload) select gen_random_uuid(),a,'{"title":"QA A"}'::jsonb from hilo_qa_ids union all select gen_random_uuid(),b,'{"title":"QA B"}'::jsonb from hilo_qa_ids;
insert into public.hilo_sessions(owner,payload) select a,jsonb_build_object('activityId',activity) from hilo_qa_ids;

select set_config('request.jwt.claim.sub',(select a::text from hilo_qa_ids),true);
set local role authenticated;
do $$ declare n int; ids record; payload jsonb; begin
  select * into ids from hilo_qa_ids;
  if (select count(*) from public.hilo_profiles)<>1 then raise exception 'Profile isolation failed';end if;
  if (select count(*) from public.hilo_study_days)<>1 then raise exception 'Study isolation failed';end if;
  begin
    insert into public.hilo_study_days(id,owner,payload) values(gen_random_uuid(),ids.b,'{}');
    raise exception 'Cross-owner write was allowed';
  exception when insufficient_privilege then null;end;
  update public.hilo_profiles set settings='{}' where id=ids.b;
  get diagnostics n=row_count;if n<>0 then raise exception 'Cross-owner update was allowed';end if;
  select a.payload into payload from public.hilo_activities a where id=ids.activity;
  if public.hilo_save_activity(ids.activity,99,payload,false) then raise exception 'Stale revision accepted';end if;
  if not public.hilo_save_activity(ids.activity,1,payload,true) then raise exception 'Valid revision rejected';end if;
  if exists(select 1 from public.hilo_sessions) then raise exception 'Completion did not clear session';end if;
  perform public.hilo_capture(ids.capture,jsonb_build_array(jsonb_build_object('id',ids.extra,'title','Idempotency QA')));
  perform public.hilo_capture(ids.capture,jsonb_build_array(jsonb_build_object('id',gen_random_uuid(),'title','Must not be inserted')));
  if (select count(*) from public.hilo_activities)<>2 then raise exception 'Duplicate capture';end if;
  for n in 1..30 loop if not public.hilo_take_ai_credit() then raise exception 'AI cap too early';end if;end loop;
  if public.hilo_take_ai_credit() then raise exception 'AI cap not enforced';end if;
  begin perform public.hilo_push_config();raise exception 'Secrets were accessible';exception when insufficient_privilege then null;end;
end $$;
reset role;
select public.hilo_queue_reminders();
do $$ begin
  if (select count(*) from public.hilo_push_jobs where owner=(select a from hilo_qa_ids))<>1 then raise exception 'Due reminder not queued';end if;
  perform public.hilo_queue_reminders();
  if (select count(*) from public.hilo_push_jobs where owner=(select a from hilo_qa_ids))<>1 then raise exception 'Duplicate reminder queued';end if;
  if not public.hilo_is_quiet('{"timezone":"Europe/Madrid","quietStart":"22:00","quietEnd":"08:00"}', '2026-10-14T21:00:00Z') then raise exception 'Quiet hours failed';end if;
  if public.hilo_is_quiet('{"timezone":"Europe/Madrid","quietStart":"22:00","quietEnd":"08:00"}', '2026-10-14T12:00:00Z') then raise exception 'Daytime marked quiet';end if;
end $$;
update public.hilo_activities set payload=jsonb_set(payload,'{status}','"done"'),revision=revision+1 where id=(select activity from hilo_qa_ids);
select public.hilo_queue_reminders();
do $$ begin if exists(select 1 from public.hilo_push_jobs where owner=(select a from hilo_qa_ids) and state<>'skipped') then raise exception 'Completed reminder still active';end if;end $$;
set local role anon;
do $$ begin
  begin perform * from public.hilo_study_days;raise exception 'Anonymous data access allowed';exception when insufficient_privilege then null;end;
  begin perform public.hilo_take_ai_credit();raise exception 'Anonymous AI allowed';exception when insufficient_privilege then null;end;
end $$;
reset role;
rollback;
select 'PASS: RLS isolation, foreign writes, revisions, atomic session clearing, idempotency, AI cap, secret permissions, reminder deduplication, quiet hours and completed cancellation' as checks;
