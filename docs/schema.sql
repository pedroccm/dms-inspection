-- DMS Inspection - Database Schema Reference
-- This file documents the full schema including audit log infrastructure.

-- ─── Audit Logs Table ──────────────────────────────────────────
-- (already exists in Supabase)
-- CREATE TABLE audit_logs (
--   id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
--   table_name text NOT NULL,
--   record_id uuid NOT NULL,
--   action text NOT NULL CHECK (action IN ('insert', 'update', 'delete')),
--   old_data jsonb,
--   new_data jsonb,
--   user_id uuid REFERENCES auth.users(id),
--   created_at timestamptz NOT NULL DEFAULT now()
-- );

-- ─── Settings Table ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS settings (
  key text PRIMARY KEY,
  value jsonb NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- RLS for settings (admin only)
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can read settings"
  ON settings FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Admins can upsert settings"
  ON settings FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Insert default retention period
INSERT INTO settings (key, value)
VALUES ('retention_days', '30'::jsonb)
ON CONFLICT (key) DO NOTHING;
