-- RF-10: 3-level approval flow migration
-- DO NOT execute directly - review and apply manually

-- 1. Update existing 'submitted' rows to 'aprovado'
UPDATE inspections SET status = 'aprovado' WHERE status = 'submitted';

-- 2. Remove old check constraint and add new one
ALTER TABLE inspections DROP CONSTRAINT IF EXISTS inspections_status_check;
ALTER TABLE inspections ADD CONSTRAINT inspections_status_check
  CHECK (status IN ('draft', 'in_progress', 'ready_for_review', 'aprovado', 'relatorio_reprovado', 'equipamento_reprovado', 'transferred'));

-- 3. Add rejection/review columns
ALTER TABLE inspections ADD COLUMN IF NOT EXISTS rejection_reason TEXT;
ALTER TABLE inspections ADD COLUMN IF NOT EXISTS rejection_type TEXT;
ALTER TABLE inspections ADD COLUMN IF NOT EXISTS reviewed_by UUID REFERENCES profiles(id);
ALTER TABLE inspections ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMPTZ;

-- 4. Update RLS policy: block executor edits when approved, equipment_reprovado, or transferred
-- (Previously blocked on 'submitted')
DROP POLICY IF EXISTS inspections_update_inspector ON inspections;
CREATE POLICY inspections_update_inspector ON inspections
  FOR UPDATE TO authenticated
  USING (
    inspector_id = auth.uid()
    AND status NOT IN ('aprovado', 'equipamento_reprovado', 'transferred')
  );
