-- RF-15: Expand equipment table with technical data fields from QR Code
-- These fields correspond to the nameplate data of reclosers (e.g., Arteche smART RC Plus)

ALTER TABLE equipment ADD COLUMN IF NOT EXISTS modelo TEXT;
ALTER TABLE equipment ADD COLUMN IF NOT EXISTS numero_serie_controle TEXT;
ALTER TABLE equipment ADD COLUMN IF NOT EXISTS numero_serie_tanque TEXT;
ALTER TABLE equipment ADD COLUMN IF NOT EXISTS marca TEXT;
ALTER TABLE equipment ADD COLUMN IF NOT EXISTS tipo TEXT;
ALTER TABLE equipment ADD COLUMN IF NOT EXISTS tensao_nominal TEXT;
ALTER TABLE equipment ADD COLUMN IF NOT EXISTS nbi TEXT;
ALTER TABLE equipment ADD COLUMN IF NOT EXISTS frequencia_nominal TEXT;
ALTER TABLE equipment ADD COLUMN IF NOT EXISTS corrente_nominal TEXT;
ALTER TABLE equipment ADD COLUMN IF NOT EXISTS capacidade_interrupcao TEXT;
ALTER TABLE equipment ADD COLUMN IF NOT EXISTS numero_fases TEXT;
ALTER TABLE equipment ADD COLUMN IF NOT EXISTS tipo_controle TEXT;
ALTER TABLE equipment ADD COLUMN IF NOT EXISTS modelo_controle TEXT;
ALTER TABLE equipment ADD COLUMN IF NOT EXISTS sensor_tensao TEXT;
ALTER TABLE equipment ADD COLUMN IF NOT EXISTS tc_interno TEXT;
ALTER TABLE equipment ADD COLUMN IF NOT EXISTS sequencia_operacao TEXT;
ALTER TABLE equipment ADD COLUMN IF NOT EXISTS meio_interrupcao TEXT;
ALTER TABLE equipment ADD COLUMN IF NOT EXISTS massa_interruptor TEXT;
ALTER TABLE equipment ADD COLUMN IF NOT EXISTS massa_caixa_controle TEXT;
ALTER TABLE equipment ADD COLUMN IF NOT EXISTS massa_total TEXT;
ALTER TABLE equipment ADD COLUMN IF NOT EXISTS norma_aplicavel TEXT;
ALTER TABLE equipment ADD COLUMN IF NOT EXISTS qr_code_raw TEXT;
