-- Migration: Master control statuses (Cadastrado / Medida / Faturada)
-- Date: 2026-04-20
-- Story: DIEN-MASTER-003
--
-- Adds three post-approval control flags for the master panel:
--   * Equipment-level: `registered` (Cadastrado) — manual tick by master
--   * Order-level: `aprovada` (auto when all inspections approved)
--                 `medida`   (auto when all equipment registered)
--                 `faturada` (manual from medida)
-- All transitions are internal control flags; no external actions triggered.

-- ─── 1. Equipment: registered flag ─────────────────────────────────

ALTER TABLE equipment
  ADD COLUMN IF NOT EXISTS registered BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE equipment
  ADD COLUMN IF NOT EXISTS registered_at TIMESTAMPTZ;

ALTER TABLE equipment
  ADD COLUMN IF NOT EXISTS registered_by UUID REFERENCES profiles(id);

COMMENT ON COLUMN equipment.registered IS
  'Cadastrado flag — master ticks this after registering the equipment in the client system (e.g. Copel). Can only be set when the equipment has an approved inspection.';

-- ─── 2. Service Orders: extended status + timestamps ────────────────

-- Drop existing CHECK constraint on status (if any) and recreate with new values.
ALTER TABLE service_orders DROP CONSTRAINT IF EXISTS service_orders_status_check;
ALTER TABLE service_orders ADD CONSTRAINT service_orders_status_check
  CHECK (status IN ('open', 'in_progress', 'completed', 'cancelled', 'aprovada', 'medida', 'faturada'));

ALTER TABLE service_orders
  ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ;

ALTER TABLE service_orders
  ADD COLUMN IF NOT EXISTS measured_at TIMESTAMPTZ;

ALTER TABLE service_orders
  ADD COLUMN IF NOT EXISTS billed_at TIMESTAMPTZ;

ALTER TABLE service_orders
  ADD COLUMN IF NOT EXISTS billed_by UUID REFERENCES profiles(id);

COMMENT ON COLUMN service_orders.status IS
  'Lifecycle: open → in_progress → aprovada (all inspections approved, auto) → medida (all equipment registered, auto) → faturada (manual by master).';
