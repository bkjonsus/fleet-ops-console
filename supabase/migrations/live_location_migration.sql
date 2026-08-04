ALTER TABLE drivers ADD COLUMN IF NOT EXISTS live_lat numeric;
ALTER TABLE drivers ADD COLUMN IF NOT EXISTS live_lng numeric;
ALTER TABLE drivers ADD COLUMN IF NOT EXISTS live_location_at timestamptz;
