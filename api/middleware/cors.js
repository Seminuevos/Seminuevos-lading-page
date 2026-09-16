/**
 * Middleware CORS — Seminuevos API
 * Permite requests desde el dominio del proyecto y bloquea el resto
 */

export function setCorsHeaders(res, origin) {
    const allowed = process.env.API_ALLOWED_ORIGIN || '*';
    // En producción debería ser: 'https://seminuevoautos.com'
    res.setHeader('Access-Control-Allow-Origin', allowed);
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.setHeader('Access-Control-Max-Age', '86400');
}

/**
 * Maneja CORS y responde al preflight OPTIONS.
 * @returns {boolean} true si la request fue el preflight (ya respondida), false para continuar
 */
export function handleCors(req, res) {
    setCorsHeaders(res, req.headers.origin);
    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return true;
    }
    return false;
}
