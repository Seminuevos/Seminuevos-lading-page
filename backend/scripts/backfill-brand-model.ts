/**
 * Completa `brand`/`model` para el inventario existente, infiriéndolos del
 * `title` (ej. "Toyota Corolla Cross LE 4x4 AWD 2022" → brand="Toyota",
 * model="Corolla Cross LE 4x4 AWD"). Es un best-effort: si el título no
 * contiene ninguna marca conocida, deja esa fila sin tocar para que se
 * complete a mano desde el panel (Editar Vehículo → Marca/Modelo).
 *
 * Solo toca filas donde brand o model todavía están vacíos — seguro de
 * re-correr, no pisa datos ya cargados a mano.
 *
 * Uso:
 *   SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... npx ts-node scripts/backfill-brand-model.ts
 *   npx ts-node scripts/backfill-brand-model.ts --dry-run   # solo muestra qué haría, no escribe
 */
import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

// Misma lista que usan los selects de marca del catálogo/panel — mantener en
// sync con frontend/views/catalogo.hbs y frontend/views/sm-op.hbs.
const KNOWN_BRANDS = [
  'Toyota',
  'Lexus',
  'Honda',
  'Acura',
  'Nissan',
  'Infiniti',
  'Jeep',
  'Dodge',
  'RAM',
  'Chrysler',
  'Hyundai',
  'Kia',
  'Ford',
  'Suzuki',
];

function inferBrandAndModel(title: string): { brand: string | null; model: string | null } {
  if (!title) return { brand: null, model: null };

  for (const brand of KNOWN_BRANDS) {
    const re = new RegExp(`\\b${brand}\\b`, 'i');
    const match = title.match(re);
    if (!match) continue;

    const afterBrand = title.slice(match.index! + match[0].length);
    // Modelo = todo hasta el primer año de 4 dígitos (1900-2099) o el final del título.
    const yearMatch = afterBrand.match(/\b(19|20)\d{2}\b/);
    const modelRaw = yearMatch ? afterBrand.slice(0, yearMatch.index) : afterBrand;
    const model = modelRaw.replace(/^[\s\-–—]+|[\s\-–—]+$/g, '').trim() || null;

    return { brand, model };
  }

  return { brand: null, model: null };
}

async function main() {
  const dryRun = process.argv.includes('--dry-run');

  const url = process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    console.error('Faltan SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY en el entorno.');
    process.exit(1);
  }
  const supabase = createClient(url, serviceKey);

  const { data: vehicles, error } = await supabase
    .from('vehicles')
    .select('id, title, brand, model')
    .or('brand.is.null,model.is.null');

  if (error) {
    console.error('Error al consultar vehicles:', error.message);
    process.exit(1);
  }

  if (!vehicles || vehicles.length === 0) {
    console.log('Nada que completar — todos los vehículos ya tienen brand/model.');
    return;
  }

  let updated = 0;
  let skipped = 0;

  for (const v of vehicles) {
    const { brand, model } = inferBrandAndModel(v.title || '');
    if (!brand) {
      skipped++;
      console.log(`  [sin marca reconocida] #${v.id} "${v.title}" — completar a mano`);
      continue;
    }

    console.log(`  #${v.id} "${v.title}" → brand="${brand}" model="${model}"`);
    if (!dryRun) {
      const { error: updateError } = await supabase
        .from('vehicles')
        .update({ brand: v.brand || brand, model: v.model || model })
        .eq('id', v.id);
      if (updateError) {
        console.error(`    Error al actualizar #${v.id}:`, updateError.message);
        continue;
      }
    }
    updated++;
  }

  console.log(
    `\n${dryRun ? '[DRY RUN] ' : ''}Completados: ${updated}. Sin marca reconocida (a mano): ${skipped}.`,
  );
}

main();
