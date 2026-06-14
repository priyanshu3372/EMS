-- Update Profiles Table for Reporting Manager and new Roles check
alter table profiles drop constraint if exists profiles_role_check;
alter table profiles add constraint profiles_role_check check (role in ('super_admin', 'admin', 'hr', 'manager', 'rm', 'accounts', 'employee'));

alter table profiles drop constraint if exists profiles_status_check;
alter table profiles add constraint profiles_status_check check (status in ('active', 'inactive'));

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
