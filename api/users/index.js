/**
 * GET  /api/users  → Lista agency_users (requiere auth, solo admin ve todos)
 * POST /api/users  → Crea un usuario nuevo (contraseña hasheada con bcrypt)
 */
import { supabase } from '../_lib/supabase-server.js';
import { handleCors } from '../_middleware/cors.js';
import { requireAuth } from '../_middleware/auth.js';
import { sanitizeString, isValidEmail, validateRequired } from '../_middleware/validate.js';
import bcrypt from 'bcryptjs';

export default async function handler(req, res) {
    if (handleCors(req, res)) return;

    if (!supabase) {
        return res.status(503).json({ error: 'Servicio de base de datos no configurado en el servidor' });
    }

    // GET — listar usuarios
    if (req.method === 'GET') {
        const authUser = requireAuth(req, res);
        if (!authUser) return;

        try {
            // 1. Intentar tabla agency_users si existiese
            try {
                let query = supabase
                    .from('agency_users')
                    .select('id, email, full_name, phone, role, branch, status, notes, created_at, updated_at')
                    .order('created_at', { ascending: false });

                if (authUser.role !== 'admin' && authUser.role !== 'super_admin') {
                    query = query.eq('id', authUser.id);
                }

                const { data, error } = await query;
                if (!error && data && data.length > 0) {
                    return res.status(200).json({ data });
                }
            } catch(e) {}

            // 2. Fallback: site_settings (agency_users_directory)
            const { data: setRow } = await supabase
                .from('site_settings')
                .select('value')
                .eq('key', 'agency_users_directory')
                .maybeSingle();

            if (setRow && setRow.value) {
                const list = typeof setRow.value === 'string' ? JSON.parse(setRow.value) : setRow.value;
                if (Array.isArray(list)) {
                    const safeList = list.map(({ password, password_hash, ...rest }) => rest);
                    const filtered = (authUser.role === 'admin' || authUser.role === 'super_admin')
                        ? safeList
                        : safeList.filter(u => u.id === authUser.id);
                    return res.status(200).json({ data: filtered });
                }
            }

            return res.status(200).json({ data: [] });

        } catch (err) {
            console.error('[GET /api/users] catch:', err);
            return res.status(500).json({ error: 'Error interno del servidor' });
        }
    }

    // POST — crear usuario
    if (req.method === 'POST') {
        const authUser = requireAuth(req, res);
        if (!authUser) return;

        // Solo admin puede crear usuarios
        if (authUser.role !== 'admin' && authUser.role !== 'super_admin') {
            return res.status(403).json({ error: 'Solo los administradores pueden crear usuarios' });
        }

        const body = req.body || {};

        if (!validateRequired(body, ['email', 'full_name', 'password'], res)) return;

        const email = sanitizeString(body.email, 254).toLowerCase();
        if (!isValidEmail(email)) {
            return res.status(400).json({ error: 'Formato de correo inválido' });
        }

        const password = sanitizeString(body.password, 128);
        if (password.length < 6) {
            return res.status(400).json({ error: 'La contraseña debe tener al menos 6 caracteres' });
        }

        try {
            // 1. Enlazar en Supabase Auth
            let authUserId = 'usr-' + Date.now();
            try {
                const { data: sbSign } = await supabase.auth.signUp({
                    email,
                    password,
                    options: {
                        data: {
                            full_name: sanitizeString(body.full_name, 150),
                            role: sanitizeString(body.role, 30) || 'sales',
                            branch: sanitizeString(body.branch, 100) || 'Porlamar (Sede Principal)',
                            phone: sanitizeString(body.phone, 30)
                        }
                    }
                });
                if (sbSign?.user?.id) {
                    authUserId = sbSign.user.id;
                }
            } catch(sbErr) {
                console.warn('[POST /api/users] Supabase Auth notice:', sbErr);
            }

            // 2. Guardar en site_settings agency_users_directory
            const { data: setRow } = await supabase
                .from('site_settings')
                .select('value')
                .eq('key', 'agency_users_directory')
                .maybeSingle();

            let currentList = [];
            if (setRow && setRow.value) {
                currentList = typeof setRow.value === 'string' ? JSON.parse(setRow.value) : setRow.value;
            }

            if (currentList.some(u => (u.email || '').toLowerCase() === email)) {
                return res.status(409).json({ error: 'Ya existe un usuario con este correo electrónico' });
            }

            const newRecord = {
                id: authUserId,
                email,
                full_name: sanitizeString(body.full_name, 150),
                phone: sanitizeString(body.phone, 30),
                role: sanitizeString(body.role, 30) || 'sales',
                branch: sanitizeString(body.branch, 100) || 'Porlamar (Sede Principal)',
                status: sanitizeString(body.status, 20) || 'active',
                notes: sanitizeString(body.notes, 500),
                password: password,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            };

            currentList.unshift(newRecord);

            await supabase
                .from('site_settings')
                .upsert({
                    key: 'agency_users_directory',
                    value: currentList
                });

            const { password: _p, ...safeUser } = newRecord;
            return res.status(201).json({ data: safeUser });

        } catch (err) {
            console.error('[POST /api/users] catch:', err);
            return res.status(500).json({ error: 'Error interno del servidor' });
        }
    }

    return res.status(405).json({ error: 'Método no permitido' });
}
