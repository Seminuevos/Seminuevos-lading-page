/**
 * Capa de Datos SQLite — Seminuevos Autos
 * Usa el modulo nativo node:sqlite de Node.js (cero dependencias externas)
 */
const path = require('path');
const { DatabaseSync } = require('node:sqlite');

const DB_PATH = path.join(__dirname, 'seminuevos.db');

function getDb() {
  const db = new DatabaseSync(DB_PATH);
  db.exec('PRAGMA foreign_keys = ON;');
  return db;
}

function getAllVehicles(filters = {}) {
  const db = getDb();
  let query = 'SELECT * FROM vehicles WHERE 1=1';
  const params = [];

  if (filters.status) {
    query += ' AND status = ?';
    params.push(filters.status);
  }
  if (filters.catalog) {
    query += ' AND catalog = ?';
    params.push(filters.catalog);
  }
  if (filters.availability) {
    query += ' AND availability = ?';
    params.push(filters.availability);
  }
  if (filters.body_type) {
    query += ' AND body_type = ?';
    params.push(filters.body_type);
  }

  query += ' ORDER BY id ASC';
  const rows = db.prepare(query).all(...params);
  db.close();

  return rows.map(r => ({
    ...r,
    images: (() => { try { return JSON.parse(r.images_json); } catch(e) { return []; } })()
  }));
}

function getVehicleById(id) {
  const db = getDb();
  const row = db.prepare('SELECT * FROM vehicles WHERE id = ?').get(id);
  db.close();
  if (!row) return null;
  return {
    ...row,
    images: (() => { try { return JSON.parse(row.images_json); } catch(e) { return []; } })()
  };
}

function getSettings() {
  const db = getDb();
  const rows = db.prepare('SELECT * FROM site_settings').all();
  db.close();
  const map = {};
  rows.forEach(r => map[r.key] = r.value);
  return map;
}

function getStaffUsers() {
  const db = getDb();
  const rows = db.prepare('SELECT id, full_name, email, phone, role, branch, status, notes, created_at FROM agency_users').all();
  db.close();
  return rows;
}

function getPromotions() {
  const db = getDb();
  const rows = db.prepare("SELECT * FROM promotions WHERE status = 'active'").all();
  db.close();
  return rows;
}

function getSystemStats() {
  const db = getDb();
  const totalVehicles = db.prepare('SELECT COUNT(*) as count FROM vehicles').get().count;
  const inStock = db.prepare("SELECT COUNT(*) as count FROM vehicles WHERE availability = 'entrega_inmediata'").get().count;
  const onOrder = db.prepare("SELECT COUNT(*) as count FROM vehicles WHERE availability = 'por_pedido'").get().count;
  const zeroKm = db.prepare("SELECT COUNT(*) as count FROM vehicles WHERE condition = '0km'").get().count;
  const totalSettings = db.prepare('SELECT COUNT(*) as count FROM site_settings').get().count;
  const totalUsers = db.prepare('SELECT COUNT(*) as count FROM agency_users').get().count;
  const totalPromotions = db.prepare('SELECT COUNT(*) as count FROM promotions').get().count;
  db.close();

  return {
    total_vehicles: totalVehicles,
    in_stock_porlamar: inStock,
    on_order_usa: onOrder,
    zero_km: zeroKm,
    site_settings_count: totalSettings,
    staff_users_count: totalUsers,
    promotions_count: totalPromotions
  };
}

module.exports = {
  getDb,
  getAllVehicles,
  getVehicleById,
  getSettings,
  getStaffUsers,
  getPromotions,
  getSystemStats
};
