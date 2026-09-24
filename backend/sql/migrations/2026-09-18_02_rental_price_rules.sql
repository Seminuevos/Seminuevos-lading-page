-- ============================================================
-- Migración: 2026-09-18_02 — rental_price_rules
-- Tarifas por rango de fechas para un vehículo de alquiler (ej. temporada
-- alta). Si una fecha pedida no cae dentro de ninguna regla, el backend usa
-- rental_vehicles.default_price_per_day como respaldo.
-- ============================================================

CREATE TABLE IF NOT EXISTS rental_price_rules (
    id BIGSERIAL PRIMARY KEY,
    rental_vehicle_id BIGINT NOT NULL REFERENCES rental_vehicles(id) ON DELETE CASCADE,
    label TEXT,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    price_per_day NUMERIC(10,2) NOT NULL CHECK (price_per_day >= 0),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT rental_price_rules_date_order CHECK (end_date >= start_date)
);

CREATE INDEX IF NOT EXISTS idx_rental_price_rules_vehicle_dates
    ON rental_price_rules (rental_vehicle_id, start_date, end_date);

ALTER TABLE rental_price_rules ENABLE ROW LEVEL SECURITY;

-- Los precios no son sensibles — necesarios para mostrar el catálogo público
-- con el precio correcto según las fechas que el visitante elija.
DROP POLICY IF EXISTS "Public can read rental price rules" ON rental_price_rules;
CREATE POLICY "Public can read rental price rules"
    ON rental_price_rules FOR SELECT USING (true);

DROP POLICY IF EXISTS "Admin full access rental_price_rules" ON rental_price_rules;
CREATE POLICY "Admin full access rental_price_rules"
    ON rental_price_rules FOR ALL TO authenticated USING (true) WITH CHECK (true);
