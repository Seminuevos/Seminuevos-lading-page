/**
 * GET    /api/users/[id]  → Obtiene un usuario por ID
 * PUT    /api/users/[id]  → Edita usuario (hashea nueva contraseña si se envía)
 * DELETE /api/users/[id]  → Elimina usuario
 */
import { supabase } from '../_lib/supabase-server.js';
import { handleCors } from '../_middleware/cors.js';
import { requireAuth } from '../_middleware/auth.js';
import { sanitizeString, isValidEmail } from '../_middleware/validate.js';
import bcrypt from 'bcryptjs';

const MASTER_ADMIN_EMAIL = 'jvaask16@gmail.com';

export default async function handler(req, res) {
    if (handleCors(req, res)) return;

    if (!supabase) {
        return res.status(503).json({ error: 'Servicio de base de datos no configurado en el servidor' });
    }

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
        const body = req.body || {};
        const ADMIN_EMAILS = ['jvaask16@gmail.com', 'jvicente@seminuevos.com'];
        const isAdmin = authUser.role === 'admin' || 
                        authUser.role === 'super_admin' || 
                        ADMIN_EMAILS.includes((authUser.email || '').toLowerCase().trim());

        const isSelf = (authUser.id === id) || 
                       (body.email && authUser.email?.toLowerCase().trim() === body.email?.toLowerCase().trim()) ||
                       (authUser.email?.toLowerCase().trim() === String(id).toLowerCase().trim());

        if (!isAdmin && !isSelf) {
            return res.status(403).json({ error: 'Acceso denegado' });
        }

        const payload = { updated_at: new Date().toISOString() };

        if (body.full_name !== undefined) payload.full_name = sanitizeString(body.full_name, 150);
        if (body.phone !== undefined)     payload.phone     = sanitizeString(body.phone, 30);
        if (body.branch !== undefined)    payload.branch    = sanitizeString(body.branch, 100);
        if (body.notes !== undefined)     payload.notes     = sanitizeString(body.notes, 500);

        // Solo admin puede cambiar rol y status
        if (isAdmin) {
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

        // Si viene nueva contraseña
        let newRawPassword = null;
        if (body.password && body.password.length >= 6) {
            newRawPassword = sanitizeString(body.password, 128);
            payload.password_hash = await bcrypt.hash(newRawPassword, 12);
            payload.password = newRawPassword;
        }

        try {
            // 1. Obtener y actualizar en site_settings agency_users_directory
            const { data: setRow } = await supabase
                .from('site_settings')
                .select('value')
                .eq('key', 'agency_users_directory')
                .maybeSingle();

            let list = [];
            if (setRow && setRow.value) {
                list = typeof setRow.value === 'string' ? JSON.parse(setRow.value) : setRow.value;
            }
            if (!Array.isArray(list)) list = [];

            const targetEmail = (body.email || '').toLowerCase().trim();
            let idx = list.findIndex(u => String(u.id) === String(id));
            if (idx === -1 && targetEmail) {
                idx = list.findIndex(u => (u.email || '').toLowerCase().trim() === targetEmail);
            }

            let targetUser = null;
            if (idx !== -1) {
                const updated = { ...list[idx], ...payload };
                if (newRawPassword) {
                    updated.password = newRawPassword;
                }
                list[idx] = updated;
                targetUser = updated;
            } else if (isAdmin) {
                targetUser = {
                    id: id,
                    email: targetEmail || (authUser.email || ''),
                    full_name: payload.full_name || 'Usuario',
                    role: payload.role || 'sales',
                    branch: payload.branch || 'Porlamar (Sede Principal)',
                    status: payload.status || 'active',
                    ...payload
                };
                if (newRawPassword) targetUser.password = newRawPassword;
                list.unshift(targetUser);
            } else {
                return res.status(404).json({ error: 'Usuario no encontrado' });
            }

            // 1. Guardar en site_settings
            let { error: updateErr } = await supabase
                .from('site_settings')
                .update({
                    value: list,
                    updated_at: new Date().toISOString()
                })
                .eq('key', 'agency_users_directory');

            if (updateErr) {
                console.warn('[api/users/:id] update error, attempting upsert:', updateErr.message);
                const { error: upsertErr } = await supabase
                    .from('site_settings')
                    .upsert({
                        key: 'agency_users_directory',
                        value: list,
                        updated_at: new Date().toISOString()
                    }, { onConflict: 'key' });

                if (upsertErr) {
                    console.error('[api/users/:id] upsert failed:', upsertErr);
                    return res.status(500).json({ error: 'Error al persistir cambios en la base de datos', details: upsertErr.message });
                }
            }

            // 2. Sincronizar en Supabase Auth si se proporcionó nueva contraseña
            if (newRawPassword) {
                const userEmail = (targetUser.email || targetEmail || '').toLowerCase().trim();
                try {
                    if (supabase.auth && supabase.auth.admin) {
                        try {
                            await supabase.auth.admin.updateUserById(id, { password: newRawPassword });
                        } catch (e) {
                            if (userEmail) {
                                const { data: authUsersRes } = await supabase.auth.admin.listUsers();
                                const authMatch = authUsersRes?.users?.find(u => (u.email || '').toLowerCase() === userEmail);
                                if (authMatch) {
                                    await supabase.auth.admin.updateUserById(authMatch.id, { password: newRawPassword });
                                } else {
                                    await supabase.auth.admin.createUser({
                                        email: userEmail,
                                        password: newRawPassword,
                                        email_confirm: true,
                                        user_metadata: {
                                            full_name: targetUser.full_name,
                                            role: targetUser.role
                                        }
                                    });
                                }
                            }
                        }
                    }
                } catch (authErr) {
                    console.warn('[api/users/:id] Supabase Auth sync notice:', authErr);
                }
            }

            const { password: _p, password_hash: _ph, ...safeData } = targetUser;
            return res.status(200).json({ data: safeData });

        } catch (err) {
            console.error('[PUT /api/users/:id] catch:', err);
            return res.status(500).json({ error: 'Error interno del servidor' });
        }
    }

    // DELETE — eliminar usuario
    if (req.method === 'DELETE') {
        const ADMIN_EMAILS = ['jvaask16@gmail.com', 'jvicente@seminuevos.com'];
        const isAdmin = authUser.role === 'admin' || 
                        authUser.role === 'super_admin' || 
                        ADMIN_EMAILS.includes((authUser.email || '').toLowerCase().trim());

        if (!isAdmin) {
            return res.status(403).json({ error: 'Solo los administradores pueden eliminar usuarios' });
        }

        try {
            const { data: setRow } = await supabase
                .from('site_settings')
                .select('value')
                .eq('key', 'agency_users_directory')
                .maybeSingle();

            if (setRow && setRow.value) {
                let list = typeof setRow.value === 'string' ? JSON.parse(setRow.value) : setRow.value;
                if (Array.isArray(list)) {
                    const target = list.find(u => String(u.id) === String(id));
                    if (!target) return res.status(404).json({ error: 'Usuario no encontrado' });

                    if (ADMIN_EMAILS.includes((target.email || '').toLowerCase().trim())) {
                        return res.status(403).json({ error: 'No es posible eliminar a un Administrador Principal' });
                    }

                    const filtered = list.filter(u => String(u.id) !== String(id));
                    await supabase
                        .from('site_settings')
                        .upsert({
                            key: 'agency_users_directory',
                            value: filtered
                        });

                    return res.status(200).json({ message: 'Usuario eliminado correctamente' });
                }
            }

            return res.status(404).json({ error: 'Usuario no encontrado' });
        } catch (err) {
            console.error('[DELETE /api/users/:id] catch:', err);
            return res.status(500).json({ error: 'Error interno del servidor' });
        }
    }

    return res.status(405).json({ error: 'Método no permitido' });
}
