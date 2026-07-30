-- Phase 1 migration: multi-stop loads, booked_by, and related columns.
-- Run in Supabase: Dashboard > SQL Editor > New query > paste > Run

-- Loads: add stops (jsonb array) and booked_by. Old single-leg columns
-- (origin, destination, pickup_date, etc.) are left in place untouched —
-- the app falls back to them for any older rows that don't have stops set,
-- so nothing breaks for existing data.
alter table loads add column if not exists stops jsonb;
alter table loads add column if not exists booked_by text;

-- Drivers: self-service availability fields (Driver Board / Driver App)
alter table drivers add column if not exists board_status text;
alter table drivers add column if not exists board_note text;
alter table drivers add column if not exists ready_date date;
alter table drivers add column if not exists ready_time time;
