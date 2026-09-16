/**
 * GET  /api/inquiries  → Lista consultas CRM (requiere auth)
 * POST /api/inquiries  → Crea consulta pública (formulario de contacto, sin auth)
 */
import { supabase } from '../_lib/supabase-server.js';
import { handleCors } from '../_middleware/cors.js';
import { requireAuth } from '../_middleware/auth.js';
import { sanitizeString, isValidEmail, checkRateLimit, getClientIP } from '../_middleware/validate.js';

export default async function handler(req, res) {
    if (handleCors(req, res)) return;

    // GET — listar consultas (requiere auth)
    if (req.method === 'GET') {
        const authUser = requireAuth(req, res);
        if (!authUser) return;

        try {
            const { data, error } = await supabase
                .from('inquiries')
                .select('*')
                .order('created_at', { ascending: false })
                .limit(200);

            if (error) {
                console.error('[GET /api/inquiries]', error);
                return res.status(500).json({ error: 'Error al obtener consultas' });
            }

            return res.status(200).json({ data });
        } catch (err) {
            return res.status(500).json({ error: 'Error interno del servidor' });
        }
    }

    // POST — nueva consulta pública (sin auth requerida, viene del formulario de contacto)
    if (req.method === 'POST') {
        const ip = getClientIP(req);

        // Rate limiting: máximo 3 consultas por minuto por IP (anti-spam)
        if (!checkRateLimit(`inquiry:${ip}`, 3, 60000)) {
            return res.status(429).json({ error: 'Demasiadas solicitudes. Por favor espera antes de enviar otra consulta.' });
        }

        const body = req.body || {};
        const name  = sanitizeString(body.name || body.full_name, 150);
        const email = sanitizeString(body.email, 254).toLowerCase();
        const phone = sanitizeString(body.phone, 30);
        const message = sanitizeString(body.message, 2000);
        const vehicle_id = body.vehicle_id ? sanitizeString(String(body.vehicle_id), 100) : null;
        const source = sanitizeString(body.source, 50) || 'web';

        if (!name || !message) {
            return res.status(400).json({ error: 'Nombre y mensaje son requeridos' });
        }

        if (email && !isValidEmail(email)) {
            return res.status(400).json({ error: 'Formato de correo inválido' });
        }

        try {
            const { data, error } = await supabase
                .from('inquiries')
                .insert([{
                    full_name: name,
                    email: email || null,
                    phone: phone || null,
                    message,
                    vehicle_id,
                    source,
                    ip_address: ip,
                    status: 'pending'
                }])
                .select()
                .single();

            if (error) {
                console.error('[POST /api/inquiries]', error);
                return res.status(500).json({ error: 'Error al enviar consulta' });
            }

            return res.status(201).json({ data, message: 'Consulta enviada correctamente' });
        } catch (err) {
            return res.status(500).json({ error: 'Error interno del servidor' });
        }
    }

    return res.status(405).json({ error: 'Método no permitido' });
}
