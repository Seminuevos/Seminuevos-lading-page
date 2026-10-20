-- ============================================================
-- MIGRACIÃ“N MAESTRA A NUEVO PROYECTO SUPABASE
-- Proyecto: SEMINUEVOS WEB RESPALDO (hknprlgyuwzolgnkwsmx)
-- ============================================================

-- Habilitar extensiÃ³n pgcrypto para bcrypt
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 1. TABLA VEHICLES
CREATE TABLE IF NOT EXISTS vehicles (
    id BIGSERIAL PRIMARY KEY,
    title TEXT NOT NULL,
    price TEXT NOT NULL,
    year INTEGER NOT NULL,
    km TEXT DEFAULT '0 KM',
    engine TEXT DEFAULT '',
    transmission TEXT DEFAULT 'AutomÃ¡tico',
    fuel TEXT DEFAULT 'Gasolina',
    body_type TEXT DEFAULT 'suv',
    condition TEXT DEFAULT 'seminuevo',
    availability TEXT DEFAULT 'entrega_inmediata',
    origin TEXT DEFAULT 'importado',
    badge TEXT,
    description TEXT DEFAULT '',
    images TEXT[] DEFAULT '{}',
    catalog TEXT DEFAULT 'seminuevos',
    status TEXT DEFAULT 'active',
    mastertech BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. TABLA SITE_SETTINGS
CREATE TABLE IF NOT EXISTS site_settings (
    key TEXT PRIMARY KEY,
    value JSONB NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. TABLA INQUIRIES
CREATE TABLE IF NOT EXISTS inquiries (
    id BIGSERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    phone TEXT,
    email TEXT,
    service TEXT,
    message TEXT,
    vehicle_id BIGINT,
    visitor_id TEXT,
    status TEXT DEFAULT 'new',
    ip_address TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. TABLA SITE_LEADS
CREATE TABLE IF NOT EXISTS site_leads (
    id BIGSERIAL PRIMARY KEY,
    visitor_id TEXT UNIQUE NOT NULL,
    email TEXT,
    name TEXT,
    phone TEXT,
    last_active TIMESTAMPTZ DEFAULT NOW(),
    tags TEXT[] DEFAULT '{}',
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. TABLA AGENCY_USERS
CREATE TABLE IF NOT EXISTS agency_users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    full_name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    phone TEXT,
    role TEXT NOT NULL DEFAULT 'sales',
    branch TEXT DEFAULT 'Porlamar (Sede Principal)',
    status TEXT DEFAULT 'active',
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. TABLA SITE_ANALYTICS
CREATE TABLE IF NOT EXISTS site_analytics (
    id BIGSERIAL PRIMARY KEY,
    event_type TEXT NOT NULL,
    event_data JSONB,
    url TEXT,
    visitor_id TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. TABLA SECURITY_LOGS
CREATE TABLE IF NOT EXISTS security_logs (
    id BIGSERIAL PRIMARY KEY,
    event_type TEXT NOT NULL,
    severity TEXT NOT NULL DEFAULT 'info',
    ip_address TEXT,
    details TEXT,
    user_agent TEXT,
    metadata JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. TABLA IP_BLACKLIST
CREATE TABLE IF NOT EXISTS ip_blacklist (
    ip TEXT PRIMARY KEY,
    reason TEXT,
    blocked_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ
);

-- HABILITAR ROW LEVEL SECURITY (RLS)
ALTER TABLE vehicles ENABLE ROW LEVEL SECURITY;
ALTER TABLE site_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE inquiries ENABLE ROW LEVEL SECURITY;
ALTER TABLE site_leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE agency_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE site_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE security_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE ip_blacklist ENABLE ROW LEVEL SECURITY;

-- POLÃTICAS RLS SEGURAS
DROP POLICY IF EXISTS "Public can read active vehicles" ON vehicles;
CREATE POLICY "Public can read active vehicles" ON vehicles FOR SELECT USING (status = 'active');

DROP POLICY IF EXISTS "Admin full access vehicles" ON vehicles;
CREATE POLICY "Admin full access vehicles" ON vehicles FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Public can read settings" ON site_settings;
CREATE POLICY "Public can read settings" ON site_settings FOR SELECT TO anon USING (true);

DROP POLICY IF EXISTS "Admin full access settings" ON site_settings;
CREATE POLICY "Admin full access settings" ON site_settings FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Public can insert inquiries" ON inquiries;
CREATE POLICY "Public can insert inquiries" ON inquiries FOR INSERT TO anon WITH CHECK (true);

DROP POLICY IF EXISTS "Admin full access inquiries" ON inquiries;
CREATE POLICY "Admin full access inquiries" ON inquiries FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Public can insert leads" ON site_leads;
CREATE POLICY "Public can insert leads" ON site_leads FOR INSERT TO anon WITH CHECK (true);

DROP POLICY IF EXISTS "Admin full access leads" ON site_leads;
CREATE POLICY "Admin full access leads" ON site_leads FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Block anon access to agency_users" ON agency_users;
CREATE POLICY "Block anon access to agency_users" ON agency_users FOR SELECT TO anon USING (false);

DROP POLICY IF EXISTS "Admin full access agency_users" ON agency_users;
CREATE POLICY "Admin full access agency_users" ON agency_users FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Public can insert analytics" ON site_analytics;
CREATE POLICY "Public can insert analytics" ON site_analytics FOR INSERT TO anon WITH CHECK (true);

DROP POLICY IF EXISTS "Admin full access analytics" ON site_analytics;
CREATE POLICY "Admin full access analytics" ON site_analytics FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Public can insert security logs" ON security_logs;
CREATE POLICY "Public can insert security logs" ON security_logs FOR INSERT TO anon WITH CHECK (true);

DROP POLICY IF EXISTS "Admin full access security logs" ON security_logs;
CREATE POLICY "Admin full access security logs" ON security_logs FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- TRIGGERS
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS vehicles_updated_at ON vehicles;
CREATE TRIGGER vehicles_updated_at BEFORE UPDATE ON vehicles FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE OR REPLACE FUNCTION sync_inquiry_to_leads()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.visitor_id IS NOT NULL THEN
        INSERT INTO site_leads (visitor_id, email, name, phone, last_active)
        VALUES (NEW.visitor_id, NEW.email, NEW.name, NEW.phone, NOW())
        ON CONFLICT (visitor_id) DO UPDATE SET
            email = EXCLUDED.email,
            name = EXCLUDED.name,
            phone = EXCLUDED.phone,
            last_active = NOW();
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tr_sync_inquiry_to_leads ON inquiries;
CREATE TRIGGER tr_sync_inquiry_to_leads AFTER INSERT ON inquiries FOR EACH ROW EXECUTE FUNCTION sync_inquiry_to_leads();

-- STORAGE BUCKET
INSERT INTO storage.buckets (id, name, public) VALUES ('vehicle-images', 'vehicle-images', true) ON CONFLICT DO NOTHING;

DROP POLICY IF EXISTS "Public can view images" ON storage.objects;
CREATE POLICY "Public can view images" ON storage.objects FOR SELECT TO anon USING (bucket_id = 'vehicle-images');

DROP POLICY IF EXISTS "Authenticated users can upload images" ON storage.objects;
CREATE POLICY "Authenticated users can upload images" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'vehicle-images');

DROP POLICY IF EXISTS "Authenticated users can delete images" ON storage.objects;
CREATE POLICY "Authenticated users can delete images" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'vehicle-images');

-- ============================================================
-- USUARIOS DEL STAFF (CON BCRYPT SEGURO)
-- ============================================================
INSERT INTO agency_users (full_name, email, password_hash, phone, role, branch, status, notes)
VALUES
    ('Administrador Master', 'jvaask16@gmail.com', crypt('Jvaask2006..', gen_salt('bf', 12)), '+58 424 8700438', 'admin', 'Porlamar (Sede Principal)', 'active', 'Acceso Directivo Principal y Supervisor General de Seminuevos'),
    ('Jvicente', 'jvicente@seminuevos.com', crypt('Admin123', gen_salt('bf', 12)), '+58 424 8700438', 'admin', 'Porlamar (Sede Principal)', 'active', 'Director General de Operaciones Seminuevos'),
    ('Matteo Lariccia', 'matteo@seminuevos.com', crypt('Admin123', gen_salt('bf', 12)), '', 'sales', 'Porlamar (Sede Principal)', 'active', 'Asesor Comercial'),
    ('Carlos Mendoza', 'carlos.ventas@seminuevos.com', crypt('Ventas2026!', gen_salt('bf', 12)), '+58 424 8700438', 'sales', 'Porlamar (Sede Principal)', 'active', 'Asesor Comercial Senior'),
    ('MarÃ­a GonzÃ¡lez', 'credito@seminuevos.com', crypt('Credito2026!', gen_salt('bf', 12)), '+58 412 1234567', 'credit', 'Porlamar (Sede Principal)', 'active', 'Analista de Mesa de CrÃ©dito'),
    ('Taller MasterTech (Perito)', 'taller@mastertech.com', crypt('Taller2026!', gen_salt('bf', 12)), '+58 424 9876543', 'mechanic', 'Taller MasterTech', 'active', 'InspecciÃ³n MecÃ¡nica y AvalÃºo')
ON CONFLICT (email) DO UPDATE SET
    password_hash = EXCLUDED.password_hash,
    full_name = EXCLUDED.full_name,
    role = EXCLUDED.role,
    status = 'active';

-- SITE SETTINGS BÃSICOS
INSERT INTO site_settings (key, value) VALUES
    ('whatsapp_number', '"584248700438"'),
    ('company_name', '"SemiNuevo"'),
    ('company_slogan', '"Compra, Consigue, Accede"'),
    ('company_address', '"Porlamar, Isla de Margarita"'),
    ('company_hours', '"Lun - SÃ¡b: 9:00 AM - 6:00 PM"'),
    ('social_facebook', '"https://www.facebook.com"'),
    ('social_instagram', '"https://www.instagram.com"'),
    ('social_tiktok', '"https://www.tiktok.com"'),
    ('social_youtube', '"https://www.youtube.com"')
ON CONFLICT (key) DO NOTHING;

-- VEHICULOS
-- INSERT ALL VEHICLES FROM data.js
INSERT INTO vehicles (title, price, year, km, engine, transmission, fuel, body_type, condition, availability, origin, badge, description, images, catalog, status) VALUES ('Honda HR-V Sport 2025 4x4 AWD', '$36,000', 2025, '15,000 KM', '2.0L', 'AutomÃ¡tico', 'Gasolina', 'suv', 'seminuevo', 'entrega_inmediata', 'nacional', 'ENTREGA INMEDIATA', 'Honda HR-V Sport 2025 con tracciÃ³n 4x4 AWD. Motor 2.0L, transmisiÃ³n automÃ¡tica. UbicaciÃ³n Porlamar. Nivel de daÃ±o leve: golpe en puerta trasera piloto. 15,000 km recorridos. Entrega inmediata.', ARRAY['images/gallery/honda-hrv-sport-2025-4x4-awd/1.jpg','images/gallery/honda-hrv-sport-2025-4x4-awd/2.jpg','images/gallery/honda-hrv-sport-2025-4x4-awd/3.jpg','images/gallery/honda-hrv-sport-2025-4x4-awd/4.jpg','images/gallery/honda-hrv-sport-2025-4x4-awd/5.jpg','images/gallery/honda-hrv-sport-2025-4x4-awd/6.jpg','images/gallery/honda-hrv-sport-2025-4x4-awd/7.jpg','images/gallery/honda-hrv-sport-2025-4x4-awd/8.jpg','images/gallery/honda-hrv-sport-2025-4x4-awd/9.jpg','images/gallery/honda-hrv-sport-2025-4x4-awd/10.jpg','images/gallery/honda-hrv-sport-2025-4x4-awd/11.jpg','images/gallery/honda-hrv-sport-2025-4x4-awd/12.jpg','images/gallery/honda-hrv-sport-2025-4x4-awd/13.jpg','images/gallery/honda-hrv-sport-2025-4x4-awd/14.jpg','images/gallery/honda-hrv-sport-2025-4x4-awd/15.jpg','images/gallery/honda-hrv-sport-2025-4x4-awd/16.jpg','images/gallery/honda-hrv-sport-2025-4x4-awd/17.jpg','images/gallery/honda-hrv-sport-2025-4x4-awd/18.jpg','images/gallery/honda-hrv-sport-2025-4x4-awd/19.jpg','images/gallery/honda-hrv-sport-2025-4x4-awd/20.jpg','images/gallery/honda-hrv-sport-2025-4x4-awd/21.jpg']::text[], 'seminuevos', 'active');
INSERT INTO vehicles (title, price, year, km, engine, transmission, fuel, body_type, condition, availability, origin, badge, description, images, catalog, status) VALUES ('Honda HR-V 2024 Sport', '$33,000', 2024, '25,000 KM', '2.0L', 'AutomÃ¡tico', 'Gasolina', 'suv', 'seminuevo', 'entrega_inmediata', 'nacional', 'PUERTO LIBRE', 'Honda HR-V 2024 Sport. Motor 2.0L, automÃ¡tica. UbicaciÃ³n Porlamar, Puerto Libre. VehÃ­culo tuvo daÃ±o leve en esquina trasera izquierda. Entrega inmediata llave en mano. 25,000 km.', ARRAY['images/gallery/honda-hrv-2024-sport/1.jpg','images/gallery/honda-hrv-2024-sport/2.jpg','images/gallery/honda-hrv-2024-sport/3.jpg','images/gallery/honda-hrv-2024-sport/4.jpg','images/gallery/honda-hrv-2024-sport/5.jpg','images/gallery/honda-hrv-2024-sport/6.jpg','images/gallery/honda-hrv-2024-sport/7.jpg','images/gallery/honda-hrv-2024-sport/8.jpg','images/gallery/honda-hrv-2024-sport/9.jpg','images/gallery/honda-hrv-2024-sport/10.jpg','images/gallery/honda-hrv-2024-sport/11.jpg','images/gallery/honda-hrv-2024-sport/12.jpg','images/gallery/honda-hrv-2024-sport/13.jpg','images/gallery/honda-hrv-2024-sport/14.jpg','images/gallery/honda-hrv-2024-sport/15.jpg','images/gallery/honda-hrv-2024-sport/16.jpg','images/gallery/honda-hrv-2024-sport/17.jpg','images/gallery/honda-hrv-2024-sport/18.jpg','images/gallery/honda-hrv-2024-sport/19.jpg','images/gallery/honda-hrv-2024-sport/20.jpg','images/gallery/honda-hrv-2024-sport/21.jpg','images/gallery/honda-hrv-2024-sport/22.jpg','images/gallery/honda-hrv-2024-sport/23.jpg','images/gallery/honda-hrv-2024-sport/24.jpg']::text[], 'seminuevos', 'active');
INSERT INTO vehicles (title, price, year, km, engine, transmission, fuel, body_type, condition, availability, origin, badge, description, images, catalog, status) VALUES ('Nissan Sentra SV 2025', '$26,000', 2025, '12,000 KM', '2.0L', 'AutomÃ¡tico', 'Gasolina', 'sedan', 'seminuevo', 'entrega_inmediata', 'nacional', 'PUERTO LIBRE', 'Nissan Sentra SV 2025. Motor 2.0L, automÃ¡tico. UbicaciÃ³n Porlamar, Puerto Libre. 12,000 km. Nivel de daÃ±o leve por granizo. Entrega inmediata.', ARRAY['images/gallery/nissan-sentra-sv-2025/1.jpg','images/gallery/nissan-sentra-sv-2025/2.jpg','images/gallery/nissan-sentra-sv-2025/3.jpg','images/gallery/nissan-sentra-sv-2025/4.jpg','images/gallery/nissan-sentra-sv-2025/5.jpg','images/gallery/nissan-sentra-sv-2025/6.jpg','images/gallery/nissan-sentra-sv-2025/7.jpg','images/gallery/nissan-sentra-sv-2025/8.jpg','images/gallery/nissan-sentra-sv-2025/9.jpg','images/gallery/nissan-sentra-sv-2025/10.jpg','images/gallery/nissan-sentra-sv-2025/11.jpg','images/gallery/nissan-sentra-sv-2025/12.jpg','images/gallery/nissan-sentra-sv-2025/13.jpg','images/gallery/nissan-sentra-sv-2025/14.jpg','images/gallery/nissan-sentra-sv-2025/15.jpg','images/gallery/nissan-sentra-sv-2025/16.jpg','images/gallery/nissan-sentra-sv-2025/17.jpg']::text[], 'seminuevos', 'active');
INSERT INTO vehicles (title, price, year, km, engine, transmission, fuel, body_type, condition, availability, origin, badge, description, images, catalog, status) VALUES ('Nissan Rogue Sport 2019', '$22,000', 2019, '50,000 KM', '2.0L', 'AutomÃ¡tico', 'Gasolina', 'suv', 'seminuevo', 'entrega_inmediata', 'nacional', 'SIN GOLPES', 'Nissan Rogue Sport 2019. Motor 2.0L, automÃ¡tica. 50,000 km. UbicaciÃ³n Porlamar, Puerto Libre (lista para nacionalizar). Mantenimiento al dÃ­a. Ãšnico dueÃ±o de concesionario, sin golpes.', ARRAY['images/gallery/rogue-sport-2019/1.jpg','images/gallery/rogue-sport-2019/2.jpg','images/gallery/rogue-sport-2019/3.jpg','images/gallery/rogue-sport-2019/4.jpg']::text[], 'seminuevos', 'active');
INSERT INTO vehicles (title, price, year, km, engine, transmission, fuel, body_type, condition, availability, origin, badge, description, images, catalog, status) VALUES ('Toyota 4Runner 2021 SR5', '$39,990', 2021, '81,000 KM', '4.0L V6', 'AutomÃ¡tico', 'Gasolina', 'suv', 'seminuevo', 'entrega_inmediata', 'nacional', '4x2', 'Toyota 4Runner 2021 SR5. Motor 4.0L V6, automÃ¡tica, 4x2. 81,000 km. UbicaciÃ³n Porlamar, Puerto Libre. Entrega inmediata. Nivel de daÃ±o medio: detalles estÃ©ticos, tuvo golpe en esquina trasera derecha.', ARRAY['images/gallery/toyota-4runner-2021-sr5/1.jpg','images/gallery/toyota-4runner-2021-sr5/2.jpg','images/gallery/toyota-4runner-2021-sr5/3.jpg','images/gallery/toyota-4runner-2021-sr5/4.jpg','images/gallery/toyota-4runner-2021-sr5/5.jpg','images/gallery/toyota-4runner-2021-sr5/6.jpg','images/gallery/toyota-4runner-2021-sr5/7.jpg','images/gallery/toyota-4runner-2021-sr5/8.jpg','images/gallery/toyota-4runner-2021-sr5/9.jpg','images/gallery/toyota-4runner-2021-sr5/10.jpg','images/gallery/toyota-4runner-2021-sr5/11.jpg','images/gallery/toyota-4runner-2021-sr5/12.jpg','images/gallery/toyota-4runner-2021-sr5/13.jpg','images/gallery/toyota-4runner-2021-sr5/14.jpg','images/gallery/toyota-4runner-2021-sr5/15.jpg','images/gallery/toyota-4runner-2021-sr5/16.jpg','images/gallery/toyota-4runner-2021-sr5/17.jpg','images/gallery/toyota-4runner-2021-sr5/18.jpg']::text[], 'seminuevos', 'active');
INSERT INTO vehicles (title, price, year, km, engine, transmission, fuel, body_type, condition, availability, origin, badge, description, images, catalog, status) VALUES ('Toyota Corolla Cross LE 4x4 AWD 2022', '$31,990', 2022, '21,000 KM', '2.0L', 'AutomÃ¡tico', 'Gasolina', 'suv', 'seminuevo', 'entrega_inmediata', 'nacional', 'PLACA NACIONAL', 'Toyota Corolla Cross LE 4x4 AWD 2022. Motor 2.0L, automÃ¡tico. Placa nacional. 21,000 km. UbicaciÃ³n Porlamar. Nivel de daÃ±o medio frontal derecho. VÃ¡lvula EGR ya eliminada. Entrega inmediata.', ARRAY['images/gallery/toyota-corolla-cross-le-4x4-awd-2022/1.jpg','images/gallery/toyota-corolla-cross-le-4x4-awd-2022/2.jpg','images/gallery/toyota-corolla-cross-le-4x4-awd-2022/3.jpg','images/gallery/toyota-corolla-cross-le-4x4-awd-2022/4.jpg','images/gallery/toyota-corolla-cross-le-4x4-awd-2022/5.jpg','images/gallery/toyota-corolla-cross-le-4x4-awd-2022/6.jpg','images/gallery/toyota-corolla-cross-le-4x4-awd-2022/7.jpg','images/gallery/toyota-corolla-cross-le-4x4-awd-2022/8.jpg','images/gallery/toyota-corolla-cross-le-4x4-awd-2022/9.jpg','images/gallery/toyota-corolla-cross-le-4x4-awd-2022/10.jpg','images/gallery/toyota-corolla-cross-le-4x4-awd-2022/11.jpg','images/gallery/toyota-corolla-cross-le-4x4-awd-2022/12.jpg','images/gallery/toyota-corolla-cross-le-4x4-awd-2022/13.jpg','images/gallery/toyota-corolla-cross-le-4x4-awd-2022/14.jpg','images/gallery/toyota-corolla-cross-le-4x4-awd-2022/15.jpg','images/gallery/toyota-corolla-cross-le-4x4-awd-2022/16.jpg','images/gallery/toyota-corolla-cross-le-4x4-awd-2022/17.jpg','images/gallery/toyota-corolla-cross-le-4x4-awd-2022/18.jpg','images/gallery/toyota-corolla-cross-le-4x4-awd-2022/19.jpg','images/gallery/toyota-corolla-cross-le-4x4-awd-2022/20.jpg','images/gallery/toyota-corolla-cross-le-4x4-awd-2022/21.jpg']::text[], 'seminuevos', 'active');
INSERT INTO vehicles (title, price, year, km, engine, transmission, fuel, body_type, condition, availability, origin, badge, description, images, catalog, status) VALUES ('GMC Sierra 1500 AT4 4WD', 'Consultar', 2026, '0 KM', 'Motor V8', 'AutomÃ¡tico', 'Gasolina', 'pickup', '0km', 'por_pedido', 'importado', 'ðŸ”¥ POR PEDIDO', 'GMC Sierra 1500 AT4 4WD, Short Bed. Pickup premium con tracciÃ³n 4x4. ImportaciÃ³n directa desde USA. Precio + movilizaciÃ³n, gastos de envÃ­o, aduana, impuestos y documentaciÃ³n.', ARRAY['images/gallery/026-gmc-sierra-1500-short-bed-at4-4wd/1.jpeg','images/gallery/026-gmc-sierra-1500-short-bed-at4-4wd/2.jpeg','images/gallery/026-gmc-sierra-1500-short-bed-at4-4wd/3.jpeg','images/gallery/026-gmc-sierra-1500-short-bed-at4-4wd/4.jpeg','images/gallery/026-gmc-sierra-1500-short-bed-at4-4wd/5.jpeg','images/gallery/026-gmc-sierra-1500-short-bed-at4-4wd/6.jpeg','images/gallery/026-gmc-sierra-1500-short-bed-at4-4wd/7.jpeg','images/gallery/026-gmc-sierra-1500-short-bed-at4-4wd/8.jpeg','images/gallery/026-gmc-sierra-1500-short-bed-at4-4wd/9.jpeg','images/gallery/026-gmc-sierra-1500-short-bed-at4-4wd/10.jpeg']::text[], '0km', 'active');
INSERT INTO vehicles (title, price, year, km, engine, transmission, fuel, body_type, condition, availability, origin, badge, description, images, catalog, status) VALUES ('Jeep Wrangler Unlimited Sport S 4x4 2022', 'Consultar', 2022, 'Bajo KM', '3.6L V6', 'AutomÃ¡tico', 'Gasolina', 'suv', 'seminuevo', 'por_pedido', 'importado', 'POR PEDIDO', 'Jeep Wrangler Unlimited Sport S 2022, 4 puertas, 4x4. Motor 3.6L V6, automÃ¡tico. ImportaciÃ³n desde USA. Precio + movilizaciÃ³n, gastos de envÃ­o, aduana, impuestos y documentaciÃ³n.', ARRAY['images/gallery/2022-jeep-wrangler-unlimited-sport-s-4x4/1.jpeg','images/gallery/2022-jeep-wrangler-unlimited-sport-s-4x4/2.jpeg','images/gallery/2022-jeep-wrangler-unlimited-sport-s-4x4/3.jpeg','images/gallery/2022-jeep-wrangler-unlimited-sport-s-4x4/4.jpeg','images/gallery/2022-jeep-wrangler-unlimited-sport-s-4x4/5.jpeg','images/gallery/2022-jeep-wrangler-unlimited-sport-s-4x4/6.jpeg','images/gallery/2022-jeep-wrangler-unlimited-sport-s-4x4/7.jpeg','images/gallery/2022-jeep-wrangler-unlimited-sport-s-4x4/8.jpeg','images/gallery/2022-jeep-wrangler-unlimited-sport-s-4x4/9.jpeg','images/gallery/2022-jeep-wrangler-unlimited-sport-s-4x4/10.jpeg','images/gallery/2022-jeep-wrangler-unlimited-sport-s-4x4/11.jpeg','images/gallery/2022-jeep-wrangler-unlimited-sport-s-4x4/12.jpeg','images/gallery/2022-jeep-wrangler-unlimited-sport-s-4x4/13.jpeg','images/gallery/2022-jeep-wrangler-unlimited-sport-s-4x4/14.jpeg']::text[], '0km', 'active');
INSERT INTO vehicles (title, price, year, km, engine, transmission, fuel, body_type, condition, availability, origin, badge, description, images, catalog, status) VALUES ('Lexus UX 200 2022', 'Consultar', 2022, 'Bajo KM', '2.0L', 'AutomÃ¡tico', 'Gasolina', 'suv', 'seminuevo', 'por_pedido', 'importado', 'PREMIUM', 'Lexus UX 200 2022. SUV premium compacto con motor 2.0L, transmisiÃ³n automÃ¡tica. ImportaciÃ³n directa desde USA. Precio + movilizaciÃ³n, gastos de envÃ­o, aduana, impuestos y documentaciÃ³n.', ARRAY['images/gallery/2022-lexus-ux-200/1.jpeg','images/gallery/2022-lexus-ux-200/2.jpeg','images/gallery/2022-lexus-ux-200/3.jpeg','images/gallery/2022-lexus-ux-200/4.jpeg','images/gallery/2022-lexus-ux-200/5.jpeg','images/gallery/2022-lexus-ux-200/6.jpeg','images/gallery/2022-lexus-ux-200/7.jpeg','images/gallery/2022-lexus-ux-200/8.jpeg','images/gallery/2022-lexus-ux-200/9.jpeg','images/gallery/2022-lexus-ux-200/10.jpeg','images/gallery/2022-lexus-ux-200/11.jpeg','images/gallery/2022-lexus-ux-200/12.jpeg','images/gallery/2022-lexus-ux-200/13.jpeg','images/gallery/2022-lexus-ux-200/14.jpeg','images/gallery/2022-lexus-ux-200/15.jpeg','images/gallery/2022-lexus-ux-200/16.jpeg']::text[], '0km', 'active');
INSERT INTO vehicles (title, price, year, km, engine, transmission, fuel, body_type, condition, availability, origin, badge, description, images, catalog, status) VALUES ('Hyundai Sonata SE 2023', 'Consultar', 2023, 'Bajo KM', '2.5L', 'AutomÃ¡tico', 'Gasolina', 'sedan', 'seminuevo', 'por_pedido', 'importado', 'POR PEDIDO', 'Hyundai Sonata SE 2023. SedÃ¡n elegante con motor 2.5L, automÃ¡tico. ImportaciÃ³n desde USA. Precio + movilizaciÃ³n, gastos de envÃ­o, aduana, impuestos y documentaciÃ³n.', ARRAY['images/gallery/2023-hyundai-sonata-se/1.jpeg','images/gallery/2023-hyundai-sonata-se/2.jpeg','images/gallery/2023-hyundai-sonata-se/3.jpeg','images/gallery/2023-hyundai-sonata-se/4.jpeg','images/gallery/2023-hyundai-sonata-se/5.jpeg','images/gallery/2023-hyundai-sonata-se/6.jpeg','images/gallery/2023-hyundai-sonata-se/7.jpeg','images/gallery/2023-hyundai-sonata-se/8.jpeg','images/gallery/2023-hyundai-sonata-se/9.jpeg','images/gallery/2023-hyundai-sonata-se/10.jpeg','images/gallery/2023-hyundai-sonata-se/11.jpeg','images/gallery/2023-hyundai-sonata-se/12.jpeg','images/gallery/2023-hyundai-sonata-se/13.jpeg','images/gallery/2023-hyundai-sonata-se/14.jpeg','images/gallery/2023-hyundai-sonata-se/15.jpeg','images/gallery/2023-hyundai-sonata-se/16.jpeg','images/gallery/2023-hyundai-sonata-se/17.jpeg']::text[], '0km', 'active');
INSERT INTO vehicles (title, price, year, km, engine, transmission, fuel, body_type, condition, availability, origin, badge, description, images, catalog, status) VALUES ('Hyundai Tucson SEL 2023', 'Consultar', 2023, 'Bajo KM', '2.5L I-4 187HP', 'AutomÃ¡tico', 'Gasolina', 'suv', 'seminuevo', 'por_pedido', 'importado', 'POR PEDIDO', 'Hyundai Tucson SEL 2023. SUV con motor 2.5L de 187HP, automÃ¡tica. ImportaciÃ³n desde USA. Precio + movilizaciÃ³n, gastos de envÃ­o, aduana, impuestos y documentaciÃ³n.', ARRAY['images/gallery/2023-hyundai-tucson-sel/1.jpeg','images/gallery/2023-hyundai-tucson-sel/2.jpeg','images/gallery/2023-hyundai-tucson-sel/3.jpeg','images/gallery/2023-hyundai-tucson-sel/4.jpeg','images/gallery/2023-hyundai-tucson-sel/5.jpeg','images/gallery/2023-hyundai-tucson-sel/6.jpeg','images/gallery/2023-hyundai-tucson-sel/7.jpeg','images/gallery/2023-hyundai-tucson-sel/8.jpeg','images/gallery/2023-hyundai-tucson-sel/9.jpeg','images/gallery/2023-hyundai-tucson-sel/10.jpeg','images/gallery/2023-hyundai-tucson-sel/11.jpeg','images/gallery/2023-hyundai-tucson-sel/12.jpeg','images/gallery/2023-hyundai-tucson-sel/13.jpeg','images/gallery/2023-hyundai-tucson-sel/14.jpeg','images/gallery/2023-hyundai-tucson-sel/15.jpeg']::text[], '0km', 'active');
INSERT INTO vehicles (title, price, year, km, engine, transmission, fuel, body_type, condition, availability, origin, badge, description, images, catalog, status) VALUES ('Isuzu NPR HD 2023', 'Consultar', 2023, 'Bajo KM', 'DiÃ©sel', 'AutomÃ¡tico', 'DiÃ©sel', 'pickup', 'seminuevo', 'por_pedido', 'importado', 'COMERCIAL', 'Isuzu NPR HD 2023. CamiÃ³n comercial diÃ©sel, ideal para trabajo pesado. ImportaciÃ³n directa desde USA. Precio + movilizaciÃ³n, gastos de envÃ­o, aduana, impuestos y documentaciÃ³n.', ARRAY['images/gallery/2023-isuzu-npr-hd/1.jpeg','images/gallery/2023-isuzu-npr-hd/2.jpeg','images/gallery/2023-isuzu-npr-hd/3.jpeg','images/gallery/2023-isuzu-npr-hd/4.jpeg','images/gallery/2023-isuzu-npr-hd/5.jpeg','images/gallery/2023-isuzu-npr-hd/6.jpeg','images/gallery/2023-isuzu-npr-hd/7.jpeg','images/gallery/2023-isuzu-npr-hd/8.jpeg','images/gallery/2023-isuzu-npr-hd/9.jpeg','images/gallery/2023-isuzu-npr-hd/10.jpeg','images/gallery/2023-isuzu-npr-hd/11.jpeg','images/gallery/2023-isuzu-npr-hd/12.jpeg','images/gallery/2023-isuzu-npr-hd/13.jpeg']::text[], '0km', 'active');
INSERT INTO vehicles (title, price, year, km, engine, transmission, fuel, body_type, condition, availability, origin, badge, description, images, catalog, status) VALUES ('Jeep Wrangler Willys Sport 4x4 2023', 'Consultar', 2023, 'Bajo KM', '3.6L V6', 'AutomÃ¡tico', 'Gasolina', 'suv', 'seminuevo', 'por_pedido', 'importado', '2 PUERTAS', 'Jeep Wrangler Willys Sport 2023, 2 puertas, 4x4. Motor 3.6L V6. El clÃ¡sico todoterreno. ImportaciÃ³n desde USA. Precio + movilizaciÃ³n, gastos de envÃ­o, aduana, impuestos y documentaciÃ³n.', ARRAY['images/gallery/2023-jeep-wrangler-2-door-willys-sport-4x4/1.jpeg','images/gallery/2023-jeep-wrangler-2-door-willys-sport-4x4/2.jpeg','images/gallery/2023-jeep-wrangler-2-door-willys-sport-4x4/3.jpeg','images/gallery/2023-jeep-wrangler-2-door-willys-sport-4x4/4.jpeg','images/gallery/2023-jeep-wrangler-2-door-willys-sport-4x4/5.jpeg','images/gallery/2023-jeep-wrangler-2-door-willys-sport-4x4/6.jpeg','images/gallery/2023-jeep-wrangler-2-door-willys-sport-4x4/7.jpeg','images/gallery/2023-jeep-wrangler-2-door-willys-sport-4x4/8.jpeg','images/gallery/2023-jeep-wrangler-2-door-willys-sport-4x4/9.jpeg','images/gallery/2023-jeep-wrangler-2-door-willys-sport-4x4/10.jpeg','images/gallery/2023-jeep-wrangler-2-door-willys-sport-4x4/11.jpeg','images/gallery/2023-jeep-wrangler-2-door-willys-sport-4x4/12.jpeg','images/gallery/2023-jeep-wrangler-2-door-willys-sport-4x4/13.jpeg','images/gallery/2023-jeep-wrangler-2-door-willys-sport-4x4/14.jpeg','images/gallery/2023-jeep-wrangler-2-door-willys-sport-4x4/15.jpeg','images/gallery/2023-jeep-wrangler-2-door-willys-sport-4x4/16.jpeg','images/gallery/2023-jeep-wrangler-2-door-willys-sport-4x4/17.jpeg']::text[], '0km', 'active');
INSERT INTO vehicles (title, price, year, km, engine, transmission, fuel, body_type, condition, availability, origin, badge, description, images, catalog, status) VALUES ('Range Rover Evoque R-Dynamic S 2023', 'Consultar', 2023, 'Bajo KM', '2.0L Turbo', 'AutomÃ¡tico', 'Gasolina', 'suv', 'seminuevo', 'por_pedido', 'importado', 'ðŸ”¥ PREMIUM', 'Land Rover Range Rover Evoque R-Dynamic S 2023. SUV de lujo con motor 2.0L Turbo, automÃ¡tico. ImportaciÃ³n directa desde USA. Precio + movilizaciÃ³n, gastos de envÃ­o, aduana, impuestos y documentaciÃ³n.', ARRAY['images/gallery/2023-land-rover-range-rover-evoque-r-dynamic-s/1.jpeg','images/gallery/2023-land-rover-range-rover-evoque-r-dynamic-s/2.jpeg','images/gallery/2023-land-rover-range-rover-evoque-r-dynamic-s/3.jpeg','images/gallery/2023-land-rover-range-rover-evoque-r-dynamic-s/4.jpeg','images/gallery/2023-land-rover-range-rover-evoque-r-dynamic-s/5.jpeg','images/gallery/2023-land-rover-range-rover-evoque-r-dynamic-s/6.jpeg','images/gallery/2023-land-rover-range-rover-evoque-r-dynamic-s/7.jpeg','images/gallery/2023-land-rover-range-rover-evoque-r-dynamic-s/8.jpeg','images/gallery/2023-land-rover-range-rover-evoque-r-dynamic-s/9.jpeg','images/gallery/2023-land-rover-range-rover-evoque-r-dynamic-s/10.jpeg','images/gallery/2023-land-rover-range-rover-evoque-r-dynamic-s/11.jpeg','images/gallery/2023-land-rover-range-rover-evoque-r-dynamic-s/12.jpeg','images/gallery/2023-land-rover-range-rover-evoque-r-dynamic-s/13.jpeg','images/gallery/2023-land-rover-range-rover-evoque-r-dynamic-s/14.jpeg','images/gallery/2023-land-rover-range-rover-evoque-r-dynamic-s/15.jpeg']::text[], '0km', 'active');
INSERT INTO vehicles (title, price, year, km, engine, transmission, fuel, body_type, condition, availability, origin, badge, description, images, catalog, status) VALUES ('Chevrolet Silverado 1500 LT 2024', 'Consultar', 2024, 'Bajo KM', 'V8', 'AutomÃ¡tico', 'Gasolina', 'pickup', 'seminuevo', 'por_pedido', 'importado', 'POR PEDIDO', 'Chevrolet Silverado 1500 LT 2024, 2WD, Standard Bed. Pickup full size, automÃ¡tica. ImportaciÃ³n desde USA. Precio + movilizaciÃ³n, gastos de envÃ­o, aduana, impuestos y documentaciÃ³n.', ARRAY['images/gallery/2024-chevrolet-silverado-1500-2wd-standard-bed-lt/1.jpeg','images/gallery/2024-chevrolet-silverado-1500-2wd-standard-bed-lt/2.jpeg','images/gallery/2024-chevrolet-silverado-1500-2wd-standard-bed-lt/3.jpeg','images/gallery/2024-chevrolet-silverado-1500-2wd-standard-bed-lt/4.jpeg','images/gallery/2024-chevrolet-silverado-1500-2wd-standard-bed-lt/5.jpeg','images/gallery/2024-chevrolet-silverado-1500-2wd-standard-bed-lt/6.jpeg','images/gallery/2024-chevrolet-silverado-1500-2wd-standard-bed-lt/7.jpeg','images/gallery/2024-chevrolet-silverado-1500-2wd-standard-bed-lt/8.jpeg','images/gallery/2024-chevrolet-silverado-1500-2wd-standard-bed-lt/9.jpeg','images/gallery/2024-chevrolet-silverado-1500-2wd-standard-bed-lt/10.jpeg','images/gallery/2024-chevrolet-silverado-1500-2wd-standard-bed-lt/11.jpeg','images/gallery/2024-chevrolet-silverado-1500-2wd-standard-bed-lt/12.jpeg','images/gallery/2024-chevrolet-silverado-1500-2wd-standard-bed-lt/13.jpeg','images/gallery/2024-chevrolet-silverado-1500-2wd-standard-bed-lt/14.jpeg','images/gallery/2024-chevrolet-silverado-1500-2wd-standard-bed-lt/15.jpeg','images/gallery/2024-chevrolet-silverado-1500-2wd-standard-bed-lt/16.jpeg']::text[], '0km', 'active');
INSERT INTO vehicles (title, price, year, km, engine, transmission, fuel, body_type, condition, availability, origin, badge, description, images, catalog, status) VALUES ('Ford F-150 XL 2024', 'Consultar', 2024, 'Bajo KM', 'V6/V8', 'AutomÃ¡tico', 'Gasolina', 'pickup', 'seminuevo', 'por_pedido', 'importado', 'POR PEDIDO', 'Ford F-150 XL 2024. La pickup mÃ¡s vendida de AmÃ©rica. AutomÃ¡tica. ImportaciÃ³n directa desde USA. Precio + movilizaciÃ³n, gastos de envÃ­o, aduana, impuestos y documentaciÃ³n.', ARRAY['images/gallery/2024-ford-f-150-xl/1.jpeg','images/gallery/2024-ford-f-150-xl/2.jpeg','images/gallery/2024-ford-f-150-xl/3.jpeg','images/gallery/2024-ford-f-150-xl/4.jpeg','images/gallery/2024-ford-f-150-xl/5.jpeg','images/gallery/2024-ford-f-150-xl/6.jpeg','images/gallery/2024-ford-f-150-xl/7.jpeg','images/gallery/2024-ford-f-150-xl/8.jpeg','images/gallery/2024-ford-f-150-xl/9.jpeg']::text[], '0km', 'active');
INSERT INTO vehicles (title, price, year, km, engine, transmission, fuel, body_type, condition, availability, origin, badge, description, images, catalog, status) VALUES ('Hyundai Santa Cruz SEL 2024', 'Consultar', 2024, 'Bajo KM', '2.5L', 'AutomÃ¡tico', 'Gasolina', 'pickup', 'seminuevo', 'por_pedido', 'importado', 'POR PEDIDO', 'Hyundai Santa Cruz SEL 2024. Pickup-SUV moderna con motor 2.5L, automÃ¡tica. ImportaciÃ³n desde USA. Precio + movilizaciÃ³n, gastos de envÃ­o, aduana, impuestos y documentaciÃ³n.', ARRAY['images/gallery/2024-hyundai-santa-cruz-sel/1.jpeg','images/gallery/2024-hyundai-santa-cruz-sel/2.jpeg','images/gallery/2024-hyundai-santa-cruz-sel/3.jpeg','images/gallery/2024-hyundai-santa-cruz-sel/4.jpeg','images/gallery/2024-hyundai-santa-cruz-sel/5.jpeg','images/gallery/2024-hyundai-santa-cruz-sel/6.jpeg','images/gallery/2024-hyundai-santa-cruz-sel/7.jpeg','images/gallery/2024-hyundai-santa-cruz-sel/8.jpeg','images/gallery/2024-hyundai-santa-cruz-sel/9.jpeg','images/gallery/2024-hyundai-santa-cruz-sel/10.jpeg','images/gallery/2024-hyundai-santa-cruz-sel/11.jpeg','images/gallery/2024-hyundai-santa-cruz-sel/12.jpeg','images/gallery/2024-hyundai-santa-cruz-sel/13.jpeg','images/gallery/2024-hyundai-santa-cruz-sel/14.jpeg','images/gallery/2024-hyundai-santa-cruz-sel/15.jpeg']::text[], '0km', 'active');
INSERT INTO vehicles (title, price, year, km, engine, transmission, fuel, body_type, condition, availability, origin, badge, description, images, catalog, status) VALUES ('Hyundai Sonata SEL 2024', 'Consultar', 2024, 'Bajo KM', '2.5L', 'AutomÃ¡tico', 'Gasolina', 'sedan', 'seminuevo', 'por_pedido', 'importado', 'POR PEDIDO', 'Hyundai Sonata SEL 2024. SedÃ¡n premium con motor 2.5L, automÃ¡tico. ImportaciÃ³n desde USA. Precio + movilizaciÃ³n, gastos de envÃ­o, aduana, impuestos y documentaciÃ³n.', ARRAY['images/gallery/2024-hyundai-sonata-sel/1.jpeg','images/gallery/2024-hyundai-sonata-sel/2.jpeg','images/gallery/2024-hyundai-sonata-sel/3.jpeg','images/gallery/2024-hyundai-sonata-sel/4.jpeg','images/gallery/2024-hyundai-sonata-sel/5.jpeg','images/gallery/2024-hyundai-sonata-sel/6.jpeg','images/gallery/2024-hyundai-sonata-sel/7.jpeg','images/gallery/2024-hyundai-sonata-sel/8.jpeg','images/gallery/2024-hyundai-sonata-sel/9.jpeg','images/gallery/2024-hyundai-sonata-sel/10.jpeg','images/gallery/2024-hyundai-sonata-sel/11.jpeg','images/gallery/2024-hyundai-sonata-sel/12.jpeg','images/gallery/2024-hyundai-sonata-sel/13.jpeg','images/gallery/2024-hyundai-sonata-sel/14.jpeg','images/gallery/2024-hyundai-sonata-sel/15.jpeg']::text[], '0km', 'active');
INSERT INTO vehicles (title, price, year, km, engine, transmission, fuel, body_type, condition, availability, origin, badge, description, images, catalog, status) VALUES ('Chevrolet Silverado 1500 Trail Boss 4WD 2025', 'Consultar', 2025, 'Bajo KM', 'V8', 'AutomÃ¡tico', 'Gasolina', 'pickup', 'seminuevo', 'por_pedido', 'importado', 'ðŸ”¥ TRAIL BOSS', 'Chevrolet Silverado 1500 Custom Trail Boss 2025, 4WD, Short Bed. Pickup todoterreno V8, automÃ¡tica. ImportaciÃ³n desde USA. Precio + movilizaciÃ³n, gastos de envÃ­o, aduana e impuestos.', ARRAY['images/gallery/2025-chevrolet-silverado-1500-4wd-short-bed-custom-trail-boss/1.jpeg','images/gallery/2025-chevrolet-silverado-1500-4wd-short-bed-custom-trail-boss/2.jpeg','images/gallery/2025-chevrolet-silverado-1500-4wd-short-bed-custom-trail-boss/3.jpeg','images/gallery/2025-chevrolet-silverado-1500-4wd-short-bed-custom-trail-boss/4.jpeg','images/gallery/2025-chevrolet-silverado-1500-4wd-short-bed-custom-trail-boss/5.jpeg','images/gallery/2025-chevrolet-silverado-1500-4wd-short-bed-custom-trail-boss/6.jpeg','images/gallery/2025-chevrolet-silverado-1500-4wd-short-bed-custom-trail-boss/7.jpeg','images/gallery/2025-chevrolet-silverado-1500-4wd-short-bed-custom-trail-boss/8.jpeg','images/gallery/2025-chevrolet-silverado-1500-4wd-short-bed-custom-trail-boss/9.jpeg','images/gallery/2025-chevrolet-silverado-1500-4wd-short-bed-custom-trail-boss/10.jpeg','images/gallery/2025-chevrolet-silverado-1500-4wd-short-bed-custom-trail-boss/11.jpeg','images/gallery/2025-chevrolet-silverado-1500-4wd-short-bed-custom-trail-boss/12.jpeg','images/gallery/2025-chevrolet-silverado-1500-4wd-short-bed-custom-trail-boss/13.jpeg','images/gallery/2025-chevrolet-silverado-1500-4wd-short-bed-custom-trail-boss/14.jpeg','images/gallery/2025-chevrolet-silverado-1500-4wd-short-bed-custom-trail-boss/15.jpeg','images/gallery/2025-chevrolet-silverado-1500-4wd-short-bed-custom-trail-boss/16.jpeg']::text[], '0km', 'active');
INSERT INTO vehicles (title, price, year, km, engine, transmission, fuel, body_type, condition, availability, origin, badge, description, images, catalog, status) VALUES ('Chevrolet Trax FWD 1RS 2025', 'Consultar', 2025, 'Bajo KM', '1.2L Turbo', 'AutomÃ¡tico', 'Gasolina', 'suv', 'seminuevo', 'por_pedido', 'importado', 'POR PEDIDO', 'Chevrolet Trax 1RS 2025. SUV compacto con motor 1.2L Turbo, automÃ¡tico. ImportaciÃ³n desde USA. Precio + movilizaciÃ³n, gastos de envÃ­o, aduana, impuestos y documentaciÃ³n.', ARRAY['images/gallery/2025-chevrolet-trax-fwd-1rs/1.jpeg','images/gallery/2025-chevrolet-trax-fwd-1rs/2.jpeg','images/gallery/2025-chevrolet-trax-fwd-1rs/3.jpeg','images/gallery/2025-chevrolet-trax-fwd-1rs/4.jpeg','images/gallery/2025-chevrolet-trax-fwd-1rs/5.jpeg','images/gallery/2025-chevrolet-trax-fwd-1rs/6.jpeg','images/gallery/2025-chevrolet-trax-fwd-1rs/7.jpeg','images/gallery/2025-chevrolet-trax-fwd-1rs/8.jpeg','images/gallery/2025-chevrolet-trax-fwd-1rs/9.jpeg','images/gallery/2025-chevrolet-trax-fwd-1rs/10.jpeg','images/gallery/2025-chevrolet-trax-fwd-1rs/11.jpeg','images/gallery/2025-chevrolet-trax-fwd-1rs/12.jpeg','images/gallery/2025-chevrolet-trax-fwd-1rs/13.jpeg','images/gallery/2025-chevrolet-trax-fwd-1rs/14.jpeg','images/gallery/2025-chevrolet-trax-fwd-1rs/15.jpeg']::text[], '0km', 'active');
INSERT INTO vehicles (title, price, year, km, engine, transmission, fuel, body_type, condition, availability, origin, badge, description, images, catalog, status) VALUES ('Ford Maverick Tremor 2025', 'Consultar', 2025, 'Bajo KM', '2.0L Turbo', 'AutomÃ¡tico', 'Gasolina', 'pickup', 'seminuevo', 'por_pedido', 'importado', 'ðŸ”¥ TREMOR', 'Ford Maverick Tremor 2025. Pickup compacta con paquete off-road Tremor, motor 2.0L Turbo, automÃ¡tica. ImportaciÃ³n desde USA. Precio + movilizaciÃ³n, gastos de envÃ­o, aduana e impuestos.', ARRAY['images/gallery/2025-ford-maverick-tremor/1.jpeg','images/gallery/2025-ford-maverick-tremor/2.jpeg','images/gallery/2025-ford-maverick-tremor/3.jpeg','images/gallery/2025-ford-maverick-tremor/4.jpeg','images/gallery/2025-ford-maverick-tremor/5.jpeg','images/gallery/2025-ford-maverick-tremor/6.jpeg','images/gallery/2025-ford-maverick-tremor/7.jpeg','images/gallery/2025-ford-maverick-tremor/8.jpeg','images/gallery/2025-ford-maverick-tremor/9.jpeg','images/gallery/2025-ford-maverick-tremor/10.jpeg','images/gallery/2025-ford-maverick-tremor/11.jpeg','images/gallery/2025-ford-maverick-tremor/12.jpeg','images/gallery/2025-ford-maverick-tremor/13.jpeg','images/gallery/2025-ford-maverick-tremor/14.jpeg','images/gallery/2025-ford-maverick-tremor/15.jpeg','images/gallery/2025-ford-maverick-tremor/16.jpeg','images/gallery/2025-ford-maverick-tremor/17.jpeg']::text[], '0km', 'active');
INSERT INTO vehicles (title, price, year, km, engine, transmission, fuel, body_type, condition, availability, origin, badge, description, images, catalog, status) VALUES ('Ford Transit-150 2025', 'Consultar', 2025, 'Bajo KM', '3.5L V6', 'AutomÃ¡tico', 'Gasolina', 'pickup', 'seminuevo', 'por_pedido', 'importado', 'COMERCIAL', 'Ford Transit-150 2025. Van comercial ideal para carga o pasajeros. Motor 3.5L V6, automÃ¡tica. ImportaciÃ³n desde USA. Precio + movilizaciÃ³n, gastos de envÃ­o, aduana e impuestos.', ARRAY['images/gallery/2025-ford-transit-150/1.jpeg','images/gallery/2025-ford-transit-150/2.jpeg','images/gallery/2025-ford-transit-150/3.jpeg','images/gallery/2025-ford-transit-150/4.jpeg','images/gallery/2025-ford-transit-150/5.jpeg','images/gallery/2025-ford-transit-150/6.jpeg','images/gallery/2025-ford-transit-150/7.jpeg','images/gallery/2025-ford-transit-150/8.jpeg','images/gallery/2025-ford-transit-150/9.jpeg','images/gallery/2025-ford-transit-150/10.jpeg','images/gallery/2025-ford-transit-150/11.jpeg','images/gallery/2025-ford-transit-150/12.jpeg','images/gallery/2025-ford-transit-150/13.jpeg','images/gallery/2025-ford-transit-150/14.jpeg','images/gallery/2025-ford-transit-150/15.jpeg']::text[], '0km', 'active');
INSERT INTO vehicles (title, price, year, km, engine, transmission, fuel, body_type, condition, availability, origin, badge, description, images, catalog, status) VALUES ('Honda Odyssey EX-L 2025', 'Consultar', 2025, 'Bajo KM', '3.5L V6', 'AutomÃ¡tico', 'Gasolina', 'suv', 'seminuevo', 'por_pedido', 'importado', 'FAMILIAR', 'Honda Odyssey EX-L 2025. Minivan premium con motor 3.5L V6, automÃ¡tica. Interior en cuero. ImportaciÃ³n desde USA. Precio + movilizaciÃ³n, gastos de envÃ­o, aduana e impuestos.', ARRAY['images/gallery/2025-honda-odyssey-ex-l/1.jpeg','images/gallery/2025-honda-odyssey-ex-l/2.jpeg','images/gallery/2025-honda-odyssey-ex-l/3.jpeg','images/gallery/2025-honda-odyssey-ex-l/4.jpeg','images/gallery/2025-honda-odyssey-ex-l/5.jpeg','images/gallery/2025-honda-odyssey-ex-l/6.jpeg','images/gallery/2025-honda-odyssey-ex-l/7.jpeg','images/gallery/2025-honda-odyssey-ex-l/8.jpeg','images/gallery/2025-honda-odyssey-ex-l/9.jpeg','images/gallery/2025-honda-odyssey-ex-l/10.jpeg','images/gallery/2025-honda-odyssey-ex-l/11.jpeg','images/gallery/2025-honda-odyssey-ex-l/12.jpeg','images/gallery/2025-honda-odyssey-ex-l/13.jpeg','images/gallery/2025-honda-odyssey-ex-l/14.jpeg','images/gallery/2025-honda-odyssey-ex-l/15.jpeg']::text[], '0km', 'active');
INSERT INTO vehicles (title, price, year, km, engine, transmission, fuel, body_type, condition, availability, origin, badge, description, images, catalog, status) VALUES ('Honda Odyssey EX-L 2025 (Negra)', 'Consultar', 2025, 'Bajo KM', '3.5L V6', 'AutomÃ¡tico', 'Gasolina', 'suv', 'seminuevo', 'por_pedido', 'importado', 'FAMILIAR', 'Honda Odyssey EX-L 2025 color negro. Minivan premium con motor 3.5L V6, automÃ¡tica. Interior en cuero. ImportaciÃ³n desde USA. Precio + movilizaciÃ³n, gastos de envÃ­o, aduana e impuestos.', ARRAY['images/gallery/2025-honda-odyssey-ex-l-negr/1.jpeg','images/gallery/2025-honda-odyssey-ex-l-negr/2.jpeg','images/gallery/2025-honda-odyssey-ex-l-negr/3.jpeg','images/gallery/2025-honda-odyssey-ex-l-negr/4.jpeg','images/gallery/2025-honda-odyssey-ex-l-negr/5.jpeg','images/gallery/2025-honda-odyssey-ex-l-negr/6.jpeg','images/gallery/2025-honda-odyssey-ex-l-negr/7.jpeg','images/gallery/2025-honda-odyssey-ex-l-negr/8.jpeg','images/gallery/2025-honda-odyssey-ex-l-negr/9.jpeg','images/gallery/2025-honda-odyssey-ex-l-negr/10.jpeg','images/gallery/2025-honda-odyssey-ex-l-negr/11.jpeg','images/gallery/2025-honda-odyssey-ex-l-negr/12.jpeg','images/gallery/2025-honda-odyssey-ex-l-negr/13.jpeg','images/gallery/2025-honda-odyssey-ex-l-negr/14.jpeg','images/gallery/2025-honda-odyssey-ex-l-negr/15.jpeg']::text[], '0km', 'active');
INSERT INTO vehicles (title, price, year, km, engine, transmission, fuel, body_type, condition, availability, origin, badge, description, images, catalog, status) VALUES ('Hyundai Elantra Hybrid Blue 2025', '$15,280+', 2025, '29,400 KM', '1.6L I-4 104HP', 'AutomÃ¡tico', 'HÃ­brido', 'sedan', 'seminuevo', 'por_pedido', 'importado', 'âš¡ HÃBRIDO', 'Hyundai Elantra Hybrid Blue 2025. Motor 1.6L I-4 de 104HP, automÃ¡tico. DaÃ±o izquierdo frontal. Airbags intactos. 29,400 km. Precio $15,280 + movilizaciÃ³n, envÃ­o, aduana e impuestos.', ARRAY['images/gallery/2025-hyundai-elantra-hybrid-blue/1.jpeg','images/gallery/2025-hyundai-elantra-hybrid-blue/2.jpeg','images/gallery/2025-hyundai-elantra-hybrid-blue/3.jpeg','images/gallery/2025-hyundai-elantra-hybrid-blue/4.jpeg','images/gallery/2025-hyundai-elantra-hybrid-blue/5.jpeg','images/gallery/2025-hyundai-elantra-hybrid-blue/6.jpeg','images/gallery/2025-hyundai-elantra-hybrid-blue/7.jpeg','images/gallery/2025-hyundai-elantra-hybrid-blue/8.jpeg','images/gallery/2025-hyundai-elantra-hybrid-blue/9.jpeg','images/gallery/2025-hyundai-elantra-hybrid-blue/10.jpeg','images/gallery/2025-hyundai-elantra-hybrid-blue/11.jpeg','images/gallery/2025-hyundai-elantra-hybrid-blue/12.jpeg','images/gallery/2025-hyundai-elantra-hybrid-blue/13.jpeg','images/gallery/2025-hyundai-elantra-hybrid-blue/14.jpeg','images/gallery/2025-hyundai-elantra-hybrid-blue/15.jpeg','images/gallery/2025-hyundai-elantra-hybrid-blue/16.jpeg','images/gallery/2025-hyundai-elantra-hybrid-blue/17.jpeg','images/gallery/2025-hyundai-elantra-hybrid-blue/18.jpeg','images/gallery/2025-hyundai-elantra-hybrid-blue/19.jpeg']::text[], '0km', 'active');
INSERT INTO vehicles (title, price, year, km, engine, transmission, fuel, body_type, condition, availability, origin, badge, description, images, catalog, status) VALUES ('Hyundai Elantra N 2025', '$15,400+', 2025, '49,400 KM', '2.0L Turbo 276HP', 'AutomÃ¡tico', 'Gasolina', 'sedan', 'seminuevo', 'por_pedido', 'importado', 'ðŸ”¥ 276HP', 'Hyundai Elantra N 2025. Motor 2.0L Turbo de 276HP, automÃ¡tico. DaÃ±o frontal y trasero. Falta convertidor catalÃ­tico. Airbags intactos. 49,400 km. Precio $15,400 + movilizaciÃ³n, envÃ­o, aduana e impuestos.', ARRAY['images/gallery/2025-hyundai-elantra-n/1.jpeg','images/gallery/2025-hyundai-elantra-n/2.jpeg','images/gallery/2025-hyundai-elantra-n/3.jpeg','images/gallery/2025-hyundai-elantra-n/4.jpeg','images/gallery/2025-hyundai-elantra-n/5.jpeg','images/gallery/2025-hyundai-elantra-n/6.jpeg','images/gallery/2025-hyundai-elantra-n/7.jpeg','images/gallery/2025-hyundai-elantra-n/8.jpeg','images/gallery/2025-hyundai-elantra-n/9.jpeg','images/gallery/2025-hyundai-elantra-n/10.jpeg','images/gallery/2025-hyundai-elantra-n/11.jpeg','images/gallery/2025-hyundai-elantra-n/12.jpeg','images/gallery/2025-hyundai-elantra-n/13.jpeg','images/gallery/2025-hyundai-elantra-n/14.jpeg','images/gallery/2025-hyundai-elantra-n/15.jpeg','images/gallery/2025-hyundai-elantra-n/16.jpeg','images/gallery/2025-hyundai-elantra-n/17.jpeg']::text[], '0km', 'active');
INSERT INTO vehicles (title, price, year, km, engine, transmission, fuel, body_type, condition, availability, origin, badge, description, images, catalog, status) VALUES ('Hyundai Kona SEL 2025', '$12,100+', 2025, '43,100 KM', '2.0L I-4 147HP', 'AutomÃ¡tico', 'Gasolina', 'suv', 'seminuevo', 'por_pedido', 'importado', 'POR PEDIDO', 'Hyundai Kona SEL 2025. Motor 2.0L I-4 de 147HP, automÃ¡tica. DaÃ±o leve lado derecho. Airbags explotados. 43,100 km. Precio $12,100 + movilizaciÃ³n, envÃ­o, aduana e impuestos.', ARRAY['images/gallery/2025-hyundai-kona-sel/1.jpeg','images/gallery/2025-hyundai-kona-sel/2.jpeg','images/gallery/2025-hyundai-kona-sel/3.jpeg','images/gallery/2025-hyundai-kona-sel/4.jpeg','images/gallery/2025-hyundai-kona-sel/5.jpeg','images/gallery/2025-hyundai-kona-sel/6.jpeg','images/gallery/2025-hyundai-kona-sel/7.jpeg','images/gallery/2025-hyundai-kona-sel/8.jpeg','images/gallery/2025-hyundai-kona-sel/9.jpeg','images/gallery/2025-hyundai-kona-sel/10.jpeg','images/gallery/2025-hyundai-kona-sel/11.jpeg','images/gallery/2025-hyundai-kona-sel/12.jpeg','images/gallery/2025-hyundai-kona-sel/13.jpeg','images/gallery/2025-hyundai-kona-sel/14.jpeg','images/gallery/2025-hyundai-kona-sel/15.jpeg','images/gallery/2025-hyundai-kona-sel/16.jpeg']::text[], '0km', 'active');
INSERT INTO vehicles (title, price, year, km, engine, transmission, fuel, body_type, condition, availability, origin, badge, description, images, catalog, status) VALUES ('Hyundai Tucson SEL 2025', '$14,860+', 2025, '52,200 KM', '2.5L I-4 187HP', 'AutomÃ¡tico', 'Gasolina', 'suv', 'seminuevo', 'por_pedido', 'importado', 'POR PEDIDO', 'Hyundai Tucson SEL 2025. Motor 2.5L I-4 de 187HP, automÃ¡tica. DaÃ±o trasero. Airbags intactos. 52,200 km. Precio $14,860 + movilizaciÃ³n, envÃ­o, aduana e impuestos.', ARRAY['images/gallery/2025-hyundai-tucson-sel/1.jpeg','images/gallery/2025-hyundai-tucson-sel/2.jpeg','images/gallery/2025-hyundai-tucson-sel/3.jpeg','images/gallery/2025-hyundai-tucson-sel/4.jpeg','images/gallery/2025-hyundai-tucson-sel/5.jpeg','images/gallery/2025-hyundai-tucson-sel/6.jpeg','images/gallery/2025-hyundai-tucson-sel/7.jpeg','images/gallery/2025-hyundai-tucson-sel/8.jpeg','images/gallery/2025-hyundai-tucson-sel/9.jpeg','images/gallery/2025-hyundai-tucson-sel/10.jpeg','images/gallery/2025-hyundai-tucson-sel/11.jpeg','images/gallery/2025-hyundai-tucson-sel/12.jpeg','images/gallery/2025-hyundai-tucson-sel/13.jpeg','images/gallery/2025-hyundai-tucson-sel/14.jpeg','images/gallery/2025-hyundai-tucson-sel/15.jpeg','images/gallery/2025-hyundai-tucson-sel/16.jpeg']::text[], '0km', 'active');
INSERT INTO vehicles (title, price, year, km, engine, transmission, fuel, body_type, condition, availability, origin, badge, description, images, catalog, status) VALUES ('Hyundai Tucson SEL Convenience 2025', '$11,950+', 2025, '68,500 KM', '2.5L I-4 187HP', 'AutomÃ¡tico', 'Gasolina', 'suv', 'seminuevo', 'por_pedido', 'importado', 'POR PEDIDO', 'Hyundai Tucson SEL Convenience 2025. Motor 2.5L I-4 de 187HP, automÃ¡tico. DaÃ±o frontal. Airbags explotados. 68,500 km. Precio $11,950 + movilizaciÃ³n, envÃ­o, aduana e impuestos.', ARRAY['images/gallery/2025-hyundai-tucson-sel-convenience/1.jpeg','images/gallery/2025-hyundai-tucson-sel-convenience/2.jpeg','images/gallery/2025-hyundai-tucson-sel-convenience/3.jpeg','images/gallery/2025-hyundai-tucson-sel-convenience/4.jpeg','images/gallery/2025-hyundai-tucson-sel-convenience/5.jpeg','images/gallery/2025-hyundai-tucson-sel-convenience/6.jpeg','images/gallery/2025-hyundai-tucson-sel-convenience/7.jpeg','images/gallery/2025-hyundai-tucson-sel-convenience/8.jpeg','images/gallery/2025-hyundai-tucson-sel-convenience/9.jpeg','images/gallery/2025-hyundai-tucson-sel-convenience/10.jpeg','images/gallery/2025-hyundai-tucson-sel-convenience/11.jpeg','images/gallery/2025-hyundai-tucson-sel-convenience/12.jpeg','images/gallery/2025-hyundai-tucson-sel-convenience/13.jpeg','images/gallery/2025-hyundai-tucson-sel-convenience/14.jpeg','images/gallery/2025-hyundai-tucson-sel-convenience/15.jpeg']::text[], '0km', 'active');
INSERT INTO vehicles (title, price, year, km, engine, transmission, fuel, body_type, condition, availability, origin, badge, description, images, catalog, status) VALUES ('Kia K5 GT-Line 2025', '$16,360+', 2025, '32,200 KM', '2.5L I-4 191HP', 'AutomÃ¡tico', 'Gasolina', 'sedan', 'seminuevo', 'por_pedido', 'importado', 'GT-LINE', 'Kia K5 GT-Line 2025. Motor 2.5L I-4 de 191HP, automÃ¡tico. DaÃ±o trasero. Airbags intactos. 32,200 km. Precio $16,360 + movilizaciÃ³n, envÃ­o, aduana e impuestos.', ARRAY['images/gallery/2025-kia-k5-gt-line/1.jpeg','images/gallery/2025-kia-k5-gt-line/2.jpeg','images/gallery/2025-kia-k5-gt-line/3.jpeg','images/gallery/2025-kia-k5-gt-line/4.jpeg','images/gallery/2025-kia-k5-gt-line/5.jpeg','images/gallery/2025-kia-k5-gt-line/6.jpeg','images/gallery/2025-kia-k5-gt-line/7.jpeg','images/gallery/2025-kia-k5-gt-line/8.jpeg','images/gallery/2025-kia-k5-gt-line/9.jpeg','images/gallery/2025-kia-k5-gt-line/10.jpeg','images/gallery/2025-kia-k5-gt-line/11.jpeg','images/gallery/2025-kia-k5-gt-line/12.jpeg','images/gallery/2025-kia-k5-gt-line/13.jpeg','images/gallery/2025-kia-k5-gt-line/14.jpeg','images/gallery/2025-kia-k5-gt-line/15.jpeg','images/gallery/2025-kia-k5-gt-line/16.jpeg','images/gallery/2025-kia-k5-gt-line/17.jpeg']::text[], '0km', 'active');
INSERT INTO vehicles (title, price, year, km, engine, transmission, fuel, body_type, condition, availability, origin, badge, description, images, catalog, status) VALUES ('Lexus GX 550 Overtrail+ 2025', '$79,940+', 2025, '10,400 KM', '3.4L V6 Turbo 349HP', 'AutomÃ¡tico', 'Gasolina', 'suv', 'seminuevo', 'por_pedido', 'importado', 'ðŸ”¥ EXCLUSIVO', 'Lexus GX 550 Overtrail+ 2025. Motor 3.4L V6 Turbo de 349HP, automÃ¡tica, 4x4. DaÃ±o lateral derecho. Airbags explotados. 10,400 km. Precio $79,940 + movilizaciÃ³n, envÃ­o, aduana e impuestos.', ARRAY['images/gallery/2025-lexus-gx-550-overtrail/1.jpeg','images/gallery/2025-lexus-gx-550-overtrail/2.jpeg','images/gallery/2025-lexus-gx-550-overtrail/3.jpeg','images/gallery/2025-lexus-gx-550-overtrail/4.jpeg','images/gallery/2025-lexus-gx-550-overtrail/5.jpeg','images/gallery/2025-lexus-gx-550-overtrail/6.jpeg','images/gallery/2025-lexus-gx-550-overtrail/7.jpeg','images/gallery/2025-lexus-gx-550-overtrail/8.jpeg','images/gallery/2025-lexus-gx-550-overtrail/9.jpeg','images/gallery/2025-lexus-gx-550-overtrail/10.jpeg','images/gallery/2025-lexus-gx-550-overtrail/11.jpeg','images/gallery/2025-lexus-gx-550-overtrail/12.jpeg','images/gallery/2025-lexus-gx-550-overtrail/13.jpeg','images/gallery/2025-lexus-gx-550-overtrail/14.jpeg','images/gallery/2025-lexus-gx-550-overtrail/15.jpeg','images/gallery/2025-lexus-gx-550-overtrail/16.jpeg']::text[], '0km', 'active');
INSERT INTO vehicles (title, price, year, km, engine, transmission, fuel, body_type, condition, availability, origin, badge, description, images, catalog, status) VALUES ('Lexus RC 350 F Sport 2025', '$23,800+', 2025, '4,300 KM', '3.5L V6 311HP', 'AutomÃ¡tico', 'Gasolina', 'coupe', 'seminuevo', 'por_pedido', 'importado', 'ðŸ”¥ JUGUETE', 'Lexus RC 350 F Sport 2025. Â¡JUGUETE! Motor 3.5L V6 de 311HP, automÃ¡tico, tracciÃ³n trasera. DaÃ±o frontal. Airbags explotados. Solo 4,300 km. Precio $23,800 + movilizaciÃ³n, envÃ­o, aduana e impuestos.', ARRAY['images/gallery/2025-lexus-rc-350-f-sport/1.jpeg','images/gallery/2025-lexus-rc-350-f-sport/2.jpeg','images/gallery/2025-lexus-rc-350-f-sport/3.jpeg','images/gallery/2025-lexus-rc-350-f-sport/4.jpeg','images/gallery/2025-lexus-rc-350-f-sport/5.jpeg','images/gallery/2025-lexus-rc-350-f-sport/6.jpeg','images/gallery/2025-lexus-rc-350-f-sport/7.jpeg','images/gallery/2025-lexus-rc-350-f-sport/8.jpeg','images/gallery/2025-lexus-rc-350-f-sport/9.jpeg','images/gallery/2025-lexus-rc-350-f-sport/10.jpeg','images/gallery/2025-lexus-rc-350-f-sport/11.jpeg','images/gallery/2025-lexus-rc-350-f-sport/12.jpeg','images/gallery/2025-lexus-rc-350-f-sport/13.jpeg','images/gallery/2025-lexus-rc-350-f-sport/14.jpeg','images/gallery/2025-lexus-rc-350-f-sport/15.jpeg','images/gallery/2025-lexus-rc-350-f-sport/16.jpeg','images/gallery/2025-lexus-rc-350-f-sport/17.jpeg']::text[], '0km', 'active');
INSERT INTO vehicles (title, price, year, km, engine, transmission, fuel, body_type, condition, availability, origin, badge, description, images, catalog, status) VALUES ('Lexus TX 350 Premium 2025', '$40,440+', 2025, '18,100 KM', '2.4L Turbo 275HP', 'AutomÃ¡tico', 'Gasolina', 'suv', 'seminuevo', 'por_pedido', 'importado', 'PREMIUM', 'Lexus TX 350 Premium 2025. Motor 2.4L Turbo de 275HP, automÃ¡tica, 4x4. DaÃ±o lateral derecho. Airbags explotados. 18,100 km. Precio $40,440 + movilizaciÃ³n, envÃ­o, aduana e impuestos.', ARRAY['images/gallery/2025-lexus-tx-350-premium/1.jpeg','images/gallery/2025-lexus-tx-350-premium/2.jpeg','images/gallery/2025-lexus-tx-350-premium/3.jpeg','images/gallery/2025-lexus-tx-350-premium/4.jpeg','images/gallery/2025-lexus-tx-350-premium/5.jpeg','images/gallery/2025-lexus-tx-350-premium/6.jpeg','images/gallery/2025-lexus-tx-350-premium/7.jpeg','images/gallery/2025-lexus-tx-350-premium/8.jpeg','images/gallery/2025-lexus-tx-350-premium/9.jpeg','images/gallery/2025-lexus-tx-350-premium/10.jpeg','images/gallery/2025-lexus-tx-350-premium/11.jpeg','images/gallery/2025-lexus-tx-350-premium/12.jpeg','images/gallery/2025-lexus-tx-350-premium/13.jpeg','images/gallery/2025-lexus-tx-350-premium/14.jpeg','images/gallery/2025-lexus-tx-350-premium/15.jpeg','images/gallery/2025-lexus-tx-350-premium/16.jpeg']::text[], '0km', 'active');
INSERT INTO vehicles (title, price, year, km, engine, transmission, fuel, body_type, condition, availability, origin, badge, description, images, catalog, status) VALUES ('Mitsubishi Outlander Sport AWC 2025', '$19,000+', 2025, '41,400 KM', '2.0L I-4 148HP', 'AutomÃ¡tico', 'Gasolina', 'suv', 'seminuevo', 'por_pedido', 'importado', '4x4 AWC', 'Mitsubishi Outlander Sport 2025 AWC. Motor 2.0L I-4 de 148HP, automÃ¡tica, tracciÃ³n 4x4. DaÃ±o leve trasero derecho. Airbags intactos. 41,400 km. Precio $19,000 + movilizaciÃ³n, envÃ­o, aduana e impuestos.', ARRAY['images/gallery/2025-mitsubishi-outlander-sport-2-0-es-awc2-0-le-awc2-0-s-awc2-0-se-awc2-0-trail-edition-awc/1.jpeg','images/gallery/2025-mitsubishi-outlander-sport-2-0-es-awc2-0-le-awc2-0-s-awc2-0-se-awc2-0-trail-edition-awc/2.jpeg','images/gallery/2025-mitsubishi-outlander-sport-2-0-es-awc2-0-le-awc2-0-s-awc2-0-se-awc2-0-trail-edition-awc/3.jpeg','images/gallery/2025-mitsubishi-outlander-sport-2-0-es-awc2-0-le-awc2-0-s-awc2-0-se-awc2-0-trail-edition-awc/4.jpeg','images/gallery/2025-mitsubishi-outlander-sport-2-0-es-awc2-0-le-awc2-0-s-awc2-0-se-awc2-0-trail-edition-awc/5.jpeg','images/gallery/2025-mitsubishi-outlander-sport-2-0-es-awc2-0-le-awc2-0-s-awc2-0-se-awc2-0-trail-edition-awc/6.jpeg','images/gallery/2025-mitsubishi-outlander-sport-2-0-es-awc2-0-le-awc2-0-s-awc2-0-se-awc2-0-trail-edition-awc/7.jpeg','images/gallery/2025-mitsubishi-outlander-sport-2-0-es-awc2-0-le-awc2-0-s-awc2-0-se-awc2-0-trail-edition-awc/8.jpeg','images/gallery/2025-mitsubishi-outlander-sport-2-0-es-awc2-0-le-awc2-0-s-awc2-0-se-awc2-0-trail-edition-awc/9.jpeg','images/gallery/2025-mitsubishi-outlander-sport-2-0-es-awc2-0-le-awc2-0-s-awc2-0-se-awc2-0-trail-edition-awc/10.jpeg','images/gallery/2025-mitsubishi-outlander-sport-2-0-es-awc2-0-le-awc2-0-s-awc2-0-se-awc2-0-trail-edition-awc/11.jpeg','images/gallery/2025-mitsubishi-outlander-sport-2-0-es-awc2-0-le-awc2-0-s-awc2-0-se-awc2-0-trail-edition-awc/12.jpeg','images/gallery/2025-mitsubishi-outlander-sport-2-0-es-awc2-0-le-awc2-0-s-awc2-0-se-awc2-0-trail-edition-awc/13.jpeg','images/gallery/2025-mitsubishi-outlander-sport-2-0-es-awc2-0-le-awc2-0-s-awc2-0-se-awc2-0-trail-edition-awc/14.jpeg','images/gallery/2025-mitsubishi-outlander-sport-2-0-es-awc2-0-le-awc2-0-s-awc2-0-se-awc2-0-trail-edition-awc/15.jpeg','images/gallery/2025-mitsubishi-outlander-sport-2-0-es-awc2-0-le-awc2-0-s-awc2-0-se-awc2-0-trail-edition-awc/16.jpeg']::text[], '0km', 'active');
INSERT INTO vehicles (title, price, year, km, engine, transmission, fuel, body_type, condition, availability, origin, badge, description, images, catalog, status) VALUES ('Nissan Altima SR FWD 2025', '$12,280+', 2025, '44,900 KM', '2.5L I-4 188HP', 'AutomÃ¡tico', 'Gasolina', 'sedan', 'seminuevo', 'por_pedido', 'importado', 'POR PEDIDO', 'Nissan Altima SR FWD 2025. Motor 2.5L I-4 de 188HP, automÃ¡tica. DaÃ±o frontal, parabrisas y techo. Airbags intactos. 44,900 km. Precio $12,280 + movilizaciÃ³n, envÃ­o, aduana e impuestos.', ARRAY['images/gallery/2025-nissan-altima-sr-fwd/1.jpeg','images/gallery/2025-nissan-altima-sr-fwd/2.jpeg','images/gallery/2025-nissan-altima-sr-fwd/3.jpeg','images/gallery/2025-nissan-altima-sr-fwd/4.jpeg','images/gallery/2025-nissan-altima-sr-fwd/5.jpeg','images/gallery/2025-nissan-altima-sr-fwd/6.jpeg','images/gallery/2025-nissan-altima-sr-fwd/7.jpeg','images/gallery/2025-nissan-altima-sr-fwd/8.jpeg','images/gallery/2025-nissan-altima-sr-fwd/9.jpeg','images/gallery/2025-nissan-altima-sr-fwd/10.jpeg','images/gallery/2025-nissan-altima-sr-fwd/11.jpeg','images/gallery/2025-nissan-altima-sr-fwd/12.jpeg','images/gallery/2025-nissan-altima-sr-fwd/13.jpeg','images/gallery/2025-nissan-altima-sr-fwd/14.jpeg','images/gallery/2025-nissan-altima-sr-fwd/15.jpeg','images/gallery/2025-nissan-altima-sr-fwd/16.jpeg']::text[], '0km', 'active');
INSERT INTO vehicles (title, price, year, km, engine, transmission, fuel, body_type, condition, availability, origin, badge, description, images, catalog, status) VALUES ('Nissan Ariya Engage 2025', '$15,400+', 2025, '17,100 KM', 'ElÃ©ctrico', 'AutomÃ¡tico', 'ElÃ©ctrico', 'suv', 'seminuevo', 'por_pedido', 'importado', 'âš¡ ELÃ‰CTRICO', 'Nissan Ariya Engage 2025. SUV 100% elÃ©ctrico, automÃ¡tico. DaÃ±o trasero izquierdo. Airbags intactos. 17,100 km. Precio $15,400 + movilizaciÃ³n, envÃ­o, aduana e impuestos.', ARRAY['images/gallery/2025-nissan-ariya-engage/1.jpeg','images/gallery/2025-nissan-ariya-engage/2.jpeg','images/gallery/2025-nissan-ariya-engage/3.jpeg','images/gallery/2025-nissan-ariya-engage/4.jpeg','images/gallery/2025-nissan-ariya-engage/5.jpeg','images/gallery/2025-nissan-ariya-engage/6.jpeg','images/gallery/2025-nissan-ariya-engage/7.jpeg','images/gallery/2025-nissan-ariya-engage/8.jpeg','images/gallery/2025-nissan-ariya-engage/9.jpeg','images/gallery/2025-nissan-ariya-engage/10.jpeg','images/gallery/2025-nissan-ariya-engage/11.jpeg','images/gallery/2025-nissan-ariya-engage/12.jpeg','images/gallery/2025-nissan-ariya-engage/13.jpeg','images/gallery/2025-nissan-ariya-engage/14.jpeg','images/gallery/2025-nissan-ariya-engage/15.jpeg','images/gallery/2025-nissan-ariya-engage/16.jpeg','images/gallery/2025-nissan-ariya-engage/17.jpeg','images/gallery/2025-nissan-ariya-engage/18.jpeg','images/gallery/2025-nissan-ariya-engage/19.jpeg']::text[], '0km', 'active');
INSERT INTO vehicles (title, price, year, km, engine, transmission, fuel, body_type, condition, availability, origin, badge, description, images, catalog, status) VALUES ('Nissan Frontier Pro-4X 4x4 2025', '$26,290+', 2025, '21,700 KM', '3.8L V6 310HP', 'AutomÃ¡tico', 'Gasolina', 'pickup', 'seminuevo', 'por_pedido', 'importado', 'ðŸ”¥ PRO-4X', 'Nissan Frontier Pro-4X 2025, 4x4, doble cabina. Motor 3.8L V6 de 310HP, automÃ¡tica. DaÃ±o frontal y trasero. Airbags intactos. 21,700 km. Precio $26,290 + movilizaciÃ³n, envÃ­o, aduana e impuestos.', ARRAY['images/gallery/2025-nissan-frontier-pro-4x-4x4/1.jpeg','images/gallery/2025-nissan-frontier-pro-4x-4x4/2.jpeg','images/gallery/2025-nissan-frontier-pro-4x-4x4/3.jpeg','images/gallery/2025-nissan-frontier-pro-4x-4x4/4.jpeg','images/gallery/2025-nissan-frontier-pro-4x-4x4/5.jpeg','images/gallery/2025-nissan-frontier-pro-4x-4x4/6.jpeg','images/gallery/2025-nissan-frontier-pro-4x-4x4/7.jpeg','images/gallery/2025-nissan-frontier-pro-4x-4x4/8.jpeg','images/gallery/2025-nissan-frontier-pro-4x-4x4/9.jpeg','images/gallery/2025-nissan-frontier-pro-4x-4x4/10.jpeg','images/gallery/2025-nissan-frontier-pro-4x-4x4/11.jpeg','images/gallery/2025-nissan-frontier-pro-4x-4x4/12.jpeg','images/gallery/2025-nissan-frontier-pro-4x-4x4/13.jpeg','images/gallery/2025-nissan-frontier-pro-4x-4x4/14.jpeg','images/gallery/2025-nissan-frontier-pro-4x-4x4/15.jpeg','images/gallery/2025-nissan-frontier-pro-4x-4x4/16.jpeg','images/gallery/2025-nissan-frontier-pro-4x-4x4/17.jpeg','images/gallery/2025-nissan-frontier-pro-4x-4x4/18.jpeg','images/gallery/2025-nissan-frontier-pro-4x-4x4/19.jpeg','images/gallery/2025-nissan-frontier-pro-4x-4x4/20.jpeg','images/gallery/2025-nissan-frontier-pro-4x-4x4/21.jpeg']::text[], '0km', 'active');
INSERT INTO vehicles (title, price, year, km, engine, transmission, fuel, body_type, condition, availability, origin, badge, description, images, catalog, status) VALUES ('Nissan Kicks Play S 2025', '$5,320+', 2025, '17,000 KM', '1.6L I-4 122HP', 'AutomÃ¡tico', 'Gasolina', 'suv', 'seminuevo', 'por_pedido', 'importado', 'ðŸ”¥ LOMITO', 'Nissan Kicks Play S 2025. Â¡LOMITO! Motor 1.6L I-4 de 122HP, automÃ¡tico. DaÃ±o leve frontal izquierdo. Airbags explotados. 17,000 km. Precio $5,320 + movilizaciÃ³n, envÃ­o, aduana e impuestos.', ARRAY['images/gallery/2025-nissan-kicks-play-s-lomitoooo/1.jpeg','images/gallery/2025-nissan-kicks-play-s-lomitoooo/2.jpeg','images/gallery/2025-nissan-kicks-play-s-lomitoooo/3.jpeg','images/gallery/2025-nissan-kicks-play-s-lomitoooo/4.jpeg','images/gallery/2025-nissan-kicks-play-s-lomitoooo/5.jpeg','images/gallery/2025-nissan-kicks-play-s-lomitoooo/6.jpeg','images/gallery/2025-nissan-kicks-play-s-lomitoooo/7.jpeg','images/gallery/2025-nissan-kicks-play-s-lomitoooo/8.jpeg','images/gallery/2025-nissan-kicks-play-s-lomitoooo/9.jpeg','images/gallery/2025-nissan-kicks-play-s-lomitoooo/10.jpeg','images/gallery/2025-nissan-kicks-play-s-lomitoooo/11.jpeg','images/gallery/2025-nissan-kicks-play-s-lomitoooo/12.jpeg','images/gallery/2025-nissan-kicks-play-s-lomitoooo/13.jpeg','images/gallery/2025-nissan-kicks-play-s-lomitoooo/14.jpeg','images/gallery/2025-nissan-kicks-play-s-lomitoooo/15.jpeg']::text[], '0km', 'active');
INSERT INTO vehicles (title, price, year, km, engine, transmission, fuel, body_type, condition, availability, origin, badge, description, images, catalog, status) VALUES ('Nissan Kicks SV 2025', '$10,300+', 2025, '2,600 KM', '2.0L I-4 141HP', 'AutomÃ¡tico', 'Gasolina', 'suv', 'seminuevo', 'por_pedido', 'importado', 'CASI NUEVO', 'Nissan Kicks SV 2025. Motor 2.0L I-4 de 141HP, automÃ¡tico. DaÃ±o leve, golpe en trasero izquierdo. Airbags intactos. Solo 2,600 km. Precio $10,300 + movilizaciÃ³n, envÃ­o, aduana e impuestos.', ARRAY['images/gallery/2025-nissan-kicks-sv/1.jpeg','images/gallery/2025-nissan-kicks-sv/2.jpeg','images/gallery/2025-nissan-kicks-sv/3.jpeg','images/gallery/2025-nissan-kicks-sv/4.jpeg','images/gallery/2025-nissan-kicks-sv/5.jpeg','images/gallery/2025-nissan-kicks-sv/6.jpeg','images/gallery/2025-nissan-kicks-sv/7.jpeg','images/gallery/2025-nissan-kicks-sv/8.jpeg','images/gallery/2025-nissan-kicks-sv/9.jpeg','images/gallery/2025-nissan-kicks-sv/10.jpeg','images/gallery/2025-nissan-kicks-sv/11.jpeg','images/gallery/2025-nissan-kicks-sv/12.jpeg','images/gallery/2025-nissan-kicks-sv/13.jpeg','images/gallery/2025-nissan-kicks-sv/14.jpeg','images/gallery/2025-nissan-kicks-sv/15.jpeg','images/gallery/2025-nissan-kicks-sv/16.jpeg']::text[], '0km', 'active');
INSERT INTO vehicles (title, price, year, km, engine, transmission, fuel, body_type, condition, availability, origin, badge, description, images, catalog, status) VALUES ('Nissan Kicks SV AWD 4x4 2025', '$12,370+', 2025, '2,000 KM', '2.0L I-4 141HP', 'AutomÃ¡tico', 'Gasolina', 'suv', 'seminuevo', 'por_pedido', 'importado', '4x4 AWD', 'Nissan Kicks SV Intelligent 4x4 AWD 2025. Motor 2.0L I-4 de 141HP, automÃ¡tica, tracciÃ³n 4x4. DaÃ±o frontal izquierdo. Airbags intactos. Solo 2,000 km. Precio $12,370 + movilizaciÃ³n, envÃ­o, aduana e impuestos.', ARRAY['images/gallery/2025-nissan-kicks-sv-intelligent-4x4-awd/1.jpeg','images/gallery/2025-nissan-kicks-sv-intelligent-4x4-awd/2.jpeg','images/gallery/2025-nissan-kicks-sv-intelligent-4x4-awd/3.jpeg','images/gallery/2025-nissan-kicks-sv-intelligent-4x4-awd/4.jpeg','images/gallery/2025-nissan-kicks-sv-intelligent-4x4-awd/5.jpeg','images/gallery/2025-nissan-kicks-sv-intelligent-4x4-awd/6.jpeg','images/gallery/2025-nissan-kicks-sv-intelligent-4x4-awd/7.jpeg','images/gallery/2025-nissan-kicks-sv-intelligent-4x4-awd/8.jpeg','images/gallery/2025-nissan-kicks-sv-intelligent-4x4-awd/9.jpeg','images/gallery/2025-nissan-kicks-sv-intelligent-4x4-awd/10.jpeg','images/gallery/2025-nissan-kicks-sv-intelligent-4x4-awd/11.jpeg','images/gallery/2025-nissan-kicks-sv-intelligent-4x4-awd/12.jpeg','images/gallery/2025-nissan-kicks-sv-intelligent-4x4-awd/13.jpeg','images/gallery/2025-nissan-kicks-sv-intelligent-4x4-awd/14.jpeg','images/gallery/2025-nissan-kicks-sv-intelligent-4x4-awd/15.jpeg','images/gallery/2025-nissan-kicks-sv-intelligent-4x4-awd/16.jpeg','images/gallery/2025-nissan-kicks-sv-intelligent-4x4-awd/17.jpeg']::text[], '0km', 'active');
INSERT INTO vehicles (title, price, year, km, engine, transmission, fuel, body_type, condition, availability, origin, badge, description, images, catalog, status) VALUES ('RAM 1500 Rebel 4x4 2025', '$32,800+', 2025, '94,200 KM', '3.0L I-6 Turbo 420HP', 'AutomÃ¡tico', 'Gasolina', 'pickup', 'seminuevo', 'por_pedido', 'importado', 'ðŸ”¥ REBEL 420HP', 'RAM 1500 Rebel 2025, 4x4, caja 5''7. Motor 3.0L I-6 Turbo de 420HP, automÃ¡tica. DaÃ±o frontal. Airbags explotados. 94,200 km. Precio $32,800 + movilizaciÃ³n, envÃ­o, aduana e impuestos.', ARRAY['images/gallery/2025-ram-1500-rebel-4x4-57-box/1.jpeg','images/gallery/2025-ram-1500-rebel-4x4-57-box/2.jpeg','images/gallery/2025-ram-1500-rebel-4x4-57-box/3.jpeg','images/gallery/2025-ram-1500-rebel-4x4-57-box/4.jpeg','images/gallery/2025-ram-1500-rebel-4x4-57-box/5.jpeg','images/gallery/2025-ram-1500-rebel-4x4-57-box/6.jpeg','images/gallery/2025-ram-1500-rebel-4x4-57-box/7.jpeg','images/gallery/2025-ram-1500-rebel-4x4-57-box/8.jpeg','images/gallery/2025-ram-1500-rebel-4x4-57-box/9.jpeg','images/gallery/2025-ram-1500-rebel-4x4-57-box/10.jpeg','images/gallery/2025-ram-1500-rebel-4x4-57-box/11.jpeg','images/gallery/2025-ram-1500-rebel-4x4-57-box/12.jpeg','images/gallery/2025-ram-1500-rebel-4x4-57-box/13.jpeg','images/gallery/2025-ram-1500-rebel-4x4-57-box/14.jpeg','images/gallery/2025-ram-1500-rebel-4x4-57-box/15.jpeg']::text[], '0km', 'active');
INSERT INTO vehicles (title, price, year, km, engine, transmission, fuel, body_type, condition, availability, origin, badge, description, images, catalog, status) VALUES ('Toyota Tacoma SR5 2025', '$29,980+', 2025, '7,500 KM', '2.4L Turbo 278HP', 'AutomÃ¡tico', 'Gasolina', 'pickup', 'seminuevo', 'por_pedido', 'importado', '4x4', 'Toyota Tacoma SR5 2025, doble cabina, 4x4. Motor 2.4L Turbo de 278HP, automÃ¡tica. DaÃ±o por inundaciÃ³n. Solo 7,500 km. Precio $29,980 + movilizaciÃ³n, envÃ­o, aduana e impuestos.', ARRAY['images/gallery/2025-toyota-tacoma-sr5/1.jpeg','images/gallery/2025-toyota-tacoma-sr5/2.jpeg','images/gallery/2025-toyota-tacoma-sr5/3.jpeg','images/gallery/2025-toyota-tacoma-sr5/4.jpeg','images/gallery/2025-toyota-tacoma-sr5/5.jpeg','images/gallery/2025-toyota-tacoma-sr5/6.jpeg','images/gallery/2025-toyota-tacoma-sr5/7.jpeg','images/gallery/2025-toyota-tacoma-sr5/8.jpeg','images/gallery/2025-toyota-tacoma-sr5/9.jpeg','images/gallery/2025-toyota-tacoma-sr5/10.jpeg','images/gallery/2025-toyota-tacoma-sr5/11.jpeg','images/gallery/2025-toyota-tacoma-sr5/12.jpeg','images/gallery/2025-toyota-tacoma-sr5/13.jpeg','images/gallery/2025-toyota-tacoma-sr5/14.jpeg','images/gallery/2025-toyota-tacoma-sr5/15.jpeg']::text[], '0km', 'active');
INSERT INTO vehicles (title, price, year, km, engine, transmission, fuel, body_type, condition, availability, origin, badge, description, images, catalog, status) VALUES ('Honda CR-V EX AWD 2026', '$24,130+', 2026, '14,900 KM', '1.5L Turbo 190HP', 'AutomÃ¡tico', 'Gasolina', 'suv', 'seminuevo', 'por_pedido', 'importado', '2026', 'Honda CR-V EX AWD 2026. Motor 1.5L Turbo de 190HP, automÃ¡tica, 4x4 AWD. DaÃ±o leve trasero izquierdo. Airbags explotados. 14,900 km. Precio $24,130 + movilizaciÃ³n, envÃ­o, aduana e impuestos.', ARRAY['images/gallery/2026-honda-cr-v-ex-awd/1.jpeg','images/gallery/2026-honda-cr-v-ex-awd/2.jpeg','images/gallery/2026-honda-cr-v-ex-awd/3.jpeg','images/gallery/2026-honda-cr-v-ex-awd/4.jpeg','images/gallery/2026-honda-cr-v-ex-awd/5.jpeg','images/gallery/2026-honda-cr-v-ex-awd/6.jpeg','images/gallery/2026-honda-cr-v-ex-awd/7.jpeg','images/gallery/2026-honda-cr-v-ex-awd/8.jpeg','images/gallery/2026-honda-cr-v-ex-awd/9.jpeg','images/gallery/2026-honda-cr-v-ex-awd/10.jpeg','images/gallery/2026-honda-cr-v-ex-awd/11.jpeg','images/gallery/2026-honda-cr-v-ex-awd/12.jpeg','images/gallery/2026-honda-cr-v-ex-awd/13.jpeg','images/gallery/2026-honda-cr-v-ex-awd/14.jpeg','images/gallery/2026-honda-cr-v-ex-awd/15.jpeg']::text[], '0km', 'active');
INSERT INTO vehicles (title, price, year, km, engine, transmission, fuel, body_type, condition, availability, origin, badge, description, images, catalog, status) VALUES ('Honda HR-V 2WD Sport 2026', '$22,000+', 2026, '11,600 KM', '2.0L I-4 158HP', 'AutomÃ¡tico', 'Gasolina', 'suv', 'seminuevo', 'por_pedido', 'importado', '2026', 'Honda HR-V 2WD Sport 2026. Motor 2.0L I-4 de 158HP, automÃ¡tica. Airbags intactos. 11,600 km. Precio $22,000 + movilizaciÃ³n, envÃ­o, aduana e impuestos.', ARRAY['images/gallery/2026-honda-hr-v-2wd-sport/1.jpeg','images/gallery/2026-honda-hr-v-2wd-sport/2.jpeg','images/gallery/2026-honda-hr-v-2wd-sport/3.jpeg','images/gallery/2026-honda-hr-v-2wd-sport/4.jpeg','images/gallery/2026-honda-hr-v-2wd-sport/5.jpeg','images/gallery/2026-honda-hr-v-2wd-sport/6.jpeg','images/gallery/2026-honda-hr-v-2wd-sport/7.jpeg','images/gallery/2026-honda-hr-v-2wd-sport/8.jpeg','images/gallery/2026-honda-hr-v-2wd-sport/9.jpeg','images/gallery/2026-honda-hr-v-2wd-sport/10.jpeg','images/gallery/2026-honda-hr-v-2wd-sport/11.jpeg','images/gallery/2026-honda-hr-v-2wd-sport/12.jpeg','images/gallery/2026-honda-hr-v-2wd-sport/13.jpeg','images/gallery/2026-honda-hr-v-2wd-sport/14.jpeg','images/gallery/2026-honda-hr-v-2wd-sport/15.jpeg']::text[], '0km', 'active');
INSERT INTO vehicles (title, price, year, km, engine, transmission, fuel, body_type, condition, availability, origin, badge, description, images, catalog, status) VALUES ('Kia Sportage LX 2026', '$16,720+', 2026, '2,800 KM', '2.5L I-4 187HP', 'AutomÃ¡tico', 'Gasolina', 'suv', 'seminuevo', 'por_pedido', 'importado', 'CASI NUEVO', 'Kia Sportage LX 2026. Motor 2.5L I-4 de 187HP, automÃ¡tico. DaÃ±o lateral derecho. Airbags explotados. Solo 2,800 km. Precio $16,720 + movilizaciÃ³n, envÃ­o, aduana e impuestos.', ARRAY['images/gallery/2026-kia-sportage-lx/1.jpeg','images/gallery/2026-kia-sportage-lx/2.jpeg','images/gallery/2026-kia-sportage-lx/3.jpeg','images/gallery/2026-kia-sportage-lx/4.jpeg','images/gallery/2026-kia-sportage-lx/5.jpeg','images/gallery/2026-kia-sportage-lx/6.jpeg','images/gallery/2026-kia-sportage-lx/7.jpeg','images/gallery/2026-kia-sportage-lx/8.jpeg','images/gallery/2026-kia-sportage-lx/9.jpeg','images/gallery/2026-kia-sportage-lx/10.jpeg','images/gallery/2026-kia-sportage-lx/11.jpeg','images/gallery/2026-kia-sportage-lx/12.jpeg','images/gallery/2026-kia-sportage-lx/13.jpeg','images/gallery/2026-kia-sportage-lx/14.jpeg','images/gallery/2026-kia-sportage-lx/15.jpeg','images/gallery/2026-kia-sportage-lx/16.jpeg']::text[], '0km', 'active');
INSERT INTO vehicles (title, price, year, km, engine, transmission, fuel, body_type, condition, availability, origin, badge, description, images, catalog, status) VALUES ('Jeep Wrangler Sport S 2 Puertas 4x4', '$21,700+', 2023, '64,000 KM', '3.6L V6', 'AutomÃ¡tico', 'Gasolina', 'suv', 'seminuevo', 'por_pedido', 'importado', '2 PUERTAS', 'Jeep Wrangler Sport S 2 puertas, 4x4. Motor 3.6L V6, automÃ¡tico. 64,000 km. UbicaciÃ³n USA. Nivel de daÃ±o leve. Airbags sin daÃ±o. Bajo pedido (promedio 2 meses Puerto Libre o nacional). Precio $21,700 + movilizaciÃ³n, envÃ­o, aduana e impuestos.', ARRAY['images/gallery/jeep-wrangler-sport-s-2-puertas-4x4/1.jpg','images/gallery/jeep-wrangler-sport-s-2-puertas-4x4/2.jpg','images/gallery/jeep-wrangler-sport-s-2-puertas-4x4/3.jpg','images/gallery/jeep-wrangler-sport-s-2-puertas-4x4/4.jpg','images/gallery/jeep-wrangler-sport-s-2-puertas-4x4/5.jpg','images/gallery/jeep-wrangler-sport-s-2-puertas-4x4/6.jpg','images/gallery/jeep-wrangler-sport-s-2-puertas-4x4/7.jpg','images/gallery/jeep-wrangler-sport-s-2-puertas-4x4/8.jpg','images/gallery/jeep-wrangler-sport-s-2-puertas-4x4/9.jpg','images/gallery/jeep-wrangler-sport-s-2-puertas-4x4/10.jpg','images/gallery/jeep-wrangler-sport-s-2-puertas-4x4/11.jpg','images/gallery/jeep-wrangler-sport-s-2-puertas-4x4/12.jpg','images/gallery/jeep-wrangler-sport-s-2-puertas-4x4/13.jpg','images/gallery/jeep-wrangler-sport-s-2-puertas-4x4/14.jpg']::text[], '0km', 'active');


-- CRM LEADS (83)
INSERT INTO site_leads (visitor_id, email, name, phone, last_active, created_at) VALUES ('v-6ua8gsctydcc2tjf9uxok6', 'jherrerabussines1@gmail.com', 'Jose andres herrera', '+584220149506', '2026-09-17T12:53:52.026037+00:00'::timestamptz, '2026-09-17T12:53:52.026037+00:00'::timestamptz) ON CONFLICT (visitor_id) DO NOTHING;
INSERT INTO site_leads (visitor_id, email, name, phone, last_active, created_at) VALUES ('v-wwrdqqgx5yfwezjn7j16h', 'reinaldojosuebc@gmail.com', 'Reinaldo Castro', '+584123515817', '2026-09-16T23:08:48.949701+00:00'::timestamptz, '2026-09-16T23:08:48.949701+00:00'::timestamptz) ON CONFLICT (visitor_id) DO NOTHING;
INSERT INTO site_leads (visitor_id, email, name, phone, last_active, created_at) VALUES ('v-gvnlh4lq7r6vfu8tu9f6d9', 'luisramagon@hotmail.com', 'Luis Rafael Martínez González', '04127949300', '2026-09-16T12:05:33.292623+00:00'::timestamptz, '2026-09-16T12:05:33.292623+00:00'::timestamptz) ON CONFLICT (visitor_id) DO NOTHING;
INSERT INTO site_leads (visitor_id, email, name, phone, last_active, created_at) VALUES ('v-hs64hfv8wqsp42acjjfnx', 'brialejandro28@gmail.com', 'Alejandro Enrique Briceño vivas', '04123272702', '2026-09-16T00:26:20.52816+00:00'::timestamptz, '2026-09-16T00:26:20.52816+00:00'::timestamptz) ON CONFLICT (visitor_id) DO NOTHING;
INSERT INTO site_leads (visitor_id, email, name, phone, last_active, created_at) VALUES ('v-qbkoj14r99b1y9w9oubm', 'emilimarin127@gmail.com', 'Emilianyer del valle', '04224012399', '2026-09-15T22:04:07.197202+00:00'::timestamptz, '2026-09-15T22:04:07.197202+00:00'::timestamptz) ON CONFLICT (visitor_id) DO NOTHING;
INSERT INTO site_leads (visitor_id, email, name, phone, last_active, created_at) VALUES ('v-uvtn8lmud8c6q3lmt4vsi9', 'Wilanyis0106s@gmail.com', 'Wilanyis del valle barcenas', '04120250355', '2026-09-15T20:15:37.753273+00:00'::timestamptz, '2026-09-15T20:15:37.753273+00:00'::timestamptz) ON CONFLICT (visitor_id) DO NOTHING;
INSERT INTO site_leads (visitor_id, email, name, phone, last_active, created_at) VALUES ('v-muwqsy38mcgjhbqzpjueeg', 'sinaifairee30@gmail.com', 'Sinai rondon', '04125959291', '2026-09-15T19:57:07.296585+00:00'::timestamptz, '2026-09-15T19:57:07.296585+00:00'::timestamptz) ON CONFLICT (visitor_id) DO NOTHING;
INSERT INTO site_leads (visitor_id, email, name, phone, last_active, created_at) VALUES ('v-mhzol9elg0j41zvz4vk4wk', 'joseaparicio2905@gmail.com', 'Jose Aparicio Quijada Gutiérrez', '04248651897', '2026-09-15T16:36:39.602996+00:00'::timestamptz, '2026-09-15T16:36:39.602996+00:00'::timestamptz) ON CONFLICT (visitor_id) DO NOTHING;
INSERT INTO site_leads (visitor_id, email, name, phone, last_active, created_at) VALUES ('v-p4dhqm9nwu12t4tfsd1rv', 'leninsabtiago1971@gmail.com', 'Lenin Javier Santiago', '04248461034', '2026-09-15T13:21:46.329701+00:00'::timestamptz, '2026-09-15T13:21:46.329701+00:00'::timestamptz) ON CONFLICT (visitor_id) DO NOTHING;
INSERT INTO site_leads (visitor_id, email, name, phone, last_active, created_at) VALUES ('v-gjre1y5tq2quulzmo5fpbn', 'Harroots1990@gmail.com', 'Héctor Alfredo Reyes peñañoza', '04223113118', '2026-09-15T12:12:55.430394+00:00'::timestamptz, '2026-09-15T12:12:55.430394+00:00'::timestamptz) ON CONFLICT (visitor_id) DO NOTHING;
INSERT INTO site_leads (visitor_id, email, name, phone, last_active, created_at) VALUES ('v-o1w1h1y181hmow4m6n6ooh', 'avilekelvin@gmail.com', 'Kelvin Esteban Avile Noriega', '+584123572542', '2026-09-15T02:57:54.221515+00:00'::timestamptz, '2026-09-15T02:57:54.221515+00:00'::timestamptz) ON CONFLICT (visitor_id) DO NOTHING;
INSERT INTO site_leads (visitor_id, email, name, phone, last_active, created_at) VALUES ('v-t9s7tiz5y0mjrmrexu4lx', 'yroyraffie09@gmail.com', 'Yroy Raffie Rodríguez Rojas', '04248918710', '2026-09-15T02:13:30.660313+00:00'::timestamptz, '2026-09-15T02:13:30.660313+00:00'::timestamptz) ON CONFLICT (visitor_id) DO NOTHING;
INSERT INTO site_leads (visitor_id, email, name, phone, last_active, created_at) VALUES ('v-2ol1gyjzyvuxdd50itzx2o', 'ginettejudith1974@gmail.com', 'Ginette Judith Arellano Castillo', '+5804128889583', '2026-09-15T01:04:47.554144+00:00'::timestamptz, '2026-09-15T01:04:47.554144+00:00'::timestamptz) ON CONFLICT (visitor_id) DO NOTHING;
INSERT INTO site_leads (visitor_id, email, name, phone, last_active, created_at) VALUES ('v-v1eg9s3syp7p6kdwrw3ec', 'albarrandelacruz@gmail.com', 'Jose Alberto Albarran', '+584248684603', '2026-09-15T00:18:13.805335+00:00'::timestamptz, '2026-09-15T00:18:13.805335+00:00'::timestamptz) ON CONFLICT (visitor_id) DO NOTHING;
INSERT INTO site_leads (visitor_id, email, name, phone, last_active, created_at) VALUES ('v-58wpvtx4nbwxm1zla477a7', 'agustinlopez2904@gmail.com', 'Agustin David Lopez Sequera', '04248144622', '2026-09-14T23:52:31.193293+00:00'::timestamptz, '2026-09-14T23:52:31.193293+00:00'::timestamptz) ON CONFLICT (visitor_id) DO NOTHING;
INSERT INTO site_leads (visitor_id, email, name, phone, last_active, created_at) VALUES ('v-5i8gxzfg40tzbh9zr7mir', 'cmhfox15@gmail.com', 'Carlos Maximilian Herrera Márquez', '04121641188', '2026-09-14T21:08:54.578109+00:00'::timestamptz, '2026-09-14T21:08:54.578109+00:00'::timestamptz) ON CONFLICT (visitor_id) DO NOTHING;
INSERT INTO site_leads (visitor_id, email, name, phone, last_active, created_at) VALUES ('v-7pasgtvc9nv934zw48emti', 'laleskamata17@gmail.com', 'Laleska valentina mata', '4248697897', '2026-09-14T20:51:22.982787+00:00'::timestamptz, '2026-09-14T20:51:22.982787+00:00'::timestamptz) ON CONFLICT (visitor_id) DO NOTHING;
INSERT INTO site_leads (visitor_id, email, name, phone, last_active, created_at) VALUES ('v-atqws3g8rukd43cvx7l5zf', 'matamiguelangel155@gmail.com', 'Miguelangel José Mata Vasquez', '+584248087344', '2026-09-14T19:32:49.923466+00:00'::timestamptz, '2026-09-14T19:32:49.923466+00:00'::timestamptz) ON CONFLICT (visitor_id) DO NOTHING;
INSERT INTO site_leads (visitor_id, email, name, phone, last_active, created_at) VALUES ('v-w66o5vm9ifajcgyd0vpi1l', 'jesusrosales0495@gmail.com', 'Jesus Maria Rosales Rosales', '+584269864998', '2026-09-14T17:40:04.780649+00:00'::timestamptz, '2026-09-14T17:40:04.780649+00:00'::timestamptz) ON CONFLICT (visitor_id) DO NOTHING;
INSERT INTO site_leads (visitor_id, email, name, phone, last_active, created_at) VALUES ('v-si21d32265ii1r8ip1zvk', 'uguetomarcano@gmail.com', 'José Gabriel ugueto ', '04149997892', '2026-09-14T16:25:50.814473+00:00'::timestamptz, '2026-09-14T16:25:50.814473+00:00'::timestamptz) ON CONFLICT (visitor_id) DO NOTHING;
INSERT INTO site_leads (visitor_id, email, name, phone, last_active, created_at) VALUES ('v-5cxt4znei8o941v28gjf07', 'lauradicanzio20@gmail.com', 'Laura Di Canzio', '04140977622', '2026-09-14T16:05:59.110861+00:00'::timestamptz, '2026-09-14T16:05:59.110861+00:00'::timestamptz) ON CONFLICT (visitor_id) DO NOTHING;
INSERT INTO site_leads (visitor_id, email, name, phone, last_active, created_at) VALUES ('v-vg18955uhyni87ndryycgc', 'paulavms2007@gmail.com', 'Paula Valentina Maneiro Serrano', '+584120843649', '2026-09-14T15:54:40.492195+00:00'::timestamptz, '2026-09-14T15:54:40.492195+00:00'::timestamptz) ON CONFLICT (visitor_id) DO NOTHING;
INSERT INTO site_leads (visitor_id, email, name, phone, last_active, created_at) VALUES ('v-t5ugx2gzf4lu9aeexpudr', 'jessikavarela7@gmail.com', 'Jessika Andreina Varela de Mosquera', '04121430980', '2026-09-14T15:37:52.405797+00:00'::timestamptz, '2026-09-14T15:37:52.405797+00:00'::timestamptz) ON CONFLICT (visitor_id) DO NOTHING;
INSERT INTO site_leads (visitor_id, email, name, phone, last_active, created_at) VALUES ('v-4rugbojt2p4mrdtg2myu8c', 'robertjs.mujica1404@gmail.com', 'Robert Jesus Salazar Mujica', '+584127944123', '2026-09-14T15:35:18.853854+00:00'::timestamptz, '2026-09-14T15:35:18.853854+00:00'::timestamptz) ON CONFLICT (visitor_id) DO NOTHING;
INSERT INTO site_leads (visitor_id, email, name, phone, last_active, created_at) VALUES ('v-mt93vw9macrhg2ge6d3wnn', 'iriannyshernandez568@gmail.com', 'iriannys Hernández', '04248472492', '2026-09-14T15:30:25.431874+00:00'::timestamptz, '2026-09-14T15:30:25.431874+00:00'::timestamptz) ON CONFLICT (visitor_id) DO NOTHING;
INSERT INTO site_leads (visitor_id, email, name, phone, last_active, created_at) VALUES ('v-mt8r0pgki6oiwbub1arfj', 'isabelordaz870@gmail.com', 'Isabel mercedes ordaz rivas', '04248941351', '2026-09-14T15:24:20.333883+00:00'::timestamptz, '2026-09-14T15:24:20.333883+00:00'::timestamptz) ON CONFLICT (visitor_id) DO NOTHING;
INSERT INTO site_leads (visitor_id, email, name, phone, last_active, created_at) VALUES ('v-i563z2leqlfpszkojesvln', 'taisonescalona94@gmail.com', 'Tyson Enrique Escalona', '04128817755', '2026-09-14T15:16:10.554991+00:00'::timestamptz, '2026-09-14T15:16:10.554991+00:00'::timestamptz) ON CONFLICT (visitor_id) DO NOTHING;
INSERT INTO site_leads (visitor_id, email, name, phone, last_active, created_at) VALUES ('v-19qekoprnhtihkcop9obm8', 'danyelisvizcaino4@gmail.com', 'Danyelis Del Valle Vizcaíno Salgado', '+584127385437', '2026-09-14T15:15:20.976544+00:00'::timestamptz, '2026-09-14T15:15:20.976544+00:00'::timestamptz) ON CONFLICT (visitor_id) DO NOTHING;
INSERT INTO site_leads (visitor_id, email, name, phone, last_active, created_at) VALUES ('v-qwgel7lrhk3aguv5f13wz', 'salcedo.er46@gmail.com', 'Eduardo José Ramírez salcedo', '04123507126', '2026-09-14T15:15:18.830529+00:00'::timestamptz, '2026-09-14T15:15:18.830529+00:00'::timestamptz) ON CONFLICT (visitor_id) DO NOTHING;
INSERT INTO site_leads (visitor_id, email, name, phone, last_active, created_at) VALUES ('v-ae3zf63fdhi1nar4caaolq', 'indriagop1@gmail.com', 'Pedro Antonio Fernández Indriago', '04128637889', '2026-09-14T15:09:47.551954+00:00'::timestamptz, '2026-09-14T15:09:47.551954+00:00'::timestamptz) ON CONFLICT (visitor_id) DO NOTHING;
INSERT INTO site_leads (visitor_id, email, name, phone, last_active, created_at) VALUES ('v-2f520gz515fub50tk19bat', 'drosariojaimes@gmail.com', 'Daniel Eduardo rosario Jaimes', '04121961981', '2026-09-14T14:57:30.268415+00:00'::timestamptz, '2026-09-14T14:57:30.268415+00:00'::timestamptz) ON CONFLICT (visitor_id) DO NOTHING;
INSERT INTO site_leads (visitor_id, email, name, phone, last_active, created_at) VALUES ('v-p7zsg0ikk7hkaw246ugwwp', 'caraballoaurelis16@gmail.com', 'Aurelis del Valle Caraballo Labori', '04248052145', '2026-09-14T14:38:33.180412+00:00'::timestamptz, '2026-09-14T14:38:33.180412+00:00'::timestamptz) ON CONFLICT (visitor_id) DO NOTHING;
INSERT INTO site_leads (visitor_id, email, name, phone, last_active, created_at) VALUES ('v-zwtw8ctoalng8r0jhlex', 'Luisyndriago98@gmail.com', 'Luis Eduardo Yndriago Villarroel', '+584123518160', '2026-09-14T14:35:43.203501+00:00'::timestamptz, '2026-09-14T14:35:43.203501+00:00'::timestamptz) ON CONFLICT (visitor_id) DO NOTHING;
INSERT INTO site_leads (visitor_id, email, name, phone, last_active, created_at) VALUES ('v-z5vdu5pwysact79vh55np', 'yuberaloai@gmail.com', 'Yuber José Figueroa Espinoza', '04128274832', '2026-09-14T14:27:12.033868+00:00'::timestamptz, '2026-09-14T14:27:12.033868+00:00'::timestamptz) ON CONFLICT (visitor_id) DO NOTHING;
INSERT INTO site_leads (visitor_id, email, name, phone, last_active, created_at) VALUES ('v-12nfpm8z6sie2spk2w4k7cy', 'sebastato123456@gmail.com', 'Sebastián Alejandro Pino Méndez ', '+584127945486', '2026-09-14T00:03:49.942459+00:00'::timestamptz, '2026-09-14T00:03:49.942459+00:00'::timestamptz) ON CONFLICT (visitor_id) DO NOTHING;
INSERT INTO site_leads (visitor_id, email, name, phone, last_active, created_at) VALUES ('v-ihx2s2vomf5zyndl9ksbv', 'darioreyes.2000@gmail.com', 'Dario Reyes', '04125307452', '2026-09-13T19:31:36.459251+00:00'::timestamptz, '2026-09-13T19:31:36.459251+00:00'::timestamptz) ON CONFLICT (visitor_id) DO NOTHING;
INSERT INTO site_leads (visitor_id, email, name, phone, last_active, created_at) VALUES ('v-0h0qki5arajups9ki545cf', 'exiogames52@gmail.com', 'Emilio José González Vicent', '04248156435', '2026-09-13T07:05:45.059864+00:00'::timestamptz, '2026-09-13T07:05:45.059864+00:00'::timestamptz) ON CONFLICT (visitor_id) DO NOTHING;
INSERT INTO site_leads (visitor_id, email, name, phone, last_active, created_at) VALUES ('v-qz5ev53f62ykd6lm7tvsh', 'elixmoreno.em@gmail.com', 'Elix Alonso Moreno Villalobos', '04123536590', '2026-09-14T01:23:29.634005+00:00'::timestamptz, '2026-09-13T01:17:34.972702+00:00'::timestamptz) ON CONFLICT (visitor_id) DO NOTHING;
INSERT INTO site_leads (visitor_id, email, name, phone, last_active, created_at) VALUES ('v-gvlwaft7jlg2qpqltf9dpw', 'gnany1505@gmail.com', 'Stephany Del Valle González Martínez', '+584121950850', '2026-09-12T23:08:42.942773+00:00'::timestamptz, '2026-09-12T23:08:42.942773+00:00'::timestamptz) ON CONFLICT (visitor_id) DO NOTHING;
INSERT INTO site_leads (visitor_id, email, name, phone, last_active, created_at) VALUES ('v-apsm58hec2h98mwfv2q0g5', 'alexanderjosesanchezbello123@gmail.com', 'Alexander José Sánchez Bello', '04226868085', '2026-09-12T20:26:45.511014+00:00'::timestamptz, '2026-09-12T20:26:45.511014+00:00'::timestamptz) ON CONFLICT (visitor_id) DO NOTHING;
INSERT INTO site_leads (visitor_id, email, name, phone, last_active, created_at) VALUES ('v-zvk4f5yn065lzwb6aqusl', 'gustavovillegastaramar@gmail.com', 'Gustavo Alonso Villegas escalante', '04264875014', '2026-09-12T20:21:23.12443+00:00'::timestamptz, '2026-09-12T20:21:23.12443+00:00'::timestamptz) ON CONFLICT (visitor_id) DO NOTHING;
INSERT INTO site_leads (visitor_id, email, name, phone, last_active, created_at) VALUES ('v-4wkwwdqh31nl30tb2aw2mg', 'marcamoisesdavid55@gmail.com', 'Moises David Marcano Marcano', '+584248438717', '2026-09-12T15:03:03.270051+00:00'::timestamptz, '2026-09-12T15:03:03.270051+00:00'::timestamptz) ON CONFLICT (visitor_id) DO NOTHING;
INSERT INTO site_leads (visitor_id, email, name, phone, last_active, created_at) VALUES ('v-p6tz7synakv4h5xpicfwb', 'luiferth1008@gmail.com', 'Luis Eduardo alves zorrilla', '04248093391', '2026-09-12T12:23:29.168651+00:00'::timestamptz, '2026-09-12T12:23:29.168651+00:00'::timestamptz) ON CONFLICT (visitor_id) DO NOTHING;
INSERT INTO site_leads (visitor_id, email, name, phone, last_active, created_at) VALUES ('v-uv9w623xu5rytajsiw6b2', 'marilyn_1805@icloud.com', 'Marilyn Carolina ordosgoitti González', '+584220194771', '2026-09-12T03:05:17.377251+00:00'::timestamptz, '2026-09-12T03:05:17.377251+00:00'::timestamptz) ON CONFLICT (visitor_id) DO NOTHING;
INSERT INTO site_leads (visitor_id, email, name, phone, last_active, created_at) VALUES ('v-kpmthr4koep4fdcuc7ryi', 'yisbelysmartinez071@gmail.com', 'Yisbelys martinez', '424 8857973', '2026-09-12T02:58:08.253258+00:00'::timestamptz, '2026-09-12T02:58:08.253258+00:00'::timestamptz) ON CONFLICT (visitor_id) DO NOTHING;
INSERT INTO site_leads (visitor_id, email, name, phone, last_active, created_at) VALUES ('v-ci56ir54vk4pis1offhoza', 'navarrettecamila65@gmail.com', 'camila valentina navarrete sánchez', '04221782185', '2026-09-12T01:34:25.498149+00:00'::timestamptz, '2026-09-12T01:34:25.498149+00:00'::timestamptz) ON CONFLICT (visitor_id) DO NOTHING;
INSERT INTO site_leads (visitor_id, email, name, phone, last_active, created_at) VALUES ('v-z6t4hb468skhc1hkp8d8dq', 'samuelgtr23@gmail.com', 'Samuel David llanos Rodríguez', '04123510719', '2026-09-11T23:34:59.823423+00:00'::timestamptz, '2026-09-11T23:34:59.823423+00:00'::timestamptz) ON CONFLICT (visitor_id) DO NOTHING;
INSERT INTO site_leads (visitor_id, email, name, phone, last_active, created_at) VALUES ('v-hjbgrxkwegi0jgnwtushs', '024aremr@gmail.com', 'Airam Morillo Rivera', '4261886537', '2026-09-11T23:13:57.98211+00:00'::timestamptz, '2026-09-11T23:13:57.98211+00:00'::timestamptz) ON CONFLICT (visitor_id) DO NOTHING;
INSERT INTO site_leads (visitor_id, email, name, phone, last_active, created_at) VALUES ('v-u7t9rmsa6b162kgwchkor', 'eduardomartinez.vecontacto@gmail.com', 'Eduardo Martinez', '+584122094104', '2026-09-11T22:45:12.919703+00:00'::timestamptz, '2026-09-11T22:45:12.919703+00:00'::timestamptz) ON CONFLICT (visitor_id) DO NOTHING;
INSERT INTO site_leads (visitor_id, email, name, phone, last_active, created_at) VALUES ('v-ieiurog717omjcck9d8kfk', 'vizcainoabel434@gmail.com', 'Abel Jesús Vizcaíno Salazar', '+584248463877', '2026-09-11T21:28:17.886994+00:00'::timestamptz, '2026-09-11T21:28:17.886994+00:00'::timestamptz) ON CONFLICT (visitor_id) DO NOTHING;
INSERT INTO site_leads (visitor_id, email, name, phone, last_active, created_at) VALUES ('v-05t2440o1x8rg4y7930r385', 'eiberleon90@gmail.com', 'Eiber Rafael salazar León', '04223030311', '2026-09-11T20:49:05.471727+00:00'::timestamptz, '2026-09-11T20:49:05.471727+00:00'::timestamptz) ON CONFLICT (visitor_id) DO NOTHING;
INSERT INTO site_leads (visitor_id, email, name, phone, last_active, created_at) VALUES ('v-htjzfgscqbok88l29xaodf', 'gertruy2780@gmail.com', 'Gertrudys mujica', '04140868530', '2026-09-11T18:48:49.190509+00:00'::timestamptz, '2026-09-11T18:48:49.190509+00:00'::timestamptz) ON CONFLICT (visitor_id) DO NOTHING;
INSERT INTO site_leads (visitor_id, email, name, phone, last_active, created_at) VALUES ('v-uthz4dk64bfhgmdjmz2r69', 'jhosselingonzalez27@gmail.com', 'Jhosselin del valle González Calzadilla', '04127279054', '2026-09-11T16:45:32.992183+00:00'::timestamptz, '2026-09-11T16:45:32.992183+00:00'::timestamptz) ON CONFLICT (visitor_id) DO NOTHING;
INSERT INTO site_leads (visitor_id, email, name, phone, last_active, created_at) VALUES ('v-6zn7kkmkhz9zez3delik68', 'natachamarcanogonzalez@gmail.com', 'Natacha marcano gonzalez', '04248064952', '2026-09-11T16:01:19.839031+00:00'::timestamptz, '2026-09-11T16:01:19.839031+00:00'::timestamptz) ON CONFLICT (visitor_id) DO NOTHING;
INSERT INTO site_leads (visitor_id, email, name, phone, last_active, created_at) VALUES ('v-fkrusjs2muqfz3iasn6tah', 'ar429939@gmail.com', 'Alejandro Ramírez', '+584121956158', '2026-09-11T15:52:51.572014+00:00'::timestamptz, '2026-09-11T15:52:51.572014+00:00'::timestamptz) ON CONFLICT (visitor_id) DO NOTHING;
INSERT INTO site_leads (visitor_id, email, name, phone, last_active, created_at) VALUES ('v-5oniicm2w1w25vapese4gj', 'jossephafonsobrito@gmail.com', 'Josseph Alberto Afonso brito', '04147922893', '2026-09-11T15:44:07.93177+00:00'::timestamptz, '2026-09-11T15:44:07.93177+00:00'::timestamptz) ON CONFLICT (visitor_id) DO NOTHING;
INSERT INTO site_leads (visitor_id, email, name, phone, last_active, created_at) VALUES ('v-evjitx6js32xcu09avsm', 'algenisrmartinezvz@gmail.com', 'Algenis Ramirez', '04248020273', '2026-09-11T14:58:00.592779+00:00'::timestamptz, '2026-09-11T14:58:00.592779+00:00'::timestamptz) ON CONFLICT (visitor_id) DO NOTHING;
INSERT INTO site_leads (visitor_id, email, name, phone, last_active, created_at) VALUES ('v-ucsgos1szythohmebp49', 'jyme1510@gmail.com', 'Jheankharlos ysaias mata Espinoza', '+584226770038', '2026-09-11T14:46:42.838385+00:00'::timestamptz, '2026-09-11T14:46:42.838385+00:00'::timestamptz) ON CONFLICT (visitor_id) DO NOTHING;
INSERT INTO site_leads (visitor_id, email, name, phone, last_active, created_at) VALUES ('v-85t5kndo6763y9jmyhitp3', 'anthonyboadas10@gmail.com', 'Anthony Brian Boadas Villafranca', '+584127943023', '2026-09-11T14:26:26.093959+00:00'::timestamptz, '2026-09-11T14:26:26.093959+00:00'::timestamptz) ON CONFLICT (visitor_id) DO NOTHING;
INSERT INTO site_leads (visitor_id, email, name, phone, last_active, created_at) VALUES ('v-9eo4ndlzuupn0w1d6kzej', 'rmanueldo@gmail.com', 'Manuel Alejandro Rondón Chacon', '04248207586', '2026-09-11T13:35:27.451496+00:00'::timestamptz, '2026-09-11T13:35:27.451496+00:00'::timestamptz) ON CONFLICT (visitor_id) DO NOTHING;
INSERT INTO site_leads (visitor_id, email, name, phone, last_active, created_at) VALUES ('v-l3zyywoi2ju31h5bee4a', 'nohetv20@gmail.com', 'Berusca Millán', '04248931665', '2026-09-11T12:32:16.305583+00:00'::timestamptz, '2026-09-11T12:32:16.305583+00:00'::timestamptz) ON CONFLICT (visitor_id) DO NOTHING;
INSERT INTO site_leads (visitor_id, email, name, phone, last_active, created_at) VALUES ('v-bl2wlh1tffqzei2oiv20am', 'trebor.mm1@gmail.com', 'Robert Montilla', '04123538894', '2026-09-11T12:28:42.78659+00:00'::timestamptz, '2026-09-11T12:28:42.78659+00:00'::timestamptz) ON CONFLICT (visitor_id) DO NOTHING;
INSERT INTO site_leads (visitor_id, email, name, phone, last_active, created_at) VALUES ('v-vwxq65m2o0ldmm7d60izf', 'mriaengel.87@gmail.com', 'María de los Ángeles torres', '+584129792924', '2026-09-11T12:23:18.067484+00:00'::timestamptz, '2026-09-11T12:23:18.067484+00:00'::timestamptz) ON CONFLICT (visitor_id) DO NOTHING;
INSERT INTO site_leads (visitor_id, email, name, phone, last_active, created_at) VALUES ('v-hf5katkvhe7n46wz5qiptm', 'luzardoyamluis2@gmail.com', 'Yamluis Luzardo', '04123514608', '2026-09-11T12:12:49.961906+00:00'::timestamptz, '2026-09-11T12:12:49.961906+00:00'::timestamptz) ON CONFLICT (visitor_id) DO NOTHING;
INSERT INTO site_leads (visitor_id, email, name, phone, last_active, created_at) VALUES ('v-fdea16k34goo83wn7vrd7a', 'marcanonilfredojose@gmail.com', 'Nilfredo José Gómez Marcano', '+584248813519', '2026-09-11T12:10:28.075023+00:00'::timestamptz, '2026-09-11T12:10:28.075023+00:00'::timestamptz) ON CONFLICT (visitor_id) DO NOTHING;
INSERT INTO site_leads (visitor_id, email, name, phone, last_active, created_at) VALUES ('v-nlh90ranbrdf93edc3t7dh', 'franjr69@gmail.com', 'Francisco Javier Rodríguez Méndez', '+58 424 7152003', '2026-09-11T11:45:08.353609+00:00'::timestamptz, '2026-09-11T11:45:08.353609+00:00'::timestamptz) ON CONFLICT (visitor_id) DO NOTHING;
INSERT INTO site_leads (visitor_id, email, name, phone, last_active, created_at) VALUES ('v-9nnmapgqkjncqc10oyz3z7', 'enriquequinoficial@gmail.com', 'Enrique José Quintero Martínez', '+584121956745', '2026-09-11T10:23:00.633977+00:00'::timestamptz, '2026-09-11T10:23:00.633977+00:00'::timestamptz) ON CONFLICT (visitor_id) DO NOTHING;
INSERT INTO site_leads (visitor_id, email, name, phone, last_active, created_at) VALUES ('v-4ukz3qxludfrzlc4eu1t', 'quiames.jonathan.jose@gmail.com', 'Yonathan', '04120932741', '2026-09-17T21:40:44.11605+00:00'::timestamptz, '2026-09-11T10:16:58.226883+00:00'::timestamptz) ON CONFLICT (visitor_id) DO NOTHING;
INSERT INTO site_leads (visitor_id, email, name, phone, last_active, created_at) VALUES ('v-slsnfr6tqvet7t04rjjb1d', 'greicyleon@gmail.com', 'Greicy Veronica Leon Marval', '+584123570524', '2026-09-11T09:38:04.43078+00:00'::timestamptz, '2026-09-11T09:38:04.43078+00:00'::timestamptz) ON CONFLICT (visitor_id) DO NOTHING;
INSERT INTO site_leads (visitor_id, email, name, phone, last_active, created_at) VALUES ('v-0cys7r1xaz2u2mopvk2i9rq', 'alexanderedwin734@gmail.com', 'Edwin Alexander Rodríguez moreno', '04147855396', '2026-09-11T05:13:27.876107+00:00'::timestamptz, '2026-09-11T05:13:27.876107+00:00'::timestamptz) ON CONFLICT (visitor_id) DO NOTHING;
INSERT INTO site_leads (visitor_id, email, name, phone, last_active, created_at) VALUES ('v-pdzn5ulwv4mlxgnhqof73a', 'rebolledo5bu@gmail.com', 'Valeria Alejandra Acosta Rebolledo', '04167999741', '2026-09-11T04:58:59.508054+00:00'::timestamptz, '2026-09-11T04:58:59.508054+00:00'::timestamptz) ON CONFLICT (visitor_id) DO NOTHING;
INSERT INTO site_leads (visitor_id, email, name, phone, last_active, created_at) VALUES ('v-ifd233jlyhm99dhb32j13w', 'vengoechearodriguez@gmail.com', 'Julio cesar Vengoechea', '+584127138993', '2026-09-11T04:27:47.404733+00:00'::timestamptz, '2026-09-11T04:27:47.404733+00:00'::timestamptz) ON CONFLICT (visitor_id) DO NOTHING;
INSERT INTO site_leads (visitor_id, email, name, phone, last_active, created_at) VALUES ('v-nu78iyg4e8ubjesdvjqak', 'robertico3903@gmail.com', 'Robert Rafael López Larez', '+584248794459', '2026-09-11T04:21:48.0657+00:00'::timestamptz, '2026-09-11T04:21:48.0657+00:00'::timestamptz) ON CONFLICT (visitor_id) DO NOTHING;
INSERT INTO site_leads (visitor_id, email, name, phone, last_active, created_at) VALUES ('v-nch5l1sejhwylys60g9ks', 'britoyarwil@gmail.com', 'Yarwil Jose Brito Rodriguez.', '+584147958737', '2026-09-11T04:18:46.692331+00:00'::timestamptz, '2026-09-11T04:18:46.692331+00:00'::timestamptz) ON CONFLICT (visitor_id) DO NOTHING;
INSERT INTO site_leads (visitor_id, email, name, phone, last_active, created_at) VALUES ('v-txj56cfpmjqdz6ez0xbqc', 'jorgequijadasss@gmail.com', 'Jorge quijada', '04165967300', '2026-09-11T03:40:53.814068+00:00'::timestamptz, '2026-09-11T03:40:53.814068+00:00'::timestamptz) ON CONFLICT (visitor_id) DO NOTHING;
INSERT INTO site_leads (visitor_id, email, name, phone, last_active, created_at) VALUES ('v-lycnv2hu8tibagjfu4ive', 'yilbertgimenez3@gmail.com', 'Yilbert Antonio Giménez cedeño', '04226466385', '2026-09-11T18:55:13.681299+00:00'::timestamptz, '2026-09-11T01:39:37.845494+00:00'::timestamptz) ON CONFLICT (visitor_id) DO NOTHING;
INSERT INTO site_leads (visitor_id, email, name, phone, last_active, created_at) VALUES ('v-a9fba1mg3jdv3wlmzzlitb', 'maximilianodewendt1@icloud.com', 'Maximiliano Dewendt', '04221638618', '2026-09-10T22:57:45.883522+00:00'::timestamptz, '2026-09-10T22:57:45.883522+00:00'::timestamptz) ON CONFLICT (visitor_id) DO NOTHING;
INSERT INTO site_leads (visitor_id, email, name, phone, last_active, created_at) VALUES ('v-s7vi2f72vq3cup40063ji', 'juanmiguelcoraspe2004@gmail.com', 'Juan coraspe', '04121288480', '2026-09-10T22:25:25.954636+00:00'::timestamptz, '2026-09-10T22:25:25.954636+00:00'::timestamptz) ON CONFLICT (visitor_id) DO NOTHING;
INSERT INTO site_leads (visitor_id, email, name, phone, last_active, created_at) VALUES ('v-u66bbohpomhilyfku2zu4', 'as@gmail.com', 'carlos', '90202020202', '2026-09-10T18:02:31.371371+00:00'::timestamptz, '2026-09-10T18:02:31.371371+00:00'::timestamptz) ON CONFLICT (visitor_id) DO NOTHING;
INSERT INTO site_leads (visitor_id, email, name, phone, last_active, created_at) VALUES ('v-a8062b5853ec41fb93adb7cc3b28b11d', 'test@seminuevoautos.com', 'Test Postulante Margarita', '04248700438', '2026-09-10T17:59:48.673262+00:00'::timestamptz, '2026-09-10T17:59:48.673262+00:00'::timestamptz) ON CONFLICT (visitor_id) DO NOTHING;
INSERT INTO site_leads (visitor_id, email, name, phone, last_active, created_at) VALUES ('v-e8b382a073d048cbb79d858aee6f956d', 'test@seminuevoautos.com', 'Test Postulante Margarita', '04248700438', '2026-09-10T17:59:23.01777+00:00'::timestamptz, '2026-09-10T17:59:23.01777+00:00'::timestamptz) ON CONFLICT (visitor_id) DO NOTHING;
INSERT INTO site_leads (visitor_id, email, name, phone, last_active, created_at) VALUES ('v-94ioys0ffzr4unpider6j', 'Jvaask16@gmail.com', 'Jose Vasquez', '04160306788', '2026-04-29T13:33:48.638816+00:00'::timestamptz, '2026-04-29T13:33:48.638816+00:00'::timestamptz) ON CONFLICT (visitor_id) DO NOTHING;
INSERT INTO site_leads (visitor_id, email, name, phone, last_active, created_at) VALUES ('v-tu6447c4ddotvjw2icm7', 'sebastiancova26@gmail.com', 'asdasd', '45244', '2026-05-06T03:56:24.92749+00:00'::timestamptz, '2026-04-29T02:54:18.707866+00:00'::timestamptz) ON CONFLICT (visitor_id) DO NOTHING;

-- INQUIRIES (88)
INSERT INTO inquiries (name, phone, email, service, message, status, visitor_id, created_at) VALUES ('juan de la parre', '04245436275', 'eduardo46v@gmail.com', 'comprar', '123', 'new', NULL, '2026-04-11T22:02:34.683393+00:00'::timestamptz);
INSERT INTO inquiries (name, phone, email, service, message, status, visitor_id, created_at) VALUES ('Sebastian', '+584122970631', 'sebastiancova26@gmail.com', 'comprar', 'Interesado en comprar', 'new', 'v-tu6447c4ddotvjw2icm7', '2026-04-29T02:54:18.707866+00:00'::timestamptz);
INSERT INTO inquiries (name, phone, email, service, message, status, visitor_id, created_at) VALUES ('Jose Vasquez', '04160306788', 'Jvaask16@gmail.com', 'tramites', 'Interesado en tramites', 'new', 'v-94ioys0ffzr4unpider6j', '2026-04-29T13:33:48.638816+00:00'::timestamptz);
INSERT INTO inquiries (name, phone, email, service, message, status, visitor_id, created_at) VALUES ('asdasd', '45244', 'sebastiancova26@gmail.com', 'vender', 'asd', 'new', 'v-tu6447c4ddotvjw2icm7', '2026-05-06T03:56:24.92749+00:00'::timestamptz);
INSERT INTO inquiries (name, phone, email, service, message, status, visitor_id, created_at) VALUES ('Test Postulante Margarita', '04248700438', 'test@seminuevoautos.com', 'Postulacion Vendedor', 'POSTULACION OFICIAL DE VENDEDOR / ASESOR COMERCIAL:
- Cedula: V-12345678
- Ubicacion: Porlamar, Isla de Margarita
- Exp: 3 a 5 anos
- Exp Auto: Si
- Modalidad: Presencial
- Vehiculo propio: Si', 'new', 'v-e8b382a073d048cbb79d858aee6f956d', '2026-09-10T17:59:23.01777+00:00'::timestamptz);
INSERT INTO inquiries (name, phone, email, service, message, status, visitor_id, created_at) VALUES ('Test Postulante Margarita', '04248700438', 'test@seminuevoautos.com', 'Postulacion Vendedor', 'Prueba de postulacion vendedor directa', 'new', 'v-a8062b5853ec41fb93adb7cc3b28b11d', '2026-09-10T17:59:48.673262+00:00'::timestamptz);
INSERT INTO inquiries (name, phone, email, service, message, status, visitor_id, created_at) VALUES ('carlos', '90202020202', 'as@gmail.com', 'Postulación Vendedor', 'POSTULACIÓN OFICIAL DE VENDEDOR / ASESOR COMERCIAL:
• Cédula/ID: 12324521
• Sector/Municipio: asdasda
• Experiencia en Ventas: 1 a 3 años de experiencia comercial
• Experiencia Automotriz: Sí, en concesionario o agencia formal
• Modalidad: Presencial en Isla de Margarita (Porlamar)
• Vehículo propio: No cuento con vehículo propio
• Enlace CV / Perfil: https://www.tallermastertech.com/postulacion
• Sobre el candidato / Logros:
jaskdajdasaksdhkjasd', 'new', 'v-u66bbohpomhilyfku2zu4', '2026-09-10T18:02:31.371371+00:00'::timestamptz);
INSERT INTO inquiries (name, phone, email, service, message, status, visitor_id, created_at) VALUES ('Juan coraspe', '04121288480', 'juanmiguelcoraspe2004@gmail.com', 'Postulación Vendedor', 'POSTULACIÓN OFICIAL DE VENDEDOR / ASESOR COMERCIAL:
• Cédula/ID: 30563714
• Sector/Municipio: Maneiro, jorge coll
• Experiencia en Ventas: 3 a 5 años de trayectoria en ventas
• Experiencia Automotriz: Sí, como vendedor independiente / broker
• Modalidad: Híbrido / Campo en Isla de Margarita
• Vehículo propio: Sí, cuento con vehículo propio
• Enlace CV / Perfil: No adjunto
• Sobre el candidato / Logros:
Buenas tardes

Quiero desenvolverme más en el campo automotriz de la compra y venta incluyendo la Importancion de vehículos, por ahora solo he vendido los carros que he tenido con el tiempo y los de amigos, tengo una venta de repuestos automotriz y voy para 3 años con ella', 'new', 'v-s7vi2f72vq3cup40063ji', '2026-09-10T22:25:25.954636+00:00'::timestamptz);
INSERT INTO inquiries (name, phone, email, service, message, status, visitor_id, created_at) VALUES ('Maximiliano Dewendt', '04221638618', 'maximilianodewendt1@icloud.com', 'Postulación Vendedor', 'POSTULACIÓN OFICIAL DE VENDEDOR / ASESOR COMERCIAL:
• Cédula/ID: 34162607
• Sector/Municipio: Pampatar
• Experiencia en Ventas: Menos de 1 año (Iniciando con alta motivación)
• Experiencia Automotriz: No tengo experiencia previa en autos
• Modalidad: Híbrido / Campo en Isla de Margarita
• Vehículo propio: Sí, cuento con vehículo propio
• Enlace CV / Perfil: No adjunto
• Sobre el candidato / Logros:
Soy una persona con ambicion, responsable y con muchas ganas de aprender y crecer profesionalmente. Se me hace facil tratar con las personas, escuchar lo que necesitan y generar confianza. Me gusta trabajar con metas y sobre todo buscar constantemente la forma de mejorar mis resultados

Me interesa el área de ventas porque disfruto el contacto con las personas y me motiva el convertir una buena conversación en una oportunidad, para mi, vender no es simplemente ofrecer un carro sino entender al cliente, saber qué está buscando y ayudarlo a tomar una decisión con confianza

Aprendo rápido, soy competitivo y tengo una actitud proactiva. Estoy dispuesto a capacitarme, conocer a fondo los vehículos y desarrollar las mejores técnicas de venta necesarias para llegar a ser un buen vendedor. Busco aportar compromiso y resultados al equipo, al mismo tiempo que adquiero experiencia y voy construyendo un perfil dentro del sector', 'new', 'v-a9fba1mg3jdv3wlmzzlitb', '2026-09-10T22:57:45.883522+00:00'::timestamptz);
INSERT INTO inquiries (name, phone, email, service, message, status, visitor_id, created_at) VALUES ('Yilbert Antonio Giménez cedeño', '04226466385', 'yilbertgimenez3@gmail.com', 'Postulación Vendedor', 'POSTULACIÓN OFICIAL DE VENDEDOR / ASESOR COMERCIAL:
• Cédula/ID: 27539202
• Sector/Municipio: Diaz
• Experiencia en Ventas: 3 a 5 años de trayectoria en ventas
• Experiencia Automotriz: Sí, en concesionario o agencia formal
• Modalidad: Presencial en Isla de Margarita (Porlamar)
• Vehículo propio: No cuento con vehículo propio
• Enlace CV / Perfil: No adjunto
• Sobre el candidato / Logros:
Trabajé en venta de carros en la avenida Bolívar en la bomba 20 petrol cerca del 911 durante varios años con un árabe tengo experiencias para vender autos y buena conversación directa con el cliente, me motiva trabajar con ustedes porque es algo donde yo mismo me pongo a prueba Yo mismo me pongo mis propios límites para yo superarlos, actualmente estoy trabajando en una venta de ropa y mercancía el mayor al lado del Gran mandarín en la tienda el emperador por los momentos si me sale la oportunidad con ustedes no la voy a desaprovechar', 'new', 'v-lycnv2hu8tibagjfu4ive', '2026-09-11T01:39:37.845494+00:00'::timestamptz);
INSERT INTO inquiries (name, phone, email, service, message, status, visitor_id, created_at) VALUES ('Jorge quijada', '04165967300', 'jorgequijadasss@gmail.com', 'Postulación Vendedor', 'POSTULACIÓN OFICIAL DE VENDEDOR / ASESOR COMERCIAL:
• Cédula/ID: 30685287
• Sector/Municipio: Altagracia, municipio Gómez
• Experiencia en Ventas: 1 a 3 años de experiencia comercial
• Experiencia Automotriz: No tengo experiencia previa en autos
• Modalidad: Híbrido / Campo en Isla de Margarita
• Vehículo propio: Sí, cuento con vehículo propio
• Enlace CV / Perfil: No adjunto
• Sobre el candidato / Logros:
Estoy buscando nuevas oportunidades de trabajo', 'new', 'v-txj56cfpmjqdz6ez0xbqc', '2026-09-11T03:40:53.814068+00:00'::timestamptz);
INSERT INTO inquiries (name, phone, email, service, message, status, visitor_id, created_at) VALUES ('Yarwil Jose Brito Rodriguez.', '+584147958737', 'britoyarwil@gmail.com', 'Postulación Vendedor', 'POSTULACIÓN OFICIAL DE VENDEDOR / ASESOR COMERCIAL:
• Cédula/ID: 30141488
• Sector/Municipio: Los Robles, pampatar, Municipio Maneiro.
• Experiencia en Ventas: 1 a 3 años de experiencia comercial
• Experiencia Automotriz: Sí, como vendedor independiente / broker
• Modalidad: Presencial en Isla de Margarita (Porlamar)
• Vehículo propio: No cuento con vehículo propio
• Enlace CV / Perfil: No adjunto
• Sobre el candidato / Logros:
Me gustan los autos como un aficionado.
Mayor logro es el mejorar tras cada venta no me gusta perder detalles.', 'new', 'v-nch5l1sejhwylys60g9ks', '2026-09-11T04:18:46.692331+00:00'::timestamptz);
INSERT INTO inquiries (name, phone, email, service, message, status, visitor_id, created_at) VALUES ('Robert Rafael López Larez', '+584248794459', 'robertico3903@gmail.com', 'Postulación Vendedor', 'POSTULACIÓN OFICIAL DE VENDEDOR / ASESOR COMERCIAL:
• Cédula/ID: 30399294
• Sector/Municipio: Porlamar
• Experiencia en Ventas: Menos de 1 año (Iniciando con alta motivación)
• Experiencia Automotriz: No tengo experiencia previa en autos
• Modalidad: Presencial en Isla de Margarita (Porlamar)
• Vehículo propio: No cuento con vehículo propio
• Enlace CV / Perfil: No adjunto
• Sobre el candidato / Logros:
Me parece interesante el puesto y ya tengo experiencia en ventas', 'new', 'v-nu78iyg4e8ubjesdvjqak', '2026-09-11T04:21:48.0657+00:00'::timestamptz);
INSERT INTO inquiries (name, phone, email, service, message, status, visitor_id, created_at) VALUES ('Julio cesar Vengoechea', '+584127138993', 'vengoechearodriguez@gmail.com', 'Postulación Vendedor', 'POSTULACIÓN OFICIAL DE VENDEDOR / ASESOR COMERCIAL:
• Cédula/ID: 32.051.609
• Sector/Municipio: Gracia
• Experiencia en Ventas: Menos de 1 año (Iniciando con alta motivación)
• Experiencia Automotriz: No tengo experiencia previa en autos
• Modalidad: Presencial en Isla de Margarita (Porlamar)
• Vehículo propio: Sí, cuento con vehículo propio
• Enlace CV / Perfil: No adjunto
• Sobre el candidato / Logros:
Bueno simplemente viene a hacer la prueba para ver, porque no tengo experiencia en ventas, pero sin conocimiento de vehículos claro dependiendo de que tan comercial sea pero se en general, y en ventas no he realizado ninguna como ya dije pero si he logrado hacer más interesante y llamativo productos que no están seguros de comprar, pero bueno simplemente vine a hacer el intento porque ni siquiera se cómo es lo de la modalidad de interés, y ni siquiera se cómo sería el horario de trabajo porque tengo que estudiar en la tarde, pero bueno disculpe me si les hice perder el tiempo.
Feliz noche', 'new', 'v-ifd233jlyhm99dhb32j13w', '2026-09-11T04:27:47.404733+00:00'::timestamptz);
INSERT INTO inquiries (name, phone, email, service, message, status, visitor_id, created_at) VALUES ('Valeria Alejandra Acosta Rebolledo', '04167999741', 'rebolledo5bu@gmail.com', 'Postulación Vendedor', 'POSTULACIÓN OFICIAL DE VENDEDOR / ASESOR COMERCIAL:
• Cédula/ID: 34162948
• Sector/Municipio: Pampatar san Lorenzo
• Experiencia en Ventas: Menos de 1 año (Iniciando con alta motivación)
• Experiencia Automotriz: No tengo experiencia previa en autos
• Modalidad: Comisionista Independiente (Margarita)
• Vehículo propio: No cuento con vehículo propio
• Enlace CV / Perfil: No adjunto
• Sobre el candidato / Logros:
Deseo unirme a Seminuevos porque me apasiona la atención al cliente y el mundo comercial. Aunque actualmente estoy estudiando y no cuento con una larga trayectoria formal en ventas, mi mayor logro ha sido desarrollar una excelente capacidad de comunicación, proactividad y facilidad para conectar con las personas en proyectos académicos y personales. Tengo la disposición de aprender rápido la gama de vehículos y aportar entusiasmo y responsabilidad asesorando a los clientes."', 'new', 'v-pdzn5ulwv4mlxgnhqof73a', '2026-09-11T04:58:59.508054+00:00'::timestamptz);
INSERT INTO inquiries (name, phone, email, service, message, status, visitor_id, created_at) VALUES ('Edwin Alexander Rodríguez moreno', '04147855396', 'alexanderedwin734@gmail.com', 'Postulación Vendedor', 'POSTULACIÓN OFICIAL DE VENDEDOR / ASESOR COMERCIAL:
• Cédula/ID: 32893377
• Sector/Municipio: Porlamar
• Experiencia en Ventas: Menos de 1 año (Iniciando con alta motivación)
• Experiencia Automotriz: No tengo experiencia previa en autos
• Modalidad: Híbrido / Campo en Isla de Margarita
• Vehículo propio: No cuento con vehículo propio
• Enlace CV / Perfil: No adjunto
• Sobre el candidato / Logros:
Por qué tengo buena presentación tengo un poco de experiencia en las ventas de algunos artículos independientes, soy una persona motivada y con buena presentación que es todo lo que tú cliente busca', 'new', 'v-0cys7r1xaz2u2mopvk2i9rq', '2026-09-11T05:13:27.876107+00:00'::timestamptz);
INSERT INTO inquiries (name, phone, email, service, message, status, visitor_id, created_at) VALUES ('Greicy Veronica Leon Marval', '+584123570524', 'greicyleon@gmail.com', 'Postulación Vendedor', 'POSTULACIÓN OFICIAL DE VENDEDOR / ASESOR COMERCIAL:
• Cédula/ID: 14840874
• Sector/Municipio: Península de Macanao
• Experiencia en Ventas: 3 a 5 años de trayectoria en ventas
• Experiencia Automotriz: No tengo experiencia previa en autos
• Modalidad: Híbrido / Campo en Isla de Margarita
• Vehículo propio: Sí, cuento con vehículo propio
• Enlace CV / Perfil: No adjunto
• Sobre el candidato / Logros:
Soy una profesional que tiene las ganas el interés y la motivación de trabajar', 'new', 'v-slsnfr6tqvet7t04rjjb1d', '2026-09-11T09:38:04.43078+00:00'::timestamptz);
INSERT INTO inquiries (name, phone, email, service, message, status, visitor_id, created_at) VALUES ('Yonathan', '04120932741', 'quiames.jonathan.jose@gmail.com', 'Postulación Vendedor', 'POSTULACIÓN OFICIAL DE VENDEDOR / ASESOR COMERCIAL:
• Cédula/ID: V 21733028
• Sector/Municipio: Pampatar
• Experiencia en Ventas: 3 a 5 años de trayectoria en ventas
• Experiencia Automotriz: No tengo experiencia previa en autos
• Modalidad: Híbrido / Campo en Isla de Margarita
• Vehículo propio: No cuento con vehículo propio
• Enlace CV / Perfil: No adjunto
• Sobre el candidato / Logros:
Quisiera otra entrada para mi y mi familia me gustaría aprender más sobre vender carros y ser parte de su equipo', 'new', 'v-4ukz3qxludfrzlc4eu1t', '2026-09-11T10:16:58.226883+00:00'::timestamptz);
INSERT INTO inquiries (name, phone, email, service, message, status, visitor_id, created_at) VALUES ('Enrique José Quintero Martínez', '+584121956745', 'enriquequinoficial@gmail.com', 'Postulación Vendedor', 'POSTULACIÓN OFICIAL DE VENDEDOR / ASESOR COMERCIAL:
• Cédula/ID: 32627483
• Sector/Municipio: Porlamar
• Experiencia en Ventas: Menos de 1 año (Iniciando con alta motivación)
• Experiencia Automotriz: No tengo experiencia previa en autos
• Modalidad: Presencial en Isla de Margarita (Porlamar)
• Vehículo propio: No cuento con vehículo propio
• Enlace CV / Perfil: No adjunto
• Sobre el candidato / Logros:
No tengo ningún logro en ventas así de grande, pero quisiera aprender con ustedes y trabajar que es lo importante', 'new', 'v-9nnmapgqkjncqc10oyz3z7', '2026-09-11T10:23:00.633977+00:00'::timestamptz);
INSERT INTO inquiries (name, phone, email, service, message, status, visitor_id, created_at) VALUES ('Francisco Javier Rodríguez Méndez', '+58 424 7152003', 'franjr69@gmail.com', 'Postulación Vendedor', 'POSTULACIÓN OFICIAL DE VENDEDOR / ASESOR COMERCIAL:
• Cédula/ID: V-14843781
• Sector/Municipio: Sabanamar/mariño
• Experiencia en Ventas: 3 a 5 años de trayectoria en ventas
• Experiencia Automotriz: Sí, como vendedor independiente / broker
• Modalidad: Híbrido / Campo en Isla de Margarita
• Vehículo propio: Sí, cuento con vehículo propio
• Enlace CV / Perfil: No adjunto
• Sobre el candidato / Logros:
Buenos días, me apasionan los autos, todo el sector automotriz y quisiera formar parte de su equipo y aprender cosas y si es posible dar mi aporte también. A nivel automotriz la venta de 2 gandolas mack visión entre el edo falcón y carabobo en el año 2008', 'new', 'v-nlh90ranbrdf93edc3t7dh', '2026-09-11T11:45:08.353609+00:00'::timestamptz);
INSERT INTO inquiries (name, phone, email, service, message, status, visitor_id, created_at) VALUES ('Nilfredo José Gómez Marcano', '+584248813519', 'marcanonilfredojose@gmail.com', 'Postulación Vendedor', 'POSTULACIÓN OFICIAL DE VENDEDOR / ASESOR COMERCIAL:
• Cédula/ID: 30277593
• Sector/Municipio: Díaz
• Experiencia en Ventas: Menos de 1 año (Iniciando con alta motivación)
• Experiencia Automotriz: No tengo experiencia previa en autos
• Modalidad: Presencial en Isla de Margarita (Porlamar)
• Vehículo propio: No cuento con vehículo propio
• Enlace CV / Perfil: No adjunto
• Sobre el candidato / Logros:
Saludos, estoy estudiando una carrera universitaria, soy maestro de educación física y entrenador, pero siempre me ha atraído el comercio de vehículos. Cualquier vacante de medio tiempo en el que pueda generar un poco mas de dinero extra y ayudarlos a ustedes en su marca me beneficiaria y mas si es en un área por la que me siento atraído. Tengo 23 años y soy de la isla', 'new', 'v-fdea16k34goo83wn7vrd7a', '2026-09-11T12:10:28.075023+00:00'::timestamptz);
INSERT INTO inquiries (name, phone, email, service, message, status, visitor_id, created_at) VALUES ('Yamluis Luzardo', '04123514608', 'luzardoyamluis2@gmail.com', 'Postulación Vendedor', 'POSTULACIÓN OFICIAL DE VENDEDOR / ASESOR COMERCIAL:
• Cédula/ID: 34283433
• Sector/Municipio: la asunción
• Experiencia en Ventas: 1 a 3 años de experiencia comercial
• Experiencia Automotriz: Sí, en concesionario o agencia formal
• Modalidad: Presencial en Isla de Margarita (Porlamar)
• Vehículo propio: No cuento con vehículo propio
• Enlace CV / Perfil: No adjunto
• Sobre el candidato / Logros:
tengo ya experiencia en ventas y por ahora ando desempleado, busco lugar para seguir trabajando y reforzando mi experiencia en ventas y negocios', 'new', 'v-hf5katkvhe7n46wz5qiptm', '2026-09-11T12:12:49.961906+00:00'::timestamptz);
INSERT INTO inquiries (name, phone, email, service, message, status, visitor_id, created_at) VALUES ('María de los Ángeles torres', '+584129792924', 'mriaengel.87@gmail.com', 'Postulación Vendedor', 'POSTULACIÓN OFICIAL DE VENDEDOR / ASESOR COMERCIAL:
• Cédula/ID: 20223723
• Sector/Municipio: Diaz
• Experiencia en Ventas: Menos de 1 año (Iniciando con alta motivación)
• Experiencia Automotriz: No tengo experiencia previa en autos
• Modalidad: Presencial en Isla de Margarita (Porlamar)
• Vehículo propio: Sí, cuento con vehículo propio
• Enlace CV / Perfil: No adjunto
• Sobre el candidato / Logros:
Esta sería mi primera vez en ventas de auto', 'new', 'v-vwxq65m2o0ldmm7d60izf', '2026-09-11T12:23:18.067484+00:00'::timestamptz);
INSERT INTO inquiries (name, phone, email, service, message, status, visitor_id, created_at) VALUES ('Robert Montilla', '04123538894', 'trebor.mm1@gmail.com', 'Postulación Vendedor', 'POSTULACIÓN OFICIAL DE VENDEDOR / ASESOR COMERCIAL:
• Cédula/ID: 27547698
• Sector/Municipio: Valle Verde
• Experiencia en Ventas: Menos de 1 año (Iniciando con alta motivación)
• Experiencia Automotriz: No tengo experiencia previa en autos
• Modalidad: Presencial en Isla de Margarita (Porlamar)
• Vehículo propio: No cuento con vehículo propio
• Enlace CV / Perfil: No adjunto
• Sobre el candidato / Logros:
Soy una personal puntual, me gusta asumir nuevos retos eh trabajado en diferentes áreas de diferentes retail y no me detiene aprender cosas nuevas, no tego conocimiento en venta automotriz pero me gustan las ventas, me se comunicar muy bien y me gusta mucho el trabajo con el público', 'new', 'v-bl2wlh1tffqzei2oiv20am', '2026-09-11T12:28:42.78659+00:00'::timestamptz);
INSERT INTO inquiries (name, phone, email, service, message, status, visitor_id, created_at) VALUES ('Berusca Millán', '04248931665', 'nohetv20@gmail.com', 'Postulación Vendedor', 'POSTULACIÓN OFICIAL DE VENDEDOR / ASESOR COMERCIAL:
• Cédula/ID: 28316197
• Sector/Municipio: Porlamar
• Experiencia en Ventas: 1 a 3 años de experiencia comercial
• Experiencia Automotriz: No en autos, pero sí en bienes de alto valor (inmuebles, seguros, etc.)
• Modalidad: Comisionista Independiente (Margarita)
• Vehículo propio: Sí, cuento con vehículo propio
• Enlace CV / Perfil: No adjunto
• Sobre el candidato / Logros:
.', 'new', 'v-l3zyywoi2ju31h5bee4a', '2026-09-11T12:32:16.305583+00:00'::timestamptz);
INSERT INTO inquiries (name, phone, email, service, message, status, visitor_id, created_at) VALUES ('Manuel Alejandro Rondón Chacon', '04248207586', 'rmanueldo@gmail.com', 'Postulación Vendedor', 'POSTULACIÓN OFICIAL DE VENDEDOR / ASESOR COMERCIAL:
• Cédula/ID: 22621989
• Sector/Municipio: García, urb doral margarita villaje
• Experiencia en Ventas: 3 a 5 años de trayectoria en ventas
• Experiencia Automotriz: Sí, como vendedor independiente / broker
• Modalidad: Presencial en Isla de Margarita (Porlamar)
• Vehículo propio: No cuento con vehículo propio
• Enlace CV / Perfil: No adjunto
• Sobre el candidato / Logros:
Soy una persona que tiene experiencia en ventas, eh trabajado en tienda, también como vendedor independiente, tengo experiencia laborar en ventas de respuesto un , trabaje en una empresa  como vendedor en el área de cauchos, aceites, baterías y accesorios para vehículos, también tengo experiencia en venta automotriz, eh trabajado como cajero, tengo experiencia con atención al publico, me considero una persona proacctiva, y cuento con disponibilidad inmediata. Acá le dejo mi número de contacto 04248207586', 'new', 'v-9eo4ndlzuupn0w1d6kzej', '2026-09-11T13:35:27.451496+00:00'::timestamptz);
INSERT INTO inquiries (name, phone, email, service, message, status, visitor_id, created_at) VALUES ('Anthony Brian Boadas Villafranca', '+584127943023', 'anthonyboadas10@gmail.com', 'Postulación Vendedor', 'POSTULACIÓN OFICIAL DE VENDEDOR / ASESOR COMERCIAL:
• Cédula/ID: 28570023
• Sector/Municipio: Avenida terranova residencia las margaritas
• Experiencia en Ventas: 1 a 3 años de experiencia comercial
• Experiencia Automotriz: No en autos, pero sí en bienes de alto valor (inmuebles, seguros, etc.)
• Modalidad: Presencial en Isla de Margarita (Porlamar)
• Vehículo propio: Sí, cuento con vehículo propio
• Enlace CV / Perfil: https://1drv.ms/w/c/59e6fb4563fb9f00/IQAbxb-zcHfrSpRog4C-HnrcAT8OcV1U3hIY4DQZk3mNDp0
• Sobre el candidato / Logros:
Mi meta es consolidarme como vendedor líder, aumentar las ventas mensuales. Busco aplicar mi conocimiento en negociación y financiamiento.', 'new', 'v-85t5kndo6763y9jmyhitp3', '2026-09-11T14:26:26.093959+00:00'::timestamptz);
INSERT INTO inquiries (name, phone, email, service, message, status, visitor_id, created_at) VALUES ('Jheankharlos ysaias mata Espinoza', '+584226770038', 'jyme1510@gmail.com', 'Postulación Vendedor', 'POSTULACIÓN OFICIAL DE VENDEDOR / ASESOR COMERCIAL:
• Cédula/ID: 30785613
• Sector/Municipio: La asuncion
• Experiencia en Ventas: 3 a 5 años de trayectoria en ventas
• Experiencia Automotriz: Sí, como vendedor independiente / broker
• Modalidad: Presencial en Isla de Margarita (Porlamar)
• Vehículo propio: Sí, cuento con vehículo propio
• Enlace CV / Perfil: No adjunto
• Sobre el candidato / Logros:
Me encanta el campo automotriz, he vendido vehículos propios, me gustaría brindar mi conocimiento en la empresa y también adquirir conocimientos', 'new', 'v-ucsgos1szythohmebp49', '2026-09-11T14:46:42.838385+00:00'::timestamptz);
INSERT INTO inquiries (name, phone, email, service, message, status, visitor_id, created_at) VALUES ('Algenis Ramirez', '04248020273', 'algenisrmartinezvz@gmail.com', 'Postulación Vendedor', 'POSTULACIÓN OFICIAL DE VENDEDOR / ASESOR COMERCIAL:
• Cédula/ID: 30008076
• Sector/Municipio: Coto periz municipio Dias
• Experiencia en Ventas: Menos de 1 año (Iniciando con alta motivación)
• Experiencia Automotriz: No tengo experiencia previa en autos
• Modalidad: Presencial en Isla de Margarita (Porlamar)
• Vehículo propio: No cuento con vehículo propio
• Enlace CV / Perfil: No adjunto
• Sobre el candidato / Logros:
Me gustaría tener experiencia  laboral   no poseo tanta experiencia . Soy flexible  a el aprendizaje  y a trabajar  en equipo', 'new', 'v-evjitx6js32xcu09avsm', '2026-09-11T14:58:00.592779+00:00'::timestamptz);
INSERT INTO inquiries (name, phone, email, service, message, status, visitor_id, created_at) VALUES ('Josseph Alberto Afonso brito', '04147922893', 'jossephafonsobrito@gmail.com', 'Postulación Vendedor', 'POSTULACIÓN OFICIAL DE VENDEDOR / ASESOR COMERCIAL:
• Cédula/ID: 31821333
• Sector/Municipio: Pampatar, maneiro
• Experiencia en Ventas: 1 a 3 años de experiencia comercial
• Experiencia Automotriz: Sí, en concesionario o agencia formal
• Modalidad: Presencial en Isla de Margarita (Porlamar)
• Vehículo propio: Sí, cuento con vehículo propio
• Enlace CV / Perfil: No adjunto
• Sobre el candidato / Logros:
Hola que tal buenos días un gusto mi nombre es Josseph soy estudiante de ingeniería mecánica , quisiera unirme a seminuevos para adquirir aún más conocimientos y experiencia sobre ventas , sé de mecánica y mucho sobre autos a , mi mayor logro en ventas fue en el negocio familiar ubicado en Texas donde llevaba a cabo el puesto como vendedor principal.', 'new', 'v-5oniicm2w1w25vapese4gj', '2026-09-11T15:44:07.93177+00:00'::timestamptz);
INSERT INTO inquiries (name, phone, email, service, message, status, visitor_id, created_at) VALUES ('Samuel David llanos Rodríguez', '04123510719', 'samuelgtr23@gmail.com', 'Postulación Vendedor', 'POSTULACIÓN OFICIAL DE VENDEDOR / ASESOR COMERCIAL:
• Cédula/ID: 31667225
• Sector/Municipio: Porlamar
• Experiencia en Ventas: Menos de 1 año (Iniciando con alta motivación)
• Experiencia Automotriz: No tengo experiencia previa en autos
• Modalidad: Presencial en Isla de Margarita (Porlamar)
• Vehículo propio: No cuento con vehículo propio
• Enlace CV / Perfil: No adjunto
• Sobre el candidato / Logros:
La verdad me aburrí en mi trabajo y me gustaría estar cerca de algunos autos y aprender más de lo que se sobre carros', 'new', 'v-z6t4hb468skhc1hkp8d8dq', '2026-09-11T23:34:59.823423+00:00'::timestamptz);
INSERT INTO inquiries (name, phone, email, service, message, status, visitor_id, created_at) VALUES ('Alejandro Ramírez', '+584121956158', 'ar429939@gmail.com', 'Postulación Vendedor', 'POSTULACIÓN OFICIAL DE VENDEDOR / ASESOR COMERCIAL:
• Cédula/ID: 30065333
• Sector/Municipio: Maneiro
• Experiencia en Ventas: 1 a 3 años de experiencia comercial
• Experiencia Automotriz: No tengo experiencia previa en autos
• Modalidad: Presencial en Isla de Margarita (Porlamar)
• Vehículo propio: Sí, cuento con vehículo propio
• Enlace CV / Perfil: No adjunto
• Sobre el candidato / Logros:
Bueno primero que todo es un placer, gracias de antemano mano por la oportunidad, me considero una persona muy optimista, una persona con una capacidad de aprender rápido, siempre me han gustado los retos e ir creciendo profesionalmente, creo que esta sería una oportunidad única para ello, soy bueno trabajando en equipo, gracias a mis antiguos empleos, manejo un trato con los clientes excepcional y soy una persona que se caracteriza por ser responsable, puntual y respetuoso.', 'new', 'v-fkrusjs2muqfz3iasn6tah', '2026-09-11T15:52:51.572014+00:00'::timestamptz);
INSERT INTO inquiries (name, phone, email, service, message, status, visitor_id, created_at) VALUES ('Natacha marcano gonzalez', '04248064952', 'natachamarcanogonzalez@gmail.com', 'Postulación Vendedor', 'POSTULACIÓN OFICIAL DE VENDEDOR / ASESOR COMERCIAL:
• Cédula/ID: 13980179
• Sector/Municipio: La capilla
• Experiencia en Ventas: 3 a 5 años de trayectoria en ventas
• Experiencia Automotriz: No tengo experiencia previa en autos
• Modalidad: Presencial en Isla de Margarita (Porlamar)
• Vehículo propio: No cuento con vehículo propio
• Enlace CV / Perfil: No adjunto
• Sobre el candidato / Logros:
Aprender en algo totalmente nuevo....mi mayor logro vender propiedades', 'new', 'v-6zn7kkmkhz9zez3delik68', '2026-09-11T16:01:19.839031+00:00'::timestamptz);
INSERT INTO inquiries (name, phone, email, service, message, status, visitor_id, created_at) VALUES ('Jhosselin del valle González Calzadilla', '04127279054', 'jhosselingonzalez27@gmail.com', 'Postulación Vendedor', 'POSTULACIÓN OFICIAL DE VENDEDOR / ASESOR COMERCIAL:
• Cédula/ID: 22994974
• Sector/Municipio: Las Cabreras municipio Marcano
• Experiencia en Ventas: 3 a 5 años de trayectoria en ventas
• Experiencia Automotriz: Sí, en concesionario o agencia formal
• Modalidad: Presencial en Isla de Margarita (Porlamar)
• Vehículo propio: Sí, cuento con vehículo propio
• Enlace CV / Perfil: No adjunto
• Sobre el candidato / Logros:
No solo vendes un producto o servicio sino que te enfocas en construir relaciones de valor a largo plazo con cada cliente. Tu enfoque combina la escucha activa con una sólida habilidad para identificar necesidades reales lo que te permite ofrecer soluciones a la medida que generan confianza instantáneamente y Entiendes que una buena asesoría se basa en ayudar, no en presionar Tu prioridad es que el cliente adquiera exactamente lo que necesita para triunfar', 'new', 'v-uthz4dk64bfhgmdjmz2r69', '2026-09-11T16:45:32.992183+00:00'::timestamptz);
INSERT INTO inquiries (name, phone, email, service, message, status, visitor_id, created_at) VALUES ('Gertrudys mujica', '04140868530', 'gertruy2780@gmail.com', 'Postulación Vendedor', 'POSTULACIÓN OFICIAL DE VENDEDOR / ASESOR COMERCIAL:
• Cédula/ID: 12739970
• Sector/Municipio: Nueva Esparta
• Experiencia en Ventas: Más de 5 años como profesional de ventas
• Experiencia Automotriz: Sí, como vendedor independiente / broker
• Modalidad: Comisionista Independiente (Margarita)
• Vehículo propio: Sí, cuento con vehículo propio
• Enlace CV / Perfil: https://www.instagram.com/gertrudysmujica?stkn=aHVvbzVkYTVrZjF5
• Sobre el candidato / Logros:
Tengo 25 años de experiencia
 como representante de venta .pero a nivel  consumo masivo y papeleria', 'new', 'v-htjzfgscqbok88l29xaodf', '2026-09-11T18:48:49.190509+00:00'::timestamptz);
INSERT INTO inquiries (name, phone, email, service, message, status, visitor_id, created_at) VALUES ('Yilbert Antonio Giménez cedeño', '04226466385', 'yilbertgimenez3@gmail.com', 'Postulación Vendedor', 'POSTULACIÓN OFICIAL DE VENDEDOR / ASESOR COMERCIAL:
• Cédula/ID: 27539202
• Sector/Municipio: Diaz
• Experiencia en Ventas: 3 a 5 años de trayectoria en ventas
• Experiencia Automotriz: Sí, en concesionario o agencia formal
• Modalidad: Presencial en Isla de Margarita (Porlamar)
• Vehículo propio: No cuento con vehículo propio
• Enlace CV / Perfil: No adjunto
• Sobre el candidato / Logros:
Trabajé en venta de carros en la avenida Bolívar en la bomba 20 petrol cerca del 911 durante varios años con un árabe tengo experiencias para vender autos y buena conversación directa con el cliente, me motiva trabajar con ustedes porque es algo donde yo mismo me pongo a prueba Yo mismo me pongo mis propios límites para yo superarlos, actualmente estoy trabajando en una venta de ropa y mercancía el mayor al lado del Gran mandarín en la tienda el emperador por los momentos si me sale la oportunidad con ustedes no la voy a desaprovechar', 'new', 'v-lycnv2hu8tibagjfu4ive', '2026-09-11T18:55:13.681299+00:00'::timestamptz);
INSERT INTO inquiries (name, phone, email, service, message, status, visitor_id, created_at) VALUES ('Eiber Rafael salazar León', '04223030311', 'eiberleon90@gmail.com', 'Postulación Vendedor', 'POSTULACIÓN OFICIAL DE VENDEDOR / ASESOR COMERCIAL:
• Cédula/ID: 27100008
• Sector/Municipio: PORLAMAR
• Experiencia en Ventas: 1 a 3 años de experiencia comercial
• Experiencia Automotriz: Sí, como vendedor independiente / broker
• Modalidad: Presencial en Isla de Margarita (Porlamar)
• Vehículo propio: No cuento con vehículo propio
• Enlace CV / Perfil: No adjunto
• Sobre el candidato / Logros:
Soy una persona muy positiva se tratar bien al cliente tengo mucha experiencia en el tema de atención y se manejar muchos tipos de situaciones. Soy muy puntual y responsable en mi trabajo', 'new', 'v-05t2440o1x8rg4y7930r385', '2026-09-11T20:49:05.471727+00:00'::timestamptz);
INSERT INTO inquiries (name, phone, email, service, message, status, visitor_id, created_at) VALUES ('Abel Jesús Vizcaíno Salazar', '+584248463877', 'vizcainoabel434@gmail.com', 'Postulación Vendedor', 'POSTULACIÓN OFICIAL DE VENDEDOR / ASESOR COMERCIAL:
• Cédula/ID: v-33070804
• Sector/Municipio: Porlamar Municipio Mariño
• Experiencia en Ventas: 1 a 3 años de experiencia comercial
• Experiencia Automotriz: No tengo experiencia previa en autos
• Modalidad: Presencial en Isla de Margarita (Porlamar)
• Vehículo propio: No cuento con vehículo propio
• Enlace CV / Perfil: https://www.instagram.com/vizcaino_abel?stkn=YnV6eXV2OGYzdHd3
• Sobre el candidato / Logros:
Soy una persona proactiva estudio comunicación social en la Ubv. tengo disponibilidad inmediata de trabajo y me gusta el trabajo en equipo. soy ejecutivo elite de Unisa, pertenezco a el movimiento Ciudadano Gane.', 'new', 'v-ieiurog717omjcck9d8kfk', '2026-09-11T21:28:17.886994+00:00'::timestamptz);
INSERT INTO inquiries (name, phone, email, service, message, status, visitor_id, created_at) VALUES ('Eduardo Martinez', '+584122094104', 'eduardomartinez.vecontacto@gmail.com', 'Postulación Vendedor', 'POSTULACIÓN OFICIAL DE VENDEDOR / ASESOR COMERCIAL:
• Cédula/ID: V31667694
• Sector/Municipio: Porlamar
• Experiencia en Ventas: 1 a 3 años de experiencia comercial
• Experiencia Automotriz: No tengo experiencia previa en autos
• Modalidad: Presencial en Isla de Margarita (Porlamar)
• Vehículo propio: No cuento con vehículo propio
• Enlace CV / Perfil: https://www.linkedin.com/in/eduardo-martinez-520897387?utm_source=share_via&utm_content=profile&utm_medium=member_android
• Sobre el candidato / Logros:
Soy Eduardo una persona que se adapta rápido a su entorno, cierra ventas con facilidad y tiene buena diccion', 'new', 'v-u7t9rmsa6b162kgwchkor', '2026-09-11T22:45:12.919703+00:00'::timestamptz);
INSERT INTO inquiries (name, phone, email, service, message, status, visitor_id, created_at) VALUES ('Airam Morillo Rivera', '4261886537', '024aremr@gmail.com', 'Postulación Vendedor', 'POSTULACIÓN OFICIAL DE VENDEDOR / ASESOR COMERCIAL:
• Cédula/ID: V- 32240668
• Sector/Municipio: San Antonio, Municipio García
• Experiencia en Ventas: Menos de 1 año (Iniciando con alta motivación)
• Experiencia Automotriz: No tengo experiencia previa en autos
• Modalidad: Presencial en Isla de Margarita (Porlamar)
• Vehículo propio: No cuento con vehículo propio
• Enlace CV / Perfil: No adjunto
• Sobre el candidato / Logros:
Me gustan las ventas, a pesar de no tener experiencia, soy de fácil aprendizaje y me adapto muy bien a cualquier área.', 'new', 'v-hjbgrxkwegi0jgnwtushs', '2026-09-11T23:13:57.98211+00:00'::timestamptz);
INSERT INTO inquiries (name, phone, email, service, message, status, visitor_id, created_at) VALUES ('camila valentina navarrete sánchez', '04221782185', 'navarrettecamila65@gmail.com', 'Postulación Vendedor', 'POSTULACIÓN OFICIAL DE VENDEDOR / ASESOR COMERCIAL:
• Cédula/ID: v-32.768.915
• Sector/Municipio: porlamar, centro
• Experiencia en Ventas: 1 a 3 años de experiencia comercial
• Experiencia Automotriz: No tengo experiencia previa en autos
• Modalidad: Presencial en Isla de Margarita (Porlamar)
• Vehículo propio: Sí, cuento con vehículo propio
• Enlace CV / Perfil: https://canva.link/sejsvwblemyza8a
• Sobre el candidato / Logros:
Me considero una persona orientada a resultados y con gran facilidad para conectar con los clientes. Mi mayor logro en ventas ha sido superar mis metas mensuales de forma constante gracias a un trato cercano y empático. Deseo unirme a Seminuevos porque me entusiasma el sector automotriz y sé que mi experiencia guiando a los clientes me permitirá brindar una asesoría de excelencia.', 'new', 'v-ci56ir54vk4pis1offhoza', '2026-09-12T01:34:25.498149+00:00'::timestamptz);
INSERT INTO inquiries (name, phone, email, service, message, status, visitor_id, created_at) VALUES ('Yisbelys martinez', '424 8857973', 'yisbelysmartinez071@gmail.com', 'Postulación Vendedor', 'POSTULACIÓN OFICIAL DE VENDEDOR / ASESOR COMERCIAL:
• Cédula/ID: 20326785
• Sector/Municipio: Los delfines
• Experiencia en Ventas: Menos de 1 año (Iniciando con alta motivación)
• Experiencia Automotriz: No tengo experiencia previa en autos
• Modalidad: Presencial en Isla de Margarita (Porlamar)
• Vehículo propio: No cuento con vehículo propio
• Enlace CV / Perfil: No adjunto
• Sobre el candidato / Logros:
Trabaje de ventas en empresa de Internet y me gustó el trabajo', 'new', 'v-kpmthr4koep4fdcuc7ryi', '2026-09-12T02:58:08.253258+00:00'::timestamptz);
INSERT INTO inquiries (name, phone, email, service, message, status, visitor_id, created_at) VALUES ('Marilyn Carolina ordosgoitti González', '+584220194771', 'marilyn_1805@icloud.com', 'Postulación Vendedor', 'POSTULACIÓN OFICIAL DE VENDEDOR / ASESOR COMERCIAL:
• Cédula/ID: V 31.686.881
• Sector/Municipio: Juan griego
• Experiencia en Ventas: 1 a 3 años de experiencia comercial
• Experiencia Automotriz: No tengo experiencia previa en autos
• Modalidad: Comisionista Independiente (Margarita)
• Vehículo propio: No cuento con vehículo propio
• Enlace CV / Perfil: No adjunto
• Sobre el candidato / Logros:
Hoy en día el comercio, ventas e inversiones reflejarán el nuevo futuro para la siguiente generación y con la experiencia y práctica puedo ser parte del mismo, busco poder progresar y a su vez ayudar a que seminuevo pueda obtener un mejor posicionamiento en el mercado, cada vez ir expandiendo a nuevas zonas y partes del mundo, espero conocerlos Att: Marilyn ordosgoitti', 'new', 'v-uv9w623xu5rytajsiw6b2', '2026-09-12T03:05:17.377251+00:00'::timestamptz);
INSERT INTO inquiries (name, phone, email, service, message, status, visitor_id, created_at) VALUES ('Luis Eduardo alves zorrilla', '04248093391', 'luiferth1008@gmail.com', 'Postulación Vendedor', 'POSTULACIÓN OFICIAL DE VENDEDOR / ASESOR COMERCIAL:
• Cédula/ID: V- 25967185
• Sector/Municipio: Playa el agua
• Experiencia en Ventas: Menos de 1 año (Iniciando con alta motivación)
• Experiencia Automotriz: Sí, en concesionario o agencia formal
• Modalidad: Híbrido / Campo en Isla de Margarita
• Vehículo propio: Sí, cuento con vehículo propio
• Enlace CV / Perfil: No adjunto
• Sobre el candidato / Logros:
Vendo y compro autos usados me gusta el área automotriz', 'new', 'v-p6tz7synakv4h5xpicfwb', '2026-09-12T12:23:29.168651+00:00'::timestamptz);
INSERT INTO inquiries (name, phone, email, service, message, status, visitor_id, created_at) VALUES ('Moises David Marcano Marcano', '+584248438717', 'marcamoisesdavid55@gmail.com', 'Postulación Vendedor', 'POSTULACIÓN OFICIAL DE VENDEDOR / ASESOR COMERCIAL:
• Cédula/ID: 30408100
• Sector/Municipio: Porlamar
• Experiencia en Ventas: Menos de 1 año (Iniciando con alta motivación)
• Experiencia Automotriz: No tengo experiencia previa en autos
• Modalidad: Presencial en Isla de Margarita (Porlamar)
• Vehículo propio: No cuento con vehículo propio
• Enlace CV / Perfil: https://www.instagram.com/moisesmarcano07?stkn=MW9jb3VpbHo3cXY0Mw%3D%3D&utm_source=qr
• Sobre el candidato / Logros:
Deseo unirme a Seminuevos porque es un sector dinámico y en constante crecimiento, donde el valor de la confianza y el asesoramiento personalizado son fundamentales. Me motiva formar parte de un equipo que facilita decisiones importantes para los clientes, ofreciendo soluciones de movilidad accesibles y garantizadas, y veo en la empresa el espacio ideal para aportar mi experiencia comercial y crecer profesionalmente.
Considero que haré un excelente trabajo porque combino una fuerte orientación a resultados con habilidades de negociación y atención al detalle. Sé escuchar las necesidades reales del cliente para ofrecerle la mejor alternativa, mantengo la proactividad en el seguimiento de prospectos y tengo la capacidad de adaptarme rápidamente a la dinámica del mercado vehicular', 'new', 'v-4wkwwdqh31nl30tb2aw2mg', '2026-09-12T15:03:03.270051+00:00'::timestamptz);
INSERT INTO inquiries (name, phone, email, service, message, status, visitor_id, created_at) VALUES ('Gustavo Alonso Villegas escalante', '04264875014', 'gustavovillegastaramar@gmail.com', 'Postulación Vendedor', 'POSTULACIÓN OFICIAL DE VENDEDOR / ASESOR COMERCIAL:
• Cédula/ID: 15895342
• Sector/Municipio: Mariño
• Experiencia en Ventas: Más de 5 años como profesional de ventas
• Experiencia Automotriz: Sí, como vendedor independiente / broker
• Modalidad: Presencial en Isla de Margarita (Porlamar)
• Vehículo propio: No cuento con vehículo propio
• Enlace CV / Perfil: No adjunto
• Sobre el candidato / Logros:
Por ver nuevas oportunidades y experiencias de trabajo. Eh tenido la habilidad de vender desde carro hasta inmuebles', 'new', 'v-zvk4f5yn065lzwb6aqusl', '2026-09-12T20:21:23.12443+00:00'::timestamptz);
INSERT INTO inquiries (name, phone, email, service, message, status, visitor_id, created_at) VALUES ('Alexander José Sánchez Bello', '04226868085', 'alexanderjosesanchezbello123@gmail.com', 'Postulación Vendedor', 'POSTULACIÓN OFICIAL DE VENDEDOR / ASESOR COMERCIAL:
• Cédula/ID: 27125058
• Sector/Municipio: Porlamar
• Experiencia en Ventas: Menos de 1 año (Iniciando con alta motivación)
• Experiencia Automotriz: No tengo experiencia previa en autos
• Modalidad: Presencial en Isla de Margarita (Porlamar)
• Vehículo propio: No cuento con vehículo propio
• Enlace CV / Perfil: No adjunto
• Sobre el candidato / Logros:
Realmente siempre me ha llamado la atención y quiero surgir', 'new', 'v-apsm58hec2h98mwfv2q0g5', '2026-09-12T20:26:45.511014+00:00'::timestamptz);
INSERT INTO inquiries (name, phone, email, service, message, status, visitor_id, created_at) VALUES ('Stephany Del Valle González Martínez', '+584121950850', 'gnany1505@gmail.com', 'Postulación Vendedor', 'POSTULACIÓN OFICIAL DE VENDEDOR / ASESOR COMERCIAL:
• Cédula/ID: V-31920290
• Sector/Municipio: Díaz
• Experiencia en Ventas: Menos de 1 año (Iniciando con alta motivación)
• Experiencia Automotriz: No tengo experiencia previa en autos
• Modalidad: Híbrido / Campo en Isla de Margarita
• Vehículo propio: No cuento con vehículo propio
• Enlace CV / Perfil: https://www.instagram.com/nanyway_07?stkn=Yjh2MWQ4d3gzaHlo&utm_source=qr
• Sobre el candidato / Logros:
Soy estudiante, trato de buscar un puesto de trabajo pero no consigo algo que no me choque con la universidad, solo pruebo para ver si logro encontrar, y mi mayor logro ha sido convencer a unas personas que comprarán el b13 de mi mamá que tenía problemas con la tapicería y la pintura', 'new', 'v-gvlwaft7jlg2qpqltf9dpw', '2026-09-12T23:08:42.942773+00:00'::timestamptz);
INSERT INTO inquiries (name, phone, email, service, message, status, visitor_id, created_at) VALUES ('José Gabriel ugueto ', '04149997892', 'uguetomarcano@gmail.com', 'Otro', 'Buenas tardes q se necesita para integrar y formar parte de su equipo ', 'new', 'v-si21d32265ii1r8ip1zvk', '2026-09-14T16:25:50.814473+00:00'::timestamptz);
INSERT INTO inquiries (name, phone, email, service, message, status, visitor_id, created_at) VALUES ('Elix Alonso Moreno Villalobos', '04123536590', 'elixmoreno.em@gmail.com', 'Postulación Vendedor', 'POSTULACIÓN OFICIAL DE VENDEDOR / ASESOR COMERCIAL:
• Cédula/ID: 12146901
• Sector/Municipio: Pedro Gonzalez Municipio Gomez Isla de margarita
• Experiencia en Ventas: Más de 5 años como profesional de ventas
• Experiencia Automotriz: Sí, como vendedor independiente / broker
• Modalidad: Híbrido / Campo en Isla de Margarita
• Vehículo propio: Sí, cuento con vehículo propio
• Enlace CV / Perfil: No adjunto
• Sobre el candidato / Logros:
Trabajo actualmente para una empresa de importaciones desde china como ejecutivo de ventas  captacion de clientes en trabajo de campo amplio conocimiento en ventas puerta a puerta abordaje de clientes potenciales asignado por crm en distintos paises de latinoamerica. "Deseo unirme a Seminuevos porque me atrae enormemente la dinámica del sector automotriz y el modelo de negocio de la empresa. A lo largo de mi trayectoria me he especializado en la negociación, gestión de proveedores y asesoría comercial enfocada en resultados. Considero que mi experiencia identificando oportunidades de mercado y conectando con las necesidades del cliente me permitirá aportar un valor inmediato al equipo, impulsando tanto el volumen de ventas como la confianza en la marca."', 'new', 'v-qz5ev53f62ykd6lm7tvsh', '2026-09-13T01:17:34.972702+00:00'::timestamptz);
INSERT INTO inquiries (name, phone, email, service, message, status, visitor_id, created_at) VALUES ('Emilio José González Vicent', '04248156435', 'exiogames52@gmail.com', 'Postulación Vendedor', 'POSTULACIÓN OFICIAL DE VENDEDOR / ASESOR COMERCIAL:
• Cédula/ID: V-28166978
• Sector/Municipio: Porlamar
• Experiencia en Ventas: 1 a 3 años de experiencia comercial
• Experiencia Automotriz: No tengo experiencia previa en autos
• Modalidad: Presencial en Isla de Margarita (Porlamar)
• Vehículo propio: No cuento con vehículo propio
• Enlace CV / Perfil: No adjunto
• Sobre el candidato / Logros:
Tengo ganas de generar bastante ingresos y eso me hace ser bastante competitivo a querer estar siempre de primer en ventas', 'new', 'v-0h0qki5arajups9ki545cf', '2026-09-13T07:05:45.059864+00:00'::timestamptz);
INSERT INTO inquiries (name, phone, email, service, message, status, visitor_id, created_at) VALUES ('Dario Reyes', '04125307452', 'darioreyes.2000@gmail.com', 'Postulación Vendedor', 'POSTULACIÓN OFICIAL DE VENDEDOR / ASESOR COMERCIAL:
• Cédula/ID: 28074871
• Sector/Municipio: El Espinal, Municipio Diaz
• Experiencia en Ventas: Menos de 1 año (Iniciando con alta motivación)
• Experiencia Automotriz: Sí, como vendedor independiente / broker
• Modalidad: Híbrido / Campo en Isla de Margarita
• Vehículo propio: No cuento con vehículo propio
• Enlace CV / Perfil: No adjunto
• Sobre el candidato / Logros:
Me apasiona el mundo de las ventas y superar mis objetivos comerciales. Aunque estoy construyendo mi conocimiento técnico sobre autos, tengo una gran facilidad para aprender rápido y conectar con las necesidades del cliente y quiero unirme a Seminuevos porque sé que mi energía y su capacitación me permitirán dar una asesoría de excelencia.', 'new', 'v-ihx2s2vomf5zyndl9ksbv', '2026-09-13T19:31:36.459251+00:00'::timestamptz);
INSERT INTO inquiries (name, phone, email, service, message, status, visitor_id, created_at) VALUES ('Sebastián Alejandro Pino Méndez ', '+584127945486', 'sebastato123456@gmail.com', 'Otro', 'Buenas, quisiera saber sobre los puestos como vendedor ', 'new', 'v-12nfpm8z6sie2spk2w4k7cy', '2026-09-14T00:03:49.942459+00:00'::timestamptz);
INSERT INTO inquiries (name, phone, email, service, message, status, visitor_id, created_at) VALUES ('Elix Alonso Moreno Villalobos', '04123536590', 'elixmoreno.em@gmail.com', 'Postulación Vendedor', 'POSTULACIÓN OFICIAL DE VENDEDOR / ASESOR COMERCIAL:
• Cédula/ID: 12146901
• Sector/Municipio: Pedro Gonzalez. Municipio Gomez
• Experiencia en Ventas: Más de 5 años como profesional de ventas
• Experiencia Automotriz: Sí, como vendedor independiente / broker
• Modalidad: Híbrido / Campo en Isla de Margarita
• Vehículo propio: Sí, cuento con vehículo propio
• Enlace CV / Perfil: No adjunto
• Sobre el candidato / Logros:
"Me apasiona el sector automotriz y sigo de cerca el crecimiento de Seminuevos, destacando su transparencia y calidad de servicio. Deseo unirme a su equipo porque comparto su visión de transformar la experiencia de compra de vehículos. Mi mayor logro en ventas ha sido cocretar un cierre de venta por un monto  de 69.000 $ , a un cliente captado atravez del CRM de igual forma con clientes captados en trabajo de campo  superar en un 25% mi meta del trimestre pasado / liderar el ranking de conversión en mi anterior empleo], lo cual alcancé mediante una escucha activa y asesoría personalizada. Mi meta comercial es consolidarme como un asesor líder dentro de la empresa, aportando valor a cada cliente y superando los objetivos mensuales."', 'new', 'v-qz5ev53f62ykd6lm7tvsh', '2026-09-14T01:23:29.634005+00:00'::timestamptz);
INSERT INTO inquiries (name, phone, email, service, message, status, visitor_id, created_at) VALUES ('Yuber José Figueroa Espinoza', '04128274832', 'yuberaloai@gmail.com', 'Postulación Vendedor', 'POSTULACIÓN OFICIAL DE VENDEDOR / ASESOR COMERCIAL:
• Cédula/ID: V-24765261
• Sector/Municipio: Arismendi
• Experiencia en Ventas: Menos de 1 año (Iniciando con alta motivación)
• Experiencia Automotriz: No tengo experiencia previa en autos
• Modalidad: Híbrido / Campo en Isla de Margarita
• Vehículo propio: No cuento con vehículo propio
• Enlace CV / Perfil: No adjunto
• Sobre el candidato / Logros:
Soy una persona muy dedicada y abierta a nuevos proyectos, y siempre mi intención será dar el todo por el todo', 'new', 'v-z5vdu5pwysact79vh55np', '2026-09-14T14:27:12.033868+00:00'::timestamptz);
INSERT INTO inquiries (name, phone, email, service, message, status, visitor_id, created_at) VALUES ('Luis Eduardo Yndriago Villarroel', '+584123518160', 'Luisyndriago98@gmail.com', 'Postulación Vendedor', 'POSTULACIÓN OFICIAL DE VENDEDOR / ASESOR COMERCIAL:
• Cédula/ID: 28074252
• Sector/Municipio: Maniero, los Cerritos
• Experiencia en Ventas: 1 a 3 años de experiencia comercial
• Experiencia Automotriz: Sí, como vendedor independiente / broker
• Modalidad: Presencial en Isla de Margarita (Porlamar)
• Vehículo propio: Sí, cuento con vehículo propio
• Enlace CV / Perfil: No adjunto
• Sobre el candidato / Logros:
Me gusta el medio de la venta y compra de vehículos, pienso que es un mercado que tiene mucho potencial', 'new', 'v-zwtw8ctoalng8r0jhlex', '2026-09-14T14:35:43.203501+00:00'::timestamptz);
INSERT INTO inquiries (name, phone, email, service, message, status, visitor_id, created_at) VALUES ('Aurelis del Valle Caraballo Labori', '04248052145', 'caraballoaurelis16@gmail.com', 'Postulación Vendedor', 'POSTULACIÓN OFICIAL DE VENDEDOR / ASESOR COMERCIAL:
• Cédula/ID: 28308381
• Sector/Municipio: Municipio maneiro Pampatar
• Experiencia en Ventas: 1 a 3 años de experiencia comercial
• Experiencia Automotriz: No tengo experiencia previa en autos
• Modalidad: Presencial en Isla de Margarita (Porlamar)
• Vehículo propio: No cuento con vehículo propio
• Enlace CV / Perfil: https://www.instagram.com/aurelis_labori04?stkn=MTFqMGRrNzRybDBrZw%3D%3D&utm_source=qr
• Sobre el candidato / Logros:
Hola, bueno me gustaría unirme a semi nuevo ya que es un reto nuevo, a pesar que tengo experiencia en ventas y atención al cliente la cual me desempeño muy bien ! La ventas de autos ya sería un reto para mi! Si me dan la oportunidad de que daré el mismo empeño! Soy muy empatica y me gusta prestar mi colaboración siempre en lo laboral y en lo grupal!', 'new', 'v-p7zsg0ikk7hkaw246ugwwp', '2026-09-14T14:38:33.180412+00:00'::timestamptz);
INSERT INTO inquiries (name, phone, email, service, message, status, visitor_id, created_at) VALUES ('Daniel Eduardo rosario Jaimes', '04121961981', 'drosariojaimes@gmail.com', 'Postulación Vendedor', 'POSTULACIÓN OFICIAL DE VENDEDOR / ASESOR COMERCIAL:
• Cédula/ID: 33111284
• Sector/Municipio: el valle
• Experiencia en Ventas: Menos de 1 año (Iniciando con alta motivación)
• Experiencia Automotriz: Sí, como vendedor independiente / broker
• Modalidad: Presencial en Isla de Margarita (Porlamar)
• Vehículo propio: No cuento con vehículo propio
• Enlace CV / Perfil: No adjunto
• Sobre el candidato / Logros:
soy joven y quiero hacer algo productivo me gustan las ventas y aprender quiero un trabajo para ayudar en la casa', 'new', 'v-2f520gz515fub50tk19bat', '2026-09-14T14:57:30.268415+00:00'::timestamptz);
INSERT INTO inquiries (name, phone, email, service, message, status, visitor_id, created_at) VALUES ('Pedro Antonio Fernández Indriago', '04128637889', 'indriagop1@gmail.com', 'Postulación Vendedor', 'POSTULACIÓN OFICIAL DE VENDEDOR / ASESOR COMERCIAL:
• Cédula/ID: 32899754
• Sector/Municipio: Pampatar
• Experiencia en Ventas: 1 a 3 años de experiencia comercial
• Experiencia Automotriz: No tengo experiencia previa en autos
• Modalidad: Presencial en Isla de Margarita (Porlamar)
• Vehículo propio: No cuento con vehículo propio
• Enlace CV / Perfil: No adjunto
• Sobre el candidato / Logros:
Me encantaría aprender un poco más sobre las ventas y ahora de autos,crecer y aprender más,he trabajado mucho en la parte de atención al cliente se desenvolverme muy bien con el cliente con buen trato y respeto,diría que mi mayor logro en ventas fue como encargado de una local pequeño donde trabaje solo y logré más de 150 ventas del producto yo solo haciendo todo en el local', 'new', 'v-ae3zf63fdhi1nar4caaolq', '2026-09-14T15:09:47.551954+00:00'::timestamptz);
INSERT INTO inquiries (name, phone, email, service, message, status, visitor_id, created_at) VALUES ('Eduardo José Ramírez salcedo', '04123507126', 'salcedo.er46@gmail.com', 'Postulación Vendedor', 'POSTULACIÓN OFICIAL DE VENDEDOR / ASESOR COMERCIAL:
• Cédula/ID: 20363523
• Sector/Municipio: Mariño
• Experiencia en Ventas: Más de 5 años como profesional de ventas
• Experiencia Automotriz: Sí, en concesionario o agencia formal
• Modalidad: Presencial en Isla de Margarita (Porlamar)
• Vehículo propio: Sí, cuento con vehículo propio
• Enlace CV / Perfil: No adjunto
• Sobre el candidato / Logros:
Saludos estimados. Encantado de pertenecer a ustedes y crecer financieramente y sobre todo personal. Saludos quedo atento', 'new', 'v-qwgel7lrhk3aguv5f13wz', '2026-09-14T15:15:18.830529+00:00'::timestamptz);
INSERT INTO inquiries (name, phone, email, service, message, status, visitor_id, created_at) VALUES ('Danyelis Del Valle Vizcaíno Salgado', '+584127385437', 'danyelisvizcaino4@gmail.com', 'Postulación Vendedor', 'POSTULACIÓN OFICIAL DE VENDEDOR / ASESOR COMERCIAL:
• Cédula/ID: V-30008068
• Sector/Municipio: Porlamar
• Experiencia en Ventas: Menos de 1 año (Iniciando con alta motivación)
• Experiencia Automotriz: No tengo experiencia previa en autos
• Modalidad: Presencial en Isla de Margarita (Porlamar)
• Vehículo propio: No cuento con vehículo propio
• Enlace CV / Perfil: No adjunto
• Sobre el candidato / Logros:
Hola me gustaría trabajar', 'new', 'v-19qekoprnhtihkcop9obm8', '2026-09-14T15:15:20.976544+00:00'::timestamptz);
INSERT INTO inquiries (name, phone, email, service, message, status, visitor_id, created_at) VALUES ('Tyson Enrique Escalona', '04128817755', 'taisonescalona94@gmail.com', 'Postulación Vendedor', 'POSTULACIÓN OFICIAL DE VENDEDOR / ASESOR COMERCIAL:
• Cédula/ID: V- 20588900
• Sector/Municipio: Sector Palo Sano, Municipio Arismendi.
• Experiencia en Ventas: Más de 5 años como profesional de ventas
• Experiencia Automotriz: No en autos, pero sí en bienes de alto valor (inmuebles, seguros, etc.)
• Modalidad: Presencial en Isla de Margarita (Porlamar)
• Vehículo propio: Sí, cuento con vehículo propio
• Enlace CV / Perfil: http://tyson-enrique-escalona
• Sobre el candidato / Logros:
Unirme a Seminuevos representa una oportunidad clave para aplicar mi experiencia comercial y de atención al cliente en un entorno dinámico, transparente y en constante crecimiento dentro del sector automotriz.
Asumir una meta comercial exigente en un entorno competitivo, enfocada en la captación y cierre de contratos de productos o servicios.', 'new', 'v-i563z2leqlfpszkojesvln', '2026-09-14T15:16:10.554991+00:00'::timestamptz);
INSERT INTO inquiries (name, phone, email, service, message, status, visitor_id, created_at) VALUES ('Isabel mercedes ordaz rivas', '04248941351', 'isabelordaz870@gmail.com', 'Postulación Vendedor', 'POSTULACIÓN OFICIAL DE VENDEDOR / ASESOR COMERCIAL:
• Cédula/ID: 29655794
• Sector/Municipio: Juangriego
• Experiencia en Ventas: Menos de 1 año (Iniciando con alta motivación)
• Experiencia Automotriz: No en autos, pero sí en bienes de alto valor (inmuebles, seguros, etc.)
• Modalidad: Presencial en Isla de Margarita (Porlamar)
• Vehículo propio: No cuento con vehículo propio
• Enlace CV / Perfil: No adjunto
• Sobre el candidato / Logros:
Soy una personas  extrovertida,  me gustan los retos ,  me gusta aprender cosas nuevas  , me gusta dar lo mejor de mi', 'new', 'v-mt8r0pgki6oiwbub1arfj', '2026-09-14T15:24:20.333883+00:00'::timestamptz);
INSERT INTO inquiries (name, phone, email, service, message, status, visitor_id, created_at) VALUES ('iriannys Hernández', '04248472492', 'iriannyshernandez568@gmail.com', 'Postulación Vendedor', 'POSTULACIÓN OFICIAL DE VENDEDOR / ASESOR COMERCIAL:
• Cédula/ID: 31769171
• Sector/Municipio: Porlamar
• Experiencia en Ventas: Menos de 1 año (Iniciando con alta motivación)
• Experiencia Automotriz: Sí, en concesionario o agencia formal
• Modalidad: Presencial en Isla de Margarita (Porlamar)
• Vehículo propio: No cuento con vehículo propio
• Enlace CV / Perfil: No adjunto
• Sobre el candidato / Logros:
Hola buenas tardes bueno literalmente tengo un pequeño negocio y de hayy Esque aprendro y ps necesito empleo y trabajar siempre con la bendición de Dios', 'new', 'v-mt93vw9macrhg2ge6d3wnn', '2026-09-14T15:30:25.431874+00:00'::timestamptz);
INSERT INTO inquiries (name, phone, email, service, message, status, visitor_id, created_at) VALUES ('Robert Jesus Salazar Mujica', '+584127944123', 'robertjs.mujica1404@gmail.com', 'Postulación Vendedor', 'POSTULACIÓN OFICIAL DE VENDEDOR / ASESOR COMERCIAL:
• Cédula/ID: V- 16547301
• Sector/Municipio: Porlamar
• Experiencia en Ventas: Más de 5 años como profesional de ventas
• Experiencia Automotriz: No tengo experiencia previa en autos
• Modalidad: Comisionista Independiente (Margarita)
• Vehículo propio: Sí, cuento con vehículo propio
• Enlace CV / Perfil: No adjunto
• Sobre el candidato / Logros:
Me siento con capacidad para ese tipo de ventas ya que he vendido mis carros personales. En la actualidad he vendido mercancía por gandolas a mis clientes', 'new', 'v-4rugbojt2p4mrdtg2myu8c', '2026-09-14T15:35:18.853854+00:00'::timestamptz);
INSERT INTO inquiries (name, phone, email, service, message, status, visitor_id, created_at) VALUES ('Jessika Andreina Varela de Mosquera', '04121430980', 'jessikavarela7@gmail.com', 'Postulación Vendedor', 'POSTULACIÓN OFICIAL DE VENDEDOR / ASESOR COMERCIAL:
• Cédula/ID: 19996253
• Sector/Municipio: Sector Génovez, municipio Mariño
• Experiencia en Ventas: Menos de 1 año (Iniciando con alta motivación)
• Experiencia Automotriz: No tengo experiencia previa en autos
• Modalidad: Presencial en Isla de Margarita (Porlamar)
• Vehículo propio: No cuento con vehículo propio
• Enlace CV / Perfil: No adjunto
• Sobre el candidato / Logros:
Hola un gusto saludarle. 
Puedo convertirme en alguien que primero escucho y entiendo la necesidad del cliente antes de proponer una solución. No vender características, sino vender alivio y/o beneficio que sea de mejor agrado', 'new', 'v-t5ugx2gzf4lu9aeexpudr', '2026-09-14T15:37:52.405797+00:00'::timestamptz);
INSERT INTO inquiries (name, phone, email, service, message, status, visitor_id, created_at) VALUES ('Paula Valentina Maneiro Serrano', '+584120843649', 'paulavms2007@gmail.com', 'Postulación Vendedor', 'POSTULACIÓN OFICIAL DE VENDEDOR / ASESOR COMERCIAL:
• Cédula/ID: V- 32212178
• Sector/Municipio: Porlamar, Mariño
• Experiencia en Ventas: Menos de 1 año (Iniciando con alta motivación)
• Experiencia Automotriz: No tengo experiencia previa en autos
• Modalidad: Presencial en Isla de Margarita (Porlamar)
• Vehículo propio: No cuento con vehículo propio
• Enlace CV / Perfil: No adjunto
• Sobre el candidato / Logros:
Me encanta el trabajo', 'new', 'v-vg18955uhyni87ndryycgc', '2026-09-14T15:54:40.492195+00:00'::timestamptz);
INSERT INTO inquiries (name, phone, email, service, message, status, visitor_id, created_at) VALUES ('Laura Di Canzio', '04140977622', 'lauradicanzio20@gmail.com', 'Postulación Vendedor', 'POSTULACIÓN OFICIAL DE VENDEDOR / ASESOR COMERCIAL:
• Cédula/ID: 29837115
• Sector/Municipio: Maneiro
• Experiencia en Ventas: 1 a 3 años de experiencia comercial
• Experiencia Automotriz: No tengo experiencia previa en autos
• Modalidad: Híbrido / Campo en Isla de Margarita
• Vehículo propio: No cuento con vehículo propio
• Enlace CV / Perfil: https://canva.link/jrm02jrpy11j352
• Sobre el candidato / Logros:
Trabajo actualmente con ventas online de ropa, me interesa un ingreso extra, abierta a nuevos conocimientos y propuestas…', 'new', 'v-5cxt4znei8o941v28gjf07', '2026-09-14T16:05:59.110861+00:00'::timestamptz);
INSERT INTO inquiries (name, phone, email, service, message, status, visitor_id, created_at) VALUES ('Jesus Maria Rosales Rosales', '+584269864998', 'jesusrosales0495@gmail.com', 'Postulación Vendedor', 'POSTULACIÓN OFICIAL DE VENDEDOR / ASESOR COMERCIAL:
• Cédula/ID: V24110412
• Sector/Municipio: Juan Griego Municipio Marcano
• Experiencia en Ventas: 1 a 3 años de experiencia comercial
• Experiencia Automotriz: No en autos, pero sí en bienes de alto valor (inmuebles, seguros, etc.)
• Modalidad: Comisionista Independiente (Margarita)
• Vehículo propio: No cuento con vehículo propio
• Enlace CV / Perfil: https://www.instagram.com/xuoo31?stkn=MXdqYjc2bXNxZ2wxMg==
• Sobre el candidato / Logros:
Bueno conseguir dinero Extra', 'new', 'v-w66o5vm9ifajcgyd0vpi1l', '2026-09-14T17:40:04.780649+00:00'::timestamptz);
INSERT INTO inquiries (name, phone, email, service, message, status, visitor_id, created_at) VALUES ('Miguelangel José Mata Vasquez', '+584248087344', 'matamiguelangel155@gmail.com', 'Postulación Vendedor', 'POSTULACIÓN OFICIAL DE VENDEDOR / ASESOR COMERCIAL:
• Cédula/ID: 32885387
• Sector/Municipio: Municipio Díaz, La encrucijada
• Experiencia en Ventas: Menos de 1 año (Iniciando con alta motivación)
• Experiencia Automotriz: No tengo experiencia previa en autos
• Modalidad: Presencial en Isla de Margarita (Porlamar)
• Vehículo propio: No cuento con vehículo propio
• Enlace CV / Perfil: No adjunto
• Sobre el candidato / Logros:
Soy graduado de bachillerato, no tengo experiencia en ventas pero me gustaría aprender, aprendo rápido y se me da bien tratar a las personas', 'new', 'v-atqws3g8rukd43cvx7l5zf', '2026-09-14T19:32:49.923466+00:00'::timestamptz);
INSERT INTO inquiries (name, phone, email, service, message, status, visitor_id, created_at) VALUES ('Laleska valentina mata', '4248697897', 'laleskamata17@gmail.com', 'Postulación Vendedor', 'POSTULACIÓN OFICIAL DE VENDEDOR / ASESOR COMERCIAL:
• Cédula/ID: 30209454
• Sector/Municipio: Porlamar, cerro colorado, mariño
• Experiencia en Ventas: Menos de 1 año (Iniciando con alta motivación)
• Experiencia Automotriz: No tengo experiencia previa en autos
• Modalidad: Presencial en Isla de Margarita (Porlamar)
• Vehículo propio: No cuento con vehículo propio
• Enlace CV / Perfil: No adjunto
• Sobre el candidato / Logros:
He trabajado como asesoramiento de ventas independiente, vendedora en tienda general, anfitriona en restaurant, muy buena atención al cliente, actualmente soy enfermera', 'new', 'v-7pasgtvc9nv934zw48emti', '2026-09-14T20:51:22.982787+00:00'::timestamptz);
INSERT INTO inquiries (name, phone, email, service, message, status, visitor_id, created_at) VALUES ('Carlos Maximilian Herrera Márquez', '04121641188', 'cmhfox15@gmail.com', 'Postulación Vendedor', 'POSTULACIÓN OFICIAL DE VENDEDOR / ASESOR COMERCIAL:
• Cédula/ID: V30685531
• Sector/Municipio: Municipio díaz San Juan
• Experiencia en Ventas: Menos de 1 año (Iniciando con alta motivación)
• Experiencia Automotriz: Sí, como vendedor independiente / broker
• Modalidad: Presencial en Isla de Margarita (Porlamar)
• Vehículo propio: No cuento con vehículo propio
• Enlace CV / Perfil: No adjunto
• Sobre el candidato / Logros:
Tengo experiencia en ventas presenciales con distintos autos de amigos, familiares y tengo amplio conocimiento de autos, motos y cualquier vehículo automotriz', 'new', 'v-5i8gxzfg40tzbh9zr7mir', '2026-09-14T21:08:54.578109+00:00'::timestamptz);
INSERT INTO inquiries (name, phone, email, service, message, status, visitor_id, created_at) VALUES ('Agustin David Lopez Sequera', '04248144622', 'agustinlopez2904@gmail.com', 'Postulación Vendedor', 'POSTULACIÓN OFICIAL DE VENDEDOR / ASESOR COMERCIAL:
• Cédula/ID: V33097661
• Sector/Municipio: El Valle del Espíritu Santo, municipio García, Nueva Esparta
• Experiencia en Ventas: Menos de 1 año (Iniciando con alta motivación)
• Experiencia Automotriz: No tengo experiencia previa en autos
• Modalidad: Presencial en Isla de Margarita (Porlamar)
• Vehículo propio: No cuento con vehículo propio
• Enlace CV / Perfil: No adjunto
• Sobre el candidato / Logros:
Me gustaría unirme a seminuevos por las siguientes razones:
1 Tengo alta motivación en aprender sobre compras y ventas de vehículos 
2 Tengo conocimiento básico sobre muchos vehículos como: Toyota, Honda,Chevrolet,etc..
3 No tengo experiencia previa vendiendo vehículos pero tengo toda la intención de aprender y adaptarme al equipo
 Soy un joven de 17 años proactivo, disciplinado. En estos momentos mi meta es aprender todo sobre la venta de vehículos para en un futuro tener mi propio concesionario', 'new', 'v-58wpvtx4nbwxm1zla477a7', '2026-09-14T23:52:31.193293+00:00'::timestamptz);
INSERT INTO inquiries (name, phone, email, service, message, status, visitor_id, created_at) VALUES ('Jose Alberto Albarran', '+584248684603', 'albarrandelacruz@gmail.com', 'Postulación Vendedor', 'POSTULACIÓN OFICIAL DE VENDEDOR / ASESOR COMERCIAL:
• Cédula/ID: 20901696
• Sector/Municipio: Juan griego
• Experiencia en Ventas: 1 a 3 años de experiencia comercial
• Experiencia Automotriz: Sí, en concesionario o agencia formal
• Modalidad: Híbrido / Campo en Isla de Margarita
• Vehículo propio: Sí, cuento con vehículo propio
• Enlace CV / Perfil: https://www.linkedin.com/in/jose-albarran-99a9152b5
• Sobre el candidato / Logros:
Quiero formar parte de Seminuevos porque es una plataforma en constante crecimiento dentro del mercado automotriz y me interesa construir una carrera sólida en este sector. Aunque voy comenzando formalmente en la venta de autos, mi mayor logro ha sido cerrar ventas directas y negociaciones personales ofreciendo asesoría transparente y destacando los beneficios clave de cada vehículo. Haré un excelente trabajo porque conozco bien los autos, sé escuchar las necesidades del cliente para generar confianza inmediata y estoy enfocado en superar las metas de ventas de la empresa', 'new', 'v-v1eg9s3syp7p6kdwrw3ec', '2026-09-15T00:18:13.805335+00:00'::timestamptz);
INSERT INTO inquiries (name, phone, email, service, message, status, visitor_id, created_at) VALUES ('Ginette Judith Arellano Castillo', '+5804128889583', 'ginettejudith1974@gmail.com', 'Postulación Vendedor', 'POSTULACIÓN OFICIAL DE VENDEDOR / ASESOR COMERCIAL:
• Cédula/ID: V-12023550
• Sector/Municipio: Villa Juana municipio García urbanización brisas margarita casa 105
• Experiencia en Ventas: Menos de 1 año (Iniciando con alta motivación)
• Experiencia Automotriz: No tengo experiencia previa en autos
• Modalidad: Presencial en Isla de Margarita (Porlamar)
• Vehículo propio: Sí, cuento con vehículo propio
• Enlace CV / Perfil: No adjunto
• Sobre el candidato / Logros:
Me encanta la ventas y en margarita el renglón automotriz es amplio', 'new', 'v-2ol1gyjzyvuxdd50itzx2o', '2026-09-15T01:04:47.554144+00:00'::timestamptz);
INSERT INTO inquiries (name, phone, email, service, message, status, visitor_id, created_at) VALUES ('Yroy Raffie Rodríguez Rojas', '04248918710', 'yroyraffie09@gmail.com', 'Postulación Vendedor', 'POSTULACIÓN OFICIAL DE VENDEDOR / ASESOR COMERCIAL:
• Cédula/ID: V-34.162.713
• Sector/Municipio: Arismendi
• Experiencia en Ventas: Menos de 1 año (Iniciando con alta motivación)
• Experiencia Automotriz: No en autos, pero sí en bienes de alto valor (inmuebles, seguros, etc.)
• Modalidad: Presencial en Isla de Margarita (Porlamar)
• Vehículo propio: No cuento con vehículo propio
• Enlace CV / Perfil: No adjunto
• Sobre el candidato / Logros:
Porque quiero tener más experiencia en ventas no encuentro muchos trabajos que me gusten tanto como este y quiero ganar más habilidad para vender, haciendo que tanto la compañía como yo ganemos dinero', 'new', 'v-t9s7tiz5y0mjrmrexu4lx', '2026-09-15T02:13:30.660313+00:00'::timestamptz);
INSERT INTO inquiries (name, phone, email, service, message, status, visitor_id, created_at) VALUES ('Kelvin Esteban Avile Noriega', '+584123572542', 'avilekelvin@gmail.com', 'Postulación Vendedor', 'POSTULACIÓN OFICIAL DE VENDEDOR / ASESOR COMERCIAL:
• Cédula/ID: V-30.707.191
• Sector/Municipio: La Asunción
• Experiencia en Ventas: 1 a 3 años de experiencia comercial
• Experiencia Automotriz: No tengo experiencia previa en autos
• Modalidad: Presencial en Isla de Margarita (Porlamar)
• Vehículo propio: Sí, cuento con vehículo propio
• Enlace CV / Perfil: https://www.linkedin.com/in/kelvin-avile-4536922a3?utm_source=share_via&utm_content=profile&utm_medium=member_android
• Sobre el candidato / Logros:
Quiero formar parte de su equipo porque me gusta el campo laboral de ventas', 'new', 'v-o1w1h1y181hmow4m6n6ooh', '2026-09-15T02:57:54.221515+00:00'::timestamptz);
INSERT INTO inquiries (name, phone, email, service, message, status, visitor_id, created_at) VALUES ('Héctor Alfredo Reyes peñañoza', '04223113118', 'Harroots1990@gmail.com', 'Postulación Vendedor', 'POSTULACIÓN OFICIAL DE VENDEDOR / ASESOR COMERCIAL:
• Cédula/ID: 9.682.968
• Sector/Municipio: Porlamar
• Experiencia en Ventas: Más de 5 años como profesional de ventas
• Experiencia Automotriz: No en autos, pero sí en bienes de alto valor (inmuebles, seguros, etc.)
• Modalidad: Presencial en Isla de Margarita (Porlamar)
• Vehículo propio: No cuento con vehículo propio
• Enlace CV / Perfil: No adjunto
• Sobre el candidato / Logros:
Se me hace fácil y divertido vender. Tengo amplia experiencia en ventas de inmuebles, propiedades de tiempo compartido, vehículos, mobiliario. Quisiera y me agrada la idea de pertenecer a su proyecto que me parece excelente para ayudar a resolver el tema de adquisición de vehículos para todas las necesidades', 'new', 'v-gjre1y5tq2quulzmo5fpbn', '2026-09-15T12:12:55.430394+00:00'::timestamptz);
INSERT INTO inquiries (name, phone, email, service, message, status, visitor_id, created_at) VALUES ('Lenin Javier Santiago', '04248461034', 'leninsabtiago1971@gmail.com', 'Postulación Vendedor', 'POSTULACIÓN OFICIAL DE VENDEDOR / ASESOR COMERCIAL:
• Cédula/ID: 11229360
• Sector/Municipio: Porlamar, Municipio Mariño
• Experiencia en Ventas: 3 a 5 años de trayectoria en ventas
• Experiencia Automotriz: Sí, como vendedor independiente / broker
• Modalidad: Híbrido / Campo en Isla de Margarita
• Vehículo propio: Sí, cuento con vehículo propio
• Enlace CV / Perfil: No adjunto
• Sobre el candidato / Logros:
¿Por qué deseo unirme al Equipo de Seminuevos?
Por ser una Empresa que está siendo líder en las ventas de Vehículos Usados, en una opción rentable, segura y transparente de quienes quieren adquirís un vehículo en condiciones óptimas en un mercado que cada vez se está expandiendo en el estado Nueva Esparta, siempre me ha gustado el sector automotriz y quisiera aportar mi experiencia adquirida por los años en diferentes puntos de vista para así generar confianza inmediata a cada futuros clientes y así poder cubrir las necesidades que ellos pudieran tener mientras buscan el Vehículo Ideal.

Mi mayor logro en las ventas fue en llevar un proyecto de una ruta que la compañía no apostaba nada a ser una ruta que dio a pie a la creación de 2 rutas alternativas el cual fue la ruta más rentable en su momento a nivel nacional y otro logro fuera de ventas fue haber trabajado en una compañía la cual era no muy conocida por su bajo interés en su imagen antes el mercado de consumos masivos, dejándola como una compañía muy reconocida a nivel regional y nacional, estos son algunas de la cosas que pudiera nombrar entre otras.', 'new', 'v-p4dhqm9nwu12t4tfsd1rv', '2026-09-15T13:21:46.329701+00:00'::timestamptz);
INSERT INTO inquiries (name, phone, email, service, message, status, visitor_id, created_at) VALUES ('Jose Aparicio Quijada Gutiérrez', '04248651897', 'joseaparicio2905@gmail.com', 'Postulación Vendedor', 'POSTULACIÓN OFICIAL DE VENDEDOR / ASESOR COMERCIAL:
• Cédula/ID: V-30399430
• Sector/Municipio: Diaz
• Experiencia en Ventas: 1 a 3 años de experiencia comercial
• Experiencia Automotriz: Sí, como vendedor independiente / broker
• Modalidad: Presencial en Isla de Margarita (Porlamar)
• Vehículo propio: No cuento con vehículo propio
• Enlace CV / Perfil: No adjunto
• Sobre el candidato / Logros:
Emplia experiencia en venta y atención al cliente', 'new', 'v-mhzol9elg0j41zvz4vk4wk', '2026-09-15T16:36:39.602996+00:00'::timestamptz);
INSERT INTO inquiries (name, phone, email, service, message, status, visitor_id, created_at) VALUES ('Sinai rondon', '04125959291', 'sinaifairee30@gmail.com', 'Postulación Vendedor', 'POSTULACIÓN OFICIAL DE VENDEDOR / ASESOR COMERCIAL:
• Cédula/ID: 28074004
• Sector/Municipio: Urbanización maneiro (isla de margarita)
• Experiencia en Ventas: Menos de 1 año (Iniciando con alta motivación)
• Experiencia Automotriz: Sí, como vendedor independiente / broker
• Modalidad: Presencial en Isla de Margarita (Porlamar)
• Vehículo propio: No cuento con vehículo propio
• Enlace CV / Perfil: No adjunto
• Sobre el candidato / Logros:
Me motiva unirme porque me apasiona el sector automotriz mi mayor fortaleza radica en la negociación, la escucha activa y la resolución de problemas habilidades que aplico con éxito para entender lo que el cliente busca y cerrar acuerdos de forma efectiva estoy preparada para aportar mi compromiso, energía y enfoque en resultados a su equipo de asesores.', 'new', 'v-muwqsy38mcgjhbqzpjueeg', '2026-09-15T19:57:07.296585+00:00'::timestamptz);
INSERT INTO inquiries (name, phone, email, service, message, status, visitor_id, created_at) VALUES ('Wilanyis del valle barcenas', '04120250355', 'Wilanyis0106s@gmail.com', 'Postulación Vendedor', 'POSTULACIÓN OFICIAL DE VENDEDOR / ASESOR COMERCIAL:
• Cédula/ID: 30.008.336
• Sector/Municipio: Porlamar
• Experiencia en Ventas: 3 a 5 años de trayectoria en ventas
• Experiencia Automotriz: No en autos, pero sí en bienes de alto valor (inmuebles, seguros, etc.)
• Modalidad: Presencial en Isla de Margarita (Porlamar)
• Vehículo propio: No cuento con vehículo propio
• Enlace CV / Perfil: No adjunto
• Sobre el candidato / Logros:
Principalmente siendo sincera, no se nada sobre vehículos, lo normal, pero aprendo rápido, me gustan las cosas nuevas es importante saber de todo así que me desenvuelvo super bien.
En la vida hay que saber de todo un poco como dicen..
Y deseo unirme a ustedes para aprender ese nuevo mundo se podría decir, sobre el tema de los vehículos.
Y bueno, con toda la actitud posible, muchas gracias....', 'new', 'v-uvtn8lmud8c6q3lmt4vsi9', '2026-09-15T20:15:37.753273+00:00'::timestamptz);
INSERT INTO inquiries (name, phone, email, service, message, status, visitor_id, created_at) VALUES ('Emilianyer del valle', '04224012399', 'emilimarin127@gmail.com', 'Postulación Vendedor', 'POSTULACIÓN OFICIAL DE VENDEDOR / ASESOR COMERCIAL:
• Cédula/ID: 30998074
• Sector/Municipio: Porlamar
• Experiencia en Ventas: Menos de 1 año (Iniciando con alta motivación)
• Experiencia Automotriz: Sí, en concesionario o agencia formal
• Modalidad: Comisionista Independiente (Margarita)
• Vehículo propio: No cuento con vehículo propio
• Enlace CV / Perfil: No adjunto
• Sobre el candidato / Logros:
Ok', 'new', 'v-qbkoj14r99b1y9w9oubm', '2026-09-15T22:04:07.197202+00:00'::timestamptz);
INSERT INTO inquiries (name, phone, email, service, message, status, visitor_id, created_at) VALUES ('Alejandro Enrique Briceño vivas', '04123272702', 'brialejandro28@gmail.com', 'Postulación Vendedor', 'POSTULACIÓN OFICIAL DE VENDEDOR / ASESOR COMERCIAL:
• Cédula/ID: 36759626
• Sector/Municipio: Gómez, Altagracia
• Experiencia en Ventas: 1 a 3 años de experiencia comercial
• Experiencia Automotriz: No tengo experiencia previa en autos
• Modalidad: Presencial en Isla de Margarita (Porlamar)
• Vehículo propio: No cuento con vehículo propio
• Enlace CV / Perfil: No adjunto
• Sobre el candidato / Logros:
Tengo la intención de formar parte de un equipo que me ayude a desarrollar una mejor experiencia, mejorar mis conocimientos como asesor de ventas, porque soy joven tengo 24 años y tengo ganas de mostrar que estoy capacitado!! He trabajado independiente junto a mi pareja estos últimos 4 años, en lo que respecta a vestimenta y calzado, ha sido increíble por la cantidad de años que he podido sostenerlo junto a ella, pero busco una meta personal ya que siempre he amado trabajar y tener una base sólida e ingresos económicos no puedo negarlo, el mundo automotriz es algo que siempre he querido recorrer! Pero no ha sido fácil tener la oportunidad', 'new', 'v-hs64hfv8wqsp42acjjfnx', '2026-09-16T00:26:20.52816+00:00'::timestamptz);
INSERT INTO inquiries (name, phone, email, service, message, status, visitor_id, created_at) VALUES ('Luis Rafael Martínez González', '04127949300', 'luisramagon@hotmail.com', 'Postulación Vendedor', 'POSTULACIÓN OFICIAL DE VENDEDOR / ASESOR COMERCIAL:
• Cédula/ID: 30399454
• Sector/Municipio: Mariño
• Experiencia en Ventas: Más de 5 años como profesional de ventas
• Experiencia Automotriz: No en autos, pero sí en bienes de alto valor (inmuebles, seguros, etc.)
• Modalidad: Híbrido / Campo en Isla de Margarita
• Vehículo propio: Sí, cuento con vehículo propio
• Enlace CV / Perfil: No adjunto
• Sobre el candidato / Logros:
Quisiera unirme al equipo de ventas ya que cuento con conocimientos en ventas y en mecánica en general tengo algunos conocimientos como para destacar en el área de ventas automotriz', 'new', 'v-gvnlh4lq7r6vfu8tu9f6d9', '2026-09-16T12:05:33.292623+00:00'::timestamptz);
INSERT INTO inquiries (name, phone, email, service, message, status, visitor_id, created_at) VALUES ('Reinaldo Castro', '+584123515817', 'reinaldojosuebc@gmail.com', 'Postulación Vendedor', 'POSTULACIÓN OFICIAL DE VENDEDOR / ASESOR COMERCIAL:
• Cédula/ID: V-27.870.034
• Sector/Municipio: Arismendi
• Experiencia en Ventas: 1 a 3 años de experiencia comercial
• Experiencia Automotriz: No en autos, pero sí en bienes de alto valor (inmuebles, seguros, etc.)
• Modalidad: Presencial en Isla de Margarita (Porlamar)
• Vehículo propio: Sí, cuento con vehículo propio
• Enlace CV / Perfil: No adjunto
• Sobre el candidato / Logros:
Me parece una exelente oportunidad laboral, me gustaría pertenecer a su equipo de trabajo', 'new', 'v-wwrdqqgx5yfwezjn7j16h', '2026-09-16T23:08:48.949701+00:00'::timestamptz);
INSERT INTO inquiries (name, phone, email, service, message, status, visitor_id, created_at) VALUES ('Jose andres herrera', '+584220149506', 'jherrerabussines1@gmail.com', 'Postulación Vendedor', 'POSTULACIÓN OFICIAL DE VENDEDOR / ASESOR COMERCIAL:
• Cédula/ID: 14686370
• Sector/Municipio: Porlamar
• Experiencia en Ventas: Más de 5 años como profesional de ventas
• Experiencia Automotriz: No en autos, pero sí en bienes de alto valor (inmuebles, seguros, etc.)
• Modalidad: Presencial en Isla de Margarita (Porlamar)
• Vehículo propio: Sí, cuento con vehículo propio
• Enlace CV / Perfil: https://www.linkedin.com/in/jos%C3%A9-andr%C3%A9s-herrera-p-5082509a?utm_source=share&utm_campaign=share_via&utm_content=profile&utm_medium=android_app
• Sobre el candidato / Logros:
Soy ingeniero de sistemas llegue hace poco a la isla vivi en miami 10 anos soy margariteño y ahora busco oportunidades para crecer en la isla me llama la atencion este tipo de negocios ademas es una manera de negocios que me llama la atencion en. Ejercer tengo facilidad de comunicación con las personas', 'new', 'v-6ua8gsctydcc2tjf9uxok6', '2026-09-17T12:53:52.026037+00:00'::timestamptz);
INSERT INTO inquiries (name, phone, email, service, message, status, visitor_id, created_at) VALUES ('Yonathan', '04120932741', 'quiames.jonathan.jose@gmail.com', 'Postulación Vendedor', 'POSTULACIÓN OFICIAL DE VENDEDOR / ASESOR COMERCIAL:
• Cédula/ID: V 21733028
• Sector/Municipio: Pampatar
• Experiencia en Ventas: 3 a 5 años de trayectoria en ventas
• Experiencia Automotriz: No tengo experiencia previa en autos
• Modalidad: Híbrido / Campo en Isla de Margarita
• Vehículo propio: No cuento con vehículo propio
• Enlace CV / Perfil: No adjunto
• Sobre el candidato / Logros:
Quisiera otra entrada para mi y mi familia me gustaría aprender más sobre vender carros y ser parte de su equipo', 'new', 'v-4ukz3qxludfrzlc4eu1t', '2026-09-17T21:40:44.11605+00:00'::timestamptz);
