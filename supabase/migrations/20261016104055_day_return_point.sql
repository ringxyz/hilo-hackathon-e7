-- Keep the existing focus. Otherwise leave a paused, concrete return point after saving a day.
create function public.hilo_capture_day(request_id uuid,items jsonb) returns void language plpgsql security invoker set search_path='' as $$
declare chosen public.hilo_activities;begin
 perform hilo_private.require_trial_access();
 perform 1 from public.hilo_profiles where id=(select auth.uid()) for update;
 if exists(select 1 from public.hilo_captures c where c.owner=(select auth.uid()) and c.id=request_id) then return;end if;
 perform public.hilo_capture(request_id,items);
 select a.* into chosen from jsonb_array_elements(items) with ordinality input(value,position)
 join public.hilo_activities a on a.id=(input.value->>'id')::uuid and a.owner=(select auth.uid())
 where a.payload->>'status'='pending'
 order by case when a.payload->>'kind'='task' then 0 else 1 end,input.position limit 1;
 if found then
  insert into public.hilo_sessions(owner,payload) values(auth.uid(),jsonb_build_object('activityId',chosen.id,'status','paused','startedAt',null,'elapsed',0,'note','','duration',coalesce((chosen.payload->>'duration')::int,20)*60)) on conflict(owner) do nothing;
 end if;
end;$$;
revoke all on function public.hilo_capture_day(uuid,jsonb) from public,anon;
grant execute on function public.hilo_capture_day(uuid,jsonb) to authenticated;
