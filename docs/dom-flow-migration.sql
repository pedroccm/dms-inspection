-- Dom Flow Migration
-- New tables and columns for the Dom inspection flow
-- DO NOT execute directly — review and adapt as needed.

-- ─── 1. Inspection Locations ──────────────────────────────────────

CREATE TABLE IF NOT EXISTS inspection_locations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT UNIQUE NOT NULL,
  address TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE inspection_locations ENABLE ROW LEVEL SECURITY;
CREATE POLICY locations_select ON inspection_locations FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY locations_insert_admin ON inspection_locations FOR INSERT WITH CHECK (auth_user_role() = 'admin');
CREATE POLICY locations_update_admin ON inspection_locations FOR UPDATE USING (auth_user_role() = 'admin');

-- ─── 2. Service Orders: new columns ──────────────────────────────

ALTER TABLE service_orders ADD COLUMN IF NOT EXISTS order_number TEXT UNIQUE;
ALTER TABLE service_orders ADD COLUMN IF NOT EXISTS client_request_date DATE;
ALTER TABLE service_orders ADD COLUMN IF NOT EXISTS location_id UUID REFERENCES inspection_locations(id);
ALTER TABLE service_orders ADD COLUMN IF NOT EXISTS equipment_count INTEGER DEFAULT 0;

-- ─── 3. Sequence for order numbers ───────────────────────────────

CREATE SEQUENCE IF NOT EXISTS service_order_seq START 1;

-- ─── 4. Inspections: new columns ─────────────────────────────────

ALTER TABLE inspections ADD COLUMN IF NOT EXISTS numero_052r TEXT;
ALTER TABLE inspections ADD COLUMN IF NOT EXISTS numero_300 TEXT;
ALTER TABLE inspections ADD COLUMN IF NOT EXISTS claimed_by UUID REFERENCES profiles(id);
ALTER TABLE inspections ADD COLUMN IF NOT EXISTS claimed_at TIMESTAMPTZ;
ALTER TABLE inspections ADD COLUMN IF NOT EXISTS qr_data JSONB;

-- ─── 5. Teams ────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS teams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT UNIQUE NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS team_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  UNIQUE(team_id, user_id)
);

ALTER TABLE teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_members ENABLE ROW LEVEL SECURITY;
CREATE POLICY teams_select ON teams FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY teams_insert_admin ON teams FOR INSERT WITH CHECK (auth_user_role() = 'admin');
CREATE POLICY team_members_select ON team_members FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY team_members_insert_admin ON team_members FOR INSERT WITH CHECK (auth_user_role() = 'admin');

-- Service orders: team assignment
ALTER TABLE service_orders ADD COLUMN IF NOT EXISTS assigned_team_id UUID REFERENCES teams(id);

-- ─── 6. Inspection status constraint update ──────────────────────

ALTER TABLE inspections DROP CONSTRAINT IF EXISTS inspections_status_check;
ALTER TABLE inspections ADD CONSTRAINT inspections_status_check
  CHECK (status IN ('disponivel', 'draft', 'in_progress', 'ready_for_review', 'aprovado', 'relatorio_reprovado', 'equipamento_reprovado', 'transferred'));
