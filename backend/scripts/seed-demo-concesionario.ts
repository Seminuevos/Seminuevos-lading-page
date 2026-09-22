/**
 * Seed persistente (no se borra solo) de un concesionario de demo + su
 * usuario + un vehículo propio, más un usuario staff normal para poder
 * revisar el panel completo (Alquileres, etc.) desde el navegador.
 *
 * A diferencia de scripts/test-concesionario-e2e.ts, esto NO limpia los
 * datos al terminar — es para que un humano entre al panel y lo revise.
 * Borrar a mano cuando ya no se necesite (ver los ids que imprime al final).
 *
 * Uso:
 *   npx ts-node scripts/seed-demo-concesionario.ts
 */
import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import * as bcrypt from 'bcryptjs';

const CONCESIONARIO_EMAIL = 'demo-concesionario@seminuevos-demo.local';
const CONCESIONARIO_PASSWORD = 'DemoConcesionario123!';
const STAFF_EMAIL = 'demo-staff@seminuevos-demo.local';
const STAFF_PASSWORD = 'DemoStaff123!';

async function main() {
  const url = process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    console.error('Faltan SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY en el entorno.');
    process.exit(1);
  }
  const supabase = createClient(url, serviceKey);

  const { data: existingConc } = await supabase
    .from('concesionarios')
    .select('id')
    .eq('name', 'DEMO Concesionario Norte')
    .maybeSingle();

  let conc = existingConc;
  if (!conc) {
    const { data: newConc, error: concErr } = await supabase
      .from('concesionarios')
      .insert([
        {
          name: 'DEMO Concesionario Norte',
          contact_email: 'contacto@demo-concesionario-norte.test',
          contact_phone: '04121112233',
          address: 'Av. Demo, Porlamar (dato de prueba)',
          status: 'active',
        },
      ])
      .select('id')
      .single();
    if (concErr || !newConc) throw new Error('No se pudo crear el concesionario: ' + concErr?.message);
    conc = newConc;
  }

  const concHash = await bcrypt.hash(CONCESIONARIO_PASSWORD, 12);
  const { data: concUser, error: concUserErr } = await supabase
    .from('agency_users')
    .upsert(
      [
        {
          email: CONCESIONARIO_EMAIL,
          full_name: 'Demo Concesionario Norte',
          password_hash: concHash,
          role: 'concesionario',
          concesionario_id: conc.id,
          status: 'active',
        },
      ],
      { onConflict: 'email' },
    )
    .select('id')
    .single();
  if (concUserErr || !concUser) throw new Error('No se pudo crear el usuario concesionario: ' + concUserErr?.message);

  const staffHash = await bcrypt.hash(STAFF_PASSWORD, 12);
  const { error: staffErr } = await supabase.from('agency_users').upsert(
    [
      {
        email: STAFF_EMAIL,
        full_name: 'Demo Staff Ventas',
        password_hash: staffHash,
        role: 'sales',
        status: 'active',
      },
    ],
    { onConflict: 'email' },
  );
  if (staffErr) throw new Error('No se pudo crear el usuario staff: ' + staffErr.message);

  const { data: existingVehicle } = await supabase
    .from('vehicles')
    .select('id')
    .eq('title', 'DEMO Toyota Corolla 2023 (Concesionario Norte)')
    .maybeSingle();

  let vehicle = existingVehicle;
  if (!vehicle) {
    const { data: newVehicle, error: vehicleErr } = await supabase
      .from('vehicles')
      .insert([
        {
          title: 'DEMO Toyota Corolla 2023 (Concesionario Norte)',
          price: '18500',
          year: 2023,
          km: '12,000 KM',
          catalog: 'seminuevos',
          status: 'active',
          for_sale: true,
          for_import: false,
          concesionario_id: conc.id,
          description: 'Vehículo de demo creado por seed-demo-concesionario.ts para revisar el panel del concesionario.',
        },
      ])
      .select('id')
      .single();
    if (vehicleErr || !newVehicle) throw new Error('No se pudo crear el vehículo de demo: ' + vehicleErr?.message);
    vehicle = newVehicle;
  }

  console.log('\n=== Seed de demo listo ===\n');
  console.log(`Concesionario:        id=${conc.id} "DEMO Concesionario Norte"`);
  console.log(`Vehículo (suyo):       id=${vehicle.id} "DEMO Toyota Corolla 2023 (Concesionario Norte)"`);
  console.log(`\nLogin CONCESIONARIO (panel restringido):`);
  console.log(`  email:    ${CONCESIONARIO_EMAIL}`);
  console.log(`  password: ${CONCESIONARIO_PASSWORD}`);
  console.log(`\nLogin STAFF normal (panel completo, para comparar):`);
  console.log(`  email:    ${STAFF_EMAIL}`);
  console.log(`  password: ${STAFF_PASSWORD}`);
  console.log(`\nURL del panel: /sm-op`);
  console.log(`\nPara borrar todo esto después:`);
  console.log(`  DELETE FROM vehicles WHERE id = ${vehicle.id};`);
  console.log(`  DELETE FROM agency_users WHERE email IN ('${CONCESIONARIO_EMAIL}', '${STAFF_EMAIL}');`);
  console.log(`  DELETE FROM concesionarios WHERE id = ${conc.id};`);
}

main().catch((err) => {
  console.error('Error inesperado:', err);
  process.exit(1);
});
