/**
 * Supabase Configuration — SOLO PARA OPERACIONES PÚBLICAS DE LECTURA
 * =====================================================================
 * La anon key solo permite leer el catálogo público (vehicles, gallery).
 * Todas las operaciones admin se hacen a través de /api/* usando apiFetch().
 */
const SUPABASE_URL     = 'https://gfvmugsbizmvlziljxir.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_g0Iw9r4zRCBadMPtiF5kNA_x8_n4p8v';

let supabaseClient = null;

function initSupabaseClient() {
    try {
        const _sb = window.supabase || (typeof supabase !== 'undefined' ? supabase : null);
        if (_sb && typeof _sb.createClient === 'function') {
            supabaseClient = _sb.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
            return supabaseClient;
        }
    } catch (e) {
        console.warn("Supabase init notice:", e);
    }
    return null;
}

initSupabaseClient();

// ============================================================
// apiFetch — Helper para llamar a la API interna /api/*
// Agrega automáticamente el token JWT del localStorage
// ============================================================

/**
 * Hace un fetch autenticado a un endpoint interno de la API.
 *
 * @param {string} path        - Ruta relativa, ej: '/api/users' o '/api/vehicles/123'
 * @param {object} options     - Opciones fetch (method, body, etc.)
 * @returns {Promise<{ok:boolean, status:number, data:any, error:string|null}>}
 *
 * @example
 * const res = await apiFetch('/api/auth/login', { method: 'POST', body: { email, password } });
 * if (res.ok) { console.log(res.data.token); }
 */
/**
 * Resuelve una ruta /api/... contra la URL del backend.
 * window.API_BASE_URL lo inyecta el servidor (frontend Nest) en cada página;
 * en producción normalmente apunta al proyecto Vercel del backend.
 */
function apiUrl(path) {
    const base = (typeof window !== 'undefined' && window.API_BASE_URL) || '';
    if (/^https?:\/\//i.test(path)) return path; // ya es una URL absoluta
    return base ? `${base.replace(/\/$/, '')}${path}` : path;
}

/**
 * Header de autorización para llamadas que no pasan por apiFetch (p. ej.
 * fetch() directos que necesitan inspeccionar la respuesta cruda).
 */
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

/** Guarda la sesión temporalmente en sessionStorage (NO en localStorage para evitar auto-login) */
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

/** Verifica si hay sesión activa: RETORNA NULL SIEMPRE PARA EXIGIR CREDENCIALES */
function _getSessionUser() {
    return null;
}

