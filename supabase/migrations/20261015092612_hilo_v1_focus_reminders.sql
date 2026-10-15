-- Additive V1: preserve demo content, IDs, sessions and study records.
alter table public.hilo_push_jobs drop constraint hilo_push_once;
alter table public.hilo_push_jobs add column kind text not null default 'appointment' check(kind in ('appointment','departure'));
alter table public.hilo_push_jobs add column acknowledged boolean not null default false;
alter table public.hilo_push_jobs add column snoozed boolean not null default false;
alter table public.hilo_push_jobs add constraint hilo_push_once unique(activity_id,occurrence,kind);
create table public.hilo_reminder_actions(owner uuid not null references auth.users(id) on delete cascade,request_id uuid not null,created_at timestamptz not null default now(),primary key(owner,request_id));
alter table public.hilo_reminder_actions enable row level security;
grant all on public.hilo_reminder_actions to service_role;

-- Freeze legacy times in their original zone without changing any user content.
update public.hilo_activities a set payload=a.payload||jsonb_build_object(
  'timezone',coalesce(p.settings->>'timezone','Europe/Madrid'),
  'startsAt',case when a.payload->>'date' is not null and a.payload->>'time' is not null then ((a.payload->>'date')::date+(a.payload->>'time')::time) at time zone coalesce(p.settings->>'timezone','Europe/Madrid') else null end,
  'travelMinutes',case when a.payload->>'kind'='event' then 30 else 0 end)
from public.hilo_profiles p where p.id=a.owner and not a.payload ? 'timezone';

-- One transaction owns the focus session and its return note. Never edit Google content.
create function public.hilo_focus(action text,activity_id uuid default null,note text default '') returns void language plpgsql security definer set search_path='' as $$
declare uid uuid:=auth.uid(); a public.hilo_activities; s jsonb; stamp bigint:=floor(extract(epoch from clock_timestamp())*1000); elapsed integer; begin
 if uid is null or action not in ('start','pause','clear') or length(note)>2000 then raise exception 'Invalid focus action'; end if;
 perform 1 from public.hilo_profiles where id=uid for update;
 select payload into s from public.hilo_sessions where owner=uid;
 if action='clear' then delete from public.hilo_sessions where owner=uid;return;end if;
 if action='pause' then
  if s is null then raise exception 'No active session';end if;
  elapsed:=coalesce((s->>'elapsed')::int,0)+case when s->>'status'='running' then greatest(0,floor((stamp-(s->>'startedAt')::bigint)/1000))::int else 0 end;
  update public.hilo_sessions set payload=s||jsonb_build_object('status','paused','startedAt',null,'elapsed',elapsed,'note',note) where owner=uid;
  update public.hilo_activities set payload=payload||jsonb_build_object('returnNote',note),updated_at=now() where owner=uid and id=(s->>'activityId')::uuid;
  return;
 end if;
 select * into a from public.hilo_activities where id=activity_id and owner=uid for update;
 if not found or a.payload->>'status'='done' then raise exception 'Activity unavailable'; end if;
 if s->>'status'='running' and s->>'activityId'<>activity_id::text then raise exception 'Pause current activity first';end if;
 if s->>'activityId'=activity_id::text then
  s:=s||jsonb_build_object('status','running','startedAt',case when s->>'status'='running' then (s->>'startedAt')::bigint else stamp end);
 else s:=jsonb_build_object('activityId',activity_id,'status','running','startedAt',stamp,'elapsed',0,'note',coalesce(a.payload->>'returnNote',a.payload->>'note',''),'duration',(a.payload->>'duration')::int*60);end if;
 insert into public.hilo_sessions(owner,payload) values(uid,s) on conflict(owner) do update set payload=excluded.payload;
end $$;

create function public.hilo_occurs(a jsonb,d date) returns boolean language sql immutable set search_path='' as $$
 select a->>'date' is not null and d>=(a->>'date')::date and case coalesce(a->>'recurrence','none')
 when 'none' then d=(a->>'date')::date when 'daily' then true
 when 'weekly' then extract(isodow from d)=extract(isodow from (a->>'date')::date)
 when 'annual' then to_char(d,'MM-DD')=substring(a->>'date',6,5) else false end;
$$;

create or replace function public.hilo_queue_reminders() returns integer language plpgsql security definer set search_path='' as $$
declare r record; d date; due timestamptz; tz text; n int:=0; k text; begin
 for r in select a.*,p.settings from public.hilo_activities a join public.hilo_profiles p on p.id=a.owner
  where a.payload->>'reminder'='true' and a.payload->>'status'='pending' and a.payload->>'date' is not null and a.payload->>'time' is not null loop
  begin
   tz:=coalesce(r.payload->>'timezone',r.settings->>'timezone','Europe/Madrid');
   -- Tomorrow is needed when travel starts before midnight.
   for d in select (now() at time zone tz)::date+i from generate_series(-1,1) i loop
    if not public.hilo_occurs(r.payload,d) or coalesce(r.payload->'completedDates','[]'::jsonb) ? d::text then continue;end if;
    foreach k in array array['appointment','departure'] loop
     if k='departure' and (r.payload->>'kind'<>'event' or coalesce((r.payload->>'travelMinutes')::int,30)=0) then continue;end if;
     due:=(d+(r.payload->>'time')::time) at time zone tz;
     if k='departure' then due:=due-make_interval(mins=>coalesce((r.payload->>'travelMinutes')::int,30));end if;
     if due>now() or due<now()-interval '1 day' then continue;end if;
     insert into public.hilo_push_jobs(owner,activity_id,occurrence,revision,due_at,kind,state)
      values(r.owner,r.id,d,r.revision,due,k,case when public.hilo_is_quiet(r.settings,due) or due<now()-interval '10 minutes' then 'missed' else 'pending' end)
      on conflict(activity_id,occurrence,kind) do nothing;
     n:=n+1;
    end loop;
   end loop;
  exception when invalid_text_representation or invalid_parameter_value or datetime_field_overflow then continue;end;
 end loop;
 -- Delivery expiry leaves an in-app reminder until explicitly handled.
 update public.hilo_push_jobs j set state='missed',leased_until=null from public.hilo_activities a,public.hilo_profiles p
 where j.activity_id=a.id and p.id=j.owner and j.state in ('pending','sending') and
 (j.due_at<now()-interval '10 minutes' or a.revision<>j.revision or a.payload->>'reminder'<>'true' or a.payload->>'status'<>'pending'
 or coalesce(a.payload->'completedDates','[]'::jsonb) ? j.occurrence::text or public.hilo_is_quiet(p.settings,now()));
 delete from public.hilo_push_jobs where acknowledged and due_at<now()-interval '30 days';
 delete from public.hilo_push_test_usage where day<current_date-7;
 delete from public.hilo_ai_usage where day<current_date-30;
 return n;
end $$;

create function public.hilo_own_reminders() returns jsonb language sql stable security definer set search_path='' as $$
 select coalesce(jsonb_agg(jsonb_build_object('id',j.id,'activity_id',j.activity_id,'occurrence',j.occurrence,'kind',j.kind,'due_at',j.due_at,'state',j.state,'acknowledged',j.acknowledged,'snoozed',j.snoozed) order by j.due_at),'[]'::jsonb)
 from public.hilo_push_jobs j join public.hilo_activities a on a.id=j.activity_id
 where j.owner=auth.uid() and not j.acknowledged and a.payload->>'status'='pending' and a.payload->>'reminder'='true'
 and not coalesce(a.payload->'completedDates','[]'::jsonb) ? j.occurrence::text;
$$;

create function public.hilo_reminder_action(request_id uuid,activity_id uuid,occurrence date,kind text,action text) returns void language plpgsql security definer set search_path='' as $$
declare uid uuid:=auth.uid();a public.hilo_activities;tz text;due timestamptz;k text;begin
 if uid is null or request_id is null or kind not in ('appointment','departure') or action not in ('10m','1h','tomorrow','start') then raise exception 'Invalid reminder action';end if;
 perform 1 from public.hilo_profiles where id=uid for update;
 select * into a from public.hilo_activities where id=activity_id and owner=uid for update;
 if not found or not public.hilo_occurs(a.payload,occurrence) or a.payload->>'status'<>'pending' or coalesce(a.payload->'completedDates','[]'::jsonb) ? occurrence::text then raise exception 'Activity unavailable';end if;
 insert into public.hilo_reminder_actions(owner,request_id) values(uid,request_id) on conflict do nothing;
 if not found then return;end if;
 tz:=coalesce(a.payload->>'timezone','Europe/Madrid');
 if action='start' then
  perform public.hilo_focus('start',activity_id);
  -- Tombstones prevent cron from recreating an upcoming reminder for this occurrence.
  foreach k in array array['appointment','departure'] loop
   insert into public.hilo_push_jobs(owner,activity_id,occurrence,revision,due_at,kind,state,acknowledged)
   values(uid,activity_id,occurrence,a.revision,now(),k,'handled',true)
   on conflict on constraint hilo_push_once do update set state='handled',acknowledged=true,leased_until=null;
  end loop;
 else
  if a.payload->>'reminder'<>'true' or a.payload->>'time' is null then raise exception 'Enable a timed reminder first';end if;
  due:=case action when '10m' then now()+interval '10 minutes' when '1h' then now()+interval '1 hour'
    else ((now() at time zone tz)+interval '1 day') at time zone tz end;
  insert into public.hilo_push_jobs(owner,activity_id,occurrence,revision,due_at,kind,state,snoozed,next_attempt)
  values(uid,activity_id,occurrence,a.revision,due,kind,'pending',true,due)
  on conflict on constraint hilo_push_once do update set due_at=excluded.due_at,next_attempt=excluded.next_attempt,revision=excluded.revision,state='pending',snoozed=true,acknowledged=false,attempts=0,leased_until=null;
 end if;
end $$;

revoke all on function public.hilo_focus(text,uuid,text),public.hilo_occurs(jsonb,date),public.hilo_own_reminders(),public.hilo_reminder_action(uuid,uuid,date,text,text) from public,anon,authenticated;
grant execute on function public.hilo_focus(text,uuid,text),public.hilo_own_reminders(),public.hilo_reminder_action(uuid,uuid,date,text,text) to authenticated;
grant execute on function public.hilo_occurs(jsonb,date) to service_role;
comment on table public.hilo_reminder_actions is 'Service-only idempotency receipts; auth.uid() scoped actions through validated RPC.';
