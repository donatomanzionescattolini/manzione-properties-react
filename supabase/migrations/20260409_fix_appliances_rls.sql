-- Fix appliances RLS policy: the previous migration referenced public.users
-- (which does not exist in the public schema) instead of public.profiles.

DROP POLICY IF EXISTS "admin_all_appliances" ON public.appliances;
DROP POLICY IF EXISTS "tenant_read_appliances" ON public.appliances;

-- Admins can do everything
CREATE POLICY "admin_all_appliances" ON public.appliances
  FOR ALL
  USING (public.is_admin());

-- Tenants can read appliances that belong to their property
CREATE POLICY "tenant_read_appliances" ON public.appliances
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.profiles p
      JOIN public.tenants t ON t.id = p.tenant_id
      WHERE p.id = auth.uid()
        AND t.property_id = appliances.property_id
    )
  );
