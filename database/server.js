/**
 * Servidor Web Standalone y API REST — Seminuevos Autos
 * Cero dependencias externas (usa solo modulos nativos de Node.js)
 * Puerto: 5050
 */
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const db = require('./db.js');

const PORT = process.env.PORT || 5050;

const server = http.createServer((req, res) => {
  // CORS Headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  const parsedUrl = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  const pathname = parsedUrl.pathname;

  // API Endpoints
  if (pathname === '/api/vehicles') {
    const catalog = parsedUrl.searchParams.get('catalog');
    const availability = parsedUrl.searchParams.get('availability');
    const status = parsedUrl.searchParams.get('status') || 'active';
    const vehicles = db.getAllVehicles({ catalog, availability, status });
    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify({ success: true, count: vehicles.length, data: vehicles }));
    return;
  }

  if (pathname.startsWith('/api/vehicles/')) {
    const id = parseInt(pathname.split('/')[3]);
    const vehicle = db.getVehicleById(id);
    if (!vehicle) {
      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: false, error: 'Vehiculo no encontrado' }));
      return;
    }
    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify({ success: true, data: vehicle }));
    return;
  }

  if (pathname === '/api/settings') {
    const settings = db.getSettings();
    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify({ success: true, data: settings }));
    return;
  }

  if (pathname === '/api/stats') {
    const stats = db.getSystemStats();
    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify({ success: true, data: stats }));
    return;
  }

  if (pathname === '/api/users') {
    const users = db.getStaffUsers();
    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify({ success: true, count: users.length, data: users }));
    return;
  }

  if (pathname === '/api/promotions') {
    const promotions = db.getPromotions();
    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify({ success: true, count: promotions.length, data: promotions }));
    return;
  }

  // Descarga de data_export.json
  if (pathname === '/data_export.json') {
    const filePath = path.join(__dirname, 'data_export.json');
    if (fs.existsSync(filePath)) {
      res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
      fs.createReadStream(filePath).pipe(res);
      return;
    }
  }

  // Descarga de CSVs
  if (pathname.startsWith('/csv/')) {
    const fileName = path.basename(pathname);
    const filePath = path.join(__dirname, 'csv', fileName);
    if (fs.existsSync(filePath)) {
      res.writeHead(200, { 'Content-Type': 'text/csv; charset=utf-8' });
      fs.createReadStream(filePath).pipe(res);
      return;
    }
  }

  // Servicio estatico de imagenes de vehiculos
  if (pathname.startsWith('/images/')) {
    const relativePath = decodeURIComponent(pathname.replace(/^\/images\//, ''));
    const candidates = [
      path.join(__dirname, 'images', relativePath),
      path.join('C:\\Users\\maste\\Desktop\\PAGINA WEBS\\Seminuevos-lading-page-main\\images', relativePath)
    ];
    for (const imgPath of candidates) {
      if (fs.existsSync(imgPath) && fs.statSync(imgPath).isFile()) {
        const ext = path.extname(imgPath).toLowerCase();
        const mimeTypes = {
          '.jpg': 'image/jpeg',
          '.jpeg': 'image/jpeg',
          '.png': 'image/png',
          '.webp': 'image/webp',
          '.svg': 'image/svg+xml',
          '.gif': 'image/gif'
        };
        res.writeHead(200, {
          'Content-Type': mimeTypes[ext] || 'application/octet-stream',
          'Cache-Control': 'public, max-age=86400'
        });
        fs.createReadStream(imgPath).pipe(res);
        return;
      }
    }
  }

  // Portal de Verificacion index.html
  if (pathname === '/' || pathname === '/index.html') {
    const indexPath = path.join(__dirname, 'index.html');
    if (fs.existsSync(indexPath)) {
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      fs.createReadStream(indexPath).pipe(res);
      return;
    }
  }

  res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
  res.end('404 Recurso no encontrado');
});

server.listen(PORT, () => {
  console.log('====================================================================');
  console.log('  SEMINUEVOS AUTOS — SERVIDOR Y API REST LOCAL INICIADO');
  console.log(`  URL Principal:   http://localhost:${PORT}/`);
  console.log(`  API Vehiculos:   http://localhost:${PORT}/api/vehicles`);
  console.log(`  API Settings:    http://localhost:${PORT}/api/settings`);
  console.log(`  API Estadisticas:http://localhost:${PORT}/api/stats`);
  console.log('====================================================================');
});
