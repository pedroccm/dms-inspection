-- Migration: Create contracts table + add contract_name to service_orders
-- Run this in Supabase SQL Editor

CREATE TABLE IF NOT EXISTS contracts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE contracts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read contracts"
  ON contracts FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert contracts"
  ON contracts FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete contracts"
  ON contracts FOR DELETE
  TO authenticated
  USING (true);

-- Add contract_name to service_orders
ALTER TABLE service_orders
  ADD COLUMN IF NOT EXISTS contract_name TEXT;
