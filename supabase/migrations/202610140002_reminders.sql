-- Scheduling and delivery run on Supabase, independently of an open browser.
create extension if not exists pg_cron;
create extension if not exists pg_net;
create extension if not exists supabase_vault with schema vault;

alter table public.hilo_push_jobs drop constraint hilo_push_jobs_activity_id_occurrence_revision_key;
alter table public.hilo_push_jobs add constraint hilo_push_once unique(activity_id,occurrence);
create index hilo_push_jobs_pending_idx on public.hilo_push_jobs(state,next_attempt);
create table public.hilo_push_test_usage(owner uuid references auth.users(id) on delete cascade, day date, count int not null, primary key(owner,day));
alter table public.hilo_push_test_usage enable row level security;
grant all on public.hilo_push_test_usage to service_role;

do $$ begin
  if not exists(select 1 from vault.secrets where name='hilo_cron_secret') then
    perform vault.create_secret(gen_random_uuid()::text||gen_random_uuid()::text,'hilo_cron_secret');
  end if;
end $$;

-- Only the Edge Function service identity can retrieve these values.
create function public.hilo_push_config() returns jsonb language sql security definer set search_path='' as $$
  select jsonb_build_object(
    'cronSecret',(select decrypted_secret from vault.decrypted_secrets where name='hilo_cron_secret'),
    'vapid',(select decrypted_secret::jsonb from vault.decrypted_secrets where name='hilo_vapid'));
$$;
create function public.hilo_initialize_push(value jsonb) returns jsonb language plpgsql security definer set search_path='' as $$
declare saved jsonb; begin
  perform pg_advisory_xact_lock(71402026);
  select decrypted_secret::jsonb into saved from vault.decrypted_secrets where name='hilo_vapid';
  if saved is null then
    if length(value->>'publicKey')<40 or length(value->>'privateKey')<30 then raise exception 'Invalid VAPID keys'; end if;
    perform vault.create_secret(value::text,'hilo_vapid');saved:=value;
  end if;
  insert into public.hilo_public_config(id,push_public_key) values(true,saved->>'publicKey') on conflict(id) do update set push_public_key=excluded.push_public_key;
  return saved;
end $$;

create function public.hilo_is_quiet(settings jsonb, instant timestamptz) returns boolean language plpgsql stable set search_path='' as $$
declare t time; a time; b time; begin
  t:=(instant at time zone coalesce(settings->>'timezone','Europe/Madrid'))::time;
  a:=coalesce(settings->>'quietStart','22:00')::time;b:=coalesce(settings->>'quietEnd','08:00')::time;
  return case when a=b then false when a<b then t>=a and t<b else t>=a or t<b end;
exception when others then return true;
end $$;

create function public.hilo_queue_reminders() returns integer language plpgsql security definer set search_path='' as $$
declare r record; d date; first_day date; due timestamptz; tz text; recurrence text; n int:=0; begin
  for r in select a.*,p.settings from public.hilo_activities a join public.hilo_profiles p on p.id=a.owner
    where a.payload->>'source'='hilo' and a.payload->>'reminder'='true' and a.payload->>'status'='pending'
    and a.payload->>'date' is not null and a.payload->>'time' is not null loop
    begin
      tz:=coalesce(r.settings->>'timezone','Europe/Madrid');first_day:=(r.payload->>'date')::date;recurrence:=coalesce(r.payload->>'recurrence','none');
      -- Yesterday covers a due reminder just before local midnight.
      for d in select ((now() at time zone tz)::date - i) from generate_series(0,1) i loop
        if d<first_day or (recurrence='none' and d<>first_day)
          or (recurrence='weekly' and extract(isodow from d)<>extract(isodow from first_day))
          or (recurrence='annual' and to_char(d,'MM-DD')<>to_char(first_day,'MM-DD'))
          or recurrence not in ('none','daily','weekly','annual')
          or coalesce(r.payload->'completedDates','[]'::jsonb) ? d::text then continue; end if;
        due:=(d+(r.payload->>'time')::time) at time zone tz;
        if due>now() or due<now()-interval '10 minutes' or public.hilo_is_quiet(r.settings,due) then continue; end if;
        insert into public.hilo_push_jobs(owner,activity_id,occurrence,revision,due_at)
          values(r.owner,r.id,d,r.revision,due)
          on conflict(activity_id,occurrence) do update set revision=excluded.revision,due_at=excluded.due_at,state='pending',
            attempts=case when public.hilo_push_jobs.revision<>excluded.revision then 0 else public.hilo_push_jobs.attempts end
            where public.hilo_push_jobs.state='pending' or (public.hilo_push_jobs.revision<>excluded.revision and public.hilo_push_jobs.state in ('skipped','failed'));
        n:=n+1;
      end loop;
    exception when invalid_text_representation or invalid_parameter_value or datetime_field_overflow then continue;
    end;
  end loop;
  -- Do not deliver stale, completed, disabled or quiet-hour jobs after a retry.
  update public.hilo_push_jobs j set state='skipped' from public.hilo_activities a,public.hilo_profiles p
    where j.activity_id=a.id and p.id=j.owner and j.state in ('pending','sending') and
    (j.due_at<now()-interval '10 minutes' or a.revision<>j.revision or a.payload->>'reminder'<>'true'
     or a.payload->>'status'<>'pending' or coalesce(a.payload->'completedDates','[]'::jsonb) ? j.occurrence::text
     or public.hilo_is_quiet(p.settings,now()));
  delete from public.hilo_push_jobs where due_at<now()-interval '30 days';
  delete from public.hilo_push_test_usage where day<current_date-7;
  delete from public.hilo_ai_usage where day<current_date-30;
  return n;
end $$;

create function public.hilo_claim_reminders() returns setof public.hilo_push_jobs language sql security definer set search_path='' as $$
  with chosen as (
    select id from public.hilo_push_jobs
    where ((state='pending' and next_attempt<=now()) or (state='sending' and leased_until<now()))
      and due_at between now()-interval '10 minutes' and now() and attempts<3
    order by due_at limit 20 for update skip locked
  ) update public.hilo_push_jobs j set state='sending',attempts=attempts+1,leased_until=now()+interval '3 minutes'
    from chosen c where j.id=c.id returning j.*;
$$;

create function public.hilo_allow_push_test(user_id uuid) returns boolean language plpgsql security definer set search_path='' as $$
declare n int; begin
  insert into public.hilo_push_test_usage(owner,day,count) values(user_id,current_date,1)
    on conflict(owner,day) do update set count=public.hilo_push_test_usage.count+1 where public.hilo_push_test_usage.count<20 returning count into n;
  return n is not null;
end $$;

revoke all on function public.hilo_push_config(),public.hilo_initialize_push(jsonb),public.hilo_queue_reminders(),public.hilo_claim_reminders(),public.hilo_allow_push_test(uuid),public.hilo_is_quiet(jsonb,timestamptz) from public,anon,authenticated;
grant execute on function public.hilo_push_config(),public.hilo_initialize_push(jsonb),public.hilo_queue_reminders(),public.hilo_claim_reminders(),public.hilo_allow_push_test(uuid),public.hilo_is_quiet(jsonb,timestamptz) to service_role;

-- Activated only after the project URL and the deployed Edge Function are verified.
create function public.hilo_enable_schedule(project_url text) returns bigint language plpgsql security definer set search_path='' as $$
declare secret_id uuid; job_id bigint; begin
  if project_url !~ '^https://[a-z0-9]+\.supabase\.co$' then raise exception 'Invalid Supabase URL'; end if;
  select id into secret_id from vault.secrets where name='hilo_project_url';
  if secret_id is null then perform vault.create_secret(project_url,'hilo_project_url');
  else perform vault.update_secret(secret_id,project_url);end if;
  select cron.schedule('hilo-reminders','* * * * *',$job$
    select net.http_post(
      url:=(select decrypted_secret from vault.decrypted_secrets where name='hilo_project_url')||'/functions/v1/hilo-push',
      headers:=jsonb_build_object('Content-Type','application/json','Authorization','Bearer '||(select decrypted_secret from vault.decrypted_secrets where name='hilo_cron_secret')),
      body:='{}'::jsonb,timeout_milliseconds:=120000);
  $job$) into job_id;
  return job_id;
end $$;
revoke all on function public.hilo_enable_schedule(text) from public,anon,authenticated,service_role;
