-- HR / Recruiting migration. Run in Supabase SQL Editor.
-- Creates the applications table (scoped per-company like everything else), a
-- separate Storage bucket for CDL/CV uploads that allows PUBLIC (anonymous)
-- uploads (since applicants aren't logged in), and the security rules for both.

create table if not exists applications (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies(id),
  position text not null,
  full_name text not null,
  phone text not null,
  email text not null,
  years_experience text,
  work_experience text,
  status text not null default 'New',   -- New | Reviewing | Contacted | Hired | Rejected
  cdl_file_path text,
  cv_file_path text,
  submitted_at timestamptz default now()
);

alter table applications enable row level security;

-- Anyone (even not logged in) can submit an application \u2014 that's the whole point
-- of the public apply link. They just need a valid company_id to attach it to.
drop policy if exists "Anyone can submit an application" on applications;
create policy "Anyone can submit an application" on applications
  for insert with check (
    company_id in (select id from companies)
  );

-- Only staff within that company (or the super admin) can view/manage applications.
drop policy if exists "Staff can view their company's applications" on applications;
create policy "Staff can view their company's applications" on applications
  for select using (
    company_id = current_user_company_id() or is_super_admin()
  );

drop policy if exists "Staff can update their company's applications" on applications;
create policy "Staff can update their company's applications" on applications
  for update using (
    company_id = current_user_company_id() or is_super_admin()
  );

drop policy if exists "Staff can delete their company's applications" on applications;
create policy "Staff can delete their company's applications" on applications
  for delete using (
    company_id = current_user_company_id() or is_super_admin()
  );

-- Storage bucket for CDL/CV files, separate from the staff "documents" bucket
-- since this one needs to accept uploads from people who aren't logged in.
insert into storage.buckets (id, name, public)
values ('applications', 'applications', false)
on conflict (id) do nothing;

drop policy if exists "Anyone can upload application files" on storage.objects;
create policy "Anyone can upload application files"
  on storage.objects for insert
  with check (bucket_id = 'applications');

drop policy if exists "Staff can view application files" on storage.objects;
create policy "Staff can view application files"
  on storage.objects for select
  using (bucket_id = 'applications' and auth.role() = 'authenticated');
