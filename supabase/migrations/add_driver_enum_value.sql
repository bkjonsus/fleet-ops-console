-- Adds "driver" as a valid value to the user_role enum used by profiles.role.
-- Run in Supabase SQL Editor.

alter type user_role add value if not exists 'driver';
