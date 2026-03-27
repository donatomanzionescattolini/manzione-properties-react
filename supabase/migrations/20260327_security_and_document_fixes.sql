-- Manzione Properties: security and document-access fixes

-- Ensure helper exists and avoids profile RLS recursion
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

-- Profiles policies
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins can manage profiles" ON public.profiles;

create policy "Admins can view all profiles" on public.profiles
  for select using (public.is_admin());

create policy "Admins can manage profiles" on public.profiles
  for all using (public.is_admin());

-- Documents table tenant visibility: allow own docs and property-level docs
DROP POLICY IF EXISTS "Tenants can view own documents" ON public.documents;

create policy "Tenants can view own documents" on public.documents
  for select using (
    exists (
      select 1
      from public.profiles p
      join public.tenants t on t.id = p.tenant_id
      where p.id = auth.uid()
        and (
          public.documents.tenant_id = p.tenant_id
          or public.documents.property_id = t.property_id
        )
    )
  );

-- Storage-object visibility: admins can read all; tenants can read only their own/property files
DROP POLICY IF EXISTS "Users can view documents" ON storage.objects;

create policy "Users can view documents" on storage.objects
  for select using (
    bucket_id = 'documents'
    and (
      public.is_admin()
      or exists (
        select 1
        from public.profiles p
        join public.tenants t on t.id = p.tenant_id
        where p.id = auth.uid()
          and (
            (
              (storage.foldername(name))[1] = 'maintenance'
              and (storage.foldername(name))[2] = t.id::text
            )
            or (storage.foldername(name))[1] = coalesce(t.property_id::text, '')
            or (storage.foldername(name))[2] = t.id::text
          )
      )
    )
  );

