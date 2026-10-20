const fs = require('fs');
const path = require('path');

const dataExportPath = 'C:\\Users\\maste\\OneDrive\\Documents\\SEMINUEVOS\\data_export.json';
const data = JSON.parse(fs.readFileSync(dataExportPath, 'utf-8'));

const html = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Verificador y Base de Datos | Seminuevos Autos</title>
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css">
  <style>
    :root {
      --bg: #070d18;
      --card-bg: #0e1726;
      --card-sub: #162238;
      --border: #1e293b;
      --border-accent: #2563eb;
      --text: #f8fafc;
      --text-muted: #94a3b8;
      --primary: #2563eb;
      --primary-hover: #1d4ed8;
      --success: #10b981;
      --warning: #f59e0b;
      --danger: #ef4444;
      --gold: #f59e0b;
      --font: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      background: var(--bg);
      color: var(--text);
      font-family: var(--font);
      line-height: 1.5;
      padding-bottom: 60px;
    }
    .top-banner {
      background: linear-gradient(90deg, #0b1f44 0%, #081329 100%);
      border-bottom: 1px solid #1d4ed8;
      padding: 12px 24px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      flex-wrap: wrap;
      gap: 12px;
      position: sticky;
      top: 0;
      z-index: 100;
      backdrop-filter: blur(10px);
    }
    .top-banner .brand {
      display: flex;
      align-items: center;
      gap: 10px;
      font-size: 0.95rem;
      font-weight: 700;
    }
    .top-banner .brand i { color: #38bdf8; }
    .top-actions {
      display: flex;
      gap: 10px;
      flex-wrap: wrap;
    }
    .btn {
      padding: 7px 14px;
      border-radius: 6px;
      font-size: 0.8rem;
      font-weight: 700;
      text-decoration: none;
      display: inline-flex;
      align-items: center;
      gap: 6px;
      cursor: pointer;
      border: 1px solid transparent;
      transition: all 0.2s;
    }
    .btn-green { background: #10b981; color: #022c22; }
    .btn-green:hover { background: #059669; color: #fff; }
    .btn-blue { background: #2563eb; color: #fff; border-color: #3b82f6; }
    .btn-blue:hover { background: #1d4ed8; }
    .btn-dark { background: #1e293b; color: #cbd5e1; border-color: #334155; }
    .btn-dark:hover { background: #334155; color: #fff; }

    header {
      background: linear-gradient(180deg, #0b1528 0%, #070d18 100%);
      border-bottom: 1px solid var(--border);
      padding: 32px 20px;
      text-align: center;
    }
    header h1 {
      font-size: 2rem;
      font-weight: 800;
      margin-bottom: 8px;
      letter-spacing: -0.02em;
    }
    header h1 span { color: #38bdf8; }
    header p {
      color: var(--text-muted);
      font-size: 0.92rem;
      max-width: 800px;
      margin: 0 auto 16px auto;
    }
    .badge-live {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      background: rgba(16, 185, 129, 0.15);
      border: 1px solid rgba(16, 185, 129, 0.4);
      color: #34d399;
      font-size: 0.75rem;
      font-weight: 700;
      padding: 4px 12px;
      border-radius: 9999px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .pulse-dot {
      width: 6px; height: 6px; border-radius: 50%; background: #10b981;
      box-shadow: 0 0 8px #10b981;
    }

    .container {
      max-width: 1440px;
      margin: 28px auto;
      padding: 0 20px;
    }

    .stats-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 16px;
      margin-bottom: 28px;
    }
    .stat-card {
      background: var(--card-bg);
      border: 1px solid var(--border);
      border-radius: 12px;
      padding: 18px 20px;
      position: relative;
      overflow: hidden;
      transition: transform 0.2s, border-color 0.2s;
    }
    .stat-card:hover {
      transform: translateY(-2px);
      border-color: #3b82f6;
    }
    .stat-card .label {
      font-size: 0.72rem;
      text-transform: uppercase;
      color: var(--text-muted);
      font-weight: 700;
      letter-spacing: 0.8px;
    }
    .stat-card .val {
      font-size: 2rem;
      font-weight: 800;
      color: #fff;
      margin: 4px 0;
    }
    .stat-card .sub {
      font-size: 0.75rem;
      color: #38bdf8;
      display: flex;
      align-items: center;
      gap: 4px;
    }

    .nav-tabs {
      display: flex;
      gap: 8px;
      border-bottom: 1px solid var(--border);
      margin-bottom: 24px;
      overflow-x: auto;
      padding-bottom: 6px;
    }
    .tab-btn {
      background: transparent;
      border: none;
      color: var(--text-muted);
      padding: 10px 20px;
      font-size: 0.92rem;
      font-weight: 700;
      cursor: pointer;
      border-radius: 8px;
      display: flex;
      align-items: center;
      gap: 8px;
      transition: all 0.2s;
    }
    .tab-btn:hover { color: #fff; background: var(--card-sub); }
    .tab-btn.active {
      color: #fff;
      background: #1e3a8a;
      border: 1px solid #3b82f6;
    }

    .tab-content { display: none; }
    .tab-content.active { display: block; }

    /* Barra de busqueda */
    .search-bar {
      display: flex;
      gap: 12px;
      margin-bottom: 20px;
      flex-wrap: wrap;
    }
    .search-input {
      flex: 1;
      min-width: 260px;
      background: var(--card-bg);
      border: 1px solid var(--border);
      color: #fff;
      padding: 12px 18px;
      border-radius: 8px;
      font-size: 0.9rem;
    }
    .search-input:focus { outline: none; border-color: #3b82f6; }
    .filter-select {
      background: var(--card-bg);
      border: 1px solid var(--border);
      color: #fff;
      padding: 12px 18px;
      border-radius: 8px;
      font-size: 0.88rem;
    }

    /* Grid de Vehiculos */
    .vehicles-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
      gap: 20px;
    }
    .veh-card {
      background: var(--card-bg);
      border: 1px solid var(--border);
      border-radius: 12px;
      overflow: hidden;
      display: flex;
      flex-direction: column;
      transition: transform 0.25s, box-shadow 0.25s, border-color 0.25s;
    }
    .veh-card:hover {
      transform: translateY(-4px);
      border-color: #3b82f6;
      box-shadow: 0 12px 30px rgba(0,0,0,0.4);
    }
    .veh-img-box {
      height: 200px;
      background: #020617;
      position: relative;
      overflow: hidden;
    }
    .veh-img-box img {
      width: 100%;
      height: 100%;
      object-fit: cover;
      transition: transform 0.5s;
    }
    .veh-card:hover .veh-img-box img { transform: scale(1.05); }
    .veh-badge {
      position: absolute;
      top: 12px;
      left: 12px;
      background: #2563eb;
      color: #fff;
      font-size: 0.65rem;
      font-weight: 800;
      padding: 4px 10px;
      border-radius: 9999px;
      letter-spacing: 0.5px;
      text-transform: uppercase;
    }
    .veh-avail {
      position: absolute;
      bottom: 12px;
      right: 12px;
      background: rgba(15, 23, 42, 0.85);
      backdrop-filter: blur(8px);
      border: 1px solid rgba(255,255,255,0.15);
      color: #38bdf8;
      font-size: 0.7rem;
      font-weight: 700;
      padding: 3px 10px;
      border-radius: 9999px;
    }
    .veh-body {
      padding: 16px 18px;
      display: flex;
      flex-direction: column;
      gap: 8px;
      flex: 1;
    }
    .veh-title {
      font-size: 1.1rem;
      font-weight: 800;
      color: #fff;
      line-height: 1.3;
    }
    .veh-price {
      font-size: 1.25rem;
      font-weight: 900;
      color: #34d399;
    }
    .veh-specs {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      font-size: 0.75rem;
      color: var(--text-muted);
      margin: 4px 0;
    }
    .veh-specs span {
      background: var(--card-sub);
      padding: 3px 8px;
      border-radius: 4px;
      border: 1px solid rgba(255,255,255,0.05);
    }
    .veh-desc {
      font-size: 0.8rem;
      color: #94a3b8;
      line-height: 1.45;
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
      overflow: hidden;
      margin-top: auto;
    }

    /* Tablas interactivas */
    .table-container {
      background: var(--card-bg);
      border: 1px solid var(--border);
      border-radius: 12px;
      overflow-x: auto;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      font-size: 0.84rem;
      text-align: left;
    }
    th {
      background: #111e36;
      color: #94a3b8;
      font-weight: 700;
      text-transform: uppercase;
      font-size: 0.7rem;
      letter-spacing: 0.8px;
      padding: 14px 18px;
      border-bottom: 1px solid var(--border);
    }
    td {
      padding: 12px 18px;
      border-bottom: 1px solid rgba(255,255,255,0.04);
      color: #cbd5e1;
    }
    tr:hover td { background: rgba(37, 99, 235, 0.05); }

    /* Code block */
    .code-box {
      background: #020617;
      border: 1px solid var(--border);
      border-radius: 10px;
      padding: 20px;
      font-family: monospace;
      font-size: 0.82rem;
      color: #93c5fd;
      max-height: 550px;
      overflow: auto;
      white-space: pre-wrap;
      word-break: break-all;
    }
  </style>
</head>
<body>

  <div class="top-banner">
    <div class="brand">
      <i class="fas fa-car-side"></i>
      <span>Seminuevos Autos — Base de Datos &amp; Verificador Local</span>
    </div>
    <div class="top-actions">
      <a href="http://localhost:5050/" target="_blank" class="btn btn-green"><i class="fas fa-play"></i> Servidor Local (5050)</a>
      <a href="https://seminuevos-lading-page.vercel.app" target="_blank" class="btn btn-blue"><i class="fas fa-globe"></i> Web en Vivo (Vercel)</a>
      <button onclick="copyDataExport()" class="btn btn-dark"><i class="fas fa-copy"></i> Copiar JSON</button>
    </div>
  </div>

  <header>
    <div class="badge-live"><span class="pulse-dot"></span> Sincronización Triple Activa: Nube + PC Local + GitHub</div>
    <h1 style="margin-top: 14px;">Catálogo Maestro &amp; Base de Datos <span>Seminuevos</span></h1>
    <p>Espacio de trabajo único y verificador local. Reemplazo completo de base de datos con inventario real, tarifas aduanales, peritaje MasterTech y trazabilidad total.</p>
  </header>

  <div class="container">
    <div class="stats-grid">
      <div class="stat-card">
        <div class="label">Total Vehículos</div>
        <div class="val" id="statTotalVeh">${data.vehicles.length}</div>
        <div class="sub"><i class="fas fa-check-circle"></i> Catálogo Completo</div>
      </div>
      <div class="stat-card">
        <div class="label">Entrega Inmediata</div>
        <div class="val">${data.vehicles.filter(v => v.availability === 'entrega_inmediata').length}</div>
        <div class="sub"><i class="fas fa-location-dot"></i> Stock Físico Margarita</div>
      </div>
      <div class="stat-card">
        <div class="label">Por Pedido / Subasta USA</div>
        <div class="val">${data.vehicles.filter(v => v.availability === 'por_pedido').length}</div>
        <div class="sub"><i class="fas fa-ship"></i> Importación Llave en Mano</div>
      </div>
      <div class="stat-card">
        <div class="label">Configuraciones</div>
        <div class="val">${data.site_settings.length}</div>
        <div class="sub"><i class="fas fa-sliders"></i> Parámetros Globales</div>
      </div>
      <div class="stat-card">
        <div class="label">Usuarios Staff</div>
        <div class="val">${data.agency_users.length}</div>
        <div class="sub"><i class="fas fa-users-gear"></i> Acceso Comercial</div>
      </div>
      <div class="stat-card">
        <div class="label">Promociones Activas</div>
        <div class="val">${data.promotions.length}</div>
        <div class="sub"><i class="fas fa-tag"></i> Ofertas Especiales</div>
      </div>
    </div>

    <div class="nav-tabs">
      <button class="tab-btn active" onclick="switchTab('tab-vehicles')"><i class="fas fa-car"></i> Catálogo de Vehículos (${data.vehicles.length})</button>
      <button class="tab-btn" onclick="switchTab('tab-settings')"><i class="fas fa-gears"></i> Configuraciones (${data.site_settings.length})</button>
      <button class="tab-btn" onclick="switchTab('tab-users')"><i class="fas fa-user-shield"></i> Usuarios Staff (${data.agency_users.length})</button>
      <button class="tab-btn" onclick="switchTab('tab-promos')"><i class="fas fa-tags"></i> Promociones (${data.promotions.length})</button>
      <button class="tab-btn" onclick="switchTab('tab-json')"><i class="fas fa-code"></i> data_export.json</button>
      <button class="tab-btn" onclick="switchTab('tab-sql')"><i class="fas fa-database"></i> Consultas SQL</button>
    </div>

    <!-- TAB 1: VEHICULOS -->
    <div id="tab-vehicles" class="tab-content active">
      <div class="search-bar">
        <input type="text" id="vehSearch" class="search-input" placeholder="Buscar por marca, modelo, motor o año (ej. 4Runner, Silverado, HR-V, 2025)..." onkeyup="filterVehicles()">
        <select id="availFilter" class="filter-select" onchange="filterVehicles()">
          <option value="all">Todas las disponibilidades</option>
          <option value="entrega_inmediata">Entrega Inmediata (Stock)</option>
          <option value="por_pedido">Por Pedido (USA)</option>
        </select>
        <select id="bodyFilter" class="filter-select" onchange="filterVehicles()">
          <option value="all">Todas las carrocerías</option>
          <option value="suv">SUV</option>
          <option value="pickup">Pickup</option>
          <option value="sedan">Sedán</option>
        </select>
      </div>
      <div class="vehicles-grid" id="vehiclesContainer"></div>
    </div>

    <!-- TAB 2: SETTINGS -->
    <div id="tab-settings" class="tab-content">
      <div class="table-container">
        <table>
          <thead>
            <tr>
              <th>Clave (Key)</th>
              <th>Valor (Value)</th>
              <th>Descripción</th>
            </tr>
          </thead>
          <tbody>
            ${data.site_settings.map(s => `
              <tr>
                <td style="font-family:monospace; color:#38bdf8; font-weight:700;">${s.key}</td>
                <td style="font-family:monospace; color:#34d399; max-width:400px; word-break:break-all;">${s.value}</td>
                <td style="color:#94a3b8;">${s.descripcion || '-'}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    </div>

    <!-- TAB 3: USUARIOS STAFF -->
    <div id="tab-users" class="tab-content">
      <div class="table-container">
        <table>
          <thead>
            <tr>
              <th>ID</th>
              <th>Nombre Completo</th>
              <th>Email</th>
              <th>Teléfono</th>
              <th>Rol</th>
              <th>Sucursal</th>
              <th>Estado</th>
            </tr>
          </thead>
          <tbody>
            ${data.agency_users.map(u => `
              <tr>
                <td>#${u.id}</td>
                <td style="font-weight:700; color:#fff;">${u.full_name}</td>
                <td style="font-family:monospace; color:#93c5fd;">${u.email}</td>
                <td>${u.phone || '-'}</td>
                <td><span style="background:#1e3a8a; color:#bfdbfe; padding:3px 8px; border-radius:4px; font-size:0.75rem; text-transform:uppercase;">${u.role}</span></td>
                <td>${u.branch}</td>
                <td><span style="color:#34d399; font-weight:700;">${u.status}</span></td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    </div>

    <!-- TAB 4: PROMOCIONES -->
    <div id="tab-promos" class="tab-content">
      <div class="table-container">
        <table>
          <thead>
            <tr>
              <th>ID</th>
              <th>Título</th>
              <th>Subtítulo</th>
              <th>Descuento / Badge</th>
              <th>Destino (URL)</th>
              <th>Estado</th>
            </tr>
          </thead>
          <tbody>
            ${data.promotions.map(p => `
              <tr>
                <td style="font-family:monospace; color:#94a3b8;">${p.id}</td>
                <td style="font-weight:700; color:#fff;">${p.title}</td>
                <td>${p.subtitle || '-'}</td>
                <td><span style="background:#064e3b; color:#a7f3d0; padding:3px 8px; border-radius:4px; font-weight:700;">${p.discount_text || p.badge_text}</span></td>
                <td style="font-family:monospace; color:#38bdf8;">${p.cta_url}</td>
                <td><span style="color:#34d399; font-weight:700;">${p.status}</span></td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    </div>

    <!-- TAB 5: JSON -->
    <div id="tab-json" class="tab-content">
      <div style="margin-bottom:12px; display:flex; gap:10px;">
        <button onclick="copyDataExport()" class="btn btn-blue"><i class="fas fa-copy"></i> Copiar Todo el JSON</button>
        <a href="data_export.json" download class="btn btn-dark"><i class="fas fa-download"></i> Descargar Archivo data_export.json</a>
      </div>
      <div class="code-box" id="jsonViewer"></div>
    </div>

    <!-- TAB 6: SQL -->
    <div id="tab-sql" class="tab-content">
      <div class="code-box">-- 1. Consultar todos los vehiculos de Entrega Inmediata en Porlamar
SELECT id, title, price, year, km, engine, badge 
FROM vehicles 
WHERE availability = 'entrega_inmediata' AND status = 'active'
ORDER BY year DESC;

-- 2. Consultar vehiculos por pedido con margen de ahorro en subastas USA
SELECT id, title, price, year, engine, body_type 
FROM vehicles 
WHERE availability = 'por_pedido' AND status = 'active'
ORDER BY id ASC;

-- 3. Resumen de stock agrupado por tipo de carroceria
SELECT body_type, COUNT(*) as total_unidades
FROM vehicles
GROUP BY body_type
ORDER BY total_unidades DESC;

-- 4. Consultar parametros globales y tarifas de calculadora
SELECT key, value, descripcion 
FROM site_settings 
ORDER BY key ASC;</div>
    </div>

  </div>

  <script>
    const EXPORT_DATA = ${JSON.stringify(data)};
    const vehicles = EXPORT_DATA.vehicles || [];

    function switchTab(tabId) {
      document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
      document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
      event.currentTarget.classList.add('active');
      document.getElementById(tabId).classList.add('active');

      if (tabId === 'tab-json' && !document.getElementById('jsonViewer').textContent) {
        document.getElementById('jsonViewer').textContent = JSON.stringify(EXPORT_DATA, null, 2);
      }
    }

    function renderVehicles(list) {
      const container = document.getElementById('vehiclesContainer');
      if (!list || list.length === 0) {
        container.innerHTML = '<div style="grid-column:1/-1; text-align:center; padding:40px; color:#94a3b8;">No se encontraron vehículos con los filtros seleccionados.</div>';
        return;
      }

      container.innerHTML = list.map(v => {
        const rawImg = (v.images && v.images.length > 0) ? v.images[0] : '';
        const cdnFallback = rawImg ? (rawImg.startsWith('http') ? rawImg : 'https://seminuevos-lading-page.vercel.app/' + rawImg) : '';
        const totalImgs = (v.images && Array.isArray(v.images)) ? v.images.length : 0;
        const isStock = v.availability === 'entrega_inmediata';
        const availLabel = isStock ? '📍 Entrega Inmediata' : '🚢 Por Pedido USA';
        
        return \`
          <div class="veh-card">
            <div class="veh-img-box">
              \${rawImg ? \`
                <img src="\${rawImg}" alt="\${v.title}" loading="lazy" onerror="if (this.src !== '\${cdnFallback}') { this.src = '\${cdnFallback}'; } else { this.parentElement.innerHTML = '<div style=\\\\"display:flex;align-items:center;justify-content:center;height:100%;color:#64748b;font-size:0.9rem;background:#0f172a;\\\\"><i class=\\\\"fas fa-car\\\\"></i>&nbsp;Foto en Proceso</div>'; }">
              \` : \`
                <div style="display:flex;align-items:center;justify-content:center;height:100%;color:#64748b;font-size:0.9rem;background:#0f172a;"><i class="fas fa-car"></i>&nbsp;Sin Imagen</div>
              \`}
              \${v.badge ? \`<span class="veh-badge">\${v.badge}</span>\` : ''}
              <span class="veh-avail">\${availLabel}</span>
              \${totalImgs > 1 ? \`<span style="position:absolute;bottom:10px;right:10px;background:rgba(0,0,0,0.75);color:#fff;font-size:0.75rem;padding:3px 8px;border-radius:4px;font-weight:600;"><i class="fas fa-images"></i> \${totalImgs} fotos</span>\` : ''}
            </div>
            <div class="veh-body">
              <div class="veh-title">\${v.title}</div>
              <div class="veh-price">\${v.price}</div>
              <div class="veh-specs">
                <span><i class="fas fa-calendar"></i> \${v.year}</span>
                <span><i class="fas fa-gauge"></i> \${v.km}</span>
                \${v.engine ? \`<span><i class="fas fa-gears"></i> \${v.engine}</span>\` : ''}
                <span><i class="fas fa-car-side"></i> \${(v.body_type || 'SUV').toUpperCase()}</span>
              </div>
              <p class="veh-desc">\${v.description || 'Vehículo certificado por Seminuevos Autos.'}</p>
            </div>
          </div>
        \`;
      }).join('');
    }

    function filterVehicles() {
      const q = (document.getElementById('vehSearch').value || '').toLowerCase();
      const avail = document.getElementById('availFilter').value;
      const body = document.getElementById('bodyFilter').value;

      const filtered = vehicles.filter(v => {
        const matchesQ = !q || (v.title && v.title.toLowerCase().includes(q)) || (v.engine && v.engine.toLowerCase().includes(q)) || String(v.year).includes(q);
        const matchesAvail = avail === 'all' || v.availability === avail;
        const matchesBody = body === 'all' || v.body_type === body;
        return matchesQ && matchesAvail && matchesBody;
      });

      renderVehicles(filtered);
    }

    function copyDataExport() {
      navigator.clipboard.writeText(JSON.stringify(EXPORT_DATA, null, 2)).then(() => {
        alert('data_export.json copiado al portapapeles con éxito.');
      });
    }

    // Render inicial
    renderVehicles(vehicles);
  </script>
</body>
</html>
`;

fs.writeFileSync('C:\\Users\\maste\\OneDrive\\Documents\\SEMINUEVOS\\index.html', html, 'utf-8');
console.log('✓ index.html generado exitosamente en C:\\Users\\maste\\OneDrive\\Documents\\SEMINUEVOS\\index.html');
