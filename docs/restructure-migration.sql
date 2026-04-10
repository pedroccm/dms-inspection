-- Migration: Move 052R/300 numbers from inspections to equipment
-- Date: 2026-04-10
-- Description: Equipment records now hold the ficha identification numbers (052R/300).
--              Inspections are created later when the executor scans the QR Code.

-- ─── 1. Add ficha columns and service_order_id to equipment ────────────────
ALTER TABLE equipment ADD COLUMN IF NOT EXISTS numero_052r TEXT;
ALTER TABLE equipment ADD COLUMN IF NOT EXISTS numero_300 TEXT;
ALTER TABLE equipment ADD COLUMN IF NOT EXISTS service_order_id UUID REFERENCES service_orders(id);

-- ─── 2. Make equipment fields nullable for initial creation ────────────────
-- These fields will be filled later via QR Code scan, so they cannot be required
-- at equipment creation time (when master creates the O.S.).
ALTER TABLE equipment ALTER COLUMN copel_control_code DROP NOT NULL;
ALTER TABLE equipment ALTER COLUMN mechanism_serial DROP NOT NULL;
ALTER TABLE equipment ALTER COLUMN control_box_serial DROP NOT NULL;
ALTER TABLE equipment ALTER COLUMN protection_relay_serial DROP NOT NULL;
ALTER TABLE equipment ALTER COLUMN manufacturer DROP NOT NULL;

-- ─── 3. Make copel_ra_code nullable (will be a temp placeholder initially) ──
-- Equipment created from O.S. will have a temporary code like "PENDENTE-1"
-- that gets replaced when executor scans the QR Code.
ALTER TABLE equipment ALTER COLUMN copel_ra_code DROP NOT NULL;

-- ─── 4. (Optional) Migrate existing data from inspections to equipment ─────
-- Run this only if you want to backfill existing ficha numbers.
-- UPDATE equipment e
-- SET numero_052r = i.numero_052r,
--     numero_300 = i.numero_300,
--     service_order_id = i.service_order_id
-- FROM inspections i
-- WHERE i.equipment_id = e.id
--   AND i.numero_052r IS NOT NULL;

-- ─── 5. Index for fast lookup by service_order_id ──────────────────────────
CREATE INDEX IF NOT EXISTS idx_equipment_service_order_id ON equipment(service_order_id);
