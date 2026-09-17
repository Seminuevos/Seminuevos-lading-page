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
