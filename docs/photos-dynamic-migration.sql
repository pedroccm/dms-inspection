-- RF-08: Dynamic photos (6-20 per inspection)
-- Remove the strict check constraint on photo_type to allow dynamic types
ALTER TABLE photos DROP CONSTRAINT IF EXISTS photos_photo_type_check;

-- Add a label column for custom photo names (e.g. "Foto 7", "Painel lateral")
ALTER TABLE photos ADD COLUMN IF NOT EXISTS label TEXT;
