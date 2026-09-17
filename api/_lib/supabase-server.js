/**
 * Supabase Server Client — SOLO PARA USO EN EL SERVIDOR
 * Usa la service_role key — NUNCA exponer al cliente/frontend
 */
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || 'https://gfvmugsbizmvlziljxir.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || 'sb_publishable_g0Iw9r4zRCBadMPtiF5kNA_x8_n4p8v';

export const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
        autoRefreshToken: false,
        persistSession: false,
        detectSessionInUrl: false
    }
});

let _cachedAuthClient = null;

/**
 * Devuelve un cliente de Supabase con permisos autenticados.
 * Si existe SUPABASE_SERVICE_ROLE_KEY, usa el cliente directo.
 * Si no, autentica la sesión en Supabase Auth con credenciales maestras
 * para tener permisos de lectura/escritura en tablas con RLS (TO authenticated).
 */
export async function getAuthenticatedServerClient() {
    if (process.env.SUPABASE_SERVICE_ROLE_KEY) {
        return supabase;
    }
    if (_cachedAuthClient) {
        return _cachedAuthClient;
    }
    try {
        const { data, error } = await supabase.auth.signInWithPassword({
            email: 'jvaask16@gmail.com',
            password: 'Jvaask2006..'
        });
        if (!error && data?.session?.access_token) {
            _cachedAuthClient = createClient(supabaseUrl, supabaseServiceKey, {
                global: {
                    headers: {
                        Authorization: `Bearer ${data.session.access_token}`
                    }
                }
            });
            return _cachedAuthClient;
        }
    } catch (err) {
        console.warn('[supabase-server] Session init notice:', err);
    }
    return supabase;
}

