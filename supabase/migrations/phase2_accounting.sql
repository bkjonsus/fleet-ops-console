-- Phase 2 migration: payment routing + accountability fields for invoices/expenses.
-- Run in Supabase: Dashboard > SQL Editor > New query > paste > Run

alter table invoices add column if not exists payment_type text default 'Direct';
alter table invoices add column if not exists factoring_company text;
alter table invoices add column if not exists created_by text;

alter table expenses add column if not exists driver text;
alter table expenses add column if not exists created_by text;
