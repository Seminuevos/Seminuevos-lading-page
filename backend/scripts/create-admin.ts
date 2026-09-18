/**
 * Bootstrap: crea (o promueve) el primer usuario administrador.
 * Necesario porque POST /api/users ya requiere un admin autenticado — este
 * script rompe ese círculo insertando directamente con la service_role key.
 *
 * Uso:
 *   SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... \
 *   npx ts-node scripts/create-admin.ts "admin@tudominio.com" "ContraseñaSegura123" "Nombre Completo"
 */
import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import * as bcrypt from 'bcryptjs';

async function main() {
  const [, , email, password, fullName] = process.argv;

  if (!email || !password || !fullName) {
    console.error('Uso: ts-node scripts/create-admin.ts <email> <password> <full_name>');
    process.exit(1);
  }
  if (password.length < 8) {
    console.error('La contraseña debe tener al menos 8 caracteres.');
    process.exit(1);
  }

  const url = process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    console.error('Faltan SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY en el entorno.');
    process.exit(1);
  }

  const supabase = createClient(url, serviceKey);
  const password_hash = await bcrypt.hash(password, 12);

  const { data, error } = await supabase
    .from('agency_users')
    .upsert(
      [
        {
          email: email.toLowerCase().trim(),
          full_name: fullName,
          password_hash,
          role: 'admin',
          status: 'active',
        },
      ],
      { onConflict: 'email' },
    )
    .select('id, email, role')
    .single();

  if (error) {
    console.error('Error al crear el administrador:', error.message);
    process.exit(1);
  }

  console.log('Administrador creado/actualizado:', data);
}

main();
