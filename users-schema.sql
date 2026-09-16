-- ============================================================
-- SemiNuevo Agency - Staff & Users Management Schema
-- ============================================================

-- 1. Create agency_users table
CREATE TABLE IF NOT EXISTS agency_users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    full_name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password TEXT,
    phone TEXT,
    role TEXT NOT NULL DEFAULT 'sales', -- 'admin', 'sales', 'credit', 'mechanic'
    branch TEXT DEFAULT 'Porlamar (Sede Principal)',
    status TEXT DEFAULT 'active', -- 'active', 'inactive'
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Ensure password column exists if table was already created
ALTER TABLE agency_users ADD COLUMN IF NOT EXISTS password TEXT;

-- 2. Enable Row Level Security (RLS)
ALTER TABLE agency_users ENABLE ROW LEVEL SECURITY;

-- 3. Policies
-- Full access for authenticated administrators & service connections
DROP POLICY IF EXISTS "Admin full access agency_users" ON agency_users;
CREATE POLICY "Admin full access agency_users"
    ON agency_users FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Allow public read access for active staff login & consultation
DROP POLICY IF EXISTS "Public read active staff" ON agency_users;
CREATE POLICY "Public read active staff"
    ON agency_users FOR SELECT TO anon USING (true);

-- 4. Initial Seed (Admin Master)
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
ON CONFLICT (email) DO UPDATE SET password = EXCLUDED.password;
