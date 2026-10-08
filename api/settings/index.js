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

    // GET — obtener configuración (site_settings)
    if (req.method === 'GET') {
        res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');

        const { key } = req.query;

        try {
            if (key) {
                const { data, error } = await supabase
                    .from('site_settings')
                    .select('key, value')
                    .eq('key', key)
                    .maybeSingle();

                if (error) {
                    console.error('[GET /api/settings?key]', error);
                    return res.status(500).json({ error: 'Error al obtener configuración' });
                }

                let val = data ? data.value : null;
                if (typeof val === 'string') {
                    try { val = JSON.parse(val); } catch(e) {}
                }
                return res.status(200).json({ key, value: val });
            }

            const { data, error } = await supabase
                .from('site_settings')
                .select('key, value');

            if (error) {
                console.error('[GET /api/settings]', error);
                return res.status(500).json({ error: 'Error al obtener configuración' });
            }

            const settingsMap = {};
            (data || []).forEach(row => {
                let v = row.value;
                if (typeof v === 'string') {
                    try { v = JSON.parse(v); } catch(e) {}
                }
                settingsMap[row.key] = v;
            });

            return res.status(200).json({ data: settingsMap });
        } catch (err) {
            return res.status(500).json({ error: 'Error interno del servidor' });
        }
    }

    // PUT — actualizar configuración (solo admin)
    if (req.method === 'PUT' || req.method === 'POST') {
        const authUser = requireAdmin(req, res);
        if (!authUser) return;

        const body = req.body || {};
        const rows = [];

        if (body.key && body.value !== undefined) {
            rows.push({
                key: String(body.key),
                value: typeof body.value === 'string' ? body.value : JSON.stringify(body.value),
                updated_at: new Date().toISOString()
            });
        } else {
            for (const [k, v] of Object.entries(body)) {
                rows.push({
                    key: String(k),
                    value: typeof v === 'string' ? v : JSON.stringify(v),
                    updated_at: new Date().toISOString()
                });
            }
        }

        if (rows.length === 0) {
            return res.status(400).json({ error: 'No se enviaron datos para actualizar' });
        }

        try {
            const { data, error } = await supabase
                .from('site_settings')
                .upsert(rows);

            if (error) {
                console.error('[PUT /api/settings]', error);
                return res.status(500).json({ error: 'Error al guardar en site_settings: ' + error.message });
            }

            return res.status(200).json({ success: true, message: 'Configuración guardada correctamente' });
        } catch (err) {
            return res.status(500).json({ error: 'Error interno del servidor: ' + err.message });
        }
    }

    return res.status(405).json({ error: 'Método no permitido' });
}
