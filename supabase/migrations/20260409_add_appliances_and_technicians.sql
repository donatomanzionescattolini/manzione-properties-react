-- ============================================================
-- Combined migration: appliances + technicians tables
-- Run this in the Supabase SQL Editor if the appliances and
-- technicians pages show 404 errors (tables missing).
-- ============================================================

-- Ensure the is_admin() helper exists (idempotent)
create or replace function public.is_admin()
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  );
$$;

-- ── Appliances ──────────────────────────────────────────────
create table if not exists public.appliances (
  id              uuid primary key default gen_random_uuid(),
  property_id     uuid references public.properties(id) on delete set null,
  name            text not null,
  category        text not null default 'other',
  brand           text not null default '',
  model           text,
  serial_number   text,
  purchase_date   date,
  warranty_expiry date,
  status          text not null default 'working',
  notes           text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz
);

alter table public.appliances enable row level security;

drop policy if exists "admin_all_appliances" on public.appliances;
drop policy if exists "tenant_read_appliances" on public.appliances;

create policy "admin_all_appliances" on public.appliances
  for all
  using (public.is_admin());

create policy "tenant_read_appliances" on public.appliances
  for select
  using (
    exists (
      select 1
      from public.profiles p
      join public.tenants t on t.id = p.tenant_id
      where p.id = auth.uid()
        and t.property_id = appliances.property_id
    )
  );

-- ── Technicians ─────────────────────────────────────────────
create table if not exists public.technicians (
  id               uuid primary key default gen_random_uuid(),
  first_name       text not null,
  last_name        text not null,
  email            text not null,
  phone            text not null,
  specialty        text not null default 'general',
  company          text,
  license_number   text,
  insurance_info   text,
  hourly_rate      numeric(10,2),
  address          text,
  city             text,
  state            text,
  zip              text,
  status           text not null default 'active',
  notes            text,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz
);

alter table public.technicians enable row level security;

drop policy if exists "admin_all_technicians" on public.technicians;

create policy "admin_all_technicians" on public.technicians
  for all
  using (public.is_admin());

-- Link technicians to maintenance requests
alter table public.maintenance_requests
  add column if not exists technician_id uuid references public.technicians(id) on delete set null;
