begin;
create temporary table hilo_trial_test_ids as select gen_random_uuid() as allowed,gen_random_uuid() as denied,gen_random_uuid() as activity,gen_random_uuid() as receipt;
insert into auth.users(id,email,email_confirmed_at) select allowed,'allowed-fixture@hilo.invalid',now() from hilo_trial_test_ids union all select denied,'denied-fixture@hilo.invalid',now() from hilo_trial_test_ids;
insert into hilo_private.trial_emails(email) values('allowed-fixture@hilo.invalid');
insert into public.hilo_profiles(id,settings) select allowed,'{"name":"Fixture"}'::jsonb from hilo_trial_test_ids union all select denied,'{"name":"Denied fixture"}'::jsonb from hilo_trial_test_ids;
select set_config('request.jwt.claims',jsonb_build_object('sub',allowed,'role','authenticated')::text,true) from hilo_trial_test_ids;
grant select on hilo_trial_test_ids to authenticated;
set local role authenticated;
do $$declare a uuid;r uuid;items jsonb;begin
 if not public.hilo_trial_access() then raise exception 'Allowed account was blocked';end if;
 select activity,receipt into a,r from hilo_trial_test_ids;
 items:=jsonb_build_array(jsonb_build_object('id',a,'title','Fixture task','kind','task','date',null,'time',null,'duration',20,'nextStep','Open notes','status','pending','reminder',false,'source','hilo','recurrence','none'));
 perform public.hilo_capture_day(r,items);perform public.hilo_capture_day(r,items);
 if (select count(*) from public.hilo_activities where owner=auth.uid())<>1 then raise exception 'Duplicate day capture';end if;
 if not exists(select 1 from public.hilo_sessions where owner=auth.uid() and payload->>'status'='paused' and payload->>'activityId'=a::text) then raise exception 'Missing paused return point';end if;
 if (select count(*) from public.hilo_profiles)<>1 then raise exception 'Cross-account profile access';end if;
end;$$;
reset role;
select set_config('request.jwt.claims',jsonb_build_object('sub',denied,'role','authenticated')::text,true) from hilo_trial_test_ids;
set local role authenticated;
do $$begin
 if public.hilo_trial_access() then raise exception 'Unlisted account was allowed';end if;
 if exists(select 1 from public.hilo_profiles) then raise exception 'Unlisted account bypassed RLS';end if;
 begin perform public.hilo_take_ai_credit();raise exception 'Unlisted AI RPC was allowed';exception when insufficient_privilege then null;end;
 begin perform public.hilo_capture(gen_random_uuid(),'[{"id":"12345678-1234-4234-8234-123456789012","title":"Blocked"}]');raise exception 'Unlisted capture was allowed';exception when insufficient_privilege then null;end;
end;$$;
reset role;
-- The managed SQL role cannot SET ROLE supabase_auth_admin. Verify hook results and its grants separately.
do $$begin
 if public.hilo_before_user_created('{"user":{"email":"ALLOWED-FIXTURE@HILO.INVALID"}}')->'error' is not null then raise exception 'Allowed signup denied';end if;
 if public.hilo_before_user_created('{"user":{"email":"unlisted-fixture@hilo.invalid"}}')->'error'->>'http_code'<>'403' then raise exception 'Unlisted signup allowed';end if;
end;$$;
reset role;
select true as trial_allowlist_rls_rpc_idempotence_return_and_signup_hook_passed,has_function_privilege('supabase_auth_admin','public.hilo_before_user_created(jsonb)','EXECUTE') as auth_hook_execute_granted,has_table_privilege('supabase_auth_admin','hilo_private.trial_emails','SELECT') as auth_hook_read_granted,not has_table_privilege('authenticated','hilo_private.trial_emails','SELECT') as list_not_public;
rollback;
