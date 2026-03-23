-- ============================================================
-- Manzione Properties - Complete Database Schema
-- Run this in your Supabase SQL editor to set up the database
-- ============================================================

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- ============================================================
-- PROFILES (extends auth.users)
-- ============================================================
create table if not exists public.profiles (
  id uuid references auth.users on delete cascade primary key,
  name text not null,
  role text not null check (role in ('admin', 'tenant')),
  tenant_id uuid,
  created_at timestamptz default now() not null
);

alter table public.profiles enable row level security;

create policy "Users can view own profile" on public.profiles
  for select using (auth.uid() = id);

create policy "Admins can view all profiles" on public.profiles
  for select using (
    exists (select 1 from public.profiles p2 where p2.id = auth.uid() and p2.role = 'admin')
  );

create policy "Admins can manage profiles" on public.profiles
  for all using (
    exists (select 1 from public.profiles p2 where p2.id = auth.uid() and p2.role = 'admin')
  );

-- Trigger: auto-create profile on signup (admin invite flow)
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, name, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
    coalesce(new.raw_user_meta_data->>'role', 'tenant')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

create or replace trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ============================================================
-- PROPERTIES
-- ============================================================
create table if not exists public.properties (
  id uuid default uuid_generate_v4() primary key,
  address text not null,
  city text not null,
  state text not null,
  zip text not null,
  unit_count int not null default 1,
  rent_amount numeric(10,2) not null,
  rent_due_day int not null default 1,
  late_fee_type text not null check (late_fee_type in ('fixed', 'percentage')),
  late_fee_amount numeric(10,2) not null default 0,
  grace_period_days int not null default 5,
  owner_id uuid,
  status text not null default 'active' check (status in ('active', 'inactive', 'vacant')),
  created_at timestamptz default now() not null,
  updated_at timestamptz
);

alter table public.properties enable row level security;

create policy "Admins can manage properties" on public.properties
  for all using (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

create policy "Tenants can view their property" on public.properties
  for select using (
    exists (
      select 1 from public.tenants t
      join public.profiles p on p.tenant_id = t.id
      where p.id = auth.uid() and t.property_id = public.properties.id
    )
  );

-- ============================================================
-- TENANTS
-- ============================================================
create table if not exists public.tenants (
  id uuid default uuid_generate_v4() primary key,
  first_name text not null,
  last_name text not null,
  email text not null,
  phone text not null default '',
  property_id uuid references public.properties(id) on delete set null,
  lease_start_date date not null,
  lease_end_date date not null,
  rent_amount numeric(10,2) not null,
  security_deposit numeric(10,2) not null default 0,
  status text not null default 'active' check (status in ('active', 'inactive', 'evicted')),
  notes text,
  created_at timestamptz default now() not null,
  updated_at timestamptz
);

alter table public.tenants enable row level security;

create policy "Admins can manage tenants" on public.tenants
  for all using (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

create policy "Tenants can view own record" on public.tenants
  for select using (
    exists (select 1 from public.profiles where id = auth.uid() and tenant_id = public.tenants.id)
  );

-- ============================================================
-- PAYMENTS
-- ============================================================
create table if not exists public.payments (
  id uuid default uuid_generate_v4() primary key,
  tenant_id uuid references public.tenants(id) not null,
  property_id uuid references public.properties(id) not null,
  amount numeric(10,2) not null,
  date date not null,
  method text not null check (method in ('check', 'ach', 'stripe', 'cash', 'online')),
  reference text,
  notes text,
  status text not null default 'pending' check (status in ('completed', 'pending', 'failed', 'refunded')),
  stripe_payment_intent_id text,
  created_at timestamptz default now() not null
);

alter table public.payments enable row level security;

create policy "Admins can manage payments" on public.payments
  for all using (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

create policy "Tenants can view own payments" on public.payments
  for select using (
    exists (select 1 from public.profiles where id = auth.uid() and tenant_id = public.payments.tenant_id)
  );

create policy "Tenants can submit payments" on public.payments
  for insert with check (
    exists (select 1 from public.profiles where id = auth.uid() and tenant_id = public.payments.tenant_id)
  );

-- ============================================================
-- LATE FEES
-- ============================================================
create table if not exists public.late_fees (
  id uuid default uuid_generate_v4() primary key,
  tenant_id uuid references public.tenants(id) not null,
  property_id uuid references public.properties(id) not null,
  amount numeric(10,2) not null,
  reason text not null,
  status text not null default 'active' check (status in ('active', 'paid', 'waived')),
  due_date date not null,
  waiver_reason text,
  waived_by text,
  waived_at timestamptz,
  created_at timestamptz default now() not null
);

alter table public.late_fees enable row level security;

create policy "Admins can manage late fees" on public.late_fees
  for all using (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

create policy "Tenants can view own late fees" on public.late_fees
  for select using (
    exists (select 1 from public.profiles where id = auth.uid() and tenant_id = public.late_fees.tenant_id)
  );

-- ============================================================
-- MAINTENANCE REQUESTS
-- ============================================================
create table if not exists public.maintenance_requests (
  id uuid default uuid_generate_v4() primary key,
  tenant_id uuid references public.tenants(id) not null,
  property_id uuid references public.properties(id) not null,
  title text not null,
  description text not null,
  priority text not null check (priority in ('low', 'medium', 'high', 'emergency')),
  category text not null check (category in ('plumbing', 'electrical', 'hvac', 'appliance', 'structural', 'general', 'other')),
  status text not null default 'pending' check (status in ('pending', 'assigned', 'in-progress', 'completed', 'cancelled')),
  photos text[] default '{}',
  vendor_id uuid,
  submitted_date date not null,
  assigned_date date,
  completed_date date,
  estimated_cost numeric(10,2),
  actual_cost numeric(10,2),
  created_at timestamptz default now() not null,
  updated_at timestamptz
);

alter table public.maintenance_requests enable row level security;

create policy "Admins can manage maintenance" on public.maintenance_requests
  for all using (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

create policy "Tenants can view own requests" on public.maintenance_requests
  for select using (
    exists (select 1 from public.profiles where id = auth.uid() and tenant_id = public.maintenance_requests.tenant_id)
  );

create policy "Tenants can submit maintenance requests" on public.maintenance_requests
  for insert with check (
    exists (select 1 from public.profiles where id = auth.uid() and tenant_id = public.maintenance_requests.tenant_id)
  );

-- ============================================================
-- MAINTENANCE NOTES
-- ============================================================
create table if not exists public.maintenance_notes (
  id uuid default uuid_generate_v4() primary key,
  request_id uuid references public.maintenance_requests(id) on delete cascade not null,
  text text not null,
  author text not null,
  created_at timestamptz default now() not null
);

alter table public.maintenance_notes enable row level security;

create policy "Admins can manage maintenance notes" on public.maintenance_notes
  for all using (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

create policy "Tenants can view notes on their requests" on public.maintenance_notes
  for select using (
    exists (
      select 1 from public.maintenance_requests mr
      join public.profiles p on p.tenant_id = mr.tenant_id
      where p.id = auth.uid() and mr.id = public.maintenance_notes.request_id
    )
  );

-- ============================================================
-- VENDORS
-- ============================================================
create table if not exists public.vendors (
  id uuid default uuid_generate_v4() primary key,
  name text not null,
  email text not null default '',
  phone text not null default '',
  category text not null,
  address text,
  city text,
  state text,
  zip text,
  ein text,
  license_number text,
  status text not null default 'active' check (status in ('active', 'inactive')),
  notes text,
  created_at timestamptz default now() not null
);

alter table public.vendors enable row level security;

create policy "Admins can manage vendors" on public.vendors
  for all using (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

-- ============================================================
-- OWNERS
-- ============================================================
create table if not exists public.owners (
  id uuid default uuid_generate_v4() primary key,
  name text not null,
  email text not null default '',
  phone text not null default '',
  company_name text,
  address text,
  city text,
  state text,
  zip text,
  tax_id text,
  properties uuid[] default '{}',
  portal_enabled boolean default false not null,
  status text not null default 'active' check (status in ('active', 'inactive')),
  notes text,
  created_at timestamptz default now() not null
);

alter table public.owners enable row level security;

create policy "Admins can manage owners" on public.owners
  for all using (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

-- ============================================================
-- EXPENSES
-- ============================================================
create table if not exists public.expenses (
  id uuid default uuid_generate_v4() primary key,
  property_id uuid references public.properties(id) not null,
  vendor_id uuid references public.vendors(id) on delete set null,
  category text not null,
  amount numeric(10,2) not null,
  description text not null,
  date date not null,
  receipt_url text,
  created_at timestamptz default now() not null
);

alter table public.expenses enable row level security;

create policy "Admins can manage expenses" on public.expenses
  for all using (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

-- ============================================================
-- ESCROW TRANSACTIONS
-- ============================================================
create table if not exists public.escrow_transactions (
  id uuid default uuid_generate_v4() primary key,
  tenant_id uuid references public.tenants(id) not null,
  property_id uuid references public.properties(id) not null,
  type text not null check (type in ('deposit', 'withdrawal', 'interest')),
  amount numeric(10,2) not null,
  description text not null,
  reference text,
  approved_by text not null,
  created_at timestamptz default now() not null
);

alter table public.escrow_transactions enable row level security;

create policy "Admins can manage escrow" on public.escrow_transactions
  for all using (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

-- ============================================================
-- DOCUMENTS
-- ============================================================
create table if not exists public.documents (
  id uuid default uuid_generate_v4() primary key,
  property_id uuid references public.properties(id) on delete set null,
  tenant_id uuid references public.tenants(id) on delete set null,
  type text not null check (type in ('lease', 'receipt', 'maintenance-report', 'communication', 'tax', 'other')),
  name text not null,
  url text not null,
  size bigint not null default 0,
  mime_type text not null default 'application/octet-stream',
  description text,
  uploaded_by text not null,
  created_at timestamptz default now() not null
);

alter table public.documents enable row level security;

create policy "Admins can manage documents" on public.documents
  for all using (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

create policy "Tenants can view own documents" on public.documents
  for select using (
    exists (select 1 from public.profiles where id = auth.uid() and tenant_id = public.documents.tenant_id)
  );

-- ============================================================
-- STORAGE BUCKET FOR DOCUMENTS
-- ============================================================
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'documents',
  'documents',
  false,
  52428800,  -- 50MB limit
  array['application/pdf', 'image/jpeg', 'image/png', 'image/webp', 'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet']
)
on conflict (id) do nothing;

create policy "Authenticated users can upload documents" on storage.objects
  for insert with check (bucket_id = 'documents' and auth.role() = 'authenticated');

create policy "Users can view documents" on storage.objects
  for select using (bucket_id = 'documents' and auth.role() = 'authenticated');

create policy "Admins can delete documents" on storage.objects
  for delete using (
    bucket_id = 'documents'
    and exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );
