/**
 * PUT    /api/vehicles/[id]  → Edita un vehículo (requiere auth)
 * DELETE /api/vehicles/[id]  → Elimina un vehículo (requiere auth)
 */
import { supabase } from '../_lib/supabase-server.js';
import { handleCors } from '../_middleware/cors.js';
import { requireAuth } from '../_middleware/auth.js';
import { sanitizeString } from '../_middleware/validate.js';

export default async function handler(req, res) {
    if (handleCors(req, res)) return;

    const { id } = req.query;

    if (!id) {
        return res.status(400).json({ error: 'ID de vehículo requerido' });
    }

    // PUT — editar vehículo
    if (req.method === 'PUT') {
        const user = requireAuth(req, res);
        if (!user) return;

        const body = req.body || {};

        // Construir payload solo con campos que vengan en el body
        const payload = {};
        if (body.title !== undefined)        payload.title        = sanitizeString(body.title, 200);
        if (body.price !== undefined)        payload.price        = sanitizeString(body.price, 100);
        if (body.year !== undefined)         payload.year         = parseInt(body.year) || null;
        if (body.km !== undefined)           payload.km           = sanitizeString(body.km, 50);
        if (body.engine !== undefined)       payload.engine       = sanitizeString(body.engine, 100);
        if (body.transmission !== undefined) payload.transmission = sanitizeString(body.transmission, 50);
        if (body.fuel !== undefined)         payload.fuel         = sanitizeString(body.fuel, 50);
        if (body.body_type !== undefined)    payload.body_type    = sanitizeString(body.body_type, 50);
        if (body.condition !== undefined)    payload.condition    = sanitizeString(body.condition, 50);
        if (body.availability !== undefined) payload.availability = sanitizeString(body.availability, 50);
        if (body.color !== undefined)        payload.color        = sanitizeString(body.color, 50);
        if (body.description !== undefined)  payload.description  = sanitizeString(body.description, 5000);
        if (body.features !== undefined)     payload.features     = Array.isArray(body.features) ? body.features.slice(0, 30) : [];
        if (body.images !== undefined)       payload.images       = Array.isArray(body.images) ? body.images.slice(0, 20) : [];
        if (body.status !== undefined)       payload.status       = sanitizeString(body.status, 20);
        payload.updated_at = new Date().toISOString();

        try {
            const { data, error } = await supabase
                .from('vehicles')
                .update(payload)
                .eq('id', id)
                .select()
                .single();

            if (error) {
                console.error('[PUT /api/vehicles/:id]', error);
                return res.status(500).json({ error: 'Error al actualizar vehículo' });
            }

            if (!data) {
                return res.status(404).json({ error: 'Vehículo no encontrado' });
            }

            return res.status(200).json({ data });

        } catch (err) {
            console.error('[PUT /api/vehicles/:id] catch:', err);
            return res.status(500).json({ error: 'Error interno del servidor' });
        }
    }

    // DELETE — eliminar vehículo
    if (req.method === 'DELETE') {
        const user = requireAuth(req, res);
        if (!user) return;

        try {
            const { error } = await supabase
                .from('vehicles')
                .delete()
                .eq('id', id);

            if (error) {
                console.error('[DELETE /api/vehicles/:id]', error);
                return res.status(500).json({ error: 'Error al eliminar vehículo' });
            }

            return res.status(200).json({ message: 'Vehículo eliminado correctamente' });

        } catch (err) {
            console.error('[DELETE /api/vehicles/:id] catch:', err);
            return res.status(500).json({ error: 'Error interno del servidor' });
        }
    }

    return res.status(405).json({ error: 'Método no permitido' });
}
