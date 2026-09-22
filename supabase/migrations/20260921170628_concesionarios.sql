-- =============================================
-- SemiNuevo Agency — Concesionarios Schema
-- =============================================
-- Un concesionario es una agencia externa que puede tener vehículos propios
-- en el catálogo y un usuario staff (rol 'concesionario', ver la migración
-- agency_users_concesionario_role) con acceso restringido a solo sus datos.

CREATE TABLE IF NOT EXISTS concesionarios (
    id BIGSERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    contact_email TEXT,
    contact_phone TEXT,
    address TEXT,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE concesionarios ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admin full access concesionarios" ON concesionarios;
DROP POLICY IF EXISTS "Block anon access to concesionarios" ON concesionarios;

-- El backend (service_role) tiene acceso total sin pasar por RLS.
CREATE POLICY "Admin full access concesionarios"
    ON concesionarios FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Block anon access to concesionarios"
    ON concesionarios FOR SELECT TO anon USING (false);

-- Reutiliza update_updated_at(), definida en 20260901000001_vehicles.sql
DROP TRIGGER IF EXISTS trg_concesionarios_updated_at ON concesionarios;
CREATE TRIGGER trg_concesionarios_updated_at
    BEFORE UPDATE ON concesionarios
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();
