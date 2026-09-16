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
async function apiFetch(path, options = {}) {
    const token = localStorage.getItem('sn_jwt_token');

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
        const response = await fetch(path, {
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
            // Si la respuesta es 401, la sesión expiró — limpiar y redirigir al login
            if (response.status === 401) {
                _clearSession();
                window.location.href = '/acceso-personal';
                return { ok: false, status: 401, data: null, error: 'Sesión expirada. Por favor inicia sesión nuevamente.' };
            }
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

/** Guarda la sesión JWT en localStorage */
function _saveSession(token, user) {
    localStorage.setItem('sn_jwt_token', token);
    localStorage.setItem('sn_admin_user', JSON.stringify(user));
    localStorage.setItem('sn_admin_logged_in', 'true');
    if (user?.role) localStorage.setItem('sn_current_role', user.role);
}

/** Borra la sesión JWT del localStorage */
function _clearSession() {
    localStorage.removeItem('sn_jwt_token');
    localStorage.removeItem('sn_admin_user');
    localStorage.removeItem('sn_admin_logged_in');
    localStorage.removeItem('sn_current_role');
}

/** Verifica si hay sesión activa (decodifica el JWT sin verificar firma) */
function _getSessionUser() {
    const token = localStorage.getItem('sn_jwt_token');
    if (!token) return null;

    try {
        // Decodificar payload del JWT (sin verificar firma, eso lo hace el servidor)
        const parts = token.split('.');
        if (parts.length !== 3) return null;
        const payload = JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')));

        // Verificar que no haya expirado
        if (payload.exp && payload.exp * 1000 < Date.now()) {
            _clearSession();
            return null;
        }

        return payload;
    } catch {
        return null;
    }
}
