/**
 * GET /api/settings  → Obtiene configuración de la agencia
 * PUT /api/settings  → Actualiza configuración (requiere auth admin)
 */
import { supabase } from '../_lib/supabase-server.js';
import { handleCors } from '../_middleware/cors.js';
import { requireAuth, requireAdmin } from '../_middleware/auth.js';
import { sanitizeString } from '../_middleware/validate.js';

export default async function handler(req, res) {
    if (handleCors(req, res)) return;

    // GET — obtener settings (requiere auth básica)
    if (req.method === 'GET') {
        const authUser = requireAuth(req, res);
        if (!authUser) return;

        try {
            const { data, error } = await supabase
                .from('settings')
                .select('*')
                .order('created_at', { ascending: false })
                .limit(1)
                .maybeSingle();

            if (error) {
                console.error('[GET /api/settings]', error);
                return res.status(500).json({ error: 'Error al obtener configuración' });
            }

            return res.status(200).json({ data: data || {} });
        } catch (err) {
            return res.status(500).json({ error: 'Error interno del servidor' });
        }
    }

    // PUT — actualizar settings (solo admin)
    if (req.method === 'PUT') {
        const authUser = requireAdmin(req, res);
        if (!authUser) return;

        const body = req.body || {};

        // Sanitizar todos los campos de configuración
        const payload = {};
        const allowedFields = [
            'agency_name', 'whatsapp_number', 'whatsapp_number2',
            'email_primary', 'email_secondary', 'address',
            'business_hours', 'instagram_url', 'facebook_url',
            'tiktok_url', 'logo_url', 'primary_color',
            'financing_enabled', 'max_financing_months', 'min_initial_payment_pct'
        ];

        for (const field of allowedFields) {
            if (body[field] !== undefined) {
                payload[field] = typeof body[field] === 'boolean'
                    ? body[field]
                    : sanitizeString(String(body[field]), 500);
            }
        }

        payload.updated_at = new Date().toISOString();

        try {
            // Upsert (insert si no existe, update si sí)
            const { data, error } = await supabase
                .from('settings')
                .upsert([payload])
                .select()
                .single();

            if (error) {
                console.error('[PUT /api/settings]', error);
                return res.status(500).json({ error: 'Error al guardar configuración' });
            }

            return res.status(200).json({ data });
        } catch (err) {
            return res.status(500).json({ error: 'Error interno del servidor' });
        }
    }

    return res.status(405).json({ error: 'Método no permitido' });
}
