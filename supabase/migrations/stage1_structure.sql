-- MULTI-COMPANY STAGE 1: structure only, no security changes yet.
-- Safe to run \u2014 purely additive, and backfills all existing data into one
-- "default" company so nothing breaks or goes missing.

-- 1. The companies table itself
create table if not exists companies (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  contact_email text,
  contact_phone text,
  status text not null default 'Active',       -- 'Active' | 'Trial' | 'Suspended'
  modules text[] not null default array['dispatch','fleet','accounting','team'],
  created_at timestamptz default now()
);

alter table companies enable row level security;

-- 2. Create your existing business as the default company, backfilling everything into it
insert into companies (name, status, modules)
values ('HHH Daily OPs', 'Active', array['dispatch','fleet','accounting','team'])
on conflict do nothing;

-- 3. Add company_id to every relevant table (nullable for now, filled in next)
alter table profiles   add column if not exists company_id uuid references companies(id);
alter table loads      add column if not exists company_id uuid references companies(id);
alter table drivers    add column if not exists company_id uuid references companies(id);
alter table trucks     add column if not exists company_id uuid references companies(id);
alter table trailers   add column if not exists company_id uuid references companies(id);
alter table invoices   add column if not exists company_id uuid references companies(id);
alter table expenses   add column if not exists company_id uuid references companies(id);
alter table statements add column if not exists company_id uuid references companies(id);
alter table documents  add column if not exists company_id uuid references companies(id);

-- 4. Backfill: every existing row belongs to the one default company we just created
do $$
declare default_company_id uuid;
begin
  select id into default_company_id from companies where name = 'HHH Daily OPs' limit 1;

  update profiles   set company_id = default_company_id where company_id is null;
  update loads      set company_id = default_company_id where company_id is null;
  update drivers    set company_id = default_company_id where company_id is null;
  update trucks     set company_id = default_company_id where company_id is null;
  update trailers   set company_id = default_company_id where company_id is null;
  update invoices   set company_id = default_company_id where company_id is null;
  update expenses   set company_id = default_company_id where company_id is null;
  update statements set company_id = default_company_id where company_id is null;
  update documents  set company_id = default_company_id where company_id is null;
end $$;
