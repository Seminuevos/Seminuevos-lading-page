-- =============================================
-- SemiNuevo Agency — Vehicle Inquiries Schema
-- =============================================
-- Consultas de clientes sobre un vehículo puntual del catálogo: nombre,
-- teléfono, y el motivo (a qué vehículo se refiere y si preguntan por
-- alquilarlo, comprarlo o importarlo). Separado de `inquiries` (formulario
-- de contacto general y postulación de empleo, sin vehículo asociado).
--
-- `vehicle_id` referencia siempre `vehicles`, nunca `rental_vehicles` (la
-- flota de alquiler por día es un catálogo aparte con su propio flujo
-- rental_requests/rental_customers — no se toca acá). Una consulta con
-- inquiry_type='alquiler' es sobre un vehículo de `vehicles` que tiene
-- available_for_rental=true.

CREATE TABLE IF NOT EXISTS vehicle_inquiries (
    id BIGSERIAL PRIMARY KEY,
    full_name TEXT NOT NULL,
    phone TEXT NOT NULL,
    vehicle_id BIGINT NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
    inquiry_type TEXT NOT NULL CHECK (inquiry_type IN ('alquiler', 'compra', 'importacion')),
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'contacted', 'closed')),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE vehicle_inquiries ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can insert vehicle inquiries" ON vehicle_inquiries;
DROP POLICY IF EXISTS "Admin full access vehicle inquiries" ON vehicle_inquiries;
DROP POLICY IF EXISTS "Block anon read of vehicle inquiries" ON vehicle_inquiries;

CREATE POLICY "Public can insert vehicle inquiries"
    ON vehicle_inquiries FOR INSERT TO anon WITH CHECK (true);

CREATE POLICY "Block anon read of vehicle inquiries"
    ON vehicle_inquiries FOR SELECT TO anon USING (false);

CREATE POLICY "Admin full access vehicle inquiries"
    ON vehicle_inquiries FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_vehicle_inquiries_vehicle_id ON vehicle_inquiries(vehicle_id);
