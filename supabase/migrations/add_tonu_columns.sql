-- Adds TONU (Truck Ordered, Not Used) tracking to the loads table.
-- Run this once in Supabase: Dashboard > SQL Editor > New query > paste > Run

alter table loads add column if not exists tonu_amount numeric;
alter table loads add column if not exists tonu_status text;
alter table loads add column if not exists tonu_notes text;
