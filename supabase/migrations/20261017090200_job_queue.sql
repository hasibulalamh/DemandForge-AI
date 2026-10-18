-- Durable, database-backed job queue.
-- Uses FOR UPDATE SKIP LOCKED so multiple workers (Vercel cron invocations) can
-- claim work concurrently without double processing. Functions are `security
-- definer` and executable only by service_role.

create or replace function public.claim_jobs(
  p_worker_id text,
  p_limit integer default 5,
  p_job_types text[] default null,
  p_lock_seconds integer default 300
)
returns setof public.jobs
language plpgsql
security definer
set search_path = public
as $$
begin
  return query
  with candidates as (
    select j.id
    from public.jobs j
    where j.status = 'queued'
      and j.scheduled_at <= now()
      and (p_job_types is null or j.job_type = any (p_job_types))
    order by j.scheduled_at asc
    limit greatest(1, least(coalesce(p_limit, 5), 25))
    for update skip locked
  )
  update public.jobs j
  set status = 'running',
      locked_by = p_worker_id,
      locked_at = now(),
      started_at = coalesce(j.started_at, now()),
      attempt_count = j.attempt_count + 1,
      updated_at = now()
  from candidates c
  where j.id = c.id
  returning j.*;
end;
$$;

revoke all on function public.claim_jobs(text, integer, text[], integer) from public, anon, authenticated;
grant execute on function public.claim_jobs(text, integer, text[], integer) to service_role;

-- Reset jobs whose worker lock expired. Jobs that have exhausted their attempt
-- budget are failed instead of being retried forever.
create or replace function public.recover_stale_jobs(p_lock_seconds integer default 300)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count integer;
begin
  update public.jobs
  set status = case when attempt_count >= max_attempts then 'failed'::public.job_status else 'queued'::public.job_status end,
      completed_at = case when attempt_count >= max_attempts then now() else null end,
      last_error = coalesce(last_error, 'Worker lock expired before the job finished'),
      scheduled_at = case when attempt_count >= max_attempts then scheduled_at else now() end,
      locked_by = null,
      locked_at = null,
      updated_at = now()
  where status = 'running'
    and locked_at is not null
    and locked_at < now() - make_interval(secs => greatest(coalesce(p_lock_seconds, 300), 30));

  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

revoke all on function public.recover_stale_jobs(integer) from public, anon, authenticated;
grant execute on function public.recover_stale_jobs(integer) to service_role;
