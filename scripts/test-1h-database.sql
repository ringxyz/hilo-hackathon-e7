begin;
do $$declare a jsonb:='{"kind":"event","time":"18:30","timezone":"Europe/Madrid","travelMinutes":15}';s jsonb:='{"timezone":"Europe/Madrid","quietStart":"22:00","quietEnd":"08:00"}';p jsonb;begin
 p:=public.hilo_schedule_target(a,s,'2026-10-18','10m','2026-10-18 14:22Z');if p->>'time'<>'18:40' or p->'departure'->>'time'<>'18:25' then raise exception 'scheduled offset failed';end if;
 p:=public.hilo_schedule_target(a,s,'2026-10-20','tomorrow','2026-10-18 14:22Z');if p->>'date'<>'2026-10-21' then raise exception 'tomorrow advances scheduled date';end if;
 p:=public.hilo_schedule_target(a||'{"time":"21:55"}',s,'2026-10-18','10m','2026-10-18 14:22Z');if p->>'date'<>'2026-10-19' or p->>'time'<>'08:15' then raise exception 'quiet/departure failed';end if;
 p:=public.hilo_schedule_target(a||'{"time":"10:00"}',s,'2026-10-18','10m','2026-10-18 14:22Z');if p->>'time'<>'16:32' then raise exception 'expired offset failed';end if;
 p:=public.hilo_schedule_target(a,s,'2026-10-24','tomorrow','2026-10-24 12:00Z');if p->>'time'<>'18:30' or p->>'date'<>'2026-10-25' then raise exception 'DST local time failed';end if;
end $$;
select set_config('hilo.h_owner',gen_random_uuid()::text,true),set_config('hilo.h_event',gen_random_uuid()::text,true),set_config('hilo.h_request',gen_random_uuid()::text,true);
insert into auth.users(id,aud,role,email,email_confirmed_at) values(current_setting('hilo.h_owner')::uuid,'authenticated','authenticated','qa-'||current_setting('hilo.h_owner')||'@hilo.invalid',now());
insert into hilo_private.trial_emails(email) values('qa-'||current_setting('hilo.h_owner')||'@hilo.invalid');
insert into public.hilo_profiles(id,settings) values(current_setting('hilo.h_owner')::uuid,'{"timezone":"Europe/Madrid","quietStart":"00:00","quietEnd":"00:00"}');
insert into public.hilo_activities(id,owner,payload) values(current_setting('hilo.h_event')::uuid,current_setting('hilo.h_owner')::uuid,jsonb_build_object('title','QA 1h','kind','event','date',(now() at time zone 'Europe/Madrid')::date+1,'time','18:30','duration',20,'recurrence','weekly','timezone','Europe/Madrid','travelMinutes',15,'status','pending','source','hilo','reminder',true));
insert into public.hilo_push_jobs(owner,activity_id,occurrence,revision,due_at,kind,state) values(current_setting('hilo.h_owner')::uuid,current_setting('hilo.h_event')::uuid,(now() at time zone 'Europe/Madrid')::date+1,1,(((now() at time zone 'Europe/Madrid')::date+1)+time '18:30') at time zone 'Europe/Madrid','appointment','pending');
select set_config('request.jwt.claim.sub',current_setting('hilo.h_owner'),true);
set local role authenticated;
do $$declare p jsonb;r jsonb;n int;begin
 p:=public.hilo_reschedule_preview(current_setting('hilo.h_event')::uuid,(now() at time zone 'Europe/Madrid')::date+1,'10m');
 if p->>'time'<>'18:40' or p->'departure'->>'time'<>'18:25' then raise exception 'future time/departure failed';end if;
 if (select count(*) from public.hilo_activities)<>1 then raise exception 'preview wrote data';end if;
 perform public.hilo_save_activity(current_setting('hilo.h_event')::uuid,1,(select payload||'{"nextStep":"Revisar el documento"}' from public.hilo_activities where id=current_setting('hilo.h_event')::uuid),false);
 if jsonb_array_length(public.hilo_own_reminders())<>1 then raise exception 'text edit lost valid reminder';end if;
 begin
  perform public.hilo_reschedule_confirm(gen_random_uuid(),current_setting('hilo.h_event')::uuid,(now() at time zone 'Europe/Madrid')::date+1,'appointment','10m',(p->>'startsAt')::timestamptz+interval '1 minute');
  raise exception 'stale preview accepted';
 exception when raise_exception then if sqlerrm='stale preview accepted' then raise;end if;end;
 r:=public.hilo_reschedule_confirm(current_setting('hilo.h_request')::uuid,current_setting('hilo.h_event')::uuid,(now() at time zone 'Europe/Madrid')::date+1,'appointment','10m',(p->>'startsAt')::timestamptz);
 if r->>'time'<>'18:40' then raise exception 'commit differs';end if;
 if public.hilo_reschedule_confirm(current_setting('hilo.h_request')::uuid,current_setting('hilo.h_event')::uuid,(now() at time zone 'Europe/Madrid')::date+1,'appointment','10m',(p->>'startsAt')::timestamptz)<>r then raise exception 'idempotency failed';end if;
 if (select count(*) from public.hilo_activities)<>2 then raise exception 'series duplicate';end if;
 if not exists(select 1 from public.hilo_activities where id=current_setting('hilo.h_event')::uuid and payload->>'recurrence'='weekly') then raise exception 'series lost';end if;
end $$;
reset role;
do $$begin if exists(select 1 from public.hilo_push_jobs where owner=current_setting('hilo.h_owner')::uuid group by activity_id,occurrence,kind having count(*)>1) then raise exception 'duplicate jobs';end if;end $$;
rollback;
