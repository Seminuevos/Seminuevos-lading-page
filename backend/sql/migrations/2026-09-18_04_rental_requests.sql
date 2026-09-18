-- ============================================================
-- Migración: 2026-09-18_04 — rental_requests
-- La solicitud de alquiler: 1 cliente -> N solicitudes (una fila por
-- vehículo pedido). Si un cliente reserva varios vehículos en un solo
-- checkout, comparten `request_group_id` para que el admin los vea
-- agrupados sin forzar una tabla puente adicional.
--
-- Flujo de status: pending -> contacted -> confirmed -> paid -> completed
--                                                       \-> cancelled
-- ============================================================

CREATE TABLE IF NOT EXISTS rental_requests (
    id BIGSERIAL PRIMARY KEY,
    request_group_id UUID DEFAULT gen_random_uuid(),
    customer_id UUID NOT NULL REFERENCES rental_customers(id) ON DELETE CASCADE,
    rental_vehicle_id BIGINT REFERENCES rental_vehicles(id) ON DELETE SET NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    estimated_total NUMERIC(10,2),
    status TEXT NOT NULL DEFAULT 'pending'
        CHECK (status IN ('pending', 'contacted', 'confirmed', 'paid', 'completed', 'cancelled')),
    notes TEXT,
    admin_notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT rental_requests_date_order CHECK (end_date >= start_date)
);

CREATE INDEX IF NOT EXISTS idx_rental_requests_customer ON rental_requests (customer_id);
CREATE INDEX IF NOT EXISTS idx_rental_requests_vehicle ON rental_requests (rental_vehicle_id);
CREATE INDEX IF NOT EXISTS idx_rental_requests_status ON rental_requests (status);

ALTER TABLE rental_requests ENABLE ROW LEVEL SECURITY;

-- Sin lectura pública (expondría email/teléfono del cliente vía join
-- implícito en la app). La creación de la solicitud pasa por el backend
-- (POST /api/public/rentals/requests), que usa la service_role key.
DROP POLICY IF EXISTS "Admin full access rental_requests" ON rental_requests;
CREATE POLICY "Admin full access rental_requests"
    ON rental_requests FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE OR REPLACE FUNCTION update_rental_requests_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_rental_requests_updated_at ON rental_requests;
CREATE TRIGGER trg_rental_requests_updated_at
    BEFORE UPDATE ON rental_requests
    FOR EACH ROW EXECUTE FUNCTION update_rental_requests_updated_at();
