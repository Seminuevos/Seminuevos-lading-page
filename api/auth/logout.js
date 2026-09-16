/**
 * POST /api/auth/logout
 * Logout del lado del servidor — registra el evento en security_logs
 * (El token se invalida del lado del cliente borrando el localStorage)
 */
import { handleCors } from '../middleware/cors.js';
import { verifyToken } from '../middleware/auth.js';
import { supabase } from '../lib/supabase-server.js';
import { getClientIP } from '../middleware/validate.js';

export default async function handler(req, res) {
    if (handleCors(req, res)) return;
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Método no permitido' });
    }

    const user = verifyToken(req);
    const ip = getClientIP(req);

    // Registrar el logout aunque el token no sea válido (sesión ya expirada)
    if (user) {
        await supabase.from('security_logs').insert({
            event_type: 'LOGOUT',
            severity: 'info',
            details: `Logout: ${user.full_name || user.email} [${user.role}]`,
            ip_address: ip,
            user_id: user.id
        }).maybeSingle().catch(() => {});
    }

    return res.status(200).json({ message: 'Sesión cerrada correctamente' });
}
