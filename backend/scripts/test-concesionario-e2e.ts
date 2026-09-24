/**
 * Prueba end-to-end del rol 'concesionario': crea un concesionario + usuario
 * de prueba directo en la base (con la service_role key, mismo patrón que
 * create-admin.ts, porque no hay forma de crear un usuario concesionario sin
 * ya tener un admin autenticado), hace login real contra el backend corriendo
 * y ejercita las rutas de vehicles/vehicle-inquiries para verificar el
 * scoping por concesionario_id. Limpia todos los datos de prueba al final,
 * incluso si alguna aserción falla.
 *
 * Requiere que el backend esté corriendo en API_BASE_URL (por defecto
 * http://localhost:3001).
 *
 * Uso:
 *   npx ts-node scripts/test-concesionario-e2e.ts
 */
import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import * as bcrypt from 'bcryptjs';

const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3001';
const TEST_EMAIL = 'test-concesionario-e2e@test.local';
const TEST_PASSWORD = 'TestPassword123!';

let passed = 0;
let failed = 0;

function assert(condition: boolean, message: string) {
  if (condition) {
    passed++;
    console.log(`  \x1b[32m✓\x1b[0m ${message}`);
  } else {
    failed++;
    console.log(`  \x1b[31m✗ FAIL\x1b[0m ${message}`);
  }
}

async function main() {
  const url = process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    console.error('Faltan SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY en el entorno.');
    process.exit(1);
  }
  const supabase = createClient(url, serviceKey);

  let concesionarioId: number | undefined;
  let otherConcesionarioId: number | undefined;
  let ownedVehicleId: number | undefined;
  let controlVehicleId: number | undefined;

  try {
    // ---- Setup (directo a la DB, sin pasar por la API) ----
    console.log('\n--- Setup ---');

    const { data: conc, error: concErr } = await supabase
      .from('concesionarios')
      .insert([{ name: 'TEST Concesionario E2E', contact_email: 'test-conc-e2e@test.local', status: 'active' }])
      .select('id')
      .single();
    if (concErr || !conc) throw new Error('No se pudo crear el concesionario de prueba: ' + concErr?.message);
    concesionarioId = conc.id;
    console.log(`  Concesionario de prueba creado: id=${concesionarioId}`);

    const { data: otherConc, error: otherConcErr } = await supabase
      .from('concesionarios')
      .insert([{ name: 'TEST Concesionario E2E (otro)', status: 'active' }])
      .select('id')
      .single();
    if (otherConcErr || !otherConc) throw new Error('No se pudo crear el segundo concesionario: ' + otherConcErr?.message);
    otherConcesionarioId = otherConc.id;
    console.log(`  Segundo concesionario (para probar aislamiento): id=${otherConcesionarioId}`);

    const password_hash = await bcrypt.hash(TEST_PASSWORD, 12);
    const { error: userErr } = await supabase.from('agency_users').upsert(
      [
        {
          email: TEST_EMAIL,
          full_name: 'Test Concesionario E2E',
          password_hash,
          role: 'concesionario',
          concesionario_id: concesionarioId,
          status: 'active',
        },
      ],
      { onConflict: 'email' },
    );
    if (userErr) throw new Error('No se pudo crear el usuario de prueba: ' + userErr.message);
    console.log(`  Usuario concesionario de prueba creado: ${TEST_EMAIL}`);

    // Vehículo "de control" que NO pertenece al concesionario de prueba
    // (inventario propio de la agencia, concesionario_id null).
    const { data: control, error: controlErr } = await supabase
      .from('vehicles')
      .insert([{ title: 'TEST-CONTROL-NOOWNER', year: 2020, status: 'active', price: 'Consultar' }])
      .select('id')
      .single();
    if (controlErr || !control) throw new Error('No se pudo crear el vehículo de control: ' + controlErr?.message);
    controlVehicleId = control.id;
    console.log(`  Vehículo de control (sin dueño) creado: id=${controlVehicleId}`);

    // ---- Login real contra el backend ----
    console.log('\n--- Login ---');
    const loginRes = await fetch(`${API_BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: TEST_EMAIL, password: TEST_PASSWORD }),
    });
    const loginBody: any = await loginRes.json();
    assert(loginRes.status === 200, `POST /api/auth/login devuelve 200 (fue ${loginRes.status})`);
    assert(loginBody?.user?.role === 'concesionario', `El usuario logueado tiene role='concesionario' (fue '${loginBody?.user?.role}')`);
    const token = loginBody?.token;
    assert(!!token, 'El login devuelve un JWT');

    const authHeaders = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };

    // ---- Crear vehículo como concesionario, intentando falsear el dueño ----
    console.log('\n--- Crear vehículo (intentando asignarlo a OTRO concesionario) ---');
    const createRes = await fetch(`${API_BASE_URL}/api/vehicles`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        title: 'TEST-OWNED-VEHICLE',
        year: 2021,
        price: '10000',
        concesionario_id: otherConcesionarioId, // intento de asignárselo a otro — debe ser ignorado
      }),
    });
    const createBody: any = await createRes.json();
    assert(createRes.status === 201 || createRes.status === 200, `POST /api/vehicles devuelve éxito (fue ${createRes.status})`);
    ownedVehicleId = createBody?.data?.id;
    assert(!!ownedVehicleId, 'El vehículo creado tiene un id');
    assert(
      createBody?.data?.concesionario_id === concesionarioId,
      `El backend fuerza concesionario_id=${concesionarioId} ignorando el ${otherConcesionarioId} del body (fue ${createBody?.data?.concesionario_id})`,
    );

    // ---- Listado scoping ----
    console.log('\n--- GET /api/vehicles (debe ver solo lo propio) ---');
    const listRes = await fetch(`${API_BASE_URL}/api/vehicles`, { headers: authHeaders });
    const listBody: any = await listRes.json();
    const listIds = (listBody?.data || []).map((v: any) => v.id);
    assert(listRes.status === 200, `GET /api/vehicles devuelve 200 (fue ${listRes.status})`);
    assert(listIds.includes(ownedVehicleId), 'El listado incluye el vehículo propio');
    assert(!listIds.includes(controlVehicleId), 'El listado NO incluye el vehículo de control (sin dueño)');
    assert(listIds.length === 1, `El listado tiene exactamente 1 vehículo (tuvo ${listIds.length})`);

    // ---- Aislamiento: no puede ver/editar/borrar el vehículo ajeno ----
    console.log('\n--- Aislamiento sobre el vehículo de control (no propio) ---');
    const getOtherRes = await fetch(`${API_BASE_URL}/api/vehicles/${controlVehicleId}`, { headers: authHeaders });
    assert(getOtherRes.status === 404, `GET del vehículo ajeno devuelve 404 (fue ${getOtherRes.status})`);

    const putOtherRes = await fetch(`${API_BASE_URL}/api/vehicles/${controlVehicleId}`, {
      method: 'PUT',
      headers: authHeaders,
      body: JSON.stringify({ title: 'HACKEADO' }),
    });
    assert(putOtherRes.status === 404, `PUT del vehículo ajeno devuelve 404 (fue ${putOtherRes.status})`);

    const deleteOtherRes = await fetch(`${API_BASE_URL}/api/vehicles/${controlVehicleId}`, {
      method: 'DELETE',
      headers: authHeaders,
    });
    assert(deleteOtherRes.status === 404, `DELETE del vehículo ajeno devuelve 404 (fue ${deleteOtherRes.status})`);

    const { data: stillThere } = await supabase.from('vehicles').select('title').eq('id', controlVehicleId).maybeSingle();
    assert(stillThere?.title === 'TEST-CONTROL-NOOWNER', 'El vehículo ajeno sigue intacto en la DB tras los intentos');

    // ---- vehicle_inquiries: público crea, concesionario ve solo lo suyo ----
    console.log('\n--- vehicle_inquiries (público crea, concesionario ve scoped) ---');
    const inqOwnedRes = await fetch(`${API_BASE_URL}/api/vehicle-inquiries`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        full_name: 'Cliente de Prueba',
        phone: '04121234567',
        vehicle_id: ownedVehicleId,
        inquiry_type: 'compra',
      }),
    });
    assert(inqOwnedRes.status === 201, `POST /api/vehicle-inquiries (vehículo propio) devuelve 201 (fue ${inqOwnedRes.status})`);

    const inqControlRes = await fetch(`${API_BASE_URL}/api/vehicle-inquiries`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        full_name: 'Cliente de Prueba 2',
        phone: '04121234568',
        vehicle_id: controlVehicleId,
        inquiry_type: 'importacion',
      }),
    });
    assert(inqControlRes.status === 201, `POST /api/vehicle-inquiries (vehículo ajeno) devuelve 201 (fue ${inqControlRes.status})`);

    const inqListRes = await fetch(`${API_BASE_URL}/api/vehicle-inquiries`, { headers: authHeaders });
    const inqListBody: any = await inqListRes.json();
    const inqVehicleIds = (inqListBody?.data || []).map((i: any) => i.vehicle_id);
    assert(inqListRes.status === 200, `GET /api/vehicle-inquiries devuelve 200 (fue ${inqListRes.status})`);
    assert(inqVehicleIds.includes(ownedVehicleId), 'Las consultas incluyen la del vehículo propio');
    assert(!inqVehicleIds.includes(controlVehicleId), 'Las consultas NO incluyen la del vehículo ajeno');
  } finally {
    // ---- Cleanup: siempre, incluso si algo falló arriba ----
    console.log('\n--- Cleanup ---');
    if (ownedVehicleId) await supabase.from('vehicle_inquiries').delete().eq('vehicle_id', ownedVehicleId);
    if (controlVehicleId) await supabase.from('vehicle_inquiries').delete().eq('vehicle_id', controlVehicleId);
    if (ownedVehicleId) await supabase.from('vehicles').delete().eq('id', ownedVehicleId);
    if (controlVehicleId) await supabase.from('vehicles').delete().eq('id', controlVehicleId);
    await supabase.from('agency_users').delete().eq('email', TEST_EMAIL);
    if (concesionarioId) await supabase.from('concesionarios').delete().eq('id', concesionarioId);
    if (otherConcesionarioId) await supabase.from('concesionarios').delete().eq('id', otherConcesionarioId);
    console.log('  Datos de prueba eliminados.');
  }

  console.log(`\n=== Resultado: ${passed} OK, ${failed} FALLARON ===\n`);
  process.exit(failed > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error('Error inesperado:', err);
  process.exit(1);
});
