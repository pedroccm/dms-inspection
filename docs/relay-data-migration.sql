-- Migration: Add relay (relé de proteção) QR data to inspections
-- Date: 2026-04-20
-- Description: Stores the 11 optional fields parsed from the relay QR Code
-- (Fabricante, Modelo, Tensão auxiliar, Ranges, Freq., Nº Série, Ano/Mês, MAC).
-- Field is JSONB so schema can evolve without further migrations.

ALTER TABLE inspections
  ADD COLUMN IF NOT EXISTS relay_data JSONB;

COMMENT ON COLUMN inspections.relay_data IS
  'Optional relay nameplate data parsed from relay QR Code. Keys: fabricante, modelo, tensao_auxiliar, range_i_fase, range_in, range_v_fase, range_vs_vn, frequencia, numero_serie, ano_mes_fabricacao, mac.';
