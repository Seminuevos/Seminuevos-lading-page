-- =============================================
-- SemiNuevo Agency — Inquiries & CRM Leads Schema
-- =============================================
-- CORREGIDO 2026-09-21: la versión anterior de este archivo describía un
-- schema (full_name/source, status sin 'new') que NUNCA se aplicó contra el
-- proyecto real. La tabla `inquiries` en producción usa `name`/`service`, y
-- `inquiries.service.ts` siempre escribió `status: 'new'` — confirmado
-- consultando la API REST del proyecto real, no solo el código. Este archivo
-- ahora documenta la tabla tal como existe, para poder adoptarla vía
-- `supabase migration repair --status applied` sin re-ejecutarla.

CREATE TABLE IF NOT EXISTS inquiries (
    id BIGSERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    phone TEXT,
    email TEXT,
    message TEXT NOT NULL,
    vehicle_id TEXT,
    service TEXT DEFAULT 'web',
    ip_address TEXT,
    visitor_id TEXT,
    status TEXT DEFAULT 'new' CHECK (status IN ('new', 'pending', 'contacted', 'closed')),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE inquiries ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can insert inquiries" ON inquiries;
DROP POLICY IF EXISTS "Admin full access inquiries" ON inquiries;

CREATE POLICY "Public can insert inquiries"
    ON inquiries FOR INSERT TO anon WITH CHECK (true);

CREATE POLICY "Admin full access inquiries"
    ON inquiries FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ------------------------------------------------------------------
-- CRM: leads derivados de las consultas
-- ------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS site_leads (
    id BIGSERIAL PRIMARY KEY,
    visitor_id TEXT UNIQUE NOT NULL,
    email TEXT,
    full_name TEXT,
    phone TEXT,
    last_active TIMESTAMPTZ DEFAULT NOW(),
    tags TEXT[] DEFAULT '{}',
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE site_leads ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can update leads" ON site_leads;
DROP POLICY IF EXISTS "Public can insert leads" ON site_leads;
DROP POLICY IF EXISTS "Admin full access leads" ON site_leads;

CREATE POLICY "Public can insert leads"
    ON site_leads FOR INSERT TO anon WITH CHECK (true);

CREATE POLICY "Admin full access leads"
    ON site_leads FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- `inquiries.name` (no `full_name`) es la columna real — ver nota arriba.
CREATE OR REPLACE FUNCTION sync_inquiry_to_leads()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.visitor_id IS NULL THEN
        RETURN NEW;
    END IF;

    INSERT INTO site_leads (visitor_id, email, full_name, phone, last_active)
    VALUES (NEW.visitor_id, NEW.email, NEW.name, NEW.phone, NOW())
    ON CONFLICT (visitor_id) DO UPDATE SET
        email = EXCLUDED.email,
        full_name = EXCLUDED.full_name,
        phone = EXCLUDED.phone,
        last_active = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tr_sync_inquiry_to_leads ON inquiries;
CREATE TRIGGER tr_sync_inquiry_to_leads
    AFTER INSERT ON inquiries
    FOR EACH ROW EXECUTE FUNCTION sync_inquiry_to_leads();
