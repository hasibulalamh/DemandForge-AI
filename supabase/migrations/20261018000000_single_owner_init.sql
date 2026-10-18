-- DemandForge AI - single-owner initialization guard
-- Single-user, multi-device deployment: public sign-up is open only until the
-- first confirmed owner account exists. Afterwards it is disabled at the app
-- layer, at the Supabase project auth setting, and via this persistent guard.

create table if not exists public.app_settings (
  id uuid primary key default gen_random_uuid(),
  key text not null unique,
  value jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.app_settings enable row level security;
revoke all on table public.app_settings from anon, authenticated;
grant all on table public.app_settings to service_role;

create table if not exists public.owner_setup_claims (
  user_id uuid primary key references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);

alter table public.owner_setup_claims enable row level security;
revoke all on table public.owner_setup_claims from anon, authenticated;
grant all on table public.owner_setup_claims to service_role;

create or replace function public.set_app_setting(p_key text, p_value jsonb)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.app_settings (key, value, updated_at)
  values (p_key, p_value, now())
  on conflict (key) do update
    set value = excluded.value,
        updated_at = now();
end;
$$;

revoke all on function public.set_app_setting(text, jsonb) from public, anon, authenticated;
grant execute on function public.set_app_setting(text, jsonb) to service_role;

create or replace function public.get_app_setting(p_key text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  return coalesce(
    (select value from public.app_settings where key = p_key),
    '{}'::jsonb
  );
end;
$$;

revoke all on function public.get_app_setting(text) from public;
grant execute on function public.get_app_setting(text) to anon, authenticated, service_role;

create or replace function public.is_workspace_initialized()
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.app_settings
    where key = 'initialized' and value = 'true'::jsonb
  );
$$;

revoke all on function public.is_workspace_initialized() from public;
grant execute on function public.is_workspace_initialized() to anon, authenticated, service_role;

create or replace function public.claim_initial_owner(p_user_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  claimed boolean := false;
begin
  perform pg_advisory_xact_lock(hashtextextended('demandforge-owner-init', 0));

  if public.is_workspace_initialized()
     or exists (select 1 from public.profiles where role = 'owner') then
    return false;
  end if;

  if not exists (
    select 1
    from auth.users
    where id = p_user_id and email_confirmed_at is not null
  ) then
    return false;
  end if;

  if not exists (select 1 from public.owner_setup_claims where user_id = p_user_id) then
    return false;
  end if;

  update public.profiles
  set role = 'owner', updated_at = now()
  where id = p_user_id and role = 'member';

  if found then
    insert into public.app_settings (key, value, updated_at)
    values ('initialized', 'true'::jsonb, now())
    on conflict (key) do update
      set value = 'true'::jsonb, updated_at = now();
    delete from public.owner_setup_claims where user_id = p_user_id;
    claimed := true;
  end if;

  return claimed;
end;
$$;

revoke all on function public.claim_initial_owner(uuid) from public, anon, authenticated;
grant execute on function public.claim_initial_owner(uuid) to service_role;

create or replace function public.register_owner_setup_claim(p_user_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  perform pg_advisory_xact_lock(hashtextextended('demandforge-owner-init', 0));
  if public.is_workspace_initialized()
     or exists (select 1 from public.profiles where role = 'owner') then
    return false;
  end if;

  if not exists (select 1 from auth.users where id = p_user_id) then
    return false;
  end if;

  insert into public.owner_setup_claims (user_id)
  values (p_user_id)
  on conflict (user_id) do nothing;
  return true;
end;
$$;

revoke all on function public.register_owner_setup_claim(uuid) from public, anon, authenticated;
grant execute on function public.register_owner_setup_claim(uuid) to service_role;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if public.is_workspace_initialized() then
    raise exception 'DemandForge owner account is already initialized';
  end if;

  insert into public.profiles (id, display_name, role)
  values (
    new.id,
    coalesce(nullif(new.raw_user_meta_data ->> 'display_name', ''), split_part(coalesce(new.email, 'user'), '@', 1)),
    'member'::public.user_role
  )
  on conflict (id) do nothing;
  return new;
end;
$$;
grant execute on function public.get_app_setting(text) to service_role;
