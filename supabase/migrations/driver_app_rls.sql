-- Driver App migration: grants drivers (role='driver' in profiles) access to just
-- their own loads and their own driver record. Run in Supabase SQL Editor.
--
-- This ADDS policies on top of whatever already exists \u2014 it doesn't replace your
-- existing admin/dispatch/fleet/accounting policies. Safe to re-run.

drop policy if exists "Drivers can view their own loads" on loads;
create policy "Drivers can view their own loads" on loads
  for select using (
    driver = (select full_name from profiles where id = auth.uid())
  );

drop policy if exists "Drivers can update their own loads" on loads;
create policy "Drivers can update their own loads" on loads
  for update using (
    driver = (select full_name from profiles where id = auth.uid())
  );

drop policy if exists "Drivers can view their own driver record" on drivers;
create policy "Drivers can view their own driver record" on drivers
  for select using (
    name = (select full_name from profiles where id = auth.uid())
  );

drop policy if exists "Drivers can update their own driver record" on drivers;
create policy "Drivers can update their own driver record" on drivers
  for update using (
    name = (select full_name from profiles where id = auth.uid())
  );

drop policy if exists "Drivers can view trucks" on trucks;
create policy "Drivers can view trucks" on trucks
  for select using (auth.role() = 'authenticated');

drop policy if exists "Drivers can view trailers" on trailers;
create policy "Drivers can view trailers" on trailers
  for select using (auth.role() = 'authenticated');
