-- DemandForge AI - grants + row level security
-- Every user-owned table is protected. Ownership is always derived from
-- auth.uid(); the application never supplies user_id as an authorization input.

grant usage on schema public to anon, authenticated, service_role;
grant select, insert, update, delete on all tables in schema public to authenticated;
grant all on all tables in schema public to service_role;
grant all on all sequences in schema public to service_role;

alter table public.profiles enable row level security;
alter table public.sources enable row level security;
alter table public.collection_rules enable row level security;
alter table public.leads enable row level security;
alter table public.demo_projects enable row level security;
alter table public.demo_artifacts enable row level security;
alter table public.jobs enable row level security;
alter table public.job_attempts enable row level security;
alter table public.deployments enable row level security;
alter table public.outreach_records enable row level security;
alter table public.ai_usage enable row level security;
alter table public.audit_events enable row level security;
alter table public.api_tokens enable row level security;

-- ---------------------------------------------------------------------------
-- Profiles: a user may only read/update their own profile.
-- ---------------------------------------------------------------------------
create policy "profiles_select_own" on public.profiles
  for select to authenticated
  using (id = (select auth.uid()));

create policy "profiles_insert_own" on public.profiles
  for insert to authenticated
  with check (id = (select auth.uid()));

create policy "profiles_update_own" on public.profiles
  for update to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

-- ---------------------------------------------------------------------------
-- Sources
-- ---------------------------------------------------------------------------
create policy "sources_select_own" on public.sources
  for select to authenticated
  using (user_id = (select auth.uid()));

create policy "sources_insert_own" on public.sources
  for insert to authenticated
  with check (user_id = (select auth.uid()));

create policy "sources_update_own" on public.sources
  for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy "sources_delete_own" on public.sources
  for delete to authenticated
  using (user_id = (select auth.uid()));

-- ---------------------------------------------------------------------------
-- Collection rules
-- ---------------------------------------------------------------------------
create policy "collection_rules_select_own" on public.collection_rules
  for select to authenticated
  using (user_id = (select auth.uid()));

create policy "collection_rules_insert_own" on public.collection_rules
  for insert to authenticated
  with check (user_id = (select auth.uid()));

create policy "collection_rules_update_own" on public.collection_rules
  for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy "collection_rules_delete_own" on public.collection_rules
  for delete to authenticated
  using (user_id = (select auth.uid()));

-- ---------------------------------------------------------------------------
-- Leads
-- ---------------------------------------------------------------------------
create policy "leads_select_own" on public.leads
  for select to authenticated
  using (user_id = (select auth.uid()));

create policy "leads_insert_own" on public.leads
  for insert to authenticated
  with check (user_id = (select auth.uid()));

create policy "leads_update_own" on public.leads
  for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy "leads_delete_own" on public.leads
  for delete to authenticated
  using (user_id = (select auth.uid()));

-- ---------------------------------------------------------------------------
-- Demo projects
-- ---------------------------------------------------------------------------
create policy "demo_projects_select_own" on public.demo_projects
  for select to authenticated
  using (user_id = (select auth.uid()));

create policy "demo_projects_insert_own" on public.demo_projects
  for insert to authenticated
  with check (
    user_id = (select auth.uid())
    and exists (
      select 1 from public.leads l
      where l.id = lead_id and l.user_id = (select auth.uid())
    )
  );

create policy "demo_projects_update_own" on public.demo_projects
  for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy "demo_projects_delete_own" on public.demo_projects
  for delete to authenticated
  using (user_id = (select auth.uid()));

-- ---------------------------------------------------------------------------
-- Demo artifacts: readable when the parent demo is owned. Writes are reserved
-- for the trusted generation worker (service_role bypasses RLS).
-- ---------------------------------------------------------------------------
create policy "demo_artifacts_select_own" on public.demo_artifacts
  for select to authenticated
  using (
    exists (
      select 1 from public.demo_projects d
      where d.id = demo_id and d.user_id = (select auth.uid())
    )
  );

-- ---------------------------------------------------------------------------
-- Jobs: users enqueue and observe their own jobs, but cannot mutate job state.
-- Claim/complete is a service_role-only operation.
-- ---------------------------------------------------------------------------
create policy "jobs_select_own" on public.jobs
  for select to authenticated
  using (user_id = (select auth.uid()));

create policy "jobs_insert_own" on public.jobs
  for insert to authenticated
  with check (user_id = (select auth.uid()));

create policy "job_attempts_select_own" on public.job_attempts
  for select to authenticated
  using (
    exists (
      select 1 from public.jobs j
      where j.id = job_id and j.user_id = (select auth.uid())
    )
  );

-- ---------------------------------------------------------------------------
-- Deployments: readable by owner, written by the deployment worker only.
-- ---------------------------------------------------------------------------
create policy "deployments_select_own" on public.deployments
  for select to authenticated
  using (user_id = (select auth.uid()));

-- ---------------------------------------------------------------------------
-- Outreach
-- ---------------------------------------------------------------------------
create policy "outreach_select_own" on public.outreach_records
  for select to authenticated
  using (user_id = (select auth.uid()));

create policy "outreach_insert_own" on public.outreach_records
  for insert to authenticated
  with check (
    user_id = (select auth.uid())
    and exists (
      select 1 from public.leads l
      where l.id = lead_id and l.user_id = (select auth.uid())
    )
  );

create policy "outreach_update_own" on public.outreach_records
  for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy "outreach_delete_own" on public.outreach_records
  for delete to authenticated
  using (user_id = (select auth.uid()));

-- ---------------------------------------------------------------------------
-- AI usage and audit trail: append-only for owners. Audit rows are written by
-- trusted server code; users can read their own trail.
-- ---------------------------------------------------------------------------
create policy "ai_usage_select_own" on public.ai_usage
  for select to authenticated
  using (user_id = (select auth.uid()));

create policy "audit_events_select_own" on public.audit_events
  for select to authenticated
  using (user_id = (select auth.uid()));

-- ---------------------------------------------------------------------------
-- Extension tokens: users manage their own tokens. The hash is never returned
-- by the application; revocation is an update of revoked_at.
-- ---------------------------------------------------------------------------
create policy "api_tokens_select_own" on public.api_tokens
  for select to authenticated
  using (user_id = (select auth.uid()));

create policy "api_tokens_insert_own" on public.api_tokens
  for insert to authenticated
  with check (user_id = (select auth.uid()));

create policy "api_tokens_update_own" on public.api_tokens
  for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy "api_tokens_delete_own" on public.api_tokens
  for delete to authenticated
  using (user_id = (select auth.uid()));
