-- =============================================
-- SemiNuevo Agency — Vehicles Schema
-- =============================================

CREATE TABLE IF NOT EXISTS vehicles (
    id BIGSERIAL PRIMARY KEY,
    title TEXT NOT NULL,
    price TEXT NOT NULL DEFAULT 'Consultar',
    year INTEGER NOT NULL,
    km TEXT DEFAULT '0 KM',
    engine TEXT DEFAULT '',
    transmission TEXT DEFAULT 'Automático',
    fuel TEXT DEFAULT 'Gasolina',
    body_type TEXT DEFAULT 'suv',
    condition TEXT DEFAULT 'seminuevo',
    availability TEXT DEFAULT 'entrega_inmediata',
    origin TEXT DEFAULT 'importado',
    color TEXT,
    badge TEXT,
    description TEXT DEFAULT '',
    features TEXT[] DEFAULT '{}',
    images TEXT[] DEFAULT '{}',
    catalog TEXT DEFAULT 'seminuevos',
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'sold')),
    mastertech BOOLEAN DEFAULT false,
    views INTEGER DEFAULT 0,
    created_by TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE vehicles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can read active vehicles" ON vehicles;
DROP POLICY IF EXISTS "Admin full access vehicles" ON vehicles;

-- Lectura pública solo de vehículos activos (usada directamente desde el frontend con la anon key)
CREATE POLICY "Public can read active vehicles"
    ON vehicles FOR SELECT USING (status = 'active');

-- El backend NestJS usa siempre la service_role key, que ignora RLS.
-- Esta política solo cubre el caso de usar la sesión de Supabase Auth directamente.
CREATE POLICY "Admin full access vehicles"
    ON vehicles FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS vehicles_updated_at ON vehicles;
CREATE TRIGGER vehicles_updated_at
    BEFORE UPDATE ON vehicles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Contador de vistas — función RPC segura invocable desde el frontend público
CREATE OR REPLACE FUNCTION increment_vehicle_views(vehicle_id BIGINT)
RETURNS void AS $$
  UPDATE vehicles
  SET views = COALESCE(views, 0) + 1
  WHERE id = vehicle_id;
$$ LANGUAGE sql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION increment_vehicle_views(BIGINT) TO anon;
GRANT EXECUTE ON FUNCTION increment_vehicle_views(BIGINT) TO authenticated;

-- Storage bucket de imágenes de vehículos
INSERT INTO storage.buckets (id, name, public)
VALUES ('vehicle-images', 'vehicle-images', true)
ON CONFLICT DO NOTHING;

DROP POLICY IF EXISTS "Public can view images" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload images" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete images" ON storage.objects;

CREATE POLICY "Public can view images"
    ON storage.objects FOR SELECT TO anon USING (bucket_id = 'vehicle-images');

CREATE POLICY "Authenticated users can upload images"
    ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'vehicle-images');

CREATE POLICY "Authenticated users can delete images"
    ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'vehicle-images');
