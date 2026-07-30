-- Documents system: metadata table + a private Storage bucket for the actual files.
-- Run in Supabase: Dashboard > SQL Editor > New query > paste > Run

-- 1. Metadata table (one row per uploaded document)
create table if not exists documents (
  id uuid primary key default gen_random_uuid(),
  category text not null,        -- 'Driver' | 'Truck' | 'Trailer' | 'Company' | 'Load' | 'Application' | 'Accounting'
  linked_to text,                -- driver name / unit number / load number / etc. (blank for company-wide docs)
  doc_type text not null,        -- e.g. 'CDL', 'Registration', 'Rate Confirmation'
  issue_date date,
  expiry_date date,
  notes text,
  file_path text not null,       -- path inside the Storage bucket
  file_name text not null,       -- original filename, for display
  mime_type text,
  created_by text,
  created_at timestamptz default now()
);

alter table documents enable row level security;

-- Any authenticated user of the app can view and upload documents. Deleting is
-- gated in the app's own UI (canEdit checks per role), not at the database level,
-- since this app doesn't yet have per-row ownership to restrict on.
create policy "Authenticated users can view documents" on documents
  for select using (auth.role() = 'authenticated');
create policy "Authenticated users can insert documents" on documents
  for insert with check (auth.role() = 'authenticated');
create policy "Authenticated users can delete documents" on documents
  for delete using (auth.role() = 'authenticated');

-- 2. Storage bucket for the actual files (private \u2014 accessed via signed URLs, not public links)
insert into storage.buckets (id, name, public)
values ('documents', 'documents', false)
on conflict (id) do nothing;

-- Storage RLS: any authenticated user can upload/view/delete objects in this bucket.
create policy "Authenticated users can upload documents files"
  on storage.objects for insert
  with check (bucket_id = 'documents' and auth.role() = 'authenticated');
create policy "Authenticated users can view documents files"
  on storage.objects for select
  using (bucket_id = 'documents' and auth.role() = 'authenticated');
create policy "Authenticated users can delete documents files"
  on storage.objects for delete
  using (bucket_id = 'documents' and auth.role() = 'authenticated');
