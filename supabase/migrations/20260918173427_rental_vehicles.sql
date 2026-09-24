-- ============================================================
-- Migración: 2026-09-18_01 — rental_vehicles
-- Vehículos disponibles para alquiler. Estructura similar a `vehicles`,
-- pero con un precio base por día en vez de precio de venta (el precio
-- real por rango de fechas vive en rental_price_rules, siguiente migración).
-- ============================================================

CREATE TABLE IF NOT EXISTS rental_vehicles (
    id BIGSERIAL PRIMARY KEY,
    title TEXT NOT NULL,
    year INTEGER,
    body_type TEXT,
    transmission TEXT DEFAULT 'Automático',
    fuel TEXT DEFAULT 'Gasolina',
    seats INTEGER,
    color TEXT,
    description TEXT DEFAULT '',
    images TEXT[] DEFAULT '{}',
    features TEXT[] DEFAULT '{}',
    default_price_per_day NUMERIC(10,2) NOT NULL CHECK (default_price_per_day >= 0),
    status TEXT NOT NULL DEFAULT 'available' CHECK (status IN ('available', 'unavailable', 'maintenance')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE rental_vehicles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can read available rental vehicles" ON rental_vehicles;
CREATE POLICY "Public can read available rental vehicles"
    ON rental_vehicles FOR SELECT USING (status = 'available');

DROP POLICY IF EXISTS "Admin full access rental_vehicles" ON rental_vehicles;
CREATE POLICY "Admin full access rental_vehicles"
    ON rental_vehicles FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE OR REPLACE FUNCTION update_rental_vehicles_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_rental_vehicles_updated_at ON rental_vehicles;
CREATE TRIGGER trg_rental_vehicles_updated_at
    BEFORE UPDATE ON rental_vehicles
    FOR EACH ROW EXECUTE FUNCTION update_rental_vehicles_updated_at();
