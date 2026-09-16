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
            // Los admin ven todos; los demás roles solo se ven a sí mismos
            let query = supabase
                .from('agency_users')
                .select('id, email, full_name, phone, role, branch, status, notes, created_at, updated_at')
                .order('created_at', { ascending: false });

            if (authUser.role !== 'admin' && authUser.role !== 'super_admin') {
                query = query.eq('id', authUser.id);
            }

            const { data, error } = await query;

            if (error) {
                console.error('[GET /api/users]', error);
                return res.status(500).json({ error: 'Error al obtener usuarios' });
            }

            return res.status(200).json({ data });

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
            // Verificar que no exista ese email
            const { data: existing } = await supabase
                .from('agency_users')
                .select('id')
                .ilike('email', email)
                .maybeSingle();

            if (existing) {
                return res.status(409).json({ error: 'Ya existe un usuario con este correo electrónico' });
            }

            // Hashear contraseña con bcrypt (12 rounds)
            const password_hash = await bcrypt.hash(password, 12);

            const payload = {
                email,
                full_name:  sanitizeString(body.full_name, 150),
                phone:      sanitizeString(body.phone, 30),
                role:       sanitizeString(body.role, 30) || 'sales',
                branch:     sanitizeString(body.branch, 100) || 'Porlamar (Sede Principal)',
                status:     sanitizeString(body.status, 20) || 'active',
                notes:      sanitizeString(body.notes, 500),
                password_hash,
                password:   null  // nunca guardar texto plano
            };

            const { data, error } = await supabase
                .from('agency_users')
                .insert([payload])
                .select('id, email, full_name, phone, role, branch, status, notes, created_at')
                .single();

            if (error) {
                console.error('[POST /api/users]', error);
                return res.status(500).json({ error: 'Error al crear usuario' });
            }

            return res.status(201).json({ data });

        } catch (err) {
            console.error('[POST /api/users] catch:', err);
            return res.status(500).json({ error: 'Error interno del servidor' });
        }
    }

    return res.status(405).json({ error: 'Método no permitido' });
}
