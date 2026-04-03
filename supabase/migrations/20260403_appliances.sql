-- Appliances / Electrodomesticos table
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

-- Admins can do everything
create policy "admin_all_appliances" on public.appliances
  for all
  using (
    exists (
      select 1 from public.users
      where users.id = auth.uid() and users.role = 'admin'
    )
  );

-- Tenants can read appliances that belong to their property
create policy "tenant_read_appliances" on public.appliances
  for select
  using (
    exists (
      select 1 from public.tenants
      where tenants.id = auth.uid()
        and tenants.property_id = appliances.property_id
    )
  );

