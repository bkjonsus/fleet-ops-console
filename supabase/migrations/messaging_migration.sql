-- Run in Supabase SQL editor.

CREATE TABLE IF NOT EXISTS driver_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL,
  driver_id uuid NOT NULL REFERENCES drivers(id) ON DELETE CASCADE,
  sender text NOT NULL CHECK (sender IN ('driver', 'dispatch')),
  sender_name text,
  message text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  read boolean NOT NULL DEFAULT false
);

CREATE INDEX IF NOT EXISTS driver_messages_driver_idx ON driver_messages(driver_id, created_at);

ALTER TABLE driver_messages ENABLE ROW LEVEL SECURITY;

-- A driver can read and send messages in their own thread
CREATE POLICY "Drivers can view their own messages" ON driver_messages
FOR SELECT USING (
  company_id = current_user_company_id()
  AND EXISTS (
    SELECT 1 FROM drivers d
    WHERE d.id = driver_messages.driver_id
      AND d.name = (SELECT full_name FROM profiles WHERE id = auth.uid())
  )
);

CREATE POLICY "Drivers can send their own messages" ON driver_messages
FOR INSERT WITH CHECK (
  company_id = current_user_company_id()
  AND sender = 'driver'
  AND EXISTS (
    SELECT 1 FROM drivers d
    WHERE d.id = driver_messages.driver_id
      AND d.name = (SELECT full_name FROM profiles WHERE id = auth.uid())
  )
);

-- A driver can mark dispatch's messages as read (their own thread only)
CREATE POLICY "Drivers can mark their thread read" ON driver_messages
FOR UPDATE USING (
  company_id = current_user_company_id()
  AND EXISTS (
    SELECT 1 FROM drivers d
    WHERE d.id = driver_messages.driver_id
      AND d.name = (SELECT full_name FROM profiles WHERE id = auth.uid())
  )
);

-- Staff can view and send messages in any thread for their company
CREATE POLICY "driver_messages_staff_select" ON driver_messages
FOR SELECT USING (
  (current_user_role() = ANY (ARRAY['admin'::user_role, 'dispatch'::user_role, 'fleet'::user_role, 'ops_viewer'::user_role]))
  AND ((company_id = current_user_company_id()) OR is_super_admin())
);

CREATE POLICY "driver_messages_staff_insert" ON driver_messages
FOR INSERT WITH CHECK (
  (current_user_role() = ANY (ARRAY['admin'::user_role, 'dispatch'::user_role, 'fleet'::user_role, 'ops_viewer'::user_role]))
  AND sender = 'dispatch'
  AND ((company_id = current_user_company_id()) OR is_super_admin())
);

CREATE POLICY "driver_messages_staff_update" ON driver_messages
FOR UPDATE USING (
  (current_user_role() = ANY (ARRAY['admin'::user_role, 'dispatch'::user_role, 'fleet'::user_role, 'ops_viewer'::user_role]))
  AND ((company_id = current_user_company_id()) OR is_super_admin())
);
