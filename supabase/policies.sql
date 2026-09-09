-- Enable Row Level Security on all tables
alter table profiles enable row level security;
alter table attendance enable row level security;
alter table leave_requests enable row level security;
alter table leave_balances enable row level security;
alter table salary_structures enable row level security;
alter table payroll_runs enable row level security;
alter table payslips enable row level security;
alter table documents enable row level security;
alter table employee_documents enable row level security;
alter table holidays enable row level security;
alter table notifications enable row level security;

-- Helper function to check if the caller has a specific role
create or replace function public.has_role(p_role text)
returns boolean as $$
begin
  return exists (
    select 1 from public.profiles
    where id = auth.uid() and role = p_role and status = 'active'
  );
end;
$$ language plpgsql security definer set search_path = public;

-- Helper function to check if the caller has any of the listed roles
create or replace function public.has_any_role(p_roles text[])
returns boolean as $$
begin
  return exists (
    select 1 from public.profiles
    where id = auth.uid() and role = any(p_roles) and status = 'active'
  );
end;
$$ language plpgsql security definer set search_path = public;


-- ==========================================
-- PROFILES POLICIES
-- ==========================================

drop policy if exists "Enable select for authenticated users" on profiles;
create policy "Enable select for authenticated users"
    on profiles for select
    to authenticated
    using (true);

drop policy if exists "Enable insert for super_admin, admin, and hr" on profiles;
create policy "Enable insert for super_admin, admin, and hr"
    on profiles for insert
    to authenticated
    with check (public.has_any_role(array['super_admin', 'admin', 'hr']));

drop policy if exists "Enable update for admin/hr and self" on profiles;
create policy "Enable update for admin/hr and self"
    on profiles for update
    to authenticated
    using (
        auth.uid() = id or 
        public.has_any_role(array['super_admin', 'admin', 'hr'])
    );

drop policy if exists "Enable delete for super_admin" on profiles;
create policy "Enable delete for super_admin"
    on profiles for delete
    to authenticated
    using (public.has_role('super_admin'));


-- ==========================================
-- ATTENDANCE POLICIES
-- ==========================================

create policy "Enable select for self, managers, rm, and HR"
    on attendance for select
    to authenticated
    using (
        auth.uid() = employee_id or 
        public.has_any_role(array['super_admin', 'hr']) or
        employee_id in (select id from public.profiles where reporting_manager_id = auth.uid())
    );

create policy "Enable insert/upsert for self and HR"
    on attendance for insert
    to authenticated
    with check (
        auth.uid() = employee_id or 
        public.has_any_role(array['super_admin', 'hr'])
    );

-- Only Super Admin and HR can amend/edit attendance
create policy "Enable update for HR and super_admin"
    on attendance for update
    to authenticated
    using (
        public.has_any_role(array['super_admin', 'hr'])
    );

create policy "Enable delete for HR and super_admin"
    on attendance for delete
    to authenticated
    using (public.has_any_role(array['super_admin', 'hr']));


-- ==========================================
-- LEAVE REQUESTS POLICIES
-- ==========================================

create policy "Enable select for self, managers, rm, and HR"
    on leave_requests for select
    to authenticated
    using (
        auth.uid() = employee_id or 
        public.has_any_role(array['super_admin', 'hr']) or
        employee_id in (select id from public.profiles where reporting_manager_id = auth.uid())
    );

create policy "Enable insert for self"
    on leave_requests for insert
    to authenticated
    with check (auth.uid() = employee_id);

create policy "Enable update for self (pending) or reviewer"
    on leave_requests for update
    to authenticated
    using (
        (auth.uid() = employee_id and status = 'pending') or 
        public.has_any_role(array['super_admin', 'hr']) or
        employee_id in (select id from public.profiles where reporting_manager_id = auth.uid())
    );

create policy "Enable delete for self (pending)"
    on leave_requests for delete
    to authenticated
    using (auth.uid() = employee_id and status = 'pending');


-- ==========================================
-- LEAVE BALANCES POLICIES
-- ==========================================

create policy "Enable select for self and HR"
    on leave_balances for select
    to authenticated
    using (
        auth.uid() = employee_id or 
        public.has_any_role(array['super_admin', 'hr'])
    );

create policy "Enable all for HR and super_admin"
    on leave_balances for all
    to authenticated
    using (public.has_any_role(array['super_admin', 'hr']));


-- ==========================================
-- SALARY STRUCTURES POLICIES
-- ==========================================

create policy "Enable select for self and payroll admins"
    on salary_structures for select
    to authenticated
    using (
        auth.uid() = employee_id or 
        public.has_any_role(array['super_admin', 'accounts'])
    );

create policy "Enable all for payroll admins"
    on salary_structures for all
    to authenticated
    using (public.has_any_role(array['super_admin', 'accounts']));


-- ==========================================
-- PAYROLL RUNS POLICIES
-- ==========================================

create policy "Enable select for payroll admins"
    on payroll_runs for select
    to authenticated
    using (public.has_any_role(array['super_admin', 'accounts']));

create policy "Enable all for payroll admins"
    on payroll_runs for all
    to authenticated
    using (public.has_any_role(array['super_admin', 'accounts']));


-- ==========================================
-- PAYSLIPS POLICIES
-- ==========================================

create policy "Enable select for self and payroll admins"
    on payslips for select
    to authenticated
    using (
        auth.uid() = employee_id or 
        public.has_any_role(array['super_admin', 'accounts'])
    );

create policy "Enable all for payroll admins"
    on payslips for all
    to authenticated
    using (public.has_any_role(array['super_admin', 'accounts']));


-- ==========================================
-- DOCUMENTS POLICIES
-- ==========================================

create policy "Enable select for authenticated users"
    on documents for select
    to authenticated
    using (true);

create policy "Enable all for admins and HR"
    on documents for all
    to authenticated
    using (public.has_any_role(array['super_admin', 'admin', 'hr']));


-- ==========================================
-- EMPLOYEE DOCUMENTS POLICIES
-- ==========================================

create policy "Enable select for self, admin, and HR"
    on employee_documents for select
    to authenticated
    using (
        auth.uid() = employee_id or 
        public.has_any_role(array['super_admin', 'admin', 'hr'])
    );

create policy "Enable all for self, admin, and HR"
    on employee_documents for all
    to authenticated
    using (
        auth.uid() = employee_id or 
        public.has_any_role(array['super_admin', 'admin', 'hr'])
    );


-- ==========================================
-- HOLIDAYS POLICIES
-- ==========================================

create policy "Enable select for authenticated users"
    on holidays for select
    to authenticated
    using (true);

create policy "Enable all for HR and super_admin"
    on holidays for all
    to authenticated
    using (public.has_any_role(array['super_admin', 'hr']));


-- ==========================================
-- NOTIFICATIONS POLICIES
-- ==========================================

create policy "Enable select and update for self"
    on notifications for select
    to authenticated
    using (auth.uid() = user_id);

create policy "Enable update for self"
    on notifications for update
    to authenticated
    using (auth.uid() = user_id);

create policy "Enable insert for authenticated users (for trigger/system notifications)"
    on notifications for insert
    to authenticated
    with check (true);
