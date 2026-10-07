/**
 * apiFetch — Helper para llamar a la API interna /api/*
 * =====================================================================
 * El frontend NUNCA tiene credenciales de Supabase (ni URL, ni anon key):
 * toda lectura y escritura pasa por el backend, que es el único que habla
 * con Supabase (con la service_role key, solo en el servidor).
 */

function apiUrl(path) {
    const base = (typeof window !== 'undefined' && window.API_BASE_URL) || '';
    if (/^https?:\/\//i.test(path)) return path;
    return base ? `${base.replace(/\/$/, '')}${path}` : path;
}

function apiAuthHeader() {
    const token = sessionStorage.getItem('sn_jwt_token') || localStorage.getItem('sn_jwt_token');
    return token ? { 'Authorization': `Bearer ${token}` } : {};
}

async function apiFetch(path, options = {}) {
    const token = sessionStorage.getItem('sn_jwt_token') || localStorage.getItem('sn_jwt_token');

    const headers = {
        'Content-Type': 'application/json',
        ...(options.headers || {})
    };

    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }

    let body = options.body;
    if (body && typeof body === 'object') {
        body = JSON.stringify(body);
    }

    try {
        const response = await fetch(apiUrl(path), {
            ...options,
            headers,
            body
        });

        let data = null;
        const contentType = response.headers.get('content-type') || '';
        if (contentType.includes('application/json')) {
            data = await response.json();
        } else {
            data = await response.text();
        }

        if (!response.ok) {
            return {
                ok: false,
                status: response.status,
                data: null,
                error: (typeof data === 'object' && data?.error) ? data.error : 'Error en la solicitud'
            };
        }

        return { ok: true, status: response.status, data, error: null };

    } catch (err) {
        console.error('[apiFetch] Error de red:', err);
        return { ok: false, status: 0, data: null, error: 'Error de conexión con el servidor' };
    }
}

/** Guarda la sesión temporalmente */
function _saveSession(token, user) {
    try {
        if (token) sessionStorage.setItem('sn_jwt_token', token);
        if (user) sessionStorage.setItem('sn_admin_user', JSON.stringify(user));
        if (user?.role) localStorage.setItem('sn_current_role', user.role);
    } catch(e) {}
}

/** Borra la sesión */
function _clearSession() {
    try {
        localStorage.removeItem('sn_jwt_token');
        localStorage.removeItem('sn_admin_user');
        localStorage.removeItem('sn_admin_logged_in');
        localStorage.removeItem('sn_current_role');
        sessionStorage.clear();
    } catch(e) {}
}

function _getSessionUser() {
    return null;
}
