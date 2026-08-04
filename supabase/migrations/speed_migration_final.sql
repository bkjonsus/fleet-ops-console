-- Run this whole thing in Supabase SQL editor.

-- Current speed on the driver row (for the Live Map pin label)
ALTER TABLE drivers ADD COLUMN IF NOT EXISTS live_speed_mph numeric;

-- History of speed readings over time
CREATE TABLE IF NOT EXISTS driver_speed_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL,
  driver_id uuid NOT NULL REFERENCES drivers(id) ON DELETE CASCADE,
  speed_mph numeric,
  lat numeric,
  lng numeric,
  recorded_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS driver_speed_logs_driver_idx ON driver_speed_logs(driver_id, recorded_at DESC);

ALTER TABLE driver_speed_logs ENABLE ROW LEVEL SECURITY;

-- A driver can log their own speed readings (this is what the Driver App uses)
CREATE POLICY "Drivers can insert their own speed logs" ON driver_speed_logs
FOR INSERT WITH CHECK (
  company_id = current_user_company_id()
  AND EXISTS (
    SELECT 1 FROM drivers d
    WHERE d.id = driver_speed_logs.driver_id
      AND d.name = (SELECT full_name FROM profiles WHERE id = auth.uid())
  )
);

-- A driver can view their own speed history
CREATE POLICY "Drivers can view their own speed logs" ON driver_speed_logs
FOR SELECT USING (
  company_id = current_user_company_id()
  AND EXISTS (
    SELECT 1 FROM drivers d
    WHERE d.id = driver_speed_logs.driver_id
      AND d.name = (SELECT full_name FROM profiles WHERE id = auth.uid())
  )
);

-- Staff (admin/fleet/accounting/ops_viewer) can view all speed logs for their company
-- (this is what powers the Fleet Live Map's speed display and future reporting)
CREATE POLICY "driver_speed_logs_select" ON driver_speed_logs
FOR SELECT USING (
  (current_user_role() = ANY (ARRAY['admin'::user_role, 'fleet'::user_role, 'accounting'::user_role, 'ops_viewer'::user_role]))
  AND ((company_id = current_user_company_id()) OR is_super_admin())
);

-- Admin/fleet can delete old logs (cleanup/retention)
CREATE POLICY "driver_speed_logs_delete" ON driver_speed_logs
FOR DELETE USING (
  (current_user_role() = ANY (ARRAY['admin'::user_role, 'fleet'::user_role, 'ops_viewer'::user_role]))
  AND ((company_id = current_user_company_id()) OR is_super_admin())
);
