-- ============================================================
-- SemiNuevo Agency — Staff & Users Management Schema
-- Versión 3.0 — Solo password_hash (bcrypt). Sin passwords en SQL.
-- ============================================================

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

-- Migración desde la v2.0 (columna `password` en texto plano, `password_hash` opcional):
-- si tu tabla ya existe con esas columnas, ejecuta esto ANTES de continuar:
--
--   UPDATE agency_users SET password_hash = <hash bcrypt de password> WHERE password_hash IS NULL;
--   ALTER TABLE agency_users ALTER COLUMN password_hash SET NOT NULL;
--   ALTER TABLE agency_users DROP COLUMN IF EXISTS password;
--
-- No se automatiza aquí porque requiere generar los hashes bcrypt fuera de SQL.

ALTER TABLE agency_users ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admin full access agency_users" ON agency_users;
DROP POLICY IF EXISTS "Public read active staff" ON agency_users;
DROP POLICY IF EXISTS "Block anon access to agency_users" ON agency_users;

-- El backend (service_role) tiene acceso total sin pasar por RLS.
CREATE POLICY "Admin full access agency_users"
    ON agency_users FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- El frontend público NUNCA debe leer agency_users directamente (ni con anon key).
-- Todo el acceso pasa por el backend NestJS (/api/auth/login, /api/users).
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

-- No se siembra ningún usuario aquí. Crea el primer administrador con:
--   POST /api/users  { email, full_name, password, role: "admin" }
-- usando un JWT temporal, o insertando manualmente con un hash bcrypt generado
-- fuera de este repositorio (nunca comitees la contraseña en texto plano).
