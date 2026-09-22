-- =============================================
-- SemiNuevo Agency — Settings Schema
-- =============================================
-- Dos tablas con propósitos distintos (antes se confundían):
--
-- 1. `settings`      → configuración administrativa de la agencia
--                      (la que ya usaba api/settings/index.js pero nunca
--                      se creaba en ningún .sql). Requiere auth para leer.
-- 2. `site_settings` → key/value de contenido PÚBLICO del sitio
--                      (textos, imágenes del hero, promociones). Lectura
--                      anónima permitida SOLO para las keys de la allowlist.
--
-- ⚠️ Ninguna de las dos debe usarse jamás para guardar API keys de terceros
-- ni directorios de usuarios/contraseñas. Eso vive en variables de entorno
-- del backend (RESEND_API_KEY, APIFY_API_KEY, etc.) y en la tabla
-- `agency_users` respectivamente.

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
-- Sin política para `anon`: esta tabla nunca se lee desde el frontend público,
-- solo a través del backend autenticado (GET/PUT /api/settings).

-- ------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS site_settings (
    key TEXT PRIMARY KEY,
    value JSONB NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE site_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can read settings" ON site_settings;
DROP POLICY IF EXISTS "Admin full access settings" ON site_settings;
DROP POLICY IF EXISTS "Public can read whitelisted settings" ON site_settings;

-- Antes esto era `USING (true)` — CUALQUIER key era legible por anon,
-- incluidas API keys y el directorio de usuarios. Ahora solo se permite
-- leer una lista explícita de keys de contenido público.
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

CREATE POLICY "Admin full access settings"
    ON site_settings FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Limpieza de datos existentes que NUNCA debieron estar en esta tabla:
DELETE FROM site_settings WHERE key IN (
    'agency_users_directory', 'agency_users_sync', 'resend_api_key', 'scraper_proxy_key'
);

CREATE OR REPLACE FUNCTION update_site_settings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_site_settings_updated_at ON site_settings;
CREATE TRIGGER trg_site_settings_updated_at
    BEFORE UPDATE ON site_settings
    FOR EACH ROW EXECUTE FUNCTION update_site_settings_updated_at();

INSERT INTO site_settings (key, value) VALUES
    ('whatsapp_number', '"584248700438"'),
    ('company_name', '"SemiNuevo"'),
    ('company_slogan', '"Compra, Consigue, Accede"'),
    ('company_address', '"Porlamar, Isla de Margarita"'),
    ('company_hours', '"Lun - Sáb: 9:00 AM - 6:00 PM"'),
    ('social_facebook', '"https://www.facebook.com"'),
    ('social_instagram', '"https://www.instagram.com"'),
    ('social_tiktok', '"https://www.tiktok.com"'),
    ('social_youtube', '"https://www.youtube.com"')
ON CONFLICT (key) DO NOTHING;
