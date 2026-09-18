-- =============================================
-- SemiNuevo Agency — Inquiries & CRM Leads Schema
-- =============================================
-- Corrige el desalineamiento entre el schema original (columna `name`) y el
-- código real, que siempre usó `full_name`. También agrega `source` e
-- `ip_address`, que el backend escribe en cada consulta.

CREATE TABLE IF NOT EXISTS inquiries (
    id BIGSERIAL PRIMARY KEY,
    full_name TEXT NOT NULL,
    phone TEXT,
    email TEXT,
    message TEXT NOT NULL,
    vehicle_id TEXT,
    source TEXT DEFAULT 'web',
    ip_address TEXT,
    visitor_id TEXT,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'contacted', 'closed')),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Migración desde el schema viejo (columna `name`, sin `full_name`):
--   ALTER TABLE inquiries RENAME COLUMN name TO full_name;
--   ALTER TABLE inquiries ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'web';
--   ALTER TABLE inquiries ADD COLUMN IF NOT EXISTS ip_address TEXT;
--   ALTER TABLE inquiries ALTER COLUMN vehicle_id TYPE TEXT;

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

-- Antes usaba NEW.name (columna que nunca coincidió con lo que el código
-- inserta) por lo que el nombre del lead quedaba siempre en NULL.
CREATE OR REPLACE FUNCTION sync_inquiry_to_leads()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.visitor_id IS NULL THEN
        RETURN NEW;
    END IF;

    INSERT INTO site_leads (visitor_id, email, full_name, phone, last_active)
    VALUES (NEW.visitor_id, NEW.email, NEW.full_name, NEW.phone, NOW())
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
