/**
 * Supabase Server Client — SOLO PARA USO EN EL SERVIDOR
 * Usa la service_role key — NUNCA exponer al cliente/frontend
 */
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const isConfigured = Boolean(supabaseUrl && supabaseServiceKey);

if (!isConfigured) {
    console.warn('[supabase-server] Variables de entorno SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY no configuradas en Vercel.');
}

export const supabase = isConfigured
    ? createClient(supabaseUrl, supabaseServiceKey, {
        auth: {
            autoRefreshToken: false,
            persistSession: false,
            detectSessionInUrl: false
        }
    })
    : null;

