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

