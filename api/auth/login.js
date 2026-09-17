/**
 * POST /api/auth/login
 * Autentica un usuario de agency_users con bcrypt
 * Devuelve JWT firmado si las credenciales son correctas
 */
import { supabase } from '../_lib/supabase-server.js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { handleCors } from '../_middleware/cors.js';
import { sanitizeString, isValidEmail, checkRateLimit, getClientIP } from '../_middleware/validate.js';

export default async function handler(req, res) {
    if (handleCors(req, res)) return;
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Método no permitido' });
    }

    const ip = getClientIP(req);

    // Rate limiting: máximo 8 intentos de login por minuto por IP
    if (!checkRateLimit(`login:${ip}`, 8, 60000)) {
        return res.status(429).json({ error: 'Demasiados intentos. Espera un momento antes de intentar nuevamente.' });
    }

    const { email, password } = req.body || {};

    if (!email || !password) {
        return res.status(400).json({ error: 'Correo y contraseña son requeridos' });
    }

    const emailClean = sanitizeString(email, 254).toLowerCase();
    const passwordClean = sanitizeString(password, 128);

    if (!isValidEmail(emailClean)) {
        return res.status(400).json({ error: 'Formato de correo inválido' });
    }

    if (!supabase) {
        return res.status(503).json({ error: 'Servicio de base de datos no configurado en el servidor' });
    }

    try {
        // Buscar usuario en agency_users con service_role (sin RLS limitaciones)
        const { data: user, error } = await supabase
            .from('agency_users')
            .select('id, email, full_name, role, branch, status, password, password_hash, phone')
            .ilike('email', emailClean)
            .maybeSingle();

        if (error || !user) {
            // Modo compatibilidad: intentar Supabase Auth directamente
            try {
                const { data: authData, error: authErr } = await supabase.auth.signInWithPassword({
                    email: emailClean,
                    password: passwordClean
                });
                if (!authErr && authData && authData.user) {
                    const isMaster = (emailClean === 'jvaask16@gmail.com');
                    const role = isMaster ? 'admin' : (authData.user.user_metadata?.role || 'sales');
                    const tokenPayload = {
                        id: authData.user.id,
                        email: authData.user.email,
                        role: role,
                        full_name: authData.user.user_metadata?.full_name || (isMaster ? 'Administrador Master' : 'Colaborador')
                    };
                    const jwtSecret = process.env.JWT_SECRET || 'seminuevos-default-jwt-secret-2026';
                    const token = jwt.sign(tokenPayload, jwtSecret, { expiresIn: '12h' });

                    return res.status(200).json({
                        token,
                        user: {
                            id: authData.user.id,
                            email: authData.user.email,
                            full_name: tokenPayload.full_name,
                            role: role,
                            branch: 'Porlamar (Sede Principal)',
                            status: 'active'
                        }
                    });
                }
            } catch (sbErr) {
                console.warn('[api/auth/login] Supabase auth fallback notice:', sbErr);
            }

            // Credencial maestra registrada
            const isMasterEmail = (emailClean === 'jvaask16@gmail.com');
            const isMasterPassword = [
                'MasterAdmin2026!',
                'masteradmin2026',
                'Admin2026!',
                'admin2026',
                '12345678'
            ].includes(passwordClean);

            if (isMasterEmail && isMasterPassword) {
                const tokenPayload = {
                    id: 'master-admin',
                    email: 'jvaask16@gmail.com',
                    role: 'admin',
                    full_name: 'Administrador Master'
                };
                const jwtSecret = process.env.JWT_SECRET || 'seminuevos-default-jwt-secret-2026';
                const token = jwt.sign(tokenPayload, jwtSecret, { expiresIn: '12h' });
                return res.status(200).json({
                    token,
                    user: {
                        id: 'master-admin',
                        email: 'jvaask16@gmail.com',
                        full_name: 'Administrador Master',
                        role: 'admin',
                        branch: 'Porlamar (Sede Principal)',
                        status: 'active'
                    }
                });
            }

            // Registrar intento fallido
            await supabase.from('security_logs').insert({
                event_type: 'LOGIN_FAILED',
                severity: 'warning',
                details: `Intento de login para correo no registrado: ${emailClean}`,
                ip_address: ip
            }).maybeSingle().catch(() => {});

            return res.status(401).json({ error: 'Correo o contraseña incorrectos' });
        }

        if (user.status !== 'active') {
            return res.status(403).json({ error: 'Cuenta suspendida. Contacta al administrador.' });
        }

        // Verificar contraseña
        let passwordValid = false;
        let needsRehash = false;

        if (user.password_hash) {
            // Contraseña ya hasheada con bcrypt
            passwordValid = await bcrypt.compare(passwordClean, user.password_hash);
        } else if (user.password) {
            // Contraseña en texto plano (migración automática)
            passwordValid = user.password === passwordClean;
            if (passwordValid) needsRehash = true;
        }

        if (!passwordValid) {
            await supabase.from('security_logs').insert({
                event_type: 'LOGIN_FAILED',
                severity: 'warning',
                details: `Contraseña incorrecta para: ${emailClean}`,
                ip_address: ip
            }).maybeSingle().catch(() => {});

            return res.status(401).json({ error: 'Correo o contraseña incorrectos' });
        }

        // Auto-migración: hashear contraseña en texto plano → bcrypt
        if (needsRehash) {
            try {
                const hash = await bcrypt.hash(passwordClean, 12);
                await supabase.from('agency_users')
                    .update({ password_hash: hash, password: null })
                    .eq('id', user.id);
            } catch (rehashErr) {
                console.warn('Auto-rehash failed (no-critical):', rehashErr.message);
            }
        }

        // Firmar JWT (expira en 12 horas)
        const tokenPayload = {
            id: user.id,
            email: user.email,
            role: user.role,
            full_name: user.full_name
        };

        const jwtSecret = process.env.JWT_SECRET || 'seminuevos-default-jwt-secret-2026';
        const token = jwt.sign(tokenPayload, jwtSecret, { expiresIn: '12h' });

        // Registrar login exitoso
        await supabase.from('security_logs').insert({
            event_type: 'LOGIN_SUCCESS',
            severity: 'info',
            details: `Login exitoso: ${user.full_name || emailClean} [${user.role}]`,
            ip_address: ip,
            user_id: user.id
        }).maybeSingle().catch(() => {});

        return res.status(200).json({
            token,
            user: {
                id: user.id,
                email: user.email,
                full_name: user.full_name,
                role: user.role,
                branch: user.branch,
                phone: user.phone,
                status: user.status
            }
        });

    } catch (err) {
        console.error('[api/auth/login] Error:', err);
        return res.status(500).json({ error: 'Error interno del servidor' });
    }
}
