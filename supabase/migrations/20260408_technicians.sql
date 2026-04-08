-- Technicians table
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

create policy "admin_all_technicians" on public.technicians
  for all
  using (
    exists (
      select 1 from public.users
      where users.id = auth.uid() and users.role = 'admin'
    )
  );

-- Add technician_id to maintenance_requests
alter table public.maintenance_requests
  add column if not exists technician_id uuid references public.technicians(id) on delete set null;
