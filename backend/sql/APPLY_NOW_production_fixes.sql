-- ============================================================
-- Aplicar en Supabase Dashboard → SQL Editor → New query
-- Corre TODO este archivo de una vez (es idempotente: se puede
-- re-ejecutar sin romper nada si algo falla a la mitad).
--
-- Basado en introspección real de tu proyecto (18/09/2026):
--   - agency_users NO existe (los 2 usuarios reales viven en el
--     JSON site_settings.agency_users_directory)
--   - vehicles (22 filas) no tiene columnas `features` ni `created_by`
--   - inquiries (88 filas) usa `name`/`service` (no full_name/source),
--     y no tiene `ip_address`
--   - security_logs (528 filas) no tiene `user_id`
--   - settings y promotions no existen (nada los usa hoy en producción)
--   - site_settings sigue con RLS abierta: anon puede leer TODO,
--     incluyendo las keys filtradas
-- ============================================================

-- 1) agency_users — no existía. La crea el backend nuevo (JWT + bcrypt).
CREATE TABLE IF NOT EXISTS agency_users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    full_name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    phone TEXT,
    role TEXT NOT NULL DEFAULT 'sales' CHECK (role IN ('admin', 'super_admin', 'sales', 'credit', 'mechanic')),
    branch TEXT DEFAULT 'Porlamar (Sede Principal)',
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE agency_users ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admin full access agency_users" ON agency_users;
CREATE POLICY "Admin full access agency_users"
    ON agency_users FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Block anon access to agency_users" ON agency_users;
CREATE POLICY "Block anon access to agency_users"
    ON agency_users FOR SELECT TO anon USING (false);

CREATE OR REPLACE FUNCTION update_agency_users_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_agency_users_updated_at ON agency_users;
CREATE TRIGGER trg_agency_users_updated_at
    BEFORE UPDATE ON agency_users
    FOR EACH ROW EXECUTE FUNCTION update_agency_users_updated_at();

-- No se siembra ningún usuario aquí — los 2 usuarios reales se migran
-- desde site_settings.agency_users_directory con un script aparte
-- (ya tienen password_hash con bcrypt, no hace falta re-hashear nada).

-- 2) vehicles — agrega las columnas que el backend nuevo ya usa
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS features TEXT[] DEFAULT '{}';
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS created_by TEXT;

-- 3) inquiries — agrega ip_address (name/service/status ya coinciden
--    con lo que el backend nuevo ya usa, no se tocan)
ALTER TABLE inquiries ADD COLUMN IF NOT EXISTS ip_address TEXT;

-- 4) security_logs — agrega user_id (login/logout ya intentan escribirlo)
ALTER TABLE security_logs ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES agency_users(id) ON DELETE SET NULL;

-- 5) settings — tabla de configuración de agencia (distinta de site_settings).
--    No existía; nada depende de ella hoy, se crea limpia.
CREATE TABLE IF NOT EXISTS settings (
    id INTEGER PRIMARY KEY DEFAULT 1,
    agency_name TEXT,
    whatsapp_number TEXT,
    whatsapp_number2 TEXT,
    email_primary TEXT,
    email_secondary TEXT,
    address TEXT,
    business_hours TEXT,
    instagram_url TEXT,
    facebook_url TEXT,
    tiktok_url TEXT,
    logo_url TEXT,
    primary_color TEXT,
    financing_enabled BOOLEAN DEFAULT true,
    max_financing_months INTEGER,
    min_initial_payment_pct INTEGER,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT settings_single_row CHECK (id = 1)
);

ALTER TABLE settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admin full access settings table" ON settings;
CREATE POLICY "Admin full access settings table"
    ON settings FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 6) site_settings — CIERRA EL HUECO DE SEGURIDAD.
--    Antes: anon podía leer CUALQUIER key (incluyendo las que filtraste).
--    Ahora: anon solo puede leer una lista explícita de keys públicas.
ALTER TABLE site_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can read settings" ON site_settings;
DROP POLICY IF EXISTS "Public can read whitelisted settings" ON site_settings;

CREATE POLICY "Public can read whitelisted settings"
    ON site_settings FOR SELECT TO anon
    USING (
        key = ANY (ARRAY[
            'whatsapp_number', 'company_name', 'company_slogan', 'company_address',
            'company_hours', 'social_facebook', 'social_instagram', 'social_tiktok',
            'social_youtube', 'promo_tag', 'promo_title', 'promo_subtitle',
            'hero1_img', 'hero2_img', 'hero3_img', 'hero_slides',
            'calc_flete', 'calc_aduana', 'calc_doc_vzla', 'calc_service_fee',
            'promotions_list'
        ])
    );

DROP POLICY IF EXISTS "Admin full access settings" ON site_settings;
CREATE POLICY "Admin full access settings"
    ON site_settings FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Después de correr esto, avísame — yo migro los 2 usuarios reales a
-- agency_users y borro las 4 keys filtradas de site_settings
-- (agency_users_directory, agency_users_sync, resend_api_key,
-- scraper_proxy_key), usando la service_role key directo — eso sí
-- lo puedo hacer yo, es manipular filas, no crear/alterar tablas.
