-- Migration v4: Fix RLS infinite recursion on profiles table (42P17)

-- 1. Clean up any rogue or recursive policies on profiles
DO $$
DECLARE
    pol RECORD;
BEGIN
    FOR pol IN (SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = 'profiles') LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.profiles', pol.policyname);
    END LOOP;
END $$;

-- 2. Ensure SECURITY DEFINER helpers with search_path=public to avoid recursion
create or replace function public.has_role(p_role text)
returns boolean as $$
begin
  return exists (
    select 1 from public.profiles
    where id = auth.uid() and role = p_role and status = 'active'
  );
end;
$$ language plpgsql security definer set search_path = public;

create or replace function public.has_any_role(p_roles text[])
returns boolean as $$
begin
  return exists (
    select 1 from public.profiles
    where id = auth.uid() and role = any(p_roles) and status = 'active'
  );
end;
$$ language plpgsql security definer set search_path = public;

-- 3. Re-create clean, non-recursive policies on profiles
create policy "Enable select for authenticated users"
    on public.profiles for select
    to authenticated
    using (true);

create policy "Enable insert for super_admin, admin, and hr"
    on public.profiles for insert
    to authenticated
    with check (public.has_any_role(array['super_admin', 'admin', 'hr']));

create policy "Enable update for admin/hr and self"
    on public.profiles for update
    to authenticated
    using (
        auth.uid() = id or 
        public.has_any_role(array['super_admin', 'admin', 'hr'])
    );

create policy "Enable delete for super_admin"
    on public.profiles for delete
    to authenticated
    using (public.has_role('super_admin'));

alter table public.profiles enable row level security;
