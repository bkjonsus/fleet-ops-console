-- Phase 3 migration: broker field, manual payment status, driver ready-city, two-way comments.
-- Run in Supabase: Dashboard > SQL Editor > New query > paste > Run

alter table loads add column if not exists broker text;
alter table loads add column if not exists payment_status text;

alter table drivers add column if not exists ready_city text;
alter table drivers add column if not exists dispatch_note text;
