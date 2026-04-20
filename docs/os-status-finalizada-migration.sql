-- Migration: Add "finalizada" status to service_orders
-- Date: 2026-04-20
-- MVP 5 item: OS status flow reworked.
--
-- New flow:
--   Aberta (open/in_progress/aprovada) while any equipment pending/in-inspection
--   Finalizada — auto when all equipment are registered (replaces former auto-Medida)
--   Medida    — manual, master clicks "Marcar como Medida"
--   Faturada  — manual, master clicks "Marcar como Faturada"

ALTER TABLE service_orders DROP CONSTRAINT IF EXISTS service_orders_status_check;
ALTER TABLE service_orders ADD CONSTRAINT service_orders_status_check
  CHECK (status IN (
    'open',
    'in_progress',
    'aprovada',
    'finalizada',
    'medida',
    'faturada',
    'completed',
    'cancelled'
  ));

ALTER TABLE service_orders
  ADD COLUMN IF NOT EXISTS finalized_at TIMESTAMPTZ;
