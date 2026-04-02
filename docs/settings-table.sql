-- Settings table for application configuration (e.g. data retention policy)
-- Run this migration in Supabase SQL Editor.

CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Default retention period: 30 days
INSERT INTO settings (key, value)
VALUES ('retention_days', '30')
ON CONFLICT (key) DO NOTHING;

-- RLS
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;

-- Any authenticated user can read settings
CREATE POLICY settings_select ON settings
  FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- Only admins can update settings
CREATE POLICY settings_update_admin ON settings
  FOR UPDATE
  USING (auth_user_role() = 'admin');
