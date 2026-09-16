/**
 * GET    /api/users/[id]  → Obtiene un usuario por ID
 * PUT    /api/users/[id]  → Edita usuario (hashea nueva contraseña si se envía)
 * DELETE /api/users/[id]  → Elimina usuario
 */
import { supabase } from '../lib/supabase-server.js';
import { handleCors } from '../middleware/cors.js';
import { requireAuth } from '../middleware/auth.js';
import { sanitizeString, isValidEmail } from '../middleware/validate.js';
import bcrypt from 'bcryptjs';

const MASTER_ADMIN_EMAIL = 'jvaask16@gmail.com';

export default async function handler(req, res) {
    if (handleCors(req, res)) return;

    const { id } = req.query;
    if (!id) return res.status(400).json({ error: 'ID de usuario requerido' });

    const authUser = requireAuth(req, res);
    if (!authUser) return;

    // GET — obtener usuario
    if (req.method === 'GET') {
        // Solo admin o el propio usuario
        if (authUser.role !== 'admin' && authUser.role !== 'super_admin' && authUser.id !== id) {
            return res.status(403).json({ error: 'Acceso denegado' });
        }

        try {
            const { data, error } = await supabase
                .from('agency_users')
                .select('id, email, full_name, phone, role, branch, status, notes, created_at, updated_at')
                .eq('id', id)
                .maybeSingle();

            if (error || !data) {
                return res.status(404).json({ error: 'Usuario no encontrado' });
            }

            return res.status(200).json({ data });
        } catch (err) {
            return res.status(500).json({ error: 'Error interno del servidor' });
        }
    }

    // PUT — editar usuario
    if (req.method === 'PUT') {
        if (authUser.role !== 'admin' && authUser.role !== 'super_admin' && authUser.id !== id) {
            return res.status(403).json({ error: 'Acceso denegado' });
        }

        const body = req.body || {};
        const payload = { updated_at: new Date().toISOString() };

        if (body.full_name !== undefined) payload.full_name = sanitizeString(body.full_name, 150);
        if (body.phone !== undefined)     payload.phone     = sanitizeString(body.phone, 30);
        if (body.branch !== undefined)    payload.branch    = sanitizeString(body.branch, 100);
        if (body.notes !== undefined)     payload.notes     = sanitizeString(body.notes, 500);

        // Solo admin puede cambiar rol y status
        if (authUser.role === 'admin' || authUser.role === 'super_admin') {
            if (body.role !== undefined)   payload.role   = sanitizeString(body.role, 30);
            if (body.status !== undefined) payload.status = sanitizeString(body.status, 20);
            if (body.email !== undefined) {
                const newEmail = sanitizeString(body.email, 254).toLowerCase();
                if (!isValidEmail(newEmail)) {
                    return res.status(400).json({ error: 'Formato de correo inválido' });
                }
                payload.email = newEmail;
            }
        }

        // Si viene nueva contraseña, hashearla
        if (body.password && body.password.length >= 6) {
            const newPwd = sanitizeString(body.password, 128);
            payload.password_hash = await bcrypt.hash(newPwd, 12);
            payload.password = null;
        }

        try {
            const { data, error } = await supabase
                .from('agency_users')
                .update(payload)
                .eq('id', id)
                .select('id, email, full_name, phone, role, branch, status, notes, created_at, updated_at')
                .maybeSingle();

            if (error) {
                console.error('[PUT /api/users/:id]', error);
                return res.status(500).json({ error: 'Error al actualizar usuario' });
            }

            if (!data) return res.status(404).json({ error: 'Usuario no encontrado' });

            return res.status(200).json({ data });
        } catch (err) {
            console.error('[PUT /api/users/:id] catch:', err);
            return res.status(500).json({ error: 'Error interno del servidor' });
        }
    }

    // DELETE — eliminar usuario
    if (req.method === 'DELETE') {
        if (authUser.role !== 'admin' && authUser.role !== 'super_admin') {
            return res.status(403).json({ error: 'Solo los administradores pueden eliminar usuarios' });
        }

        try {
            // Proteger la cuenta del administrador master
            const { data: target } = await supabase
                .from('agency_users')
                .select('email')
                .eq('id', id)
                .maybeSingle();

            if (!target) return res.status(404).json({ error: 'Usuario no encontrado' });

            if (target.email === MASTER_ADMIN_EMAIL) {
                return res.status(403).json({ error: 'No es posible eliminar al Administrador Master' });
            }

            const { error } = await supabase.from('agency_users').delete().eq('id', id);

            if (error) {
                console.error('[DELETE /api/users/:id]', error);
                return res.status(500).json({ error: 'Error al eliminar usuario' });
            }

            return res.status(200).json({ message: 'Usuario eliminado correctamente' });
        } catch (err) {
            console.error('[DELETE /api/users/:id] catch:', err);
            return res.status(500).json({ error: 'Error interno del servidor' });
        }
    }

    return res.status(405).json({ error: 'Método no permitido' });
}
