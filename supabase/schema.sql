-- ============================================================
-- Fleet Ops Console — Supabase schema
-- Run this once in Supabase: Dashboard > SQL Editor > New query > paste all > Run
-- ============================================================

-- 0. Extensions ----------------------------------------------
create extension if not exists pgcrypto;

-- 1. Roles ----------------------------------------------------
create type user_role as enum ('admin', 'dispatch', 'fleet', 'accounting', 'ops_viewer');

-- 2. Profiles (one row per staff login, links to Supabase auth) ----
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  role user_role not null default 'dispatch',
  created_at timestamptz not null default now()
);

-- Auto-create a profile row whenever a new staff account is created in Supabase Auth.
-- New accounts default to 'dispatch' — the admin changes this afterward in the Team page
-- (except the very first account, which you set to 'admin' manually — see README_SETUP.md).
create function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, full_name, role)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name', new.email), 'dispatch');
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- 3. Core tables ------------------------------------------------
create table loads (
  id uuid primary key default gen_random_uuid(),
  load_number text not null,
  driver text,
  truck text,
  origin text,
  destination text,
  pickup_date date,
  pickup_time time,
  delivery_date date,
  delivery_time time,
  rate numeric,
  miles numeric,
  status text not null default 'Assigned',
  notes text,
  created_at timestamptz not null default now(),
  created_by uuid references profiles(id)
);

create table drivers (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  phone text,
  cdl_number text,
  cdl_issue_date date,
  cdl_expiry_date date,
  contract_type text not null default 'Company - Per Mile',
  per_mile_rate numeric,
  percentage_rate numeric,
  dispatch_fee_percent numeric,
  truck_lease_weekly numeric,
  trailer_lease_weekly numeric,
  assigned_truck text,
  assigned_trailer text,
  status text not null default 'Active',
  notes text,
  created_at timestamptz not null default now()
);

create table trucks (
  id uuid primary key default gen_random_uuid(),
  unit_number text not null,
  year text,
  make text,
  model text,
  vin text,
  ownership text not null default 'Company Owned',
  assigned_driver text,
  rented_from text,
  rental_start date,
  return_date date,
  notes text,
  created_at timestamptz not null default now()
);

create table trailers (
  id uuid primary key default gen_random_uuid(),
  trailer_number text not null,
  trailer_type text,
  year text,
  make text,
  model text,
  vin text,
  ownership text not null default 'Company Owned',
  assigned_driver text,
  rented_from text,
  rental_start date,
  return_date date,
  notes text,
  created_at timestamptz not null default now()
);

create table invoices (
  id uuid primary key default gen_random_uuid(),
  invoice_number text not null,
  customer text,
  load_number text,
  amount numeric,
  issue_date date,
  due_date date,
  status text not null default 'Draft',
  created_at timestamptz not null default now()
);

create table expenses (
  id uuid primary key default gen_random_uuid(),
  date date,
  category text,
  amount numeric,
  description text,
  load_number text,
  created_at timestamptz not null default now()
);

create table statements (
  id uuid primary key default gen_random_uuid(),
  driver text,
  period_start date,
  period_end date,
  pay_lines jsonb not null default '[]',
  deductions jsonb not null default '[]',
  notes text,
  gross numeric,
  total_deductions numeric,
  net numeric,
  created_date date,
  created_at timestamptz not null default now()
);

-- 4. Helper: get the current user's role -------------------------
create function public.current_role()
returns user_role as $$
  select role from public.profiles where id = auth.uid();
$$ language sql stable security definer;

-- 5. Row Level Security -------------------------------------------
alter table profiles enable row level security;
alter table loads enable row level security;
alter table drivers enable row level security;
alter table trucks enable row level security;
alter table trailers enable row level security;
alter table invoices enable row level security;
alter table expenses enable row level security;
alter table statements enable row level security;

-- Profiles: everyone can read all profiles (needed for driver-name pickers, "assigned to" etc).
-- Only admin can change roles. Anyone can read their own row.
create policy "profiles_select_all" on profiles for select using (true);
create policy "profiles_update_admin" on profiles for update using (current_role() = 'admin');

-- Loads: admin, dispatch, fleet(view), accounting(view), ops_viewer(edit) can read.
-- admin, dispatch, ops_viewer can write.
create policy "loads_select" on loads for select using (
  current_role() in ('admin','dispatch','fleet','accounting','ops_viewer')
);
create policy "loads_write" on loads for insert with check (
  current_role() in ('admin','dispatch','ops_viewer')
);
create policy "loads_update" on loads for update using (
  current_role() in ('admin','dispatch','ops_viewer')
);
create policy "loads_delete" on loads for delete using (
  current_role() in ('admin','dispatch','ops_viewer')
);

-- Drivers/Trucks/Trailers: admin, fleet, ops_viewer can write. accounting can read (for statement calc).
create policy "drivers_select" on drivers for select using (
  current_role() in ('admin','fleet','accounting','ops_viewer')
);
create policy "drivers_write" on drivers for insert with check (
  current_role() in ('admin','fleet','ops_viewer')
);
create policy "drivers_update" on drivers for update using (
  current_role() in ('admin','fleet','ops_viewer')
);
create policy "drivers_delete" on drivers for delete using (
  current_role() in ('admin','fleet','ops_viewer')
);

create policy "trucks_select" on trucks for select using (
  current_role() in ('admin','fleet','ops_viewer')
);
create policy "trucks_write" on trucks for insert with check (
  current_role() in ('admin','fleet','ops_viewer')
);
create policy "trucks_update" on trucks for update using (
  current_role() in ('admin','fleet','ops_viewer')
);
create policy "trucks_delete" on trucks for delete using (
  current_role() in ('admin','fleet','ops_viewer')
);

create policy "trailers_select" on trailers for select using (
  current_role() in ('admin','fleet','ops_viewer')
);
create policy "trailers_write" on trailers for insert with check (
  current_role() in ('admin','fleet','ops_viewer')
);
create policy "trailers_update" on trailers for update using (
  current_role() in ('admin','fleet','ops_viewer')
);
create policy "trailers_delete" on trailers for delete using (
  current_role() in ('admin','fleet','ops_viewer')
);

-- Invoices/Expenses/Statements: admin, accounting can write. ops_viewer can read only.
create policy "invoices_select" on invoices for select using (
  current_role() in ('admin','accounting','ops_viewer')
);
create policy "invoices_write" on invoices for insert with check (
  current_role() in ('admin','accounting')
);
create policy "invoices_update" on invoices for update using (
  current_role() in ('admin','accounting')
);
create policy "invoices_delete" on invoices for delete using (
  current_role() in ('admin','accounting')
);

create policy "expenses_select" on expenses for select using (
  current_role() in ('admin','accounting','ops_viewer')
);
create policy "expenses_write" on expenses for insert with check (
  current_role() in ('admin','accounting')
);
create policy "expenses_update" on expenses for update using (
  current_role() in ('admin','accounting')
);
create policy "expenses_delete" on expenses for delete using (
  current_role() in ('admin','accounting')
);

create policy "statements_select" on statements for select using (
  current_role() in ('admin','accounting','ops_viewer')
);
create policy "statements_write" on statements for insert with check (
  current_role() in ('admin','accounting')
);
create policy "statements_update" on statements for update using (
  current_role() in ('admin','accounting')
);
create policy "statements_delete" on statements for delete using (
  current_role() in ('admin','accounting')
);
