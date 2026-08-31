-- Update Profiles Table for Reporting Manager and new Roles check
alter table profiles drop constraint if exists profiles_role_check;
alter table profiles add constraint profiles_role_check check (role in ('super_admin', 'admin', 'hr', 'manager', 'rm', 'accounts', 'employee'));

alter table profiles drop constraint if exists profiles_status_check;
alter table profiles add constraint profiles_status_check check (status in ('active', 'inactive', 'invited'));

alter table profiles add column if not exists reporting_manager_id uuid references profiles(id) on delete set null;
alter table profiles add column if not exists reporting_manager_name text;
alter table profiles add column if not exists reporting_manager_designation text;

-- Update Attendance Table status check
alter table attendance drop constraint if exists attendance_status_check;
alter table attendance add constraint attendance_status_check check (status in ('present', 'absent', 'late', 'wfh', 'half_day', 'on_leave', 'weekly_off'));

-- Update Employee Documents Table for verification fields and check constraints
alter table employee_documents drop constraint if exists employee_documents_doc_type_check;
alter table employee_documents add constraint employee_documents_doc_type_check check (doc_type in ('aadhaar', 'pan', 'passport', 'resume', 'offer_letter', 'edu_certificate', 'exp_letter', 'other'));

alter table employee_documents add column if not exists document_verification_status text not null default 'pending' check (document_verification_status in ('pending', 'verified', 'rejected'));
alter table employee_documents add column if not exists verified_by uuid references profiles(id) on delete set null;
alter table employee_documents add column if not exists verified_at timestamptz;
alter table employee_documents add column if not exists verification_remarks text;
alter table employee_documents add column if not exists file_name text;
alter table employee_documents add column if not exists file_path text;
alter table employee_documents add column if not exists file_size bigint not null default 0 check (file_size >= 0);
update employee_documents
set
  file_path = coalesce(file_path, url, ''),
  file_name = coalesce(file_name, nullif(split_part(coalesce(url, ''), '/', array_length(string_to_array(coalesce(url, ''), '/'), 1)), ''), 'document')
where file_path is null or file_name is null;
alter table employee_documents alter column file_name set not null;
alter table employee_documents alter column file_path set not null;
alter table employee_documents drop column if exists url;

-- Align payslip persistence with the frontend payslip view.
alter table payslips add column if not exists basic numeric not null default 0 check (basic >= 0);
alter table payslips add column if not exists hra numeric not null default 0 check (hra >= 0);
alter table payslips add column if not exists da numeric not null default 0 check (da >= 0);
alter table payslips add column if not exists special_allowance numeric not null default 0 check (special_allowance >= 0);
