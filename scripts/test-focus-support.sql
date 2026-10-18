-- Disposable identities, full rollback. Production/demo records are never edited.
begin;
select set_config('hilo.qa_user',gen_random_uuid()::text,true),set_config('hilo.qa_other',gen_random_uuid()::text,true);
insert into auth.users(id,aud,role,email,email_confirmed_at)
 select id,'authenticated','authenticated','support-fixture-'||id||'@hilo.invalid',now() from (values(current_setting('hilo.qa_user')::uuid),(current_setting('hilo.qa_other')::uuid)) v(id);
insert into hilo_private.trial_emails(email) select email from auth.users where id in (current_setting('hilo.qa_user')::uuid,current_setting('hilo.qa_other')::uuid);
insert into public.hilo_profiles(id,settings) values(current_setting('hilo.qa_user')::uuid,'{"timezone":"Europe/Madrid","quietStart":"22:00","quietEnd":"08:00"}'),(current_setting('hilo.qa_other')::uuid,'{}');
select set_config('request.jwt.claim.sub',current_setting('hilo.qa_user'),true);
set local role authenticated;
do $$
declare items jsonb; first_id uuid:=gen_random_uuid(); second_id uuid:=gen_random_uuid(); step_id uuid:=gen_random_uuid(); day text:=to_char(now() at time zone 'Europe/Madrid','YYYY-MM-DD'); request_id uuid:=gen_random_uuid(); snap jsonb; changes jsonb; failed boolean;
begin
 select jsonb_agg(jsonb_build_object('id',gen_random_uuid(),'title','Disposable Later fixture','kind','task','date',null,'time',null,'duration',15,'recurrence','none','status','pending','source','hilo')) into items from generate_series(1,24);
 perform public.hilo_capture(gen_random_uuid(),items);
 if (select count(*) from public.hilo_activities where owner=auth.uid())<>24 then raise exception '24-task capture failed';end if;
 items:=jsonb_build_array(jsonb_build_object('id',first_id,'title','First fixture','kind','task','date',day,'time','09:00','duration',15,'status','pending','source','hilo','recurrence','none','steps',jsonb_build_array(jsonb_build_object('id',step_id,'title','Open one folder','minutes',1,'done',false))),jsonb_build_object('id',second_id,'title','Second fixture','kind','task','date',day,'time',null,'duration',20,'status','pending','source','hilo','recurrence','none'));
 perform public.hilo_capture_day_energy(request_id,items,'low');
 perform public.hilo_capture_day_energy(request_id,items,'low');
 if (select count(*) from public.hilo_activities where owner=auth.uid())<>26 then raise exception 'Duplicate capture';end if;
 if (select settings->'dayEnergy'->>'value' from public.hilo_profiles where id=auth.uid())<>'low' then raise exception 'Energy not persisted';end if;
 if (select payload->'steps'->0->>'title' from public.hilo_activities where id=first_id)<>'Open one folder' then raise exception 'Steps lost';end if;
 failed:=false;begin perform public.hilo_capture_day_energy(gen_random_uuid(),jsonb_build_array(items->0||jsonb_build_object('id',gen_random_uuid()),items->1||jsonb_build_object('id',gen_random_uuid())),'low');exception when others then failed:=true;end;
 if not failed or (select count(*) from public.hilo_activities where owner=auth.uid())<>26 then raise exception 'Low energy boundary/rollback failed';end if;
 -- Capturing a day may create a paused return point; retain that session verbatim.
 select jsonb_agg(jsonb_build_object('id',id,'revision',revision) order by id) into snap from public.hilo_activities where owner=auth.uid();
 changes:=jsonb_build_array(jsonb_build_object('id',first_id,'revision',1,'payload',items->0||jsonb_build_object('time','15:00','timezone','Europe/Madrid','startsAt',day||'T13:00:00Z','reminder',false)),jsonb_build_object('id',second_id,'revision',1,'payload',items->1||jsonb_build_object('date',null,'time',null,'timezone','Europe/Madrid','startsAt',null,'reminder',false)));
 request_id:=gen_random_uuid();
 perform public.hilo_replan_day(request_id,changes,snap,(select payload from public.hilo_sessions where owner=auth.uid()));
 perform public.hilo_replan_day(request_id,changes,snap,(select payload from public.hilo_sessions where owner=auth.uid()));
 if (select payload->>'time' from public.hilo_activities where id=first_id)<>'15:00' or (select payload->>'date' from public.hilo_activities where id=second_id) is not null then raise exception 'Replan not saved';end if;
 if (select revision from public.hilo_activities where id=first_id)<>2 then raise exception 'Replan retry duplicated';end if;
 failed:=false;begin perform public.hilo_replan_day(gen_random_uuid(),changes,snap,(select payload from public.hilo_sessions where owner=auth.uid()));exception when others then failed:=true;end;
 if not failed then raise exception 'Stale plan accepted';end if;
 if (select payload->'steps'->0->>'title' from public.hilo_activities where id=first_id)<>'Open one folder' then raise exception 'Replan erased steps';end if;
 if has_function_privilege('anon','public.hilo_replan_day(uuid,jsonb,jsonb,jsonb)','execute') then raise exception 'Anonymous RPC access';end if;
end $$;
reset role;
select 'focus_support_transaction_passed' as result;
rollback;
