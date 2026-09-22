/**
 * Lógica pura de fusión de inventario para el panel de administración
 * (sm-op.hbs). Extraída a un módulo aparte para poder testearla con
 * `node --test` sin necesidad de un navegador — antes vivía inline dentro
 * de loadVehicles() y un bug ahí (mezclar el catálogo estático de respaldo
 * sin importar el rol) hizo que un usuario 'concesionario' viera vehículos
 * ajenos. Ver vehicle-merge.test.js para el caso que reproduce ese bug.
 *
 * Se carga como <script> normal en el navegador (define
 * window.mergeVehiclesForRole) y también funciona con require() desde Node.
 */
(function (root) {
  /**
   * @param {object} params
   * @param {string|null} params.role - rol del usuario logueado (agency_users.role)
   * @param {Array} params.apiVehicles - respuesta de GET /api/vehicles (ya scoped por el backend)
   * @param {Array} params.staticVehicles - catálogo estático de respaldo (data.js: vehiclesSeminuevos/vehicles0km/allVehicles)
   * @param {Array} params.localVehicles - vehículos guardados en localStorage.sn_vehicles
   * @param {string[]} params.deleted - claves (título o id) marcadas como borradas en localStorage.sn_deleted_vehicles
   * @param {object} params.overrides - localStorage.sn_vehicle_overrides, keyed por id o título
   * @returns {Array} la lista final a renderizar en la tabla del panel
   */
  function mergeVehiclesForRole(params) {
    const role = params.role || null;
    const dbVehs = params.apiVehicles || [];
    const deleted = params.deleted || [];
    const overrides = params.overrides || {};

    // Un concesionario solo debe ver exactamente lo que el backend le
    // scopea por concesionario_id — mezclar el catálogo estático de
    // respaldo o vehículos locales le mostraría inventario ajeno que no
    // le pertenece. Este es el fix del bug: para este rol, ni el catálogo
    // estático ni sn_vehicles se consultan en absoluto.
    if (role === 'concesionario') {
      return dbVehs.map(function (v) {
        return Object.assign({}, v, {
          catalog: v.catalog || 'seminuevos',
          status: v.status || 'active',
        });
      });
    }

    const staticVehicles = params.staticVehicles || [];
    const localVehicles = params.localVehicles || [];
    const titleMap = new Map();

    function inferCatalog(v) {
      return (
        v.catalog ||
        (v.availability === 'entrega_inmediata' ? 'seminuevos' : v.condition === '0km' ? '0km' : 'importados')
      );
    }

    // 1. Vehículos de la DB (respetando la lista de borrados para que una
    // eliminación del usuario tenga efecto inmediato).
    dbVehs.forEach(function (v) {
      const key = (v.title || '').toLowerCase().trim();
      const idKey = String(v.id || '');
      if (key && !deleted.includes(key) && !deleted.includes(idKey)) {
        const mapKey = 'db_' + v.id + '_' + key;
        if (!titleMap.has(mapKey)) {
          let item = Object.assign({}, v, { catalog: inferCatalog(v), status: v.status || 'active' });
          const ov = overrides[idKey] || overrides[key];
          if (ov) item = Object.assign({}, item, ov);
          titleMap.set(mapKey, item);
        }
      }
    });

    // 2. Vehículos estáticos/locales se agregan solo si no están ya en la DB
    // (por título) y no fueron borrados explícitamente.
    localVehicles.concat(staticVehicles).forEach(function (v) {
      const key = (v.title || '').toLowerCase().trim();
      const idKey = String(v.id || '');
      if (key && !deleted.includes(key) && !deleted.includes(idKey)) {
        const isAlreadyInDb = Array.from(titleMap.values()).some(function (item) {
          return (item.title || '').toLowerCase().trim() === key;
        });
        if (!isAlreadyInDb) {
          let item = Object.assign({}, v, { catalog: inferCatalog(v), status: v.status || 'active', isStatic: true });
          const ov = overrides[idKey] || overrides[key];
          if (ov) item = Object.assign({}, item, ov);
          titleMap.set('static_' + v.id + '_' + key, item);
        }
      }
    });

    return Array.from(titleMap.values());
  }

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = { mergeVehiclesForRole: mergeVehiclesForRole };
  } else {
    root.mergeVehiclesForRole = mergeVehiclesForRole;
  }
})(typeof window !== 'undefined' ? window : this);
