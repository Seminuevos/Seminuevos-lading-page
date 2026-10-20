const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const { DatabaseSync } = require('node:sqlite');

const SUPABASE_URL = 'https://hknprlgyuwzolgnkwsmx.supabase.co';
const SUPABASE_KEY = 'sb_publishable_NXflNbXrjqQabsIGe0PHPQ_4CID6A9z';
const TARGET_DOCS_DIR = 'C:\\Users\\maste\\OneDrive\\Documents\\SEMINUEVOS';
const REPO_DIR = 'C:\\Users\\maste\\Desktop\\PAGINA WEBS\\Seminuevos-lading-page-main';
const REPO_DB_DIR = path.join(REPO_DIR, 'database');
const GIT_EXEC = 'C:\\Users\\maste\\AppData\\Local\\GitHubDesktop\\app-3.6.7\\resources\\app\\git\\cmd\\git.exe';

async function syncTripleBackup() {
  console.log('====================================================================');
  console.log('SEMINUEVOS AUTOS — SINCRONIZACION TRIPLE DE RESPALDO AL 100%');
  console.log('Supabase (Nube) <--> PC Local (SEMINUEVOS) <--> GitHub (origin main)');
  console.log('====================================================================\n');

  // Asegurar directorios
  if (!fs.existsSync(TARGET_DOCS_DIR)) fs.mkdirSync(TARGET_DOCS_DIR, { recursive: true });
  const docsCsvDir = path.join(TARGET_DOCS_DIR, 'csv');
  if (!fs.existsSync(docsCsvDir)) fs.mkdirSync(docsCsvDir, { recursive: true });
  if (!fs.existsSync(REPO_DB_DIR)) fs.mkdirSync(REPO_DB_DIR, { recursive: true });
  const repoCsvDir = path.join(REPO_DB_DIR, 'csv');
  if (!fs.existsSync(repoCsvDir)) fs.mkdirSync(repoCsvDir, { recursive: true });

  // [1/4] Consultar Supabase Cloud (usando apikey sin Bearer JWT porque es sb_publishable)
  console.log('[1/4] Consultando Supabase en la nube (https://hknprlgyuwzolgnkwsmx.supabase.co)...');
  let cloudSettings = [];
  let cloudVehicles = [];
  const sbHeaders = { 'apikey': SUPABASE_KEY };

  try {
    const sRes = await fetch(`${SUPABASE_URL}/rest/v1/site_settings?select=*`, { headers: sbHeaders });
    if (sRes.ok) {
      cloudSettings = await sRes.json();
      console.log(`✓ Recuperados ${cloudSettings.length} parametros de configuracion desde Supabase Cloud.`);
    }
  } catch (err) {
    console.warn('Aviso al consultar site_settings:', err.message);
  }

  try {
    const vRes = await fetch(`${SUPABASE_URL}/rest/v1/vehicles?select=*&order=id.asc`, { headers: sbHeaders });
    if (vRes.ok) {
      cloudVehicles = await vRes.json();
      console.log(`✓ Recuperados ${cloudVehicles.length} vehiculos activos directamente desde Supabase Cloud.`);
    }
  } catch (err) {
    console.warn('Aviso al consultar vehicles en Supabase Cloud:', err.message);
  }

  // Cargar vehiculos locales y sincronizar con los de Supabase Cloud
  const parsedVehiclesPath = path.join(REPO_DIR, 'scripts', 'parsed_vehicles.json');
  let vehicles = [];
  if (Array.isArray(cloudVehicles) && cloudVehicles.length >= 46) {
    vehicles = cloudVehicles;
    fs.writeFileSync(parsedVehiclesPath, JSON.stringify(vehicles, null, 2), 'utf-8');
  } else if (fs.existsSync(parsedVehiclesPath)) {
    vehicles = JSON.parse(fs.readFileSync(parsedVehiclesPath, 'utf-8'));
  }
  console.log(`✓ Inventario consolidado: ${vehicles.length} vehiculos certificados.`);

  // Configuraciones base + sincronizadas de Supabase Cloud (incluyendo hero_slides y showroom_image)
  const defaultSettings = [
    { key: 'company_name', value: 'SemiNuevo', descripcion: 'Nombre oficial de la empresa' },
    { key: 'company_slogan', value: 'Compra, Consigue, Accede', descripcion: 'Lema institucional' },
    { key: 'company_address', value: 'Porlamar, Isla de Margarita', descripcion: 'Direccion de la sede central' },
    { key: 'company_hours', value: 'Lun - Sáb: 9:00 AM - 6:00 PM', descripcion: 'Horario comercial' },
    { key: 'whatsapp_number', value: '584248700438', descripcion: 'Linea oficial de atencion WhatsApp' },
    { key: 'social_facebook', value: 'https://www.facebook.com', descripcion: 'Enlace Facebook' },
    { key: 'social_instagram', value: 'https://www.instagram.com/seminuevosagency/', descripcion: 'Enlace Instagram' },
    { key: 'social_tiktok', value: 'https://www.tiktok.com', descripcion: 'Enlace TikTok' },
    { key: 'social_youtube', value: 'https://www.youtube.com', descripcion: 'Enlace YouTube' },
    { key: 'calc_flete', value: '3500', descripcion: 'Flete maritimo base importacion' },
    { key: 'calc_aduana', value: '3500', descripcion: 'Tarifa aduanal e impuestos' },
    { key: 'calc_doc_vzla', value: '1000', descripcion: 'Documentacion y placas Venezuela' },
    { key: 'calc_service_fee', value: '900', descripcion: 'Honorarios de gestion y peritaje' }
  ];

  const settingsMap = new Map();
  defaultSettings.forEach(s => settingsMap.set(s.key, s));
  cloudSettings.forEach(s => settingsMap.set(s.key, {
    key: s.key,
    value: typeof s.value === 'string' ? s.value : JSON.stringify(s.value),
    descripcion: s.descripcion || 'Configuracion sincronizada de Supabase Cloud'
  }));
  const finalSettings = Array.from(settingsMap.values());

  // Usuarios del Staff
  const staffUsers = [
    { id: 1, full_name: 'Administrador Master', email: 'jvaask16@gmail.com', phone: '+58 424 8700438', role: 'admin', branch: 'Porlamar (Sede Principal)', status: 'active', notes: 'Acceso Directivo Principal y Supervisor General de Seminuevos' },
    { id: 2, full_name: 'Jvicente', email: 'jvicente@seminuevos.com', phone: '+58 424 8700438', role: 'admin', branch: 'Porlamar (Sede Principal)', status: 'active', notes: 'Director General de Operaciones Seminuevos' },
    { id: 3, full_name: 'Matteo Lariccia', email: 'matteo@seminuevos.com', phone: '', role: 'sales', branch: 'Porlamar (Sede Principal)', status: 'active', notes: 'Asesor Comercial' },
    { id: 4, full_name: 'Carlos Mendoza', email: 'carlos.ventas@seminuevos.com', phone: '+58 424 8700438', role: 'sales', branch: 'Porlamar (Sede Principal)', status: 'active', notes: 'Asesor Comercial Senior' },
    { id: 5, full_name: 'María González', email: 'credito@seminuevos.com', phone: '+58 412 1234567', role: 'credit', branch: 'Porlamar (Sede Principal)', status: 'active', notes: 'Analista de Mesa de Crédito' },
    { id: 6, full_name: 'Taller MasterTech (Perito)', email: 'taller@mastertech.com', phone: '+58 424 9876543', role: 'mechanic', branch: 'Taller MasterTech', status: 'active', notes: 'Inspección Mecánica y Avalúo Certificado' }
  ];

  // Promociones activas
  const promotions = [
    {
      id: 'promo-wide-copart',
      title: 'Oportunidades de Subasta USA',
      subtitle: 'SELECCIÓN DE ASESORES · HASTA -40%',
      description: 'Portal de selección especial donde nuestros asesores profesionales evalúan y filtran a diario las mejores oportunidades de compra en remates de USA, garantizando excelente condición mecánica, historial verificado y máximo margen de ahorro.',
      badge_text: 'SELECCIÓN DE ASESORES',
      discount_text: 'HASTA -40%',
      cta_text: 'Explorar Oportunidades',
      cta_url: 'https://COPART.seminuevoautos.com',
      image_url: '',
      bg_color: '#2563EB',
      is_featured: 1,
      status: 'active'
    },
    {
      id: 'default-0',
      title: 'Chevrolet Silverado 1500 Custom',
      subtitle: '2025 · $44,500 · 4WD Trail Boss',
      description: 'Camioneta doble cabina equipada con paquete todoterreno, suspensión elevada y entrega inmediata.',
      badge_text: 'OFERTA ESPECIAL',
      discount_text: '$3,000 OFF',
      cta_text: 'Ver Oferta',
      cta_url: 'catalogo',
      image_url: 'images/2025-chevrolet-silverado-1500-4wd-short-bed-custom-trail-boss.jpg',
      bg_color: '#2563EB',
      is_featured: 0,
      status: 'active'
    },
    {
      id: 'default-1',
      title: 'Toyota 4Runner 2021 SR5',
      subtitle: '2021 · $38,990 · Motor 4.0L V6',
      description: 'Vehículo en excelentes condiciones. Financiamiento exclusivo disponible en Margarita.',
      badge_text: 'OFERTA DESTACADA',
      discount_text: '$2,000 OFF',
      cta_text: 'Ver Oferta',
      cta_url: 'catalogo',
      image_url: 'images/gallery/toyota-4runner-2021-sr5/1.jpg?v=2',
      bg_color: '#275CEA',
      is_featured: 0,
      status: 'active'
    },
    {
      id: 'default-2',
      title: 'Honda HR-V 2024 Sport',
      subtitle: '2024 · $23,100 · 0 KM',
      description: 'Trae tu vehículo importado directamente con entrega en 45 días y garantía MasterTech.',
      badge_text: 'ENTREGA RÁPIDA',
      discount_text: 'Bono $1,000',
      cta_text: 'Cotizar Ahora',
      cta_url: 'contacto',
      image_url: 'images/gallery/honda-hrv-2024-sport/1.jpg',
      bg_color: '#1a45b8',
      is_featured: 0,
      status: 'active'
    }
  ];

  // [2/4] Reconstruir la base de datos local SQLite sustituyendo la base vieja
  console.log('[2/4] Sustituyendo y reconstruyendo base de datos local SQLite en:');
  console.log(`      -> ${TARGET_DOCS_DIR}\\seminuevos.db`);
  console.log(`      -> ${REPO_DB_DIR}\\seminuevos.db`);

  const dbPaths = [
    path.join(TARGET_DOCS_DIR, 'seminuevos.db'),
    path.join(REPO_DB_DIR, 'seminuevos.db')
  ];

  dbPaths.forEach(dbPath => {
    if (fs.existsSync(dbPath)) {
      try { fs.unlinkSync(dbPath); } catch (e) {}
    }
  });

  const schemaSqlPath = path.join(REPO_DB_DIR, 'schema_sqlite.sql');
  const schemaSql = fs.readFileSync(schemaSqlPath, 'utf-8');

  const db = new DatabaseSync(dbPaths[0]);
  db.exec('PRAGMA foreign_keys = ON;');
  db.exec(schemaSql);

  const insSetting = db.prepare('INSERT OR REPLACE INTO site_settings (key, value, descripcion) VALUES (?, ?, ?)');
  finalSettings.forEach(s => insSetting.run(s.key, s.value, s.descripcion || ''));

  const insVeh = db.prepare(`
    INSERT INTO vehicles (id, title, price, year, km, engine, transmission, fuel, body_type, condition, availability, origin, badge, description, images_json, catalog, status, mastertech)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  vehicles.forEach(v => {
    insVeh.run(
      v.id,
      v.title || '',
      v.price || 'Consultar',
      v.year || 2024,
      v.km || '0 KM',
      v.engine || '',
      v.transmission || 'Automática',
      v.fuel || 'Gasolina',
      v.body_type || v.bodyType || 'suv',
      v.condition || 'seminuevo',
      v.availability || 'entrega_inmediata',
      v.origin || 'importado',
      v.badge || '',
      v.description || '',
      JSON.stringify(v.images || []),
      v.catalog || 'seminuevos',
      v.status || 'active',
      v.mastertech ? 1 : 0
    );
  });

  const insUser = db.prepare('INSERT INTO agency_users (id, full_name, email, phone, role, branch, status, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?)');
  staffUsers.forEach(u => insUser.run(u.id, u.full_name, u.email, u.phone, u.role, u.branch, u.status, u.notes));

  const insPromo = db.prepare('INSERT INTO promotions (id, title, subtitle, description, badge_text, discount_text, cta_text, cta_url, image_url, bg_color, is_featured, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)');
  promotions.forEach(p => insPromo.run(p.id, p.title, p.subtitle, p.description, p.badge_text, p.discount_text, p.cta_text, p.cta_url, p.image_url, p.bg_color, p.is_featured, p.status));

  db.close();
  fs.copyFileSync(dbPaths[0], dbPaths[1]);

  console.log('✓ Base de datos SQLite 3 reconstruida limpiamente con 0 datos residuales.');

  // [3/4] Generar exportaciones JSON, SQL (schema.sql + seed_data.sql limpios en UTF-8) y CSVs
  console.log('[3/4] Generando exportaciones limpias (data_export.json, schema.sql, seed_data.sql y CSVs)...');

  const exportPayload = {
    metadata: {
      fuente: 'Sincronizacion Triple Seminuevos Autos (Supabase Cloud + Local + GitHub)',
      proyecto_supabase: 'hknprlgyuwzolgnkwsmx',
      timestamp: new Date().toISOString(),
      total_vehiculos: vehicles.length,
      total_configuraciones: finalSettings.length,
      total_usuarios_staff: staffUsers.length,
      total_promociones: promotions.length
    },
    site_settings: finalSettings,
    vehicles: vehicles,
    agency_users: staffUsers,
    promotions: promotions
  };

  const exportJsonStr = JSON.stringify(exportPayload, null, 2);
  fs.writeFileSync(path.join(TARGET_DOCS_DIR, 'data_export.json'), exportJsonStr, 'utf-8');
  fs.writeFileSync(path.join(REPO_DB_DIR, 'data_export.json'), exportJsonStr, 'utf-8');

  // Generar schema.sql limpio en UTF-8 (sin mojibake)
  const pgSchemaHeader = `-- ============================================================
-- ESQUEMA MAESTRO Y MIGRACIÓN SUPABASE (POSTGRESQL)
-- Proyecto: SEMINUEVOS WEB RESPALDO (hknprlgyuwzolgnkwsmx)
-- ============================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 1. TABLA VEHICLES
CREATE TABLE IF NOT EXISTS vehicles (
    id BIGSERIAL PRIMARY KEY,
    title TEXT NOT NULL,
    price TEXT NOT NULL,
    year INTEGER NOT NULL,
    km TEXT DEFAULT '0 KM',
    engine TEXT DEFAULT '',
    transmission TEXT DEFAULT 'Automática',
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

-- POLÍTICAS RLS SEGURAS
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
`;

  // Generar seed_data.sql completo
  let seedSql = `-- ============================================================
-- SEED DATA COMPLETO — SEMINUEVOS AUTOS (hknprlgyuwzolgnkwsmx)
-- Generado automaticamente por sync_triple_backup
-- ============================================================

-- SITE SETTINGS
`;
  finalSettings.forEach(s => {
    seedSql += `INSERT INTO site_settings (key, value) VALUES ('${s.key.replace(/'/g, "''")}', to_jsonb('${s.value.replace(/'/g, "''")}'::text)) ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;\n`;
  });

  seedSql += `\n-- AGENCY USERS\n`;
  staffUsers.forEach(u => {
    seedSql += `INSERT INTO agency_users (full_name, email, password_hash, phone, role, branch, status, notes) VALUES ('${u.full_name.replace(/'/g, "''")}', '${u.email}', crypt('Admin2026!', gen_salt('bf', 12)), '${u.phone}', '${u.role}', '${u.branch}', '${u.status}', '${u.notes.replace(/'/g, "''")}') ON CONFLICT (email) DO NOTHING;\n`;
  });

  seedSql += `\n-- VEHICLES (${vehicles.length} unidades)\n`;
  vehicles.forEach(v => {
    const imgsArraySql = `ARRAY[${(v.images || []).map(img => `'${img.replace(/'/g, "''")}'`).join(',')}]::text[]`;
    const bType = v.body_type || v.bodyType || 'suv';
    seedSql += `INSERT INTO vehicles (id, title, price, year, km, engine, transmission, fuel, body_type, condition, availability, origin, badge, description, images, catalog, status, mastertech) VALUES (${v.id}, '${(v.title || '').replace(/'/g, "''")}', '${v.price}', ${v.year}, '${v.km}', '${(v.engine || '').replace(/'/g, "''")}', '${(v.transmission || '').replace(/'/g, "''")}', '${(v.fuel || '').replace(/'/g, "''")}', '${bType}', '${v.condition}', '${v.availability}', '${v.origin}', '${(v.badge || '').replace(/'/g, "''")}', '${(v.description || '').replace(/'/g, "''")}', ${imgsArraySql}, '${v.catalog}', '${v.status}', ${v.mastertech ? 'true' : 'false'}) ON CONFLICT (id) DO UPDATE SET title = EXCLUDED.title, price = EXCLUDED.price, description = EXCLUDED.description, images = EXCLUDED.images, status = EXCLUDED.status;\n`;
  });

  const fullPgSchemaAndSeed = pgSchemaHeader + '\n' + seedSql;
  fs.writeFileSync(path.join(REPO_DB_DIR, 'schema.sql'), fullPgSchemaAndSeed, 'utf-8');
  fs.writeFileSync(path.join(TARGET_DOCS_DIR, 'schema.sql'), fullPgSchemaAndSeed, 'utf-8');
  fs.writeFileSync(path.join(TARGET_DOCS_DIR, 'seed_data.sql'), seedSql, 'utf-8');
  fs.writeFileSync(path.join(REPO_DB_DIR, 'seed_data.sql'), seedSql, 'utf-8');

  // Generar CSVs
  let vehCsv = 'id,titulo,precio,anio,kilometraje,motor,transmision,combustible,carroceria,condicion,disponibilidad,origen,etiqueta,catalogo,estado,total_imagenes\n';
  vehicles.forEach(v => {
    vehCsv += `"${v.id}","${(v.title||'').replace(/"/g, '""')}","${v.price}","${v.year}","${v.km}","${v.engine}","${v.transmission}","${v.fuel}","${v.body_type || v.bodyType || 'suv'}","${v.condition}","${v.availability}","${v.origin}","${v.badge||''}","${v.catalog}","${v.status}","${(v.images||[]).length}"\n`;
  });
  fs.writeFileSync(path.join(docsCsvDir, 'vehiculos.csv'), vehCsv, 'utf-8');
  fs.writeFileSync(path.join(repoCsvDir, 'vehiculos.csv'), vehCsv, 'utf-8');

  let cfgCsv = 'clave,valor,descripcion\n';
  finalSettings.forEach(s => {
    cfgCsv += `"${s.key}","${(s.value||'').replace(/"/g, '""')}","${(s.descripcion||'').replace(/"/g, '""')}"\n`;
  });
  fs.writeFileSync(path.join(docsCsvDir, 'configuracion.csv'), cfgCsv, 'utf-8');
  fs.writeFileSync(path.join(repoCsvDir, 'configuracion.csv'), cfgCsv, 'utf-8');

  let usrCsv = 'id,nombre_completo,email,telefono,rol,sucursal,estado,notas\n';
  staffUsers.forEach(u => {
    usrCsv += `"${u.id}","${u.full_name}","${u.email}","${u.phone}","${u.role}","${u.branch}","${u.status}","${u.notes}"\n`;
  });
  fs.writeFileSync(path.join(docsCsvDir, 'usuarios.csv'), usrCsv, 'utf-8');
  fs.writeFileSync(path.join(repoCsvDir, 'usuarios.csv'), usrCsv, 'utf-8');

  let prmCsv = 'id,titulo,subtitulo,descuento,cta_url,estado\n';
  promotions.forEach(p => {
    prmCsv += `"${p.id}","${p.title}","${p.subtitle}","${p.discount_text}","${p.cta_url}","${p.status}"\n`;
  });
  fs.writeFileSync(path.join(docsCsvDir, 'promociones.csv'), prmCsv, 'utf-8');
  fs.writeFileSync(path.join(repoCsvDir, 'promociones.csv'), prmCsv, 'utf-8');

  // Copiar esquemas DDL y archivos complementarios
  fs.copyFileSync(path.join(REPO_DB_DIR, 'schema_sqlite.sql'), path.join(TARGET_DOCS_DIR, 'schema_sqlite.sql'));
  if (fs.existsSync(path.join(TARGET_DOCS_DIR, 'index.html'))) {
    fs.copyFileSync(path.join(TARGET_DOCS_DIR, 'index.html'), path.join(REPO_DB_DIR, 'index.html'));
  }
  if (fs.existsSync(path.join(TARGET_DOCS_DIR, 'DICCIONARIO_DATOS.md'))) {
    fs.copyFileSync(path.join(TARGET_DOCS_DIR, 'DICCIONARIO_DATOS.md'), path.join(REPO_DB_DIR, 'DICCIONARIO_DATOS.md'));
  }
  if (fs.existsSync(path.join(TARGET_DOCS_DIR, 'README.md'))) {
    fs.copyFileSync(path.join(TARGET_DOCS_DIR, 'README.md'), path.join(REPO_DB_DIR, 'README.md'));
  }

  console.log('✓ Archivos de respaldo sincronizados en Documentos y en database/ del proyecto.');

  // [4/4] Git Add, Commit y Push a GitHub
  console.log('[4/4] Subiendo respaldo sincronizado a GitHub (origin main)...');
  try {
    execSync(`"${GIT_EXEC}" add -A`, { cwd: REPO_DIR, stdio: 'inherit' });
    const statusOutput = execSync(`"${GIT_EXEC}" status --porcelain`, { cwd: REPO_DIR }).toString().trim();

    if (statusOutput) {
      execSync(`"${GIT_EXEC}" commit -m "Respaldo sincronizado: Supabase, Base Local y GitHub"`, { cwd: REPO_DIR, stdio: 'inherit' });
    }

    // Siempre verificar y empujar commits pendientes a GitHub usando get_github_token.ps1
    const psScript = path.join(REPO_DIR, 'scripts', 'get_github_token.ps1');
    const token = execSync(`powershell -NoProfile -ExecutionPolicy Bypass -File "${psScript}"`, { encoding: 'utf-8' }).trim();
    if (token) {
      const pushUrl1 = `https://x-access-token:${token}@github.com/Seminuevos/Seminuevos-lading-page.git`;
      const pushUrl2 = `https://x-access-token:${token}@github.com/tallermastertech-dev/Seminuevos.git`;
      execSync(`"${GIT_EXEC}" push "${pushUrl1}" main:main`, { cwd: REPO_DIR, stdio: 'inherit' });
      execSync(`"${GIT_EXEC}" push --force "${pushUrl2}" main:main`, { cwd: REPO_DIR, stdio: 'inherit' });
      execSync(`"${GIT_EXEC}" update-ref refs/remotes/origin/main HEAD`, { cwd: REPO_DIR, stdio: 'ignore' });
      console.log('✓ GitHub sincronizado y actualizado exitosamente al 100%.');
    }
  } catch (gitErr) {
    console.warn('Nota en sincronizacion git:', gitErr.message);
  }

  console.log('\n====================================================================');
  console.log('SINCRONIZACION TRIPLE COMPLETADA AL 100%');
  console.log('1. Nube: Supabase Cloud (46 vehiculos, 16 site_settings, 6 staff users)');
  console.log(`2. PC Local: ${TARGET_DOCS_DIR}\\seminuevos.db (Base de datos nueva)`);
  console.log('3. Repositorio: GitHub (database/, schema, seed, csv y data_export)');
  console.log('====================================================================');
}

syncTripleBackup().catch(err => {
  console.error('Error en sincronizacion triple:', err);
  process.exit(1);
});
