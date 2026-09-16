-- ============================================================
-- SemiNuevo Agency — Staff & Users Management Schema
-- Versión 2.0 — Con password_hash (bcrypt) y migraciones
-- ============================================================

-- 1. Crear tabla agency_users
CREATE TABLE IF NOT EXISTS agency_users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    full_name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password TEXT,             -- DEPRECATED: solo para migración. Se borrará después del primer login.
    password_hash TEXT,        -- bcrypt hash — este es el campo válido
    phone TEXT,
    role TEXT NOT NULL DEFAULT 'sales', -- 'admin', 'sales', 'credit', 'mechanic'
    branch TEXT DEFAULT 'Porlamar (Sede Principal)',
    status TEXT DEFAULT 'active', -- 'active', 'inactive'
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Migraciones — Agregar columnas si no existen
ALTER TABLE agency_users ADD COLUMN IF NOT EXISTS password      TEXT;
ALTER TABLE agency_users ADD COLUMN IF NOT EXISTS password_hash TEXT;

-- 3. Habilitar Row Level Security (RLS)
ALTER TABLE agency_users ENABLE ROW LEVEL SECURITY;

-- 4. Políticas RLS
-- El service_role de la API tiene acceso total sin importar RLS
-- Las siguientes políticas aplican solo al anon key (frontend público)

-- Eliminar políticas anteriores
DROP POLICY IF EXISTS "Admin full access agency_users" ON agency_users;
DROP POLICY IF EXISTS "Public read active staff" ON agency_users;

-- Acceso total para conexiones autenticadas (admin panel via service_role)
CREATE POLICY "Admin full access agency_users"
    ON agency_users FOR ALL TO authenticated
    USING (true) WITH CHECK (true);

-- IMPORTANTE: El frontend público NO debe poder leer agency_users con la anon key.
-- El login ahora pasa por /api/auth/login en el servidor (service_role).
-- La siguiente política permite leer solo usuarios activos si aún usas la anon key en algún lugar.
-- Si quieres máxima seguridad, cambia TO anon USING (false) para bloquear todo acceso anon.
CREATE POLICY "Public read active staff"
    ON agency_users FOR SELECT TO anon
    USING (status = 'active');

-- 5. Seed inicial (Administrador Master)
-- NOTA: La contraseña en texto plano se migrará automáticamente a bcrypt en el primer login.
INSERT INTO agency_users (full_name, email, password, phone, role, branch, status, notes)
VALUES (
    'Administrador Master',
    'jvaask16@gmail.com',
    'MasterAdmin2026!',
    '+58 424-870-0438',
    'admin',
    'Porlamar (Sede Principal)',
    'active',
    'Cuenta administrativa principal del sistema Seminuevos.'
)
ON CONFLICT (email) DO UPDATE
    SET
        password = CASE
            WHEN agency_users.password_hash IS NOT NULL THEN NULL -- ya migrado, borrar plaintext
            ELSE EXCLUDED.password
        END,
        role     = EXCLUDED.role,
        status   = EXCLUDED.status;

-- 6. Función para auto-actualizar updated_at
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
