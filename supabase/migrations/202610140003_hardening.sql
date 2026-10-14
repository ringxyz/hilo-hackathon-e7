-- A Supabase-created event trigger does not need a public RPC execution grant.
revoke all on function public.rls_auto_enable() from public,anon,authenticated;
-- Operational counters are intentionally closed to end users.
comment on table public.hilo_push_jobs is 'Service-only queue. RLS denies all direct client access.';
comment on table public.hilo_ai_usage is 'Service-owned counter. Only hilo_take_ai_credit can increment the caller count.';
comment on table public.hilo_push_test_usage is 'Service-only push test quota.';
