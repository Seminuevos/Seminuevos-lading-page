/**
 * Helpers de Validación y Sanitización — Seminuevos API
 * Validación manual sin dependencias externas (compatible con Vercel Edge/Serverless)
 */

/**
 * Sanitiza un string: recorta, limita longitud y elimina caracteres peligrosos
 */
export function sanitizeString(value, maxLength = 500) {
    if (value === null || value === undefined) return '';
    return String(value).trim().slice(0, maxLength);
}

/**
 * Valida formato de email básico
 */
export function isValidEmail(email) {
    return typeof email === 'string' &&
        /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) &&
        email.length <= 254;
}

/**
 * Valida que un valor sea un número finito
 */
export function isValidNumber(value) {
    return !isNaN(parseFloat(value)) && isFinite(value);
}

/**
 * Valida los campos requeridos del body. Responde 400 si falta alguno.
 * @param {object} body - El body de la request
 * @param {string[]} required - Lista de campos requeridos
 * @param {object} res - Response object
 * @returns {boolean} true si válido, false si ya respondió con error
 */
export function validateRequired(body, required, res) {
    const missing = required.filter(f => !body[f] && body[f] !== 0);
    if (missing.length > 0) {
        res.status(400).json({
            error: `Campos requeridos faltantes: ${missing.join(', ')}`
        });
        return false;
    }
    return true;
}

/**
 * Obtiene el IP real del cliente considerando proxies de Vercel
 */
export function getClientIP(req) {
    return (req.headers['x-forwarded-for'] || '').split(',')[0].trim() ||
        req.socket?.remoteAddress ||
        'unknown';
}

/**
 * Rate limiting simple en memoria (para serverless — se reinicia con cada deploy)
 * Para producción real usar Upstash Redis o similar
 */
const _rateLimitMap = new Map();
export function checkRateLimit(key, maxRequests = 10, windowMs = 60000) {
    const now = Date.now();
    const entry = _rateLimitMap.get(key) || { count: 0, start: now };

    if (now - entry.start > windowMs) {
        // Reset ventana
        _rateLimitMap.set(key, { count: 1, start: now });
        return true;
    }

    entry.count++;
    _rateLimitMap.set(key, entry);

    if (entry.count > maxRequests) {
        return false; // rate limit exceeded
    }
    return true;
}
