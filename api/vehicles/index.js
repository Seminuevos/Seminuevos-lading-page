/**
 * GET  /api/vehicles  → Lista vehículos (admin, con todos los campos)
 * POST /api/vehicles  → Crea un vehículo nuevo (requiere auth)
 */
import { supabase } from '../_lib/supabase-server.js';
import { handleCors } from '../_middleware/cors.js';
import { requireAuth } from '../_middleware/auth.js';
import { sanitizeString, validateRequired } from '../_middleware/validate.js';

export default async function handler(req, res) {
    if (handleCors(req, res)) return;

    // GET — listar vehículos (requiere auth)
    if (req.method === 'GET') {
        const user = requireAuth(req, res);
        if (!user) return;

        try {
            const { data, error } = await supabase
                .from('vehicles')
                .select('*')
                .order('created_at', { ascending: false });

            if (error) {
                console.error('[GET /api/vehicles]', error);
                return res.status(500).json({ error: 'Error al obtener inventario' });
            }

            return res.status(200).json({ data });

        } catch (err) {
            console.error('[GET /api/vehicles] catch:', err);
            return res.status(500).json({ error: 'Error interno del servidor' });
        }
    }

    // POST — crear vehículo
    if (req.method === 'POST') {
        const user = requireAuth(req, res);
        if (!user) return;

        const body = req.body || {};

        if (!validateRequired(body, ['title'], res)) return;

        const payload = {
            title:        sanitizeString(body.title, 200),
            price:        sanitizeString(body.price, 100),
            year:         parseInt(body.year) || new Date().getFullYear(),
            km:           sanitizeString(body.km, 50),
            engine:       sanitizeString(body.engine, 100),
            transmission: sanitizeString(body.transmission, 50),
            fuel:         sanitizeString(body.fuel, 50),
            body_type:    sanitizeString(body.body_type, 50),
            condition:    sanitizeString(body.condition, 50),
            availability: sanitizeString(body.availability, 50),
            color:        sanitizeString(body.color, 50),
            description:  sanitizeString(body.description, 5000),
            features:     Array.isArray(body.features) ? body.features.slice(0, 30) : [],
            images:       Array.isArray(body.images) ? body.images.slice(0, 20) : [],
            status:       sanitizeString(body.status, 20) || 'active',
            created_by:   user.email
        };

        try {
            const { data, error } = await supabase
                .from('vehicles')
                .insert([payload])
                .select()
                .single();

            if (error) {
                console.error('[POST /api/vehicles]', error);
                return res.status(500).json({ error: 'Error al crear vehículo' });
            }

            return res.status(201).json({ data });

        } catch (err) {
            console.error('[POST /api/vehicles] catch:', err);
            return res.status(500).json({ error: 'Error interno del servidor' });
        }
    }

    return res.status(405).json({ error: 'Método no permitido' });
}
