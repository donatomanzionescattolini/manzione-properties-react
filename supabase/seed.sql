-- ============================================================
-- Manzione Properties - Seed Data
-- Run AFTER schema.sql. Replace placeholder UUIDs with real ones
-- from your Supabase auth.users table after creating admin account.
-- ============================================================

-- STEP 1: Create admin user via Supabase Dashboard → Auth → Users
--   Email: admin@manzione.com
--   Password: (choose a strong password)
--   User metadata: {"name": "Admin", "role": "admin"}
--
-- STEP 2: Get the UUID of that admin user and replace ADMIN_USER_ID below

-- ============================================================
-- SAMPLE PROPERTIES
-- ============================================================
insert into public.properties (id, address, city, state, zip, unit_count, rent_amount, rent_due_day, late_fee_type, late_fee_amount, grace_period_days, status)
values
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567801', '123 Oak Street', 'Philadelphia', 'PA', '19103', 1, 1800.00, 1, 'fixed', 75.00, 5, 'active'),
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567802', '456 Maple Avenue', 'Cherry Hill', 'NJ', '08002', 1, 2200.00, 1, 'percentage', 5.00, 5, 'active'),
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567803', '789 Pine Road', 'Marlton', 'NJ', '08053', 2, 1600.00, 1, 'fixed', 50.00, 3, 'active')
on conflict (id) do nothing;

-- ============================================================
-- SAMPLE TENANTS
-- ============================================================
insert into public.tenants (id, first_name, last_name, email, phone, property_id, lease_start_date, lease_end_date, rent_amount, security_deposit, status)
values
  ('b1c2d3e4-f5a6-7890-bcde-f12345678901', 'John', 'Smith', 'john@example.com', '(215) 555-0101', 'a1b2c3d4-e5f6-7890-abcd-ef1234567801', '2024-01-01', '2026-12-31', 1800.00, 3600.00, 'active'),
  ('b1c2d3e4-f5a6-7890-bcde-f12345678902', 'Sarah', 'Johnson', 'sarah@example.com', '(856) 555-0202', 'a1b2c3d4-e5f6-7890-abcd-ef1234567802', '2024-03-01', '2026-02-28', 2200.00, 4400.00, 'active'),
  ('b1c2d3e4-f5a6-7890-bcde-f12345678903', 'Michael', 'Davis', 'michael@example.com', '(856) 555-0303', 'a1b2c3d4-e5f6-7890-abcd-ef1234567803', '2023-06-01', '2026-05-31', 1600.00, 3200.00, 'active')
on conflict (id) do nothing;

-- ============================================================
-- SAMPLE VENDORS
-- ============================================================
insert into public.vendors (id, name, email, phone, category, city, state, status)
values
  ('c1d2e3f4-a5b6-7890-cdef-123456789001', 'Joe''s Plumbing', 'joe@plumbing.com', '(215) 555-0401', 'plumber', 'Philadelphia', 'PA', 'active'),
  ('c1d2e3f4-a5b6-7890-cdef-123456789002', 'Elite Electric', 'info@eliteelectric.com', '(856) 555-0402', 'electrician', 'Cherry Hill', 'NJ', 'active'),
  ('c1d2e3f4-a5b6-7890-cdef-123456789003', 'Cool Air HVAC', 'service@coolair.com', '(856) 555-0403', 'hvac', 'Marlton', 'NJ', 'active')
on conflict (id) do nothing;

-- ============================================================
-- SAMPLE OWNERS
-- ============================================================
insert into public.owners (id, name, email, phone, company_name, state, properties, portal_enabled, status)
values
  ('d1e2f3a4-b5c6-7890-defa-123456789001', 'Manzione LLC', 'owner@manzione.com', '(215) 555-0501', 'Manzione Properties LLC', 'NJ',
   array['a1b2c3d4-e5f6-7890-abcd-ef1234567801'::uuid, 'a1b2c3d4-e5f6-7890-abcd-ef1234567802'::uuid],
   false, 'active')
on conflict (id) do nothing;

-- ============================================================
-- SAMPLE PAYMENTS
-- ============================================================
insert into public.payments (tenant_id, property_id, amount, date, method, reference, status)
values
  ('b1c2d3e4-f5a6-7890-bcde-f12345678901', 'a1b2c3d4-e5f6-7890-abcd-ef1234567801', 1800.00, '2026-03-01', 'check', '#1234', 'completed'),
  ('b1c2d3e4-f5a6-7890-bcde-f12345678902', 'a1b2c3d4-e5f6-7890-abcd-ef1234567802', 2200.00, '2026-03-01', 'ach', null, 'completed'),
  ('b1c2d3e4-f5a6-7890-bcde-f12345678901', 'a1b2c3d4-e5f6-7890-abcd-ef1234567801', 1800.00, '2026-02-01', 'check', '#1220', 'completed'),
  ('b1c2d3e4-f5a6-7890-bcde-f12345678902', 'a1b2c3d4-e5f6-7890-abcd-ef1234567802', 2200.00, '2026-02-01', 'ach', null, 'completed'),
  ('b1c2d3e4-f5a6-7890-bcde-f12345678903', 'a1b2c3d4-e5f6-7890-abcd-ef1234567803', 1600.00, '2026-02-01', 'cash', null, 'completed'),
  ('b1c2d3e4-f5a6-7890-bcde-f12345678903', 'a1b2c3d4-e5f6-7890-abcd-ef1234567803', 1600.00, '2026-01-01', 'check', null, 'completed');

-- ============================================================
-- SAMPLE LATE FEES
-- ============================================================
insert into public.late_fees (tenant_id, property_id, amount, reason, status, due_date)
values
  ('b1c2d3e4-f5a6-7890-bcde-f12345678903', 'a1b2c3d4-e5f6-7890-abcd-ef1234567803', 50.00, 'Late rent payment - March 2026', 'active', '2026-03-08');

-- ============================================================
-- SAMPLE MAINTENANCE REQUESTS
-- ============================================================
insert into public.maintenance_requests (id, tenant_id, property_id, title, description, priority, category, status, vendor_id, submitted_date, assigned_date)
values
  ('e1f2a3b4-c5d6-7890-efab-123456789001',
   'b1c2d3e4-f5a6-7890-bcde-f12345678901', 'a1b2c3d4-e5f6-7890-abcd-ef1234567801',
   'Leaking Faucet in Kitchen', 'The kitchen faucet has been dripping constantly for 3 days',
   'medium', 'plumbing', 'in-progress',
   'c1d2e3f4-a5b6-7890-cdef-123456789001',
   '2026-03-10', '2026-03-11'),
  ('e1f2a3b4-c5d6-7890-efab-123456789002',
   'b1c2d3e4-f5a6-7890-bcde-f12345678902', 'a1b2c3d4-e5f6-7890-abcd-ef1234567802',
   'HVAC Not Heating Properly', 'The heating system is not working correctly, temperature drops at night',
   'high', 'hvac', 'pending',
   null, '2026-03-12', null)
on conflict (id) do nothing;

insert into public.maintenance_notes (request_id, text, author)
values
  ('e1f2a3b4-c5d6-7890-efab-123456789001', 'Plumber scheduled for Friday', 'Admin');

-- ============================================================
-- SAMPLE ESCROW TRANSACTIONS
-- ============================================================
insert into public.escrow_transactions (tenant_id, property_id, type, amount, description, approved_by)
values
  ('b1c2d3e4-f5a6-7890-bcde-f12345678901', 'a1b2c3d4-e5f6-7890-abcd-ef1234567801', 'deposit', 3600.00, 'Security deposit received', 'Admin'),
  ('b1c2d3e4-f5a6-7890-bcde-f12345678902', 'a1b2c3d4-e5f6-7890-abcd-ef1234567802', 'deposit', 4400.00, 'Security deposit received', 'Admin'),
  ('b1c2d3e4-f5a6-7890-bcde-f12345678903', 'a1b2c3d4-e5f6-7890-abcd-ef1234567803', 'deposit', 3200.00, 'Security deposit received', 'Admin');

-- ============================================================
-- SAMPLE EXPENSES
-- ============================================================
insert into public.expenses (property_id, vendor_id, category, amount, description, date)
values
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567801', 'c1d2e3f4-a5b6-7890-cdef-123456789001', 'repairs', 250.00, 'Kitchen faucet repair', '2026-02-15'),
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567802', null, 'property-tax', 3600.00, 'Q1 property tax payment', '2026-01-15'),
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567801', null, 'management', 180.00, 'Management fee - February', '2026-02-28');
