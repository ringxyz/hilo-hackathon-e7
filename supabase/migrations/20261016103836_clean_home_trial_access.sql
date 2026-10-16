-- The list is server-owned and is never bundled in the client or public repository.
create table hilo_private.trial_emails (
 email text primary key check(email=lower(btrim(email))),
 enabled boolean not null default true,
 created_at timestamptz not null default now()
);
alter table hilo_private.trial_emails enable row level security;
revoke all on hilo_private.trial_emails from public,anon,authenticated;
grant select on hilo_private.trial_emails to supabase_auth_admin;
grant usage on schema hilo_private to supabase_auth_admin;
create policy auth_hook_read on hilo_private.trial_emails for select to supabase_auth_admin using(true);

create function hilo_private.trial_access() returns boolean language sql stable security definer set search_path='' as $$
 select auth.uid() is not null and exists(
  select 1 from auth.users u join hilo_private.trial_emails t on t.email=lower(btrim(u.email))
  where u.id=(select auth.uid()) and u.email_confirmed_at is not null and not coalesce(u.is_anonymous,false) and t.enabled
 );
$$;
revoke all on function hilo_private.trial_access() from public,anon;
grant execute on function hilo_private.trial_access() to authenticated;
create function public.hilo_trial_access() returns boolean language sql stable security invoker set search_path='' as $$select hilo_private.trial_access();$$;
revoke all on function public.hilo_trial_access() from public,anon;
grant execute on function public.hilo_trial_access() to authenticated;

create function hilo_private.require_trial_access() returns void language plpgsql security invoker set search_path='' as $$begin
 if not hilo_private.trial_access() then raise exception using errcode='42501',message='Tu correo no está en la lista de prueba de Hilo. Pide acceso para probar.';end if;
end;$$;
revoke all on function hilo_private.require_trial_access() from public,anon;
grant execute on function hilo_private.require_trial_access() to authenticated;

create function public.hilo_before_user_created(event jsonb) returns jsonb language sql stable security invoker set search_path='' as $$
 select case when exists(select 1 from hilo_private.trial_emails t where t.email=lower(btrim(event->'user'->>'email')) and t.enabled)
 then '{}'::jsonb else jsonb_build_object('error',jsonb_build_object('http_code',403,'message','Tu correo no está en la lista de prueba de Hilo. Pide acceso para probar.')) end;
$$;
revoke all on function public.hilo_before_user_created(jsonb) from public,anon,authenticated;
grant execute on function public.hilo_before_user_created(jsonb) to supabase_auth_admin;

-- Classification is shared by the in-app reminder list and push delivery.
create function public.hilo_wants_reminder(settings jsonb,activity jsonb,kind text) returns boolean language sql immutable security invoker set search_path='' as $$
 select case when kind='departure' then coalesce((settings->'reminderPreferences'->>'departure')::boolean,true)
 when activity->>'purpose'='study' then coalesce((settings->'reminderPreferences'->>'study')::boolean,true)
 when activity->>'kind'='task' then coalesce((settings->'reminderPreferences'->>'resume')::boolean,true)
 else true end;
$$;
revoke all on function public.hilo_wants_reminder(jsonb,jsonb,text) from public,anon;
grant execute on function public.hilo_wants_reminder(jsonb,jsonb,text) to authenticated,service_role;
