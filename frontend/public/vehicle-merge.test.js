const test = require('node:test');
const assert = require('node:assert/strict');
const { mergeVehiclesForRole } = require('./vehicle-merge.js');

const staticCatalog = [
  { id: 'static-1', title: 'Honda HR-V Sport 2025 4x4 AWD', catalog: 'seminuevos' },
  { id: 'static-2', title: 'Nissan Sentra SV 2025', catalog: 'seminuevos' },
];

test('concesionario: NO mezcla el catálogo estático ni local — solo lo que devuelve la API (regresión del bug real)', () => {
  const apiVehicles = [{ id: 935, title: 'DEMO Toyota Corolla 2023 (Concesionario Norte)', concesionario_id: 9 }];
  const localVehicles = [{ id: 'local-1', title: 'Vehículo Local Ajeno' }];

  const result = mergeVehiclesForRole({
    role: 'concesionario',
    apiVehicles,
    staticVehicles: staticCatalog,
    localVehicles,
    deleted: [],
    overrides: {},
  });

  assert.equal(result.length, 1, 'un concesionario debe ver exactamente lo que devolvió la API, nada más');
  assert.equal(result[0].id, 935);
  assert.ok(
    !result.some((v) => v.title === 'Honda HR-V Sport 2025 4x4 AWD' || v.title === 'Vehículo Local Ajeno'),
    'no debe filtrarse inventario estático/local ajeno al concesionario',
  );
});

test('concesionario: si la API no devuelve nada, el resultado es una lista vacía (no hay fallback al catálogo estático)', () => {
  const result = mergeVehiclesForRole({
    role: 'concesionario',
    apiVehicles: [],
    staticVehicles: staticCatalog,
    localVehicles: [],
    deleted: [],
    overrides: {},
  });
  assert.deepEqual(result, []);
});

test('concesionario: aplica defaults de catalog/status pero no toca otros campos', () => {
  const result = mergeVehiclesForRole({
    role: 'concesionario',
    apiVehicles: [{ id: 1, title: 'X', for_sale: true }],
    staticVehicles: [],
    localVehicles: [],
    deleted: [],
    overrides: {},
  });
  assert.equal(result[0].catalog, 'seminuevos');
  assert.equal(result[0].status, 'active');
  assert.equal(result[0].for_sale, true);
});

test('admin/sales (rol sin scoping): SÍ mezcla estático+local cuando no está ya en la DB por título (comportamiento preexistente, sin cambios)', () => {
  const apiVehicles = [{ id: 1, title: 'Toyota Corolla', catalog: 'seminuevos' }];
  const localVehicles = [{ id: 'local-1', title: 'Vehículo Solo Local' }];

  const result = mergeVehiclesForRole({
    role: 'admin',
    apiVehicles,
    staticVehicles: staticCatalog,
    localVehicles,
    deleted: [],
    overrides: {},
  });

  // DB (1) + local (1) + estático (2) = 4, ninguno duplicado por título
  assert.equal(result.length, 4);
  assert.ok(result.some((v) => v.title === 'Toyota Corolla' && !v.isStatic));
  assert.ok(result.some((v) => v.title === 'Vehículo Solo Local' && v.isStatic));
  assert.ok(result.some((v) => v.title === 'Honda HR-V Sport 2025 4x4 AWD' && v.isStatic));
});

test('admin/sales: un vehículo estático NO se duplica si ya existe en la DB con el mismo título (case-insensitive)', () => {
  const apiVehicles = [{ id: 1, title: 'honda hr-v sport 2025 4x4 awd', catalog: 'seminuevos' }];

  const result = mergeVehiclesForRole({
    role: 'admin',
    apiVehicles,
    staticVehicles: staticCatalog,
    localVehicles: [],
    deleted: [],
    overrides: {},
  });

  const matches = result.filter((v) => v.title.toLowerCase() === 'honda hr-v sport 2025 4x4 awd');
  assert.equal(matches.length, 1, 'no debe haber una copia estática duplicando el vehículo real de la DB');
  assert.equal(matches[0].isStatic, undefined, 'la versión que queda debe ser la de la DB, no la estática');
});

test('admin/sales: respeta la lista de borrados (por título y por id) incluso para vehículos de la DB', () => {
  const apiVehicles = [
    { id: 1, title: 'Vehículo A' },
    { id: 2, title: 'Vehículo B' },
  ];

  const result = mergeVehiclesForRole({
    role: 'admin',
    apiVehicles,
    staticVehicles: [],
    localVehicles: [],
    deleted: ['vehículo a', '2'],
    overrides: {},
  });

  assert.equal(result.length, 0);
});

test('admin/sales: aplica overrides locales por id sobre el vehículo de la DB', () => {
  const apiVehicles = [{ id: 1, title: 'Vehículo A', price: '10000' }];

  const result = mergeVehiclesForRole({
    role: 'admin',
    apiVehicles,
    staticVehicles: [],
    localVehicles: [],
    deleted: [],
    overrides: { '1': { price: '99999' } },
  });

  assert.equal(result[0].price, '99999');
});

test('role null/undefined (sesión sin rol resuelto) se comporta como no-concesionario', () => {
  const result = mergeVehiclesForRole({
    role: null,
    apiVehicles: [{ id: 1, title: 'Vehículo A' }],
    staticVehicles: staticCatalog,
    localVehicles: [],
    deleted: [],
    overrides: {},
  });
  assert.equal(result.length, 3);
});
