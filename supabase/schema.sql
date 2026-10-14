-- Run once in Supabase → SQL Editor → New query → Run
-- Project: balconia (kqmagzfkwgujwgwrzbel)

create extension if not exists "pgcrypto";

-- Profiles (1:1 with auth.users)
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text,
  full_name text,
  created_at timestamptz not null default now()
);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name)
  values (new.id, new.email, coalesce(new.raw_user_meta_data->>'full_name', ''))
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Balcony designs + AI images
create table if not exists public.balcony_designs (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users (id) on delete cascade,
  request_id text not null,
  created_at timestamptz not null default now(),
  answers jsonb not null default '{}'::jsonb,
  plan jsonb not null default '{}'::jsonb,
  original_path text,
  original_mime text,
  output_path text,
  status text not null default 'ready'
    check (status in ('ready','generating','complete','failed')),
  leonardo_generation_id text,
  last_error text,
  unique (owner_id, request_id)
);

create index if not exists balcony_designs_owner_created_idx
  on public.balcony_designs (owner_id, created_at desc);

-- Orders
create table if not exists public.orders (
  id text primary key,
  request_id text not null unique,
  owner_id uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  status text not null default 'pending_confirmation',
  payment_method text not null default 'cod',
  customer jsonb not null,
  items jsonb not null,
  design_id uuid references public.balcony_designs (id) on delete set null,
  fulfilment_type text not null default 'diy',
  subtotal_paise integer not null,
  shipping_status text not null default 'to_be_confirmed',
  email_sent_at timestamptz
);

create index if not exists orders_created_idx on public.orders (created_at desc);

-- Makeover consultations
create table if not exists public.makeover_consultations (
  id text primary key,
  request_id text not null unique,
  owner_id uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  customer jsonb not null,
  coverage jsonb,
  status text not null default 'pending_coverage_review'
);

-- Storage bucket for balcony photos + AI renders (private)
insert into storage.buckets (id, name, public)
values ('balcony-designs', 'balcony-designs', false)
on conflict (id) do nothing;

-- RLS
alter table public.profiles enable row level security;
alter table public.balcony_designs enable row level security;
alter table public.orders enable row level security;
alter table public.makeover_consultations enable row level security;

drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own" on public.profiles
  for select using (auth.uid() = id);

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own" on public.profiles
  for update using (auth.uid() = id);

drop policy if exists "designs_select_own" on public.balcony_designs;
create policy "designs_select_own" on public.balcony_designs
  for select using (auth.uid() = owner_id);

drop policy if exists "designs_insert_own" on public.balcony_designs;
create policy "designs_insert_own" on public.balcony_designs
  for insert with check (auth.uid() = owner_id);

drop policy if exists "designs_update_own" on public.balcony_designs;
create policy "designs_update_own" on public.balcony_designs
  for update using (auth.uid() = owner_id);

drop policy if exists "designs_delete_own" on public.balcony_designs;
create policy "designs_delete_own" on public.balcony_designs
  for delete using (auth.uid() = owner_id);

drop policy if exists "orders_select_own" on public.orders;
create policy "orders_select_own" on public.orders
  for select using (auth.uid() = owner_id);

-- Storage: owners can read/write their folder {user_id}/...
drop policy if exists "design_images_read_own" on storage.objects;
create policy "design_images_read_own" on storage.objects
  for select using (
    bucket_id = 'balcony-designs'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

drop policy if exists "design_images_write_own" on storage.objects;
create policy "design_images_write_own" on storage.objects
  for insert with check (
    bucket_id = 'balcony-designs'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

drop policy if exists "design_images_update_own" on storage.objects;
create policy "design_images_update_own" on storage.objects
  for update using (
    bucket_id = 'balcony-designs'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

drop policy if exists "design_images_delete_own" on storage.objects;
create policy "design_images_delete_own" on storage.objects
  for delete using (
    bucket_id = 'balcony-designs'
    and auth.uid()::text = (storage.foldername(name))[1]
  );
