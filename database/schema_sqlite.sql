-- ============================================================
-- ESQUEMA DDL SQLITE 3 — SEMINUEVOS AUTOS
-- Base de datos local optimizada para SQLite 3 y Node.js nativo
-- ============================================================

PRAGMA foreign_keys = ON;

-- 1. TABLA VEHICULOS
CREATE TABLE IF NOT EXISTS vehicles (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    price TEXT NOT NULL,
    year INTEGER NOT NULL,
    km TEXT DEFAULT '0 KM',
    engine TEXT DEFAULT '',
    transmission TEXT DEFAULT 'Automático',
    fuel TEXT DEFAULT 'Gasolina',
    body_type TEXT DEFAULT 'suv',
    condition TEXT DEFAULT 'seminuevo',
    availability TEXT DEFAULT 'entrega_inmediata',
    origin TEXT DEFAULT 'importado',
    badge TEXT,
    description TEXT DEFAULT '',
    images_json TEXT DEFAULT '[]',
    catalog TEXT DEFAULT 'seminuevos',
    status TEXT DEFAULT 'active',
    mastertech INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_vehicles_status ON vehicles(status);
CREATE INDEX IF NOT EXISTS idx_vehicles_catalog ON vehicles(catalog);
CREATE INDEX IF NOT EXISTS idx_vehicles_body_type ON vehicles(body_type);
CREATE INDEX IF NOT EXISTS idx_vehicles_year ON vehicles(year);

-- 2. TABLA CONFIGURACION DEL SITIO
CREATE TABLE IF NOT EXISTS site_settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    descripcion TEXT DEFAULT '',
    updated_at TEXT DEFAULT (datetime('now'))
);

-- 3. TABLA CONSULTAS / CONTACTOS (INQUIRIES)
CREATE TABLE IF NOT EXISTS inquiries (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    phone TEXT,
    email TEXT,
    service TEXT,
    message TEXT,
    vehicle_id INTEGER,
    visitor_id TEXT,
    status TEXT DEFAULT 'new',
    ip_address TEXT,
    created_at TEXT DEFAULT (datetime('now'))
);

-- 4. TABLA LEADS DE CLIENTES
CREATE TABLE IF NOT EXISTS site_leads (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    visitor_id TEXT UNIQUE NOT NULL,
    email TEXT,
    name TEXT,
    phone TEXT,
    source TEXT,
    interest_vehicle TEXT,
    status TEXT DEFAULT 'lead',
    created_at TEXT DEFAULT (datetime('now'))
);

-- 5. TABLA USUARIOS STAFF DEL CONCESIONARIO
CREATE TABLE IF NOT EXISTS agency_users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    full_name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    phone TEXT,
    role TEXT DEFAULT 'sales',
    branch TEXT DEFAULT 'Porlamar (Sede Principal)',
    status TEXT DEFAULT 'active',
    notes TEXT,
    created_at TEXT DEFAULT (datetime('now'))
);

-- 6. TABLA PROMOCIONES Y OFERTAS EXCLUSIVAS
CREATE TABLE IF NOT EXISTS promotions (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    subtitle TEXT,
    description TEXT,
    badge_text TEXT,
    discount_text TEXT,
    cta_text TEXT,
    cta_url TEXT,
    image_url TEXT,
    bg_color TEXT,
    is_featured INTEGER DEFAULT 0,
    status TEXT DEFAULT 'active',
    created_at TEXT DEFAULT (datetime('now'))
);

-- 7. TABLA ANALITICA WEB
CREATE TABLE IF NOT EXISTS site_analytics (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    event_type TEXT NOT NULL,
    event_data TEXT DEFAULT '{}',
    url TEXT,
    visitor_id TEXT,
    created_at TEXT DEFAULT (datetime('now'))
);

-- 8. TABLA LOGS DE SEGURIDAD
CREATE TABLE IF NOT EXISTS security_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    event_type TEXT NOT NULL,
    severity TEXT DEFAULT 'info',
    ip_address TEXT,
    details TEXT,
    user_agent TEXT,
    created_at TEXT DEFAULT (datetime('now'))
);
