-- =============================================
-- SemiNuevo Agency — vehicles: brand, model, doors
-- =============================================
-- Necesarios para los filtros de búsqueda del catálogo (marca/modelo/
-- puertas/año — año ya existe). Antes la "marca" se inferia buscando texto
-- dentro de `title` (ej. "Toyota Corolla 2023"), lo cual es fragil; ahora es
-- una columna real. Nullable: el inventario existente se completa con
-- `backend/scripts/backfill-brand-model.ts` (infiere brand/model desde
-- title) — `doors` no se puede inferir de forma confiable y queda vacío
-- hasta que se cargue a mano desde el panel.

ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS brand TEXT;
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS model TEXT;
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS doors INTEGER;

CREATE INDEX IF NOT EXISTS idx_vehicles_brand ON vehicles(brand);
CREATE INDEX IF NOT EXISTS idx_vehicles_model ON vehicles(model);
