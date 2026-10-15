-- Real queue integration, isolated by transaction; no delivery or committed fixtures.
begin;
select set_config('hilo.queue_owner',gen_random_uuid()::text,true),set_config('hilo.queue_activity',gen_random_uuid()::text,true);
insert into auth.users(id,aud,role) values(current_setting('hilo.queue_owner')::uuid,'authenticated','authenticated');
insert into public.hilo_profiles(id,settings) values(current_setting('hilo.queue_owner')::uuid,'{"timezone":"Europe/Madrid","quietStart":"00:00","quietEnd":"00:00"}');
insert into public.hilo_activities(id,owner,payload) values(current_setting('hilo.queue_activity')::uuid,current_setting('hilo.queue_owner')::uuid,
jsonb_build_object('title','Isolated departure fixture','status','pending','kind','event','date',((now()-interval '2 minutes') at time zone 'Europe/Madrid')::date,'time',to_char((now()-interval '2 minutes') at time zone 'Europe/Madrid','HH24:MI'),'timezone','Europe/Madrid','travelMinutes',30,'reminder',true,'recurrence','none'));
select public.hilo_queue_reminders();
select public.hilo_queue_reminders();
select set_config('hilo.queue_initial',(select jsonb_build_object('separate_kinds',count(*)=2 and count(distinct kind)=2,'departure_30_minutes',max(due_at)-min(due_at)=interval '30 minutes','appointment_ready',bool_or(kind='appointment' and state='pending'),'expired_departure_retained',bool_or(kind='departure' and state='missed'))::text from public.hilo_push_jobs where owner=current_setting('hilo.queue_owner')::uuid),true);
update public.hilo_activities set payload=payload||'{"travelMinutes":45}',revision=revision+1 where id=current_setting('hilo.queue_activity')::uuid;
select public.hilo_queue_reminders();
select set_config('hilo.queue_changed',(select jsonb_build_object('old_jobs_replaced',count(*)=2,'departure_45_minutes',max(due_at)-min(due_at)=interval '45 minutes','current_revision',bool_and(revision=(select revision from public.hilo_activities where id=current_setting('hilo.queue_activity')::uuid)))::text from public.hilo_push_jobs where owner=current_setting('hilo.queue_owner')::uuid),true);
select jsonb_build_object('queue',current_setting('hilo.queue_initial')::jsonb,'changed_travel',current_setting('hilo.queue_changed')::jsonb,'quiet_2200',public.hilo_is_quiet('{"timezone":"Europe/Madrid","quietStart":"22:00","quietEnd":"08:00"}','2026-10-25 21:00Z'),'quiet_0759',public.hilo_is_quiet('{"timezone":"Europe/Madrid","quietStart":"22:00","quietEnd":"08:00"}','2026-10-25 06:59Z'),'allowed_0800',not public.hilo_is_quiet('{"timezone":"Europe/Madrid","quietStart":"22:00","quietEnd":"08:00"}','2026-10-25 07:00Z')) as checks;
rollback;
