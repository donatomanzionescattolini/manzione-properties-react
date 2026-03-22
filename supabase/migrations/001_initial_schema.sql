-- ============================================================
-- Manzione Properties – Initial Database Schema
-- Run this in the Supabase SQL Editor for your project.
-- All tables use Row-Level Security (RLS) so that tenants
-- can only read their own data and admins have full access.
-- ============================================================

-- Enable UUID extension
create extension if not exists "pgcrypto";

-- ============================================================
-- ENUMS
-- ============================================================
create type user_role           as enum ('admin', 'tenant');
create type property_status     as enum ('active', 'inactive', 'vacant');
create type tenant_status       as enum ('active', 'inactive', 'evicted');
create type payment_method      as enum ('check', 'ach', 'stripe', 'cash', 'online');
create type payment_status      as enum ('completed', 'pending', 'failed', 'refunded');
create type late_fee_status     as enum ('active', 'paid', 'waived');
create type late_fee_type       as enum ('percentage', 'fixed');
create type maintenance_priority as enum ('low', 'medium', 'high', 'emergency');
create type maintenance_status  as enum ('pending', 'assigned', 'in-progress', 'completed', 'cancelled');
create type maintenance_category as enum ('plumbing', 'electrical', 'hvac', 'appliance', 'structural', 'general', 'other');
create type vendor_category     as enum ('plumber', 'electrician', 'hvac', 'painter', 'contractor', 'landscaper', 'cleaning', 'locksmith', 'other');
create type vendor_status       as enum ('active', 'inactive');
create type owner_status        as enum ('active', 'inactive');
create type expense_category    as enum ('repairs', 'utilities', 'property-tax', 'hoa', 'legal', 'management', 'commission', 'insurance', 'other');
create type escrow_type         as enum ('deposit', 'withdrawal', 'interest');
create type document_type       as enum ('lease', 'receipt', 'maintenance-report', 'communication', 'tax', 'other');

-- ============================================================
-- PROFILES (extends Supabase auth.users)
-- ============================================================
create table profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  email       text not null,
  name        text not null,
  role        user_role not null default 'tenant',
  tenant_id   uuid,  -- FK added after tenants table is created
  created_at  timestamptz not null default now(),
  updated_at  timestamptz
);

-- ============================================================
-- OWNERS
-- ============================================================
create table owners (
  id             uuid primary key default gen_random_uuid(),
  name           text not null,
  email          text not null,
  phone          text not null,
  company_name   text,
  address        text,
  city           text,
  state          text,
  zip            text,
  tax_id         text,
  portal_enabled boolean not null default false,
  status         owner_status not null default 'active',
  notes          text,
  created_at     timestamptz not null default now()
);

-- ============================================================
-- PROPERTIES
-- ============================================================
create table properties (
  id                  uuid primary key default gen_random_uuid(),
  address             text not null,
  city                text not null,
  state               text not null,
  zip                 text not null,
  unit_count          integer not null default 1,
  rent_amount         numeric(10,2) not null,
  rent_due_day        integer not null default 1 check (rent_due_day between 1 and 28),
  late_fee_type       late_fee_type not null default 'fixed',
  late_fee_amount     numeric(10,2) not null default 0,
  grace_period_days   integer not null default 5,
  owner_id            uuid references owners(id) on delete set null,
  status              property_status not null default 'active',
  created_at          timestamptz not null default now(),
  updated_at          timestamptz
);

-- ============================================================
-- TENANTS
-- ============================================================
create table tenants (
  id                uuid primary key default gen_random_uuid(),
  first_name        text not null,
  last_name         text not null,
  email             text not null,
  phone             text not null,
  property_id       uuid not null references properties(id) on delete restrict,
  lease_start_date  date not null,
  lease_end_date    date not null,
  rent_amount       numeric(10,2) not null,
  security_deposit  numeric(10,2) not null default 0,
  status            tenant_status not null default 'active',
  notes             text,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz
);

-- Now we can add the FK from profiles to tenants
alter table profiles
  add constraint profiles_tenant_id_fkey
  foreign key (tenant_id) references tenants(id) on delete set null;

-- ============================================================
-- PAYMENTS
-- ============================================================
create table payments (
  id          uuid primary key default gen_random_uuid(),
  tenant_id   uuid not null references tenants(id) on delete restrict,
  property_id uuid not null references properties(id) on delete restrict,
  amount      numeric(10,2) not null,
  date        date not null,
  method      payment_method not null,
  reference   text,
  notes       text,
  status      payment_status not null default 'pending',
  stripe_payment_intent_id text,  -- set when method = 'stripe'
  created_at  timestamptz not null default now()
);

-- ============================================================
-- LATE FEES
-- ============================================================
create table late_fees (
  id            uuid primary key default gen_random_uuid(),
  tenant_id     uuid not null references tenants(id) on delete restrict,
  property_id   uuid not null references properties(id) on delete restrict,
  amount        numeric(10,2) not null,
  reason        text not null,
  status        late_fee_status not null default 'active',
  due_date      timestamptz not null,
  waiver_reason text,
  waived_by     text,
  waived_at     timestamptz,
  created_at    timestamptz not null default now()
);

-- ============================================================
-- VENDORS
-- ============================================================
create table vendors (
  id             uuid primary key default gen_random_uuid(),
  name           text not null,
  email          text not null,
  phone          text not null,
  category       vendor_category not null,
  address        text,
  city           text,
  state          text,
  zip            text,
  ein            text,
  license_number text,
  status         vendor_status not null default 'active',
  notes          text,
  created_at     timestamptz not null default now()
);

-- ============================================================
-- MAINTENANCE REQUESTS
-- ============================================================
create table maintenance_requests (
  id              uuid primary key default gen_random_uuid(),
  tenant_id       uuid not null references tenants(id) on delete restrict,
  property_id     uuid not null references properties(id) on delete restrict,
  title           text not null,
  description     text not null,
  priority        maintenance_priority not null default 'medium',
  category        maintenance_category not null default 'general',
  status          maintenance_status not null default 'pending',
  photos          text[] not null default '{}',
  vendor_id       uuid references vendors(id) on delete set null,
  submitted_date  date not null default current_date,
  assigned_date   date,
  completed_date  date,
  estimated_cost  numeric(10,2),
  actual_cost     numeric(10,2),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz
);

create table maintenance_notes (
  id          uuid primary key default gen_random_uuid(),
  request_id  uuid not null references maintenance_requests(id) on delete cascade,
  text        text not null,
  author      text not null,
  created_at  timestamptz not null default now()
);

-- ============================================================
-- EXPENSES
-- ============================================================
create table expenses (
  id          uuid primary key default gen_random_uuid(),
  property_id uuid not null references properties(id) on delete restrict,
  vendor_id   uuid references vendors(id) on delete set null,
  category    expense_category not null,
  amount      numeric(10,2) not null,
  description text not null,
  date        date not null,
  receipt_url text,
  created_at  timestamptz not null default now()
);

-- ============================================================
-- ESCROW TRANSACTIONS
-- ============================================================
create table escrow_transactions (
  id          uuid primary key default gen_random_uuid(),
  tenant_id   uuid not null references tenants(id) on delete restrict,
  property_id uuid not null references properties(id) on delete restrict,
  type        escrow_type not null,
  amount      numeric(10,2) not null,
  description text not null,
  reference   text,
  approved_by text not null,
  created_at  timestamptz not null default now()
);

-- ============================================================
-- DOCUMENTS (metadata only – files stored in Supabase Storage)
-- ============================================================
create table documents (
  id          uuid primary key default gen_random_uuid(),
  property_id uuid references properties(id) on delete set null,
  tenant_id   uuid references tenants(id) on delete set null,
  type        document_type not null,
  name        text not null,
  storage_path text not null,  -- path in Supabase Storage bucket 'documents'
  size        integer not null,
  mime_type   text not null,
  description text,
  uploaded_by text not null,
  created_at  timestamptz not null default now()
);

-- ============================================================
-- INDEXES
-- ============================================================
create index idx_properties_status     on properties(status);
create index idx_tenants_property_id   on tenants(property_id);
create index idx_tenants_status        on tenants(status);
create index idx_payments_tenant_id    on payments(tenant_id);
create index idx_payments_property_id  on payments(property_id);
create index idx_payments_date         on payments(date);
create index idx_late_fees_tenant_id   on late_fees(tenant_id);
create index idx_maintenance_property  on maintenance_requests(property_id);
create index idx_maintenance_tenant    on maintenance_requests(tenant_id);
create index idx_maintenance_status    on maintenance_requests(status);
create index idx_documents_property    on documents(property_id);
create index idx_documents_tenant      on documents(tenant_id);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================
alter table profiles              enable row level security;
alter table owners                enable row level security;
alter table properties            enable row level security;
alter table tenants               enable row level security;
alter table payments              enable row level security;
alter table late_fees             enable row level security;
alter table vendors               enable row level security;
alter table maintenance_requests  enable row level security;
alter table maintenance_notes     enable row level security;
alter table expenses              enable row level security;
alter table escrow_transactions   enable row level security;
alter table documents             enable row level security;

-- Helper: is the current user an admin?
create or replace function is_admin()
returns boolean
language sql security definer
as $$
  select exists (
    select 1 from profiles
    where id = auth.uid() and role = 'admin'
  );
$$;

-- Helper: get the tenant_id for the current user (null if admin)
create or replace function my_tenant_id()
returns uuid
language sql security definer
as $$
  select tenant_id from profiles where id = auth.uid();
$$;

-- Profiles: users can read/update their own profile; admins can read all
create policy "profiles: own read"   on profiles for select using (id = auth.uid() or is_admin());
create policy "profiles: own update" on profiles for update using (id = auth.uid()) with check (id = auth.uid());

-- Admins have full access to all operational tables
create policy "admin full access: owners"       on owners               for all using (is_admin());
create policy "admin full access: properties"   on properties           for all using (is_admin());
create policy "admin full access: tenants"      on tenants              for all using (is_admin());
create policy "admin full access: payments"     on payments             for all using (is_admin());
create policy "admin full access: late_fees"    on late_fees            for all using (is_admin());
create policy "admin full access: vendors"      on vendors              for all using (is_admin());
create policy "admin full access: maintenance"  on maintenance_requests for all using (is_admin());
create policy "admin full access: maint_notes"  on maintenance_notes    for all using (is_admin());
create policy "admin full access: expenses"     on expenses             for all using (is_admin());
create policy "admin full access: escrow"       on escrow_transactions  for all using (is_admin());
create policy "admin full access: documents"    on documents            for all using (is_admin());

-- Tenants can only see their own data
create policy "tenant: read own payments"
  on payments for select
  using (tenant_id = my_tenant_id());

create policy "tenant: insert own payment"
  on payments for insert
  with check (tenant_id = my_tenant_id());

create policy "tenant: read own late_fees"
  on late_fees for select
  using (tenant_id = my_tenant_id());

create policy "tenant: read own maintenance"
  on maintenance_requests for select
  using (tenant_id = my_tenant_id());

create policy "tenant: insert own maintenance"
  on maintenance_requests for insert
  with check (tenant_id = my_tenant_id());

create policy "tenant: read own maint_notes"
  on maintenance_notes for select
  using (
    exists (
      select 1 from maintenance_requests mr
      where mr.id = request_id and mr.tenant_id = my_tenant_id()
    )
  );

create policy "tenant: read own documents"
  on documents for select
  using (tenant_id = my_tenant_id());

create policy "tenant: read own tenant row"
  on tenants for select
  using (id = my_tenant_id());

create policy "tenant: read own property"
  on properties for select
  using (
    id = (select property_id from tenants where id = my_tenant_id())
  );

-- ============================================================
-- STORAGE BUCKET for documents (run after creating the bucket
-- named 'documents' in the Supabase Dashboard → Storage)
-- ============================================================
-- insert into storage.buckets (id, name, public) values ('documents', 'documents', false);

-- Storage RLS example policies (uncomment and adapt as needed):
-- create policy "documents: admin upload"
--   on storage.objects for insert to authenticated
--   using (bucket_id = 'documents' and is_admin());

-- create policy "documents: admin read"
--   on storage.objects for select to authenticated
--   using (bucket_id = 'documents' and is_admin());

-- create policy "documents: tenant read own"
--   on storage.objects for select to authenticated
--   using (
--     bucket_id = 'documents' and
--     (storage.foldername(name))[1] = my_tenant_id()::text
--   );

-- ============================================================
-- TRIGGER: auto-create profile on new auth user sign-up
-- ============================================================
create or replace function handle_new_user()
returns trigger
language plpgsql security definer
as $$
begin
  insert into profiles (id, email, name, role)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
    coalesce((new.raw_user_meta_data->>'role')::user_role, 'tenant')
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure handle_new_user();
