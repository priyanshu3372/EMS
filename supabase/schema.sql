-- Enable necessary extensions
create extension if not exists pgcrypto;

-- Cleanup existing objects in reverse dependency order
drop table if exists notifications cascade;
drop table if exists holidays cascade;
drop table if exists employee_documents cascade;
drop table if exists documents cascade;
drop table if exists payslips cascade;
drop table if exists payroll_runs cascade;
drop table if exists salary_structures cascade;
drop table if exists leave_balances cascade;
drop table if exists leave_requests cascade;
drop table if exists attendance cascade;
drop table if exists profiles cascade;

-- Profiles table (one-to-one with auth.users)
create table profiles (
    id uuid primary key references auth.users on delete cascade,
    full_name text not null,
    email text unique not null,
    role text not null default 'employee' check (role in ('super_admin', 'admin', 'hr', 'manager', 'rm', 'accounts', 'employee')),
    status text not null default 'active' check (status in ('active', 'inactive')),
    employee_id text unique,
    department text,
    designation text,
    phone text,
    employment_type text default 'Full-time' check (employment_type in ('Full-time', 'Part-time', 'Contract', 'Intern')),
    date_of_joining date,
    ctc numeric default 0,
    pan text,
    bank_name text,
    bank_account text,
    ifsc text,
    reporting_manager_id uuid references profiles(id) on delete set null,
    reporting_manager_name text,
    reporting_manager_designation text,
    created_at timestamptz default now()
);

-- Indexes for performance
create index idx_profiles_role on profiles(role);
create index idx_profiles_status on profiles(status);
create index idx_profiles_department on profiles(department);

-- Attendance table
create table attendance (
    id uuid primary key default gen_random_uuid(),
    employee_id uuid not null references profiles(id) on delete cascade,
    date date not null,
    status text not null check (status in ('present', 'absent', 'late', 'wfh', 'half_day', 'on_leave', 'weekly_off')),
    check_in time,
    check_out time,
    note text,
    created_at timestamptz default now(),
    constraint unique_employee_date unique (employee_id, date)
);

create index idx_attendance_date on attendance(date);
create index idx_attendance_employee_date on attendance(employee_id, date);

-- Leave requests table
create table leave_requests (
    id uuid primary key default gen_random_uuid(),
    employee_id uuid not null references profiles(id) on delete cascade,
    leave_type text not null check (leave_type in ('casual', 'sick', 'earned', 'maternity', 'paternity', 'wfh', 'comp_off')),
    from_date date not null,
    to_date date not null,
    days integer not null check (days > 0),
    reason text,
    status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
    applied_on date not null default current_date,
    reviewed_by uuid references profiles(id) on delete set null,
    reviewed_at timestamptz,
    created_at timestamptz default now(),
    constraint check_leave_dates check (to_date >= from_date)
);

create index idx_leave_requests_employee on leave_requests(employee_id);
create index idx_leave_requests_status on leave_requests(status);

-- Leave balances table
create table leave_balances (
    id uuid primary key default gen_random_uuid(),
    employee_id uuid not null references profiles(id) on delete cascade,
    year integer not null,
    casual integer not null default 12,
    sick integer not null default 12,
    earned integer not null default 18,
    wfh integer not null default 24,
    comp_off integer not null default 5,
    created_at timestamptz default now(),
    constraint unique_employee_year unique (employee_id, year)
);

-- Salary structures table
create table salary_structures (
    id uuid primary key default gen_random_uuid(),
    employee_id uuid not null references profiles(id) on delete cascade unique,
    ctc numeric not null check (ctc >= 0),
    basic numeric not null check (basic >= 0),
    hra numeric not null check (hra >= 0),
    da numeric not null check (da >= 0),
    special_allowance numeric not null check (special_allowance >= 0),
    effective_from date not null,
    created_at timestamptz default now()
);

-- Payroll runs table
create table payroll_runs (
    id uuid primary key default gen_random_uuid(),
    month integer not null check (month between 1 and 12),
    year integer not null,
    status text not null default 'draft' check (status in ('draft', 'processing', 'approved', 'paid')),
    total_gross numeric not null default 0,
    total_net numeric not null default 0,
    processed_by uuid references profiles(id) on delete set null,
    processed_at timestamptz,
    created_at timestamptz default now(),
    constraint unique_month_year unique (month, year)
);

-- Payslips table
create table payslips (
    id uuid primary key default gen_random_uuid(),
    employee_id uuid not null references profiles(id) on delete cascade,
    payroll_run_id uuid not null references payroll_runs(id) on delete cascade,
    gross numeric not null check (gross >= 0),
    pf numeric not null check (pf >= 0),
    esi numeric not null check (esi >= 0),
    pt numeric not null check (pt >= 0),
    tds numeric not null default 0 check (tds >= 0),
    net numeric not null check (net >= 0),
    generated_at timestamptz default now(),
    created_at timestamptz default now(),
    constraint unique_employee_run unique (employee_id, payroll_run_id)
);

-- Documents table (Company general documents)
create table documents (
    id uuid primary key default gen_random_uuid(),
    name text not null,
    category text not null check (category in ('policy', 'handbook', 'template', 'announcement')),
    type text not null,
    size text not null,
    url text not null,
    uploaded_by uuid references profiles(id) on delete set null,
    created_at timestamptz default now()
);

-- Employee uploaded documents checklist
create table employee_documents (
    id uuid primary key default gen_random_uuid(),
    employee_id uuid not null references profiles(id) on delete cascade,
    doc_type text not null check (doc_type in ('aadhaar', 'pan', 'passport', 'resume', 'offer_letter', 'edu_certificate', 'exp_letter', 'other')),
    url text not null,
    document_verification_status text not null default 'pending' check (document_verification_status in ('pending', 'verified', 'rejected')),
    verified_by uuid references profiles(id) on delete set null,
    verified_at timestamptz,
    verification_remarks text,
    uploaded_at timestamptz default now(),
    constraint unique_employee_doctype unique (employee_id, doc_type)
);

-- Holidays table
create table holidays (
    id uuid primary key default gen_random_uuid(),
    name text not null,
    date date not null unique,
    type text not null check (type in ('national', 'festival', 'regional', 'optional')),
    created_at timestamptz default now()
);

-- Notifications table
create table notifications (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null references profiles(id) on delete cascade,
    type text not null,
    message text not null,
    read boolean not null default false,
    created_at timestamptz default now()
);

-- PL/pgSQL function to securely create an employee account
create or replace function create_employee_account(
    p_email text,
    p_password text,
    p_full_name text,
    p_role text,
    p_employee_id text,
    p_department text,
    p_designation text,
    p_phone text,
    p_employment_type text,
    p_date_of_joining date,
    p_status text,
    p_reporting_manager_id uuid default null,
    p_reporting_manager_name text default null,
    p_reporting_manager_designation text default null
) returns uuid
security definer
language plpgsql
as $$
declare
    new_user_id uuid;
begin
    -- Create user in auth.users
    insert into auth.users (
        instance_id,
        id,
        aud,
        role,
        email,
        encrypted_password,
        email_confirmed_at,
        raw_app_meta_data,
        raw_user_meta_data,
        created_at,
        updated_at,
        confirmation_token,
        recovery_token
    ) values (
        '00000000-0000-0000-0000-000000000000',
        gen_random_uuid(),
        'authenticated',
        'authenticated',
        p_email,
        crypt(p_password, gen_salt('bf')),
        now(),
        jsonb_build_object('provider', 'email', 'providers', jsonb_build_array('email')),
        jsonb_build_object('full_name', p_full_name),
        now(),
        now(),
        '',
        ''
    ) returning id into new_user_id;

    -- Create user profile
    insert into public.profiles (
        id,
        full_name,
        email,
        role,
        status,
        employee_id,
        department,
        designation,
        phone,
        employment_type,
        date_of_joining,
        reporting_manager_id,
        reporting_manager_name,
        reporting_manager_designation
    ) values (
        new_user_id,
        p_full_name,
        p_email,
        p_role,
        p_status,
        p_employee_id,
        p_department,
        p_designation,
        p_phone,
        p_employment_type,
        p_date_of_joining,
        p_reporting_manager_id,
        p_reporting_manager_name,
        p_reporting_manager_designation
    );

    -- Seed leave balances for current year
    insert into public.leave_balances (
        employee_id,
        year
    ) values (
        new_user_id,
        extract(year from current_date)::integer
    );

    return new_user_id;
end;
$$;

-- Trigger logic to automatically create profiles for users signed up externally
create or replace function handle_new_user()
returns trigger
security definer
language plpgsql
as $$
begin
    insert into public.profiles (id, full_name, email, role, status)
    values (
        new.id,
        coalesce(new.raw_user_meta_data->>'full_name', substring(new.email from '^[^@]+')),
        new.email,
        coalesce(new.raw_user_meta_data->>'role', 'employee'),
        'active'
    )
    on conflict (id) do nothing;

    insert into public.leave_balances (employee_id, year)
    values (
        new.id,
        extract(year from current_date)::integer
    )
    on conflict do nothing;

    return new;
end;
$$;

create or replace trigger on_auth_user_created
    after insert on auth.users
    for each row execute function handle_new_user();
