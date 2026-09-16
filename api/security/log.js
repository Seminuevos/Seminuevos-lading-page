/**
 * POST /api/security/log  → Registra un evento de seguridad
 * GET  /api/security/log  → Lista logs (requiere auth admin)
 */
import { supabase } from '../_lib/supabase-server.js';
import { handleCors } from '../_middleware/cors.js';
import { requireAuth, requireAdmin } from '../_middleware/auth.js';
import { sanitizeString, checkRateLimit, getClientIP } from '../_middleware/validate.js';

export default async function handler(req, res) {
    if (handleCors(req, res)) return;

    const ip = getClientIP(req);

    // GET — listar logs (solo admin)
    if (req.method === 'GET') {
        const authUser = requireAdmin(req, res);
        if (!authUser) return;

        try {
            const { data, error } = await supabase
                .from('security_logs')
                .select('*')
                .order('created_at', { ascending: false })
                .limit(500);

            if (error) return res.status(500).json({ error: 'Error al obtener logs' });
            return res.status(200).json({ data });
        } catch {
            return res.status(500).json({ error: 'Error interno del servidor' });
        }
    }

    // POST — registrar evento (requiere auth básica)
    if (req.method === 'POST') {
        const authUser = requireAuth(req, res);
        if (!authUser) return;

        // Rate limiting: máximo 30 logs por minuto por usuario
        if (!checkRateLimit(`seclog:${authUser.id}`, 30, 60000)) {
            return res.status(429).json({ error: 'Demasiados eventos de log' });
        }

        const body = req.body || {};

        const payload = {
            event_type: sanitizeString(body.event_type || body.type, 100),
            severity:   sanitizeString(body.severity || body.level, 20) || 'info',
            details:    sanitizeString(body.details || body.message, 1000),
            ip_address: ip,
            user_id:    authUser.id
        };

        if (!payload.event_type) {
            return res.status(400).json({ error: 'event_type es requerido' });
        }

        try {
            const { data, error } = await supabase
                .from('security_logs')
                .insert([payload])
                .select()
                .single();

            if (error) {
                console.error('[POST /api/security/log]', error);
                return res.status(500).json({ error: 'Error al registrar evento' });
            }

            return res.status(201).json({ data });
        } catch (err) {
            return res.status(500).json({ error: 'Error interno del servidor' });
        }
    }

    return res.status(405).json({ error: 'Método no permitido' });
}
