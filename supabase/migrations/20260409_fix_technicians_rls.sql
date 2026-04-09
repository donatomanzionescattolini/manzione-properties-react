-- Fix technicians RLS policy: the previous migration referenced public.users
-- (which does not exist in the public schema) instead of using public.is_admin().

DROP POLICY IF EXISTS "admin_all_technicians" ON public.technicians;

CREATE POLICY "admin_all_technicians" ON public.technicians
  FOR ALL
  USING (public.is_admin());
