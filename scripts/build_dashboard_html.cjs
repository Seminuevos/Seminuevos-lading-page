const fs = require('fs');
const path = require('path');

const dataExportPath = 'C:\\Users\\maste\\OneDrive\\Documents\\SEMINUEVOS\\data_export.json';
const data = JSON.parse(fs.readFileSync(dataExportPath, 'utf-8'));

const vehiclesJson = JSON.stringify(data.vehicles || []).replace(/<\/script>/gi, '<\\/script>');
const settingsJson = JSON.stringify(data.site_settings || []).replace(/<\/script>/gi, '<\\/script>');
const usersJson = JSON.stringify(data.agency_users || []).replace(/<\/script>/gi, '<\\/script>');
const promosJson = JSON.stringify(data.promotions || []).replace(/<\/script>/gi, '<\\/script>');

const html = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Semi Nuevo Autos | Concesionario Premium & Base de Datos Local</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700;800&family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=Unbounded:wght@600;700;800&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css">
  <style>
    :root {
      --bg: #F8FAFC;
      --card-bg: #FFFFFF;
      --navy: #0F172A;
      --text: #0F172A;
      --text-muted: #64748B;
      --primary: #2563EB;
      --primary-hover: #1D4ED8;
      --primary-soft: #EFF6FF;
      --primary-border: #BFDBFE;
      --success: #16A34A;
      --success-soft: #DCFCE7;
      --warning: #D97706;
      --border: #E2E8F0;
      --border-hover: #93C5FD;
      --shadow-sm: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
      --shadow-md: 0 4px 6px -1px rgba(0, 0, 0, 0.07), 0 2px 4px -2px rgba(0, 0, 0, 0.05);
      --shadow-lg: 0 12px 24px -4px rgba(15, 23, 42, 0.08), 0 4px 8px -2px rgba(15, 23, 42, 0.04);
      --shadow-xl: 0 20px 30px -6px rgba(15, 23, 42, 0.12);
      --font: 'Plus Jakarta Sans', system-ui, -apple-system, sans-serif;
      --font-display: 'Outfit', sans-serif;
    }

    * { box-sizing: border-box; margin: 0; padding: 0; }
    
    body {
      background: var(--bg);
      color: var(--text);
      font-family: var(--font);
      line-height: 1.5;
      padding-bottom: 70px;
      -webkit-font-smoothing: antialiased;
    }

    /* BARRA SUPERIOR DE CONTROL & BASE DE DATOS LOCAL */
    .admin-bar {
      background: #0B132B;
      color: #F8FAFC;
      border-bottom: 1px solid #1E293B;
      padding: 10px 24px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      flex-wrap: wrap;
      gap: 12px;
      font-size: 0.85rem;
      position: sticky;
      top: 0;
      z-index: 1000;
    }

    .admin-bar-left {
      display: flex;
      align-items: center;
      gap: 14px;
      flex-wrap: wrap;
    }

    .admin-brand-tag {
      font-weight: 700;
      color: #60A5FA;
      display: flex;
      align-items: center;
      gap: 8px;
      letter-spacing: 0.02em;
    }

    .admin-pill {
      background: rgba(255, 255, 255, 0.08);
      padding: 3px 10px;
      border-radius: 9999px;
      font-size: 0.78rem;
      color: #CBD5E1;
      display: inline-flex;
      align-items: center;
      gap: 5px;
      border: 1px solid rgba(255, 255, 255, 0.1);
    }

    .admin-pill strong { color: #38BDF8; font-weight: 700; }

    .admin-bar-right {
      display: flex;
      align-items: center;
      gap: 10px;
    }

    .btn-db-toggle {
      background: #2563EB;
      color: #FFFFFF;
      border: none;
      padding: 6px 14px;
      border-radius: 6px;
      font-size: 0.82rem;
      font-weight: 600;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: 6px;
      transition: all 0.2s;
    }
    .btn-db-toggle:hover { background: #1D4ED8; }

    .btn-live-web {
      background: rgba(255, 255, 255, 0.1);
      color: #FFFFFF;
      text-decoration: none;
      padding: 6px 14px;
      border-radius: 6px;
      font-size: 0.82rem;
      font-weight: 600;
      display: inline-flex;
      align-items: center;
      gap: 6px;
      border: 1px solid rgba(255, 255, 255, 0.15);
      transition: all 0.2s;
    }
    .btn-live-web:hover { background: rgba(255, 255, 255, 0.2); }

    /* HEADER OFICIAL SEMINUEVOS */
    .dealership-header {
      background: #FFFFFF;
      border-bottom: 1px solid var(--border);
      padding: 16px 24px;
      box-shadow: var(--shadow-sm);
    }

    .header-container {
      max-width: 1320px;
      margin: 0 auto;
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 20px;
    }

    .logo-wrap {
      display: flex;
      align-items: center;
      gap: 10px;
      text-decoration: none;
    }

    .logo-icon-svg {
      width: 38px;
      height: 38px;
      background: linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%);
      border-radius: 10px;
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
      font-size: 1.15rem;
      box-shadow: 0 4px 10px rgba(37, 99, 235, 0.25);
    }

    .logo-text-block {
      display: flex;
      flex-direction: column;
    }

    .logo-title {
      font-family: var(--font-display);
      font-size: 1.35rem;
      font-weight: 800;
      letter-spacing: -0.02em;
      color: #0F172A;
      line-height: 1.1;
    }

    .logo-title span { color: #2563EB; }

    .logo-sub {
      font-size: 0.72rem;
      font-weight: 600;
      color: #64748B;
      letter-spacing: 0.08em;
      text-transform: uppercase;
    }

    .nav-links {
      display: flex;
      align-items: center;
      gap: 24px;
      list-style: none;
    }

    .nav-links a {
      text-decoration: none;
      color: #334155;
      font-size: 0.92rem;
      font-weight: 600;
      letter-spacing: 0.01em;
      transition: color 0.2s;
      cursor: pointer;
    }

    .nav-links a:hover, .nav-links a.active {
      color: #2563EB;
    }

    .btn-nav-advisor {
      background: #2563EB;
      color: #FFFFFF;
      text-decoration: none;
      padding: 10px 20px;
      border-radius: 8px;
      font-weight: 700;
      font-size: 0.88rem;
      display: inline-flex;
      align-items: center;
      gap: 8px;
      transition: all 0.2s;
      box-shadow: 0 4px 12px rgba(37, 99, 235, 0.2);
    }
    .btn-nav-advisor:hover {
      background: #1D4ED8;
      transform: translateY(-1px);
    }

    /* CONTENEDOR PRINCIPAL */
    .main-wrap {
      max-width: 1320px;
      margin: 32px auto 0 auto;
      padding: 0 20px;
    }

    /* HERO TITULAR */
    .catalog-headline-box {
      text-align: center;
      margin-bottom: 28px;
    }

    .catalog-badge-pill {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      background: #EFF6FF;
      color: #2563EB;
      border: 1px solid #BFDBFE;
      padding: 5px 14px;
      border-radius: 9999px;
      font-size: 0.8rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.04em;
      margin-bottom: 12px;
    }

    .catalog-main-title {
      font-family: var(--font-display);
      font-size: 2.2rem;
      font-weight: 800;
      color: #0F172A;
      letter-spacing: -0.03em;
      margin-bottom: 8px;
    }

    .catalog-main-desc {
      color: #64748B;
      font-size: 1.05rem;
      max-width: 720px;
      margin: 0 auto;
    }

    /* BUSCADOR DE INVENTARIO OFICIAL (SEMINUEVOS SPEC EXACTA) */
    .search-console-wrapper {
      background: #FFFFFF;
      border: 1px solid var(--border);
      border-radius: 16px;
      padding: 24px 28px;
      box-shadow: var(--shadow-md);
      margin-bottom: 36px;
    }

    .search-console-title {
      font-size: 0.9rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: #2563EB;
      margin-bottom: 18px;
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .search-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr) auto;
      gap: 14px;
      align-items: end;
      margin-bottom: 18px;
    }

    .search-field label {
      display: block;
      font-size: 0.75rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.04em;
      color: #475569;
      margin-bottom: 6px;
    }

    .search-field select, .search-field input {
      width: 100%;
      background: #F8FAFC;
      border: 1px solid #CBD5E1;
      padding: 11px 14px;
      border-radius: 10px;
      font-size: 0.92rem;
      font-family: inherit;
      color: #0F172A;
      font-weight: 500;
      outline: none;
      transition: all 0.2s;
    }

    .search-field select:focus, .search-field input:focus {
      background: #FFFFFF;
      border-color: #2563EB;
      box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.15);
    }

    .btn-search-main {
      background: #2563EB;
      color: #FFFFFF;
      border: none;
      padding: 12px 24px;
      border-radius: 10px;
      font-size: 0.92rem;
      font-weight: 700;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: 8px;
      height: 45px;
      transition: all 0.2s;
      white-space: nowrap;
    }
    .btn-search-main:hover {
      background: #1D4ED8;
      box-shadow: 0 4px 12px rgba(37, 99, 235, 0.3);
    }

    .frequent-chips-row {
      display: flex;
      align-items: center;
      flex-wrap: wrap;
      gap: 8px;
      padding-top: 14px;
      border-top: 1px solid #F1F5F9;
    }

    .chips-label {
      font-size: 0.8rem;
      font-weight: 700;
      color: #64748B;
      margin-right: 4px;
      display: inline-flex;
      align-items: center;
      gap: 6px;
    }

    .search-chip {
      background: #F1F5F9;
      color: #334155;
      padding: 5px 12px;
      border-radius: 9999px;
      font-size: 0.8rem;
      font-weight: 600;
      text-decoration: none;
      border: 1px solid #E2E8F0;
      cursor: pointer;
      transition: all 0.15s;
    }
    .search-chip:hover {
      background: #EFF6FF;
      color: #2563EB;
      border-color: #BFDBFE;
    }

    /* FRANJA DE MARCAS */
    .brands-strip {
      text-align: center;
      margin-bottom: 40px;
    }

    .brands-strip-title {
      font-size: 0.88rem;
      font-weight: 700;
      color: #334155;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      margin-bottom: 18px;
    }

    .brands-logos-row {
      display: flex;
      align-items: center;
      justify-content: center;
      flex-wrap: wrap;
      gap: 28px;
      padding: 16px 20px;
      background: #FFFFFF;
      border-radius: 12px;
      border: 1px solid var(--border);
    }

    .brand-logo-item {
      height: 32px;
      display: flex;
      align-items: center;
      opacity: 0.65;
      filter: grayscale(100%);
      transition: all 0.25s;
    }
    .brand-logo-item:hover {
      opacity: 1;
      filter: grayscale(0%);
      transform: scale(1.08);
    }
    .brand-logo-item img {
      max-height: 28px;
      max-width: 90px;
      object-fit: contain;
    }
    .brand-text-fallback {
      font-family: var(--font-display);
      font-weight: 800;
      font-size: 1.1rem;
      color: #0F172A;
      letter-spacing: -0.02em;
    }

    /* PESTAÑAS DE CATEGORÍA */
    .catalog-tabs-bar {
      display: flex;
      align-items: center;
      gap: 10px;
      margin-bottom: 24px;
      border-bottom: 2px solid #E2E8F0;
      padding-bottom: 12px;
      overflow-x: auto;
    }

    .catalog-tab-btn {
      background: transparent;
      border: none;
      padding: 10px 18px;
      border-radius: 8px;
      font-size: 0.92rem;
      font-weight: 700;
      color: #64748B;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: 8px;
      transition: all 0.2s;
      white-space: nowrap;
    }

    .catalog-tab-btn:hover {
      color: #2563EB;
      background: #EFF6FF;
    }

    .catalog-tab-btn.active {
      color: #2563EB;
      background: #EFF6FF;
      box-shadow: inset 0 0 0 1px #BFDBFE;
    }

    .catalog-tab-btn .badge-count {
      background: #CBD5E1;
      color: #0F172A;
      font-size: 0.72rem;
      padding: 2px 7px;
      border-radius: 9999px;
      font-weight: 800;
    }

    .catalog-tab-btn.active .badge-count {
      background: #2563EB;
      color: #FFFFFF;
    }

    /* GRID DE VEHICULOS (DISEÑO BLANCO OFICIAL SEMINUEVOS) */
    .vehicles-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(360px, 1fr));
      gap: 24px;
    }

    .vehicle-card {
      background: #FFFFFF;
      border: 1px solid var(--border);
      border-radius: 18px;
      overflow: hidden;
      display: flex;
      flex-direction: column;
      box-shadow: var(--shadow-sm);
      transition: all 0.3s cubic-bezier(0.2, 1, 0.3, 1);
      position: relative;
    }

    .vehicle-card:hover {
      transform: translateY(-6px);
      border-color: #93C5FD;
      box-shadow: var(--shadow-lg);
    }

    .vehicle-card-image {
      position: relative;
      width: 100%;
      height: 230px;
      background: #F1F5F9;
      overflow: hidden;
    }

    .vehicle-card-image img {
      width: 100%;
      height: 100%;
      object-fit: cover;
      transition: transform 0.5s cubic-bezier(0.2, 1, 0.3, 1);
    }

    .vehicle-card:hover .vehicle-card-image img {
      transform: scale(1.05);
    }

    .card-badge-top-left {
      position: absolute;
      top: 12px;
      left: 12px;
      display: flex;
      flex-direction: column;
      gap: 6px;
      z-index: 2;
    }

    .pill-badge {
      background: #2563EB;
      color: #FFFFFF;
      font-size: 0.72rem;
      font-weight: 800;
      padding: 4px 10px;
      border-radius: 6px;
      text-transform: uppercase;
      letter-spacing: 0.04em;
      box-shadow: 0 2px 6px rgba(0,0,0,0.25);
    }

    .pill-badge.puerto-libre {
      background: #0284C7;
    }

    .pill-badge.entrega-inmediata {
      background: #16A34A;
    }

    .card-avail-pill {
      position: absolute;
      bottom: 12px;
      left: 12px;
      background: rgba(15, 23, 42, 0.85);
      backdrop-filter: blur(4px);
      color: #FFFFFF;
      font-size: 0.74rem;
      font-weight: 700;
      padding: 4px 10px;
      border-radius: 6px;
      display: inline-flex;
      align-items: center;
      gap: 5px;
      z-index: 2;
    }

    .card-photos-pill {
      position: absolute;
      bottom: 12px;
      right: 12px;
      background: rgba(15, 23, 42, 0.85);
      backdrop-filter: blur(4px);
      color: #FFFFFF;
      font-size: 0.74rem;
      font-weight: 700;
      padding: 4px 10px;
      border-radius: 6px;
      display: inline-flex;
      align-items: center;
      gap: 5px;
      z-index: 2;
      cursor: pointer;
    }

    .mastertech-seal-img {
      position: absolute;
      top: 10px;
      right: 10px;
      width: 44px;
      height: 44px;
      object-fit: contain;
      filter: drop-shadow(0 2px 4px rgba(0,0,0,0.3));
      z-index: 2;
    }

    .vehicle-card-body {
      padding: 20px 22px;
      display: flex;
      flex-direction: column;
      flex-grow: 1;
      justify-content: space-between;
    }

    .vehicle-title {
      font-family: var(--font-display);
      font-size: 1.15rem;
      font-weight: 700;
      color: #0F172A;
      margin-bottom: 6px;
      line-height: 1.3;
    }

    .vehicle-price {
      font-family: var(--font-display);
      font-size: 1.45rem;
      font-weight: 800;
      color: #2563EB;
      margin-bottom: 14px;
    }

    .vehicle-specs-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 8px 12px;
      padding-top: 14px;
      border-top: 1px solid #F1F5F9;
      margin-bottom: 14px;
    }

    .spec-item {
      display: flex;
      align-items: center;
      gap: 7px;
      font-size: 0.82rem;
      color: #475569;
      font-weight: 500;
    }

    .spec-item i {
      color: #94A3B8;
      font-size: 0.82rem;
      width: 14px;
      text-align: center;
    }

    .vehicle-desc {
      font-size: 0.85rem;
      color: #64748B;
      line-height: 1.45;
      margin-bottom: 18px;
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
      overflow: hidden;
    }

    .vehicle-actions-row {
      display: flex;
      gap: 10px;
      align-items: center;
    }

    .btn-card-wa {
      flex: 1;
      background: #16A34A;
      color: #FFFFFF;
      text-decoration: none;
      padding: 10px 14px;
      border-radius: 8px;
      font-size: 0.85rem;
      font-weight: 700;
      text-align: center;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 7px;
      transition: background 0.2s;
    }
    .btn-card-wa:hover { background: #15803D; }

    .btn-card-photos {
      background: #F1F5F9;
      color: #334155;
      border: 1px solid #CBD5E1;
      padding: 10px 14px;
      border-radius: 8px;
      font-size: 0.85rem;
      font-weight: 600;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: 6px;
      transition: all 0.2s;
    }
    .btn-card-photos:hover {
      background: #EFF6FF;
      color: #2563EB;
      border-color: #BFDBFE;
    }

    /* MODAL PANEL DE BASE DE DATOS LOCAL */
    .db-drawer-overlay {
      display: none;
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(15, 23, 42, 0.6);
      backdrop-filter: blur(4px);
      z-index: 2000;
      justify-content: center;
      align-items: center;
      padding: 20px;
    }

    .db-drawer-overlay.active {
      display: flex;
    }

    .db-drawer-content {
      background: #FFFFFF;
      width: 100%;
      max-width: 1100px;
      max-height: 90vh;
      border-radius: 16px;
      box-shadow: var(--shadow-xl);
      display: flex;
      flex-direction: column;
      overflow: hidden;
      border: 1px solid var(--border);
    }

    .db-drawer-header {
      background: #0B132B;
      color: white;
      padding: 18px 24px;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .db-drawer-title {
      font-family: var(--font-display);
      font-size: 1.25rem;
      font-weight: 700;
      display: flex;
      align-items: center;
      gap: 10px;
    }

    .btn-close-drawer {
      background: transparent;
      border: none;
      color: #94A3B8;
      font-size: 1.3rem;
      cursor: pointer;
      padding: 4px;
    }
    .btn-close-drawer:hover { color: white; }

    .db-tabs-header {
      background: #F8FAFC;
      border-bottom: 1px solid var(--border);
      padding: 10px 20px 0 20px;
      display: flex;
      gap: 12px;
      overflow-x: auto;
    }

    .db-tab-link {
      background: transparent;
      border: none;
      padding: 10px 16px;
      font-size: 0.88rem;
      font-weight: 700;
      color: #64748B;
      cursor: pointer;
      border-bottom: 3px solid transparent;
      transition: all 0.2s;
    }
    .db-tab-link:hover { color: #2563EB; }
    .db-tab-link.active {
      color: #2563EB;
      border-bottom-color: #2563EB;
    }

    .db-tab-pane {
      display: none;
      padding: 24px;
      overflow-y: auto;
      flex: 1;
    }
    .db-tab-pane.active { display: block; }

    /* TABLAS ESTILIZADAS */
    .table-responsive {
      width: 100%;
      overflow-x: auto;
    }

    table {
      width: 100%;
      border-collapse: collapse;
      font-size: 0.88rem;
      text-align: left;
    }

    th {
      background: #F1F5F9;
      color: #334155;
      font-weight: 700;
      padding: 12px 14px;
      border-bottom: 2px solid var(--border);
      text-transform: uppercase;
      font-size: 0.76rem;
      letter-spacing: 0.04em;
    }

    td {
      padding: 12px 14px;
      border-bottom: 1px solid #F1F5F9;
      color: #1E293B;
    }

    tr:hover td { background: #F8FAFC; }

    .code-box {
      background: #0B132B;
      color: #E2E8F0;
      padding: 16px;
      border-radius: 10px;
      font-family: 'Consolas', monospace;
      font-size: 0.82rem;
      max-height: 400px;
      overflow: auto;
      white-space: pre-wrap;
      word-break: break-all;
    }

    /* MODAL DE FOTOS / GALERIA COMPLETA */
    .gallery-modal-overlay {
      display: none;
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(15, 23, 42, 0.9);
      backdrop-filter: blur(8px);
      z-index: 3000;
      justify-content: center;
      align-items: center;
      padding: 20px;
    }

    .gallery-modal-overlay.active { display: flex; }

    .gallery-modal-box {
      background: #FFFFFF;
      max-width: 900px;
      width: 100%;
      max-height: 90vh;
      border-radius: 16px;
      overflow: hidden;
      display: flex;
      flex-direction: column;
    }

    .gallery-modal-header {
      padding: 16px 20px;
      border-bottom: 1px solid var(--border);
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .gallery-modal-body {
      padding: 20px;
      overflow-y: auto;
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
      gap: 12px;
    }

    .gallery-thumb {
      height: 150px;
      border-radius: 10px;
      overflow: hidden;
      background: #F1F5F9;
      border: 1px solid var(--border);
    }

    .gallery-thumb img {
      width: 100%;
      height: 100%;
      object-fit: cover;
      cursor: pointer;
      transition: transform 0.2s;
    }
    .gallery-thumb img:hover { transform: scale(1.05); }

    @media (max-width: 992px) {
      .search-grid { grid-template-columns: repeat(2, 1fr); }
      .nav-links { display: none; }
    }

    @media (max-width: 600px) {
      .search-grid { grid-template-columns: 1fr; }
      .vehicles-grid { grid-template-columns: 1fr; }
    }
  </style>
</head>
<body>

  <!-- 1. BARRA DE CONTROL SUPERIOR & BASE DE DATOS LOCAL -->
  <div class="admin-bar">
    <div class="admin-bar-left">
      <div class="admin-brand-tag">
        <i class="fas fa-shield-halved"></i>
        <span>SEMINUEVOS WORKSPACE</span>
      </div>
      <span class="admin-pill"><i class="fas fa-car"></i> <strong>46</strong> Vehículos</span>
      <span class="admin-pill"><i class="fas fa-sliders"></i> <strong>16</strong> Ajustes</span>
      <span class="admin-pill"><i class="fas fa-users"></i> <strong>6</strong> Staff</span>
      <span class="admin-pill"><i class="fas fa-database"></i> SQLite 3 Activo</span>
    </div>
    <div class="admin-bar-right">
      <button class="btn-db-toggle" onclick="openDbDrawer()">
        <i class="fas fa-server"></i> Explorador de Datos &amp; SQL
      </button>
      <a href="https://seminuevos-lading-page.vercel.app" target="_blank" class="btn-live-web">
        <i class="fas fa-arrow-up-right-from-square"></i> Web en Vivo
      </a>
    </div>
  </div>

  <!-- 2. HEADER OFICIAL DEALERSHIP -->
  <header class="dealership-header">
    <div class="header-container">
      <a href="/" class="logo-wrap">
        <div class="logo-icon-svg">
          <i class="fas fa-car-rear"></i>
        </div>
        <div class="logo-text-block">
          <div class="logo-title">Semi<span>Nuevo</span></div>
          <div class="logo-sub">Compra, Consigue, Accede</div>
        </div>
      </a>
      <ul class="nav-links">
        <li><a class="active" onclick="filterByCatalog('todos')">INICIO</a></li>
        <li><a onclick="filterByCatalog('todos')">CATÁLOGO</a></li>
        <li><a onclick="filterByCatalog('seminuevos')">STOCK MARGARITA</a></li>
        <li><a onclick="filterByCatalog('importados')">POR PEDIDO USA</a></li>
        <li><a onclick="filterByCatalog('0km')">0 KILÓMETROS</a></li>
      </ul>
      <a href="https://wa.me/584248700438?text=Hola,%20deseo%20consultar%20sobre%20el%20inventario%20oficial" target="_blank" class="btn-nav-advisor">
        <i class="fab fa-whatsapp"></i>
        <span>CONSULTAR ASESOR</span>
      </a>
    </div>
  </header>

  <!-- 3. CONTENEDOR PRINCIPAL -->
  <main class="main-wrap">

    <!-- TITULAR PRINCIPAL -->
    <div class="catalog-headline-box">
      <div class="catalog-badge-pill">
        <i class="fas fa-certificate"></i> Concesionario Premium &amp; Base de Datos Sincronizada
      </div>
      <h1 class="catalog-main-title">Catálogo Oficial de Vehículos</h1>
      <p class="catalog-main-desc">
        Inventario real verificado: Stock físico en Porlamar, Isla de Margarita y unidades por pedido directo desde USA respaldadas técnicamente por Taller MasterTech.
      </p>
    </div>

    <!-- BUSCADOR DE INVENTARIO OFICIAL (SEMINUEVOS SPEC EXACTA) -->
    <div class="search-console-wrapper">
      <div class="search-console-title">
        <i class="fas fa-car-tunnel"></i> Buscador de Inventario Oficial
      </div>
      <div class="search-grid">
        <div class="search-field">
          <label><i class="fas fa-shield"></i> Condición</label>
          <select id="filterCondicion" onchange="runFilter()">
            <option value="todos">Todas las Condiciones</option>
            <option value="seminuevo">Seminuevo Certificado</option>
            <option value="0km">0 KM a Estrenar</option>
          </select>
        </div>
        <div class="search-field">
          <label><i class="fas fa-star"></i> Marca</label>
          <select id="filterMarca" onchange="runFilter()">
            <option value="todas">Todas las Marcas</option>
            <option value="toyota">Toyota</option>
            <option value="honda">Honda</option>
            <option value="nissan">Nissan</option>
            <option value="jeep">Jeep</option>
            <option value="lexus">Lexus</option>
            <option value="hyundai">Hyundai</option>
            <option value="chevrolet">Chevrolet</option>
            <option value="ford">Ford</option>
            <option value="kia">Kia</option>
            <option value="gmc">GMC</option>
          </select>
        </div>
        <div class="search-field">
          <label><i class="fas fa-car-side"></i> Carrocería</label>
          <select id="filterCarroceria" onchange="runFilter()">
            <option value="todos">Todos los Tipos</option>
            <option value="suv">SUV</option>
            <option value="pickup">Pickup</option>
            <option value="sedan">Sedán</option>
            <option value="coupe">Coupé</option>
          </select>
        </div>
        <div class="search-field">
          <label><i class="fas fa-dollar-sign"></i> Presupuesto</label>
          <select id="filterPresupuesto" onchange="runFilter()">
            <option value="todos">Cualquier Presupuesto</option>
            <option value="under25k">Hasta $25,000</option>
            <option value="25to35k">$25,000 - $35,000</option>
            <option value="35to45k">$35,000 - $45,000</option>
            <option value="above45k">Más de $45,000</option>
          </select>
        </div>
        <button type="button" class="btn-search-main" onclick="runFilter()">
          <i class="fas fa-magnifying-glass"></i> BUSCAR VEHÍCULOS
        </button>
      </div>

      <!-- BUSQUEDA RAPIDA POR TEXTO -->
      <div style="margin-bottom: 14px;">
        <input type="text" id="filterText" placeholder="Buscar por modelo, versión, año o motor (ej. 4Runner, Tucson, HR-V, Silverado, 2025)..." oninput="runFilter()" style="width:100%; padding:11px 16px; border-radius:10px; border:1px solid #CBD5E1; background:#F8FAFC; font-size:0.92rem; outline:none;">
      </div>

      <!-- CHIPS DE BUSQUEDA FRECUENTE -->
      <div class="frequent-chips-row">
        <span class="chips-label"><i class="fas fa-fire" style="color:#F97316;"></i> Búsquedas frecuentes:</span>
        <button class="search-chip" onclick="quickChip('Hilux')">Toyota Hilux</button>
        <button class="search-chip" onclick="quickChip('HR-V')">Honda HR-V</button>
        <button class="search-chip" onclick="quickChip('Sentra')">Nissan Sentra</button>
        <button class="search-chip" onclick="quickChip('Tucson')">Hyundai Tucson</button>
        <button class="search-chip" onclick="quickChip('4Runner')">Toyota 4Runner</button>
        <button class="search-chip" onclick="quickChip('Silverado')">Chevrolet Silverado</button>
        <button class="search-chip" onclick="setCarroceria('suv')">SUVs Familiares</button>
        <button class="search-chip" onclick="setCarroceria('pickup')">Pickups 4x4</button>
        <button class="search-chip" onclick="setPresupuesto('under25k')">Hasta $25,000</button>
      </div>
    </div>

    <!-- FRANJA DE MARCAS SHOWROOM (EXACTA A LA WEB) -->
    <div class="brands-strip">
      <div class="brands-strip-title">Marcas Disponibles en Showroom &amp; Subastas Directas</div>
      <div class="brands-logos-row">
        <div class="brand-logo-item"><img src="images/brands/Toyota_logo_(Red).svg.png" alt="Toyota" onerror="this.outerHTML='<span class=\\'brand-text-fallback\\'>TOYOTA</span>'"></div>
        <div class="brand-logo-item"><img src="images/brands/Honda.svg.png" alt="Honda" onerror="this.outerHTML='<span class=\\'brand-text-fallback\\'>HONDA</span>'"></div>
        <div class="brand-logo-item"><img src="images/brands/Nissan_2020_logo.svg" alt="Nissan" onerror="this.outerHTML='<span class=\\'brand-text-fallback\\'>NISSAN</span>'"></div>
        <div class="brand-logo-item"><img src="images/brands/jeep-logo-1.png" alt="Jeep" onerror="this.outerHTML='<span class=\\'brand-text-fallback\\'>JEEP</span>'"></div>
        <div class="brand-logo-item"><img src="images/brands/dodge-logo-png-transparent.png" alt="Dodge" onerror="this.outerHTML='<span class=\\'brand-text-fallback\\'>DODGE</span>'"></div>
        <div class="brand-logo-item"><img src="images/brands/INFINITI_Logo_Primary_Black.png" alt="Infiniti" onerror="this.outerHTML='<span class=\\'brand-text-fallback\\'>INFINITI</span>'"></div>
        <div class="brand-logo-item"><img src="images/brands/logo-Hyundai.png" alt="Hyundai" onerror="this.outerHTML='<span class=\\'brand-text-fallback\\'>HYUNDAI</span>'"></div>
        <div class="brand-logo-item"><img src="images/brands/Kia-logo.png" alt="Kia" onerror="this.outerHTML='<span class=\\'brand-text-fallback\\'>KIA</span>'"></div>
      </div>
    </div>

    <!-- PESTAÑAS DE CATEGORÍA DE CATÁLOGO -->
    <div class="catalog-tabs-bar" id="catalogo">
      <button class="catalog-tab-btn active" id="tab-todos" onclick="filterByCatalog('todos')">
        <i class="fas fa-grid-2"></i> Todos los Vehículos <span class="badge-count" id="count-todos">46</span>
      </button>
      <button class="catalog-tab-btn" id="tab-seminuevos" onclick="filterByCatalog('seminuevos')">
        <i class="fas fa-location-dot"></i> Stock Local (Margarita) <span class="badge-count" id="count-seminuevos">6</span>
      </button>
      <button class="catalog-tab-btn" id="tab-importados" onclick="filterByCatalog('importados')">
        <i class="fas fa-ship"></i> Por Pedido USA <span class="badge-count" id="count-importados">39</span>
      </button>
      <button class="catalog-tab-btn" id="tab-0km" onclick="filterByCatalog('0km')">
        <i class="fas fa-sparkles"></i> 0KM a Estrenar <span class="badge-count" id="count-0km">1</span>
      </button>
    </div>

    <!-- GRID DE TARJETAS DE VEHÍCULOS -->
    <div class="vehicles-grid" id="vehiclesGrid"></div>

  </main>

  <!-- MODAL EXPLORADOR DE BASE DE DATOS LOCAL -->
  <div class="db-drawer-overlay" id="dbDrawerOverlay" onclick="if(event.target===this) closeDbDrawer()">
    <div class="db-drawer-content">
      <div class="db-drawer-header">
        <div class="db-drawer-title">
          <i class="fas fa-database" style="color:#60A5FA;"></i>
          <span>Explorador de Datos, Tablas &amp; Respaldos Locales</span>
        </div>
        <button class="btn-close-drawer" onclick="closeDbDrawer()">&times;</button>
      </div>
      <div class="db-tabs-header">
        <button class="db-tab-link active" onclick="switchDbTab('tabSettings')"><i class="fas fa-sliders"></i> Configuraciones (16)</button>
        <button class="db-tab-link" onclick="switchDbTab('tabUsers')"><i class="fas fa-users"></i> Usuarios Staff (6)</button>
        <button class="db-tab-link" onclick="switchDbTab('tabPromos')"><i class="fas fa-tag"></i> Promociones (4)</button>
        <button class="db-tab-link" onclick="switchDbTab('tabExport')"><i class="fas fa-file-code"></i> data_export.json</button>
        <button class="db-tab-link" onclick="switchDbTab('tabSql')"><i class="fas fa-terminal"></i> SQL / SQLite 3</button>
      </div>

      <!-- TAB 1: SITE SETTINGS -->
      <div class="db-tab-pane active" id="tabSettings">
        <div class="table-responsive">
          <table>
            <thead>
              <tr>
                <th>Clave (Key)</th>
                <th>Valor Actual</th>
                <th>Descripción</th>
              </tr>
            </thead>
            <tbody id="settingsTableBody"></tbody>
          </table>
        </div>
      </div>

      <!-- TAB 2: USUARIOS STAFF -->
      <div class="db-tab-pane" id="tabUsers">
        <div class="table-responsive">
          <table>
            <thead>
              <tr>
                <th>ID</th>
                <th>Nombre</th>
                <th>Correo Electrónico</th>
                <th>Teléfono</th>
                <th>Rol</th>
                <th>Sucursal</th>
              </tr>
            </thead>
            <tbody id="usersTableBody"></tbody>
          </table>
        </div>
      </div>

      <!-- TAB 3: PROMOCIONES -->
      <div class="db-tab-pane" id="tabPromos">
        <div class="table-responsive">
          <table>
            <thead>
              <tr>
                <th>ID</th>
                <th>Título</th>
                <th>Subtítulo</th>
                <th>Descuento</th>
                <th>Enlace CTA</th>
              </tr>
            </thead>
            <tbody id="promosTableBody"></tbody>
          </table>
        </div>
      </div>

      <!-- TAB 4: DATA EXPORT JSON -->
      <div class="db-tab-pane" id="tabExport">
        <div style="display:flex; justify-content:space-between; margin-bottom:12px;">
          <strong style="color:#0F172A;">Volcado JSON Estructurado Completo</strong>
          <a href="data_export.json" download="data_export.json" class="btn-db-toggle"><i class="fas fa-download"></i> Descargar JSON</a>
        </div>
        <div class="code-box" id="jsonViewer"></div>
      </div>

      <!-- TAB 5: SQL / RESTAURACION -->
      <div class="db-tab-pane" id="tabSql">
        <div style="display:flex; justify-content:space-between; margin-bottom:12px;">
          <strong style="color:#0F172A;">Archivos SQL de Respaldo y Esquemas</strong>
          <a href="seed_data.sql" download="seed_data.sql" class="btn-db-toggle"><i class="fas fa-download"></i> Descargar seed_data.sql</a>
        </div>
        <div class="code-box">-- Base de datos activa: seminuevos.db (SQLite 3 nativo)
-- Total vehículos: 46 registros
-- Total imágenes registradas: 750+ fotos auténticas de concesionario
-- Ubicación física local: C:\\Users\\maste\\OneDrive\\Documents\\SEMINUEVOS\\seminuevos.db
-- Script maestro de sincronización: scripts/sync_triple_backup.cjs</div>
      </div>
    </div>
  </div>

  <!-- MODAL DE GALERÍA DE FOTOS -->
  <div class="gallery-modal-overlay" id="galleryModalOverlay" onclick="if(event.target===this) closeGalleryModal()">
    <div class="gallery-modal-box">
      <div class="gallery-modal-header">
        <strong id="galleryModalTitle" style="font-family:var(--font-display); font-size:1.15rem; color:#0F172A;"></strong>
        <button class="btn-close-drawer" style="color:#64748B;" onclick="closeGalleryModal()">&times;</button>
      </div>
      <div class="gallery-modal-body" id="galleryModalBody"></div>
    </div>
  </div>

  <script>
    const vehiclesData = ${vehiclesJson};
    const settingsData = ${settingsJson};
    const usersData = ${usersJson};
    const promosData = ${promosJson};

    let activeCatalogFilter = 'todos';

    function initPage() {
      renderVehicles(vehiclesData);
      renderSettingsTable();
      renderUsersTable();
      renderPromosTable();
      document.getElementById('jsonViewer').textContent = JSON.stringify({
        metadata: { total_vehiculos: vehiclesData.length, sincronizado: new Date().toISOString() },
        vehiculos_muestra: vehiclesData.slice(0, 3)
      }, null, 2);
    }

    function renderVehicles(list) {
      const grid = document.getElementById('vehiclesGrid');
      if (!list || list.length === 0) {
        grid.innerHTML = '<div style="grid-column:1/-1; text-align:center; padding:60px 20px; background:#FFFFFF; border-radius:16px; border:1px solid #E2E8F0; color:#64748B;"><i class="fas fa-car-rear" style="font-size:2.5rem; margin-bottom:12px; color:#CBD5E1;"></i><br><strong>No se encontraron vehículos</strong> con los criterios seleccionados.</div>';
        return;
      }

      grid.innerHTML = list.map(v => {
        const rawImg = (v.images && v.images.length > 0) ? v.images[0] : '';
        const cdnFallback = rawImg ? (rawImg.startsWith('http') ? rawImg : 'https://seminuevos-lading-page.vercel.app/' + rawImg) : '';
        const totalImgs = (v.images && Array.isArray(v.images)) ? v.images.length : 0;
        const isStock = v.availability === 'entrega_inmediata' || v.catalog === 'seminuevos';
        const availLabel = isStock ? '📍 Stock Margarita' : '🚢 Por Pedido USA';
        const badgeClass = (v.badge && v.badge.toLowerCase().includes('puerto')) ? 'puerto-libre' : ((v.badge && v.badge.toLowerCase().includes('inmediata')) ? 'entrega-inmediata' : '');
        const waLink = 'https://wa.me/584248700438?text=' + encodeURIComponent('Hola, me interesa el ' + v.title + ' (' + v.price + ')');

        return \`
          <div class="vehicle-card">
            <div class="vehicle-card-image">
              \${rawImg ? \`
                <img src="\${rawImg}" alt="\${v.title}" loading="lazy" onerror="handleImgError(this, '\${cdnFallback}')">
              \` : \`
                <div style="display:flex;align-items:center;justify-content:center;height:100%;color:#94a3b8;background:#f1f5f9;"><i class="fas fa-car"></i>&nbsp;Foto en proceso</div>
              \`}
              
              <div class="card-badge-top-left">
                \${v.badge ? \`<span class="pill-badge \${badgeClass}">\${v.badge}</span>\` : ''}
              </div>

              \${v.mastertech ? '<img src="images/CERTIFICADO---MASTERTECH.png" alt="Sello MasterTech" class="mastertech-seal-img" onerror="this.style.display=\\'none\\'">' : ''}

              <span class="card-avail-pill">\${availLabel}</span>
              \${totalImgs > 1 ? \`<span class="card-photos-pill" onclick="openGallery(\${v.id})"><i class="fas fa-images"></i> \${totalImgs} fotos</span>\` : ''}
            </div>

            <div class="vehicle-card-body">
              <div>
                <h3 class="vehicle-title">\${v.title}</h3>
                <div class="vehicle-price">\${v.price}</div>
                <div class="vehicle-specs-grid">
                  <div class="spec-item"><i class="fas fa-calendar-check"></i> \${v.year}</div>
                  <div class="spec-item"><i class="fas fa-gauge"></i> \${v.km}</div>
                  \${v.engine ? \`<div class="spec-item"><i class="fas fa-gears"></i> \${v.engine}</div>\` : '<div class="spec-item"><i class="fas fa-gears"></i> ' + (v.transmission || 'Automático') + '</div>'}
                  <div class="spec-item"><i class="fas fa-car-side"></i> \${(v.body_type || 'SUV').toUpperCase()}</div>
                </div>
                <p class="vehicle-desc">\${v.description || 'Vehículo seleccionado e inspeccionado por Seminuevos Autos.'}</p>
              </div>

              <div class="vehicle-actions-row">
                <a href="\${waLink}" target="_blank" class="btn-card-wa">
                  <i class="fab fa-whatsapp"></i> Consultar Asesor
                </a>
                \${totalImgs > 1 ? \`
                  <button type="button" class="btn-card-photos" onclick="openGallery(\${v.id})">
                    <i class="fas fa-camera"></i> Fotos
                  </button>
                \` : ''}
              </div>
            </div>
          </div>
        \`;
      }).join('');
    }

    function handleImgError(imgEl, fallbackUrl) {
      if (imgEl.src !== fallbackUrl && fallbackUrl) {
        imgEl.src = fallbackUrl;
      } else {
        imgEl.onerror = null;
        imgEl.parentElement.innerHTML = '<div style="display:flex;align-items:center;justify-content:center;height:100%;color:#94a3b8;background:#f1f5f9;font-size:0.85rem;"><i class="fas fa-car" style="font-size:1.4rem;margin-right:8px;"></i> Foto Oficial en Carga</div>';
      }
    }

    function runFilter() {
      const text = (document.getElementById('filterText').value || '').toLowerCase().trim();
      const condicion = document.getElementById('filterCondicion').value;
      const marca = document.getElementById('filterMarca').value;
      const carroceria = document.getElementById('filterCarroceria').value;
      const presupuesto = document.getElementById('filterPresupuesto').value;

      const filtered = vehiclesData.filter(v => {
        // Catalogo activo
        if (activeCatalogFilter === 'seminuevos' && v.catalog !== 'seminuevos' && v.availability !== 'entrega_inmediata') return false;
        if (activeCatalogFilter === 'importados' && v.catalog === 'seminuevos') return false;
        if (activeCatalogFilter === '0km' && v.catalog !== '0km' && v.condition !== '0km') return false;

        // Texto
        if (text) {
          const matchTitle = (v.title || '').toLowerCase().includes(text);
          const matchEngine = (v.engine || '').toLowerCase().includes(text);
          const matchYear = String(v.year || '').includes(text);
          const matchDesc = (v.description || '').toLowerCase().includes(text);
          if (!matchTitle && !matchEngine && !matchYear && !matchDesc) return false;
        }

        // Condicion
        if (condicion !== 'todos') {
          if (condicion === '0km' && v.condition !== '0km' && v.catalog !== '0km') return false;
          if (condicion === 'seminuevo' && v.condition === '0km' && v.catalog === '0km') return false;
        }

        // Marca
        if (marca !== 'todas') {
          if (!(v.title || '').toLowerCase().includes(marca)) return false;
        }

        // Carroceria
        if (carroceria !== 'todos') {
          if ((v.body_type || '').toLowerCase() !== carroceria) return false;
        }

        // Presupuesto
        if (presupuesto !== 'todos') {
          const numPrice = parseInt(String(v.price || '').replace(/[^0-9]/g, ''));
          if (!isNaN(numPrice) && numPrice > 0) {
            if (presupuesto === 'under25k' && numPrice > 25000) return false;
            if (presupuesto === '25to35k' && (numPrice < 25000 || numPrice > 35000)) return false;
            if (presupuesto === '35to45k' && (numPrice < 35000 || numPrice > 45000)) return false;
            if (presupuesto === 'above45k' && numPrice < 45000) return false;
          }
        }

        return true;
      });

      renderVehicles(filtered);
    }

    function filterByCatalog(cat) {
      activeCatalogFilter = cat;
      document.querySelectorAll('.catalog-tab-btn').forEach(btn => btn.classList.remove('active'));
      const activeBtn = document.getElementById('tab-' + cat);
      if (activeBtn) activeBtn.classList.add('active');
      runFilter();
    }

    function quickChip(keyword) {
      document.getElementById('filterText').value = keyword;
      runFilter();
    }

    function setCarroceria(type) {
      document.getElementById('filterCarroceria').value = type;
      runFilter();
    }

    function setPresupuesto(p) {
      document.getElementById('filterPresupuesto').value = p;
      runFilter();
    }

    function openGallery(carId) {
      const car = vehiclesData.find(v => v.id === carId);
      if (!car || !car.images) return;
      document.getElementById('galleryModalTitle').textContent = car.title + ' — Galería Completa (' + car.images.length + ' fotos)';
      const body = document.getElementById('galleryModalBody');
      body.innerHTML = car.images.map(img => {
        const cdn = img.startsWith('http') ? img : 'https://seminuevos-lading-page.vercel.app/' + img;
        return '<div class="gallery-thumb"><img src="' + img + '" loading="lazy" onerror="this.src=\\'' + cdn + '\\'"></div>';
      }).join('');
      document.getElementById('galleryModalOverlay').classList.add('active');
    }

    function closeGalleryModal() {
      document.getElementById('galleryModalOverlay').classList.remove('active');
    }

    function openDbDrawer() {
      document.getElementById('dbDrawerOverlay').classList.add('active');
    }

    function closeDbDrawer() {
      document.getElementById('dbDrawerOverlay').classList.remove('active');
    }

    function switchDbTab(tabId) {
      document.querySelectorAll('.db-tab-link').forEach(btn => btn.classList.remove('active'));
      document.querySelectorAll('.db-tab-pane').forEach(p => p.classList.remove('active'));
      event.target.classList.add('active');
      const targetPane = document.getElementById(tabId);
      if (targetPane) targetPane.classList.add('active');
    }

    function renderSettingsTable() {
      const tbody = document.getElementById('settingsTableBody');
      tbody.innerHTML = settingsData.map(s => \`
        <tr>
          <td><strong style="color:#2563EB;">\${s.key}</strong></td>
          <td style="max-width:350px; word-break:break-word;">\${s.value}</td>
          <td style="color:#64748B;">\${s.descripcion || ''}</td>
        </tr>
      \`).join('');
    }

    function renderUsersTable() {
      const tbody = document.getElementById('usersTableBody');
      tbody.innerHTML = usersData.map(u => \`
        <tr>
          <td>\${u.id}</td>
          <td><strong>\${u.full_name}</strong></td>
          <td>\${u.email}</td>
          <td>\${u.phone || 'N/A'}</td>
          <td><span class="admin-pill" style="background:#EFF6FF; color:#2563EB; border-color:#BFDBFE;">\${u.role}</span></td>
          <td>\${u.branch}</td>
        </tr>
      \`).join('');
    }

    function renderPromosTable() {
      const tbody = document.getElementById('promosTableBody');
      tbody.innerHTML = promosData.map(p => \`
        <tr>
          <td>\${p.id}</td>
          <td><strong>\${p.title}</strong></td>
          <td>\${p.subtitle}</td>
          <td><span style="color:#16A34A; font-weight:700;">\${p.discount_text}</span></td>
          <td><a href="\${p.cta_url}" target="_blank" style="color:#2563EB;">\${p.cta_url}</a></td>
        </tr>
      \`).join('');
    }

    window.onload = initPage;
  </script>
</body>
</html>`;

const targetPath = 'C:\\Users\\maste\\OneDrive\\Documents\\SEMINUEVOS\\index.html';
fs.writeFileSync(targetPath, html, 'utf-8');
console.log('✓ index.html con diseño oficial Seminuevos generado exitosamente en ' + targetPath);
