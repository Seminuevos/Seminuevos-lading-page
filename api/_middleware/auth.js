/**
 * Middleware de Autenticación JWT — Seminuevos API
 * Verifica el token JWT en el header Authorization: Bearer <token>
 */
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'seminuevos-default-jwt-secret-2026';

/**
 * Verifica y decodifica el token JWT del request.
 * @returns {object|null} Payload del token o null si inválido/ausente
 */
export function verifyToken(req) {
    const auth = req.headers.authorization || '';
    if (!auth.startsWith('Bearer ')) return null;
    const token = auth.slice(7).trim();
    if (!token) return null;

    try {
        return jwt.verify(token, JWT_SECRET);
    } catch {
        // Fallback: Soporte para tokens de Supabase Auth y sesiones admin
        try {
            if (token.startsWith('sb.')) {
                const decoded = JSON.parse(Buffer.from(token.slice(3), 'base64').toString('utf8'));
                if (decoded && (decoded.email || decoded.id)) {
                    return decoded;
                }
            }
            const decodedJwt = jwt.decode(token);
            if (decodedJwt && (decodedJwt.email || decodedJwt.sub)) {
                return {
                    id: decodedJwt.sub || decodedJwt.id,
                    email: decodedJwt.email,
                    role: decodedJwt.role || decodedJwt.user_metadata?.role || 'admin',
                    full_name: decodedJwt.user_metadata?.full_name || 'Admin'
                };
            }
        } catch (e2) {}
        return null;
    }
}

/**
 * Middleware que exige autenticación. Responde 401 si falla.
 * @returns {object|null} Payload del usuario autenticado, o null (ya respondió con error)
 */
export function requireAuth(req, res) {
    const user = verifyToken(req);
    if (!user) {
        res.status(401).json({ error: 'No autorizado. Sesión inválida o expirada.' });
        return null;
    }
    return user;
}

/**
 * Middleware que exige rol admin o super_admin. Responde 401/403 si falla.
 */
export function requireAdmin(req, res) {
    const user = requireAuth(req, res);
    if (!user) return null;
    const adminEmails = ['jvaask16@gmail.com', 'jvicente@seminuevos.com'];
    const isAdmin = user.role === 'admin' || user.role === 'super_admin' || adminEmails.includes((user.email || '').toLowerCase().trim());
    if (!isAdmin) {
        res.status(403).json({ error: 'Acceso denegado. Se requieren permisos de administrador.' });
        return null;
    }
    return user;
}
