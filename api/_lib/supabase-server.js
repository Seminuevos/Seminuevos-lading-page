/**
 * Supabase Server Client — SOLO PARA USO EN EL SERVIDOR
 * Usa la service_role key — NUNCA exponer al cliente/frontend
 */
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || 'https://hknprlgyuwzolgnkwsmx.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || 'sb_publishable_NXflNbXrjqQabsIGe0PHPQ_4CID6A9z';

export const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
        autoRefreshToken: false,
        persistSession: false,
        detectSessionInUrl: false
    }
});

/**
 * Devuelve un cliente de Supabase con permisos de servicio (bypassa RLS de forma segura en backend).
 */
export async function getAuthenticatedServerClient() {
    return supabase;
}

