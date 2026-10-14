-- Hilo: each account owns its records. No API service key is shipped to the browser.
create table public.hilo_profiles (id uuid primary key references auth.users(id) on delete cascade, settings jsonb not null default '{}', created_at timestamptz not null default now());
create table public.hilo_activities (id uuid primary key, owner uuid not null references auth.users(id) on delete cascade, payload jsonb not null, revision integer not null default 1, updated_at timestamptz not null default now());
create table public.hilo_sessions (owner uuid primary key references auth.users(id) on delete cascade, payload jsonb not null);
create table public.hilo_captures (id uuid not null, owner uuid not null references auth.users(id) on delete cascade, created_at timestamptz not null default now(), primary key(owner,id));
create table public.hilo_integrations (owner uuid primary key references auth.users(id) on delete cascade, encrypted text not null);
create table public.hilo_study_days (id uuid primary key, owner uuid not null references auth.users(id) on delete cascade, payload jsonb not null, created_at timestamptz not null default now());
create table public.hilo_exams (id uuid primary key, owner uuid not null references auth.users(id) on delete cascade, payload jsonb not null);
create table public.hilo_push_subscriptions (id uuid primary key default gen_random_uuid(), owner uuid not null references auth.users(id) on delete cascade, endpoint text not null unique, subscription jsonb not null, created_at timestamptz not null default now());
create table public.hilo_push_jobs (id uuid primary key default gen_random_uuid(), owner uuid not null references auth.users(id) on delete cascade, activity_id uuid not null references public.hilo_activities(id) on delete cascade, occurrence date not null, revision integer not null, due_at timestamptz not null, state text not null default 'pending', attempts integer not null default 0, leased_until timestamptz, next_attempt timestamptz not null default now(), unique(activity_id,occurrence,revision));
create table public.hilo_public_config (id boolean primary key default true check(id), push_public_key text);
create table public.hilo_ai_usage (owner uuid not null references auth.users(id) on delete cascade, day date not null, count integer not null default 0, primary key(owner,day));

do $$ declare t text; begin
  foreach t in array array['hilo_activities','hilo_sessions','hilo_captures','hilo_integrations','hilo_study_days','hilo_exams','hilo_push_subscriptions'] loop
    execute format('alter table public.%I enable row level security',t);
    execute format('create policy owned_records on public.%I for all to authenticated using ((select auth.uid()) = owner) with check ((select auth.uid()) = owner)',t);
    execute format('create index %I on public.%I(owner)',t || '_owner_idx',t);
  end loop;
end $$;
alter table public.hilo_profiles enable row level security;
create policy own_profile on public.hilo_profiles for all to authenticated using ((select auth.uid()) = id) with check ((select auth.uid()) = id);
alter table public.hilo_push_jobs enable row level security;
alter table public.hilo_ai_usage enable row level security;
alter table public.hilo_public_config enable row level security;
create policy public_config on public.hilo_public_config for select to anon,authenticated using (true);

create function public.hilo_capture(request_id uuid, items jsonb) returns void language plpgsql security invoker set search_path = '' as $$
declare a jsonb; begin
  if auth.uid() is null or jsonb_array_length(items) not between 1 and 12 then raise exception 'Invalid capture'; end if;
  insert into public.hilo_captures(id,owner) values(request_id,auth.uid()) on conflict do nothing;
  if not found then return; end if;
  for a in select value from jsonb_array_elements(items) loop
    insert into public.hilo_activities(id,owner,payload) values((a->>'id')::uuid,auth.uid(),a);
  end loop;
end $$;

-- Session and completion changes are committed in the same transaction.
create function public.hilo_save_activity(activity_id uuid, expected_revision int, value jsonb, clear_session boolean default false) returns boolean language plpgsql security invoker set search_path = '' as $$
begin
  update public.hilo_activities set payload=value, revision=revision+1, updated_at=now() where id=activity_id and owner=auth.uid() and revision=expected_revision;
  if not found then return false; end if;
  if clear_session then delete from public.hilo_sessions where owner=auth.uid() and payload->>'activityId'=activity_id::text; end if;
  return true;
end $$;

create function public.hilo_delete_own_data() returns void language plpgsql security invoker set search_path = '' as $$
begin
  delete from public.hilo_sessions where owner=auth.uid();
  delete from public.hilo_captures where owner=auth.uid();
  delete from public.hilo_activities where owner=auth.uid();
  delete from public.hilo_integrations where owner=auth.uid();
  delete from public.hilo_study_days where owner=auth.uid();
  delete from public.hilo_exams where owner=auth.uid();
  delete from public.hilo_push_subscriptions where owner=auth.uid();
  delete from public.hilo_profiles where id=auth.uid();
end $$;

-- Basic server-enforced daily cap prevents accidental runaway AI spend.
create function public.hilo_take_ai_credit() returns boolean language plpgsql security definer set search_path = '' as $$
declare n int; begin
  if auth.uid() is null then return false; end if;
  insert into public.hilo_ai_usage(owner,day,count) values(auth.uid(),current_date,1)
    on conflict(owner,day) do update set count=public.hilo_ai_usage.count+1 where public.hilo_ai_usage.count<30 returning count into n;
  return n is not null;
end $$;
revoke all on function public.hilo_capture(uuid,jsonb), public.hilo_save_activity(uuid,int,jsonb,boolean), public.hilo_delete_own_data(), public.hilo_take_ai_credit() from public,anon;
grant execute on function public.hilo_capture(uuid,jsonb), public.hilo_save_activity(uuid,int,jsonb,boolean), public.hilo_delete_own_data(), public.hilo_take_ai_credit() to authenticated;

-- The project disables automatic exposure; grant only the tables this app uses.
grant usage on schema public to anon,authenticated,service_role;
grant select,insert,update,delete on public.hilo_profiles,public.hilo_activities,public.hilo_sessions,public.hilo_captures,public.hilo_integrations,public.hilo_study_days,public.hilo_exams,public.hilo_push_subscriptions to authenticated;
grant select on public.hilo_public_config to anon,authenticated;
grant all on public.hilo_profiles,public.hilo_activities,public.hilo_sessions,public.hilo_captures,public.hilo_integrations,public.hilo_study_days,public.hilo_exams,public.hilo_push_subscriptions,public.hilo_push_jobs,public.hilo_public_config,public.hilo_ai_usage to service_role;
