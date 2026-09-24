-- =============================================
-- SemiNuevo Agency — condiciones de concesionario + fee de depósito
-- =============================================
-- `contact_person` es el nombre de la persona de contacto del concesionario
-- (distinto de `name`, que es el nombre del concesionario/dealership).
ALTER TABLE concesionarios ADD COLUMN IF NOT EXISTS contact_person TEXT;

-- Condiciones comerciales del concesionario: comisiones de venta/alquiler y
-- los fees que se le cobran al cliente final en un alquiler. Un registro por
-- concesionario (no historial de cambios — solo el valor vigente).
CREATE TABLE IF NOT EXISTS concesionario_conditions (
    id BIGSERIAL PRIMARY KEY,
    concesionario_id BIGINT NOT NULL UNIQUE REFERENCES concesionarios(id) ON DELETE CASCADE,
    sale_commission_pct NUMERIC(5,2),
    rental_commission_pct NUMERIC(5,2),
    reservation_fee_type TEXT CHECK (reservation_fee_type IN ('percent', 'fixed')),
    reservation_fee_value NUMERIC(10,2),
    insurance_fee_pct NUMERIC(5,2),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE concesionario_conditions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admin full access concesionario_conditions" ON concesionario_conditions;
DROP POLICY IF EXISTS "Block anon access to concesionario_conditions" ON concesionario_conditions;

CREATE POLICY "Admin full access concesionario_conditions"
    ON concesionario_conditions FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Block anon access to concesionario_conditions"
    ON concesionario_conditions FOR SELECT TO anon USING (false);

-- Reutiliza update_updated_at(), definida en 20260901000001_vehicles.sql
DROP TRIGGER IF EXISTS trg_concesionario_conditions_updated_at ON concesionario_conditions;
CREATE TRIGGER trg_concesionario_conditions_updated_at
    BEFORE UPDATE ON concesionario_conditions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Fee de depósito: es por vehículo (no por concesionario), y solo aplica
-- cuando el vehículo tiene available_for_rental = true — se edita en la
-- ficha del vehículo, no en las condiciones del concesionario.
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS deposit_fee_type TEXT CHECK (deposit_fee_type IN ('percent', 'fixed'));
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS deposit_fee_value NUMERIC(10,2);
