-- ==============================================================================
-- FINLOG - SUPABASE DATABASE SCHEMA
-- Execute this script in your Supabase SQL Editor (https://supabase.com/dashboard)
-- ==============================================================================

-- 1. Create Profiles Table (Stores user profile, spreadsheet linking, partner linking, & refresh token)
create table if not exists public.profiles (
  id uuid references auth.users on delete cascade primary key,
  email text not null,
  name text,
  avatar_url text,
  spreadsheet_id text,
  spreadsheet_name text default 'FINLOG',
  partner_id uuid references public.profiles(id) on delete set null,
  invite_code text unique,
  onboarding_completed boolean default false,
  google_refresh_token text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Ensure user cannot be their own partner
alter table public.profiles drop constraint if exists chk_partner_not_self;
alter table public.profiles add constraint chk_partner_not_self check (partner_id is null or partner_id <> id);

-- 2. Create Partner Invites Table
create table if not exists public.partner_invites (
  id uuid default gen_random_uuid() primary key,
  inviter_id uuid references public.profiles(id) on delete cascade not null,
  invite_code text unique not null,
  spreadsheet_id text not null,
  spreadsheet_name text default 'FINLOG',
  status text default 'active', -- 'active', 'accepted', 'expired'
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 3. Enable Row Level Security (RLS)
alter table public.profiles enable row level security;
alter table public.partner_invites enable row level security;

-- 4. RLS Policies for Profiles
drop policy if exists "Allow users to read their own profile and partner profile" on public.profiles;
drop policy if exists "Allow authenticated users to read profiles" on public.profiles;
drop policy if exists "Allow anyone to read profiles" on public.profiles;
drop policy if exists "Allow users to update their own profile" on public.profiles;
drop policy if exists "Allow users to insert their own profile" on public.profiles;
drop policy if exists "Allow users to upsert their own profile" on public.profiles;

-- Allow public read of profile metadata (name, avatar_url, invite_code, etc)
create policy "Allow anyone to read profiles"
  on public.profiles for select
  using (true);

create policy "Allow users to update their own profile"
  on public.profiles for update
  using (auth.uid() = id);

create policy "Allow users to insert their own profile"
  on public.profiles for insert
  with check (auth.uid() = id);

-- 5. RLS Policies for Partner Invites
drop policy if exists "Allow anyone to read invite by invite_code" on public.partner_invites;
create policy "Allow anyone to read invite by invite_code"
  on public.partner_invites for select
  using (true);

create policy "Allow authenticated users to create invites"
  on public.partner_invites for insert
  with check (auth.uid() = inviter_id);

create policy "Allow inviter to update their invites"
  on public.partner_invites for update
  using (auth.uid() = inviter_id);

-- ==============================================================================
-- HELPER RPC FUNCTIONS (SECURITY DEFINER to safely bridge RLS & guarantee creation)
-- ==============================================================================

-- 1. Helper RPC function to get invite details with inviter info (checks partner_invites & profiles fallback)
create or replace function public.get_invite_details(p_invite_code text)
returns json as $$
declare
  result json;
  clean_code text;
begin
  clean_code := upper(trim(p_invite_code));

  -- First, try querying partner_invites table
  select json_build_object(
    'id', pi.id,
    'invite_code', pi.invite_code,
    'spreadsheet_id', pi.spreadsheet_id,
    'spreadsheet_name', coalesce(pi.spreadsheet_name, 'FINLOG'),
    'status', pi.status,
    'inviter', json_build_object(
      'id', p.id,
      'name', coalesce(p.name, 'Pasanganmu'),
      'email', p.email,
      'avatar_url', p.avatar_url
    )
  ) into result
  from public.partner_invites pi
  join public.profiles p on p.id = pi.inviter_id
  where upper(pi.invite_code) = clean_code
    and pi.status = 'active'
    and p.spreadsheet_id is not null;

  if result is not null then
    return result;
  end if;

  -- Fallback: check profiles table directly
  select json_build_object(
    'id', p.id,
    'invite_code', p.invite_code,
    'spreadsheet_id', p.spreadsheet_id,
    'spreadsheet_name', coalesce(p.spreadsheet_name, 'FINLOG'),
    'status', 'active',
    'inviter', json_build_object(
      'id', p.id,
      'name', coalesce(p.name, 'Pasanganmu'),
      'email', p.email,
      'avatar_url', p.avatar_url
    )
  ) into result
  from public.profiles p
  where upper(p.invite_code) = clean_code
    and p.spreadsheet_id is not null
    and p.spreadsheet_id <> '';

  return result;
end;
$$ language plpgsql security definer;

grant execute on function public.get_invite_details(text) to anon, authenticated;

-- 2. Helper RPC function to accept partner invite (Guarantees user profile exists & links both atomically)
create or replace function public.accept_partner_invite(p_invite_code text)
returns json as $$
declare
  current_user_id uuid;
  current_user_email text;
  current_user_meta jsonb;
  inviter record;
  clean_code text;
begin
  current_user_id := auth.uid();
  if current_user_id is null then
    return json_build_object('success', false, 'error', 'Sesi login tidak valid.');
  end if;

  clean_code := upper(trim(p_invite_code));

  -- 1. Find inviter from profiles or partner_invites
  select * into inviter
  from public.profiles
  where upper(invite_code) = clean_code
  limit 1;

  if inviter.id is null then
    select p.* into inviter
    from public.partner_invites pi
    join public.profiles p on p.id = pi.inviter_id
    where upper(pi.invite_code) = clean_code
    limit 1;
  end if;

  if inviter.id is null then
    return json_build_object('success', false, 'error', 'Kode undangan tidak ditemukan.');
  end if;

  -- Prevent self partnering
  if inviter.id = current_user_id then
    return json_build_object('success', false, 'error', 'Tidak dapat menggunakan kode undangan milik sendiri.');
  end if;

  -- Check if inviter already has a different partner
  if inviter.partner_id is not null and inviter.partner_id <> current_user_id then
    return json_build_object('success', false, 'error', 'Pengguna ini sudah terhubung dengan pasangan lain.');
  end if;

  -- Check if inviter has a spreadsheet
  if inviter.spreadsheet_id is null or inviter.spreadsheet_id = '' then
    return json_build_object('success', false, 'error', 'Pasangan belum menyiapkan Google Spreadsheet.');
  end if;

  -- Get current user email and metadata from auth.users
  select email, raw_user_meta_data into current_user_email, current_user_meta
  from auth.users where id = current_user_id;

  -- 2. UPSERT current user (Partner) in profiles table (Never fails even if profile row didn't exist)
  insert into public.profiles (
    id,
    email,
    name,
    avatar_url,
    invite_code,
    partner_id,
    spreadsheet_id,
    spreadsheet_name,
    onboarding_completed,
    updated_at
  ) values (
    current_user_id,
    coalesce(current_user_email, ''),
    coalesce(current_user_meta->>'full_name', current_user_meta->>'name', split_part(current_user_email, '@', 1), 'Pengguna FinLog'),
    current_user_meta->>'avatar_url',
    'FIN-' || upper(substr(md5(random()::text), 1, 4)),
    inviter.id,
    inviter.spreadsheet_id,
    coalesce(inviter.spreadsheet_name, 'FINLOG'),
    true,
    timezone('utc'::text, now())
  )
  on conflict (id) do update set
    partner_id = inviter.id,
    spreadsheet_id = inviter.spreadsheet_id,
    spreadsheet_name = coalesce(inviter.spreadsheet_name, 'FINLOG'),
    onboarding_completed = true,
    updated_at = timezone('utc'::text, now());

  -- 3. Update inviter (Primary Account)
  update public.profiles
  set
    partner_id = current_user_id,
    updated_at = timezone('utc'::text, now())
  where id = inviter.id;

  -- 4. Mark invite record as accepted
  update public.partner_invites
  set status = 'accepted'
  where upper(invite_code) = clean_code;

  return json_build_object(
    'success', true,
    'spreadsheet_id', inviter.spreadsheet_id,
    'spreadsheet_name', coalesce(inviter.spreadsheet_name, 'FINLOG'),
    'inviter_id', inviter.id,
    'inviter_name', coalesce(inviter.name, 'Pasangan')
  );
end;
$$ language plpgsql security definer;

grant execute on function public.accept_partner_invite(text) to authenticated;

-- 3. Helper RPC function to disconnect partner
create or replace function public.disconnect_partner()
returns json as $$
declare
  current_user_id uuid;
  current_prof record;
  other_prof record;
  is_owner boolean;
begin
  current_user_id := auth.uid();
  if current_user_id is null then
    return json_build_object('success', false, 'error', 'Sesi login tidak valid.');
  end if;

  select * into current_prof from public.profiles where id = current_user_id;
  if current_prof.id is null or current_prof.partner_id is null then
    return json_build_object('success', false, 'error', 'Anda belum terhubung dengan pasangan.');
  end if;

  select * into other_prof from public.profiles where id = current_prof.partner_id;

  -- Check ownership: Did current user create the invite / own the sheet?
  select exists(
    select 1 from public.partner_invites
    where inviter_id = current_user_id
  ) into is_owner;

  if not is_owner then
    select exists(
      select 1 from public.partner_invites
      where inviter_id = current_prof.partner_id
    ) into is_owner;
    is_owner := not is_owner;
  end if;

  -- 1. Unlink both users
  if is_owner then
    -- Current user is OWNER: Keep spreadsheet, clear partner_id
    update public.profiles
    set
      partner_id = null,
      updated_at = timezone('utc'::text, now())
    where id = current_user_id;

    -- Other user is PARTNER: Clear spreadsheet, clear partner_id, set onboarding_completed = false
    if other_prof.id is not null then
      update public.profiles
      set
        partner_id = null,
        spreadsheet_id = null,
        onboarding_completed = false,
        updated_at = timezone('utc'::text, now())
      where id = other_prof.id;
    end if;
  else
    -- Current user is PARTNER: Clear spreadsheet, clear partner_id, set onboarding_completed = false
    update public.profiles
    set
      partner_id = null,
      spreadsheet_id = null,
      onboarding_completed = false,
      updated_at = timezone('utc'::text, now())
    where id = current_user_id;

    -- Other user is OWNER: Keep spreadsheet, clear partner_id
    if other_prof.id is not null then
      update public.profiles
      set
        partner_id = null,
        updated_at = timezone('utc'::text, now())
      where id = other_prof.id;
    end if;
  end if;

  -- Re-activate or cleanup partner_invites so owner can invite again
  update public.partner_invites
  set status = 'active'
  where (inviter_id = current_user_id or inviter_id = current_prof.partner_id);

  return json_build_object(
    'success', true,
    'is_owner', is_owner
  );
end;
$$ language plpgsql security definer;

grant execute on function public.disconnect_partner() to authenticated;

-- ==============================================================================
-- TRIGGER: Automatically Create Profile on User Signup
-- ==============================================================================
create or replace function public.handle_new_user()
returns trigger as $$
declare
  generated_code text;
begin
  generated_code := 'FIN-' || upper(substr(md5(random()::text), 1, 4));

  insert into public.profiles (id, email, name, avatar_url, invite_code, onboarding_completed)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
    new.raw_user_meta_data->>'avatar_url',
    generated_code,
    false
  )
  on conflict (id) do update set
    email = excluded.email,
    name = coalesce(excluded.name, public.profiles.name),
    avatar_url = coalesce(excluded.avatar_url, public.profiles.avatar_url);

  return new;
end;
$$ language plpgsql security definer;

-- Drop trigger if already exists and recreate
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
