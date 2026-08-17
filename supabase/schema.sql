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

-- Allow public read of profile metadata (name, avatar_url, etc)
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

-- Helper RPC function to get invite details with inviter info (Bypasses RLS safely)
create or replace function public.get_invite_details(p_invite_code text)
returns json as $$
declare
  result json;
begin
  select json_build_object(
    'id', pi.id,
    'invite_code', pi.invite_code,
    'spreadsheet_id', pi.spreadsheet_id,
    'spreadsheet_name', pi.spreadsheet_name,
    'status', pi.status,
    'inviter', json_build_object(
      'id', p.id,
      'name', coalesce(p.name, 'Pasanganmu'),
      'email', p.email,
      'avatar_url', p.avatar_url
    )
  ) into result
  from public.partner_invites pi
  left join public.profiles p on p.id = pi.inviter_id
  where pi.invite_code = p_invite_code
    and pi.status = 'active';

  return result;
end;
$$ language plpgsql security definer;

grant execute on function public.get_invite_details(text) to anon, authenticated;

-- 6. Trigger: Automatically Create Profile on User Signup
create or replace function public.handle_new_user()
returns trigger as $$
declare
  generated_code text;
begin
  -- Generate a random 6-character unique invite code like 'FIN-8921'
  generated_code := 'FIN-' || upper(substr(md5(random()::text), 1, 4));

  insert into public.profiles (id, email, name, avatar_url, invite_code, onboarding_completed)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
    new.raw_user_meta_data->>'avatar_url',
    generated_code,
    false
  );
  return new;
end;
$$ language plpgsql security definer;

-- Drop trigger if already exists and recreate
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
