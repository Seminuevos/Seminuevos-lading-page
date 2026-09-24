-- ============================================================
-- Migración: 2026-09-18_03 — rental_customers
-- Clientes de alquiler. Sin cuenta/login — el único requisito es email +
-- teléfono. Email único: si la misma persona vuelve a pedir, el backend
-- reutiliza el mismo registro (find-or-create) en vez de duplicar.
-- ============================================================

CREATE TABLE IF NOT EXISTS rental_customers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT NOT NULL UNIQUE,
    phone TEXT NOT NULL,
    full_name TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE rental_customers ENABLE ROW LEVEL SECURITY;

-- Contiene PII (email/teléfono) — nunca lectura pública. Todo el acceso pasa
-- por el backend (service_role bypasea RLS; esta política solo cubre el
-- caso de una sesión de Supabase Auth directa, que no usamos).
DROP POLICY IF EXISTS "Admin full access rental_customers" ON rental_customers;
CREATE POLICY "Admin full access rental_customers"
    ON rental_customers FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE OR REPLACE FUNCTION update_rental_customers_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_rental_customers_updated_at ON rental_customers;
CREATE TRIGGER trg_rental_customers_updated_at
    BEFORE UPDATE ON rental_customers
    FOR EACH ROW EXECUTE FUNCTION update_rental_customers_updated_at();
