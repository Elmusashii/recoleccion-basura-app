import { supabase } from '../config/supabase.js';
import { successResponse, errorResponse } from '../utils/response.js';
import { OFFICIAL_ROUTES } from '../data/officialRoutes.js';

/**
 * Obtener todas las rutas de recolección de basura activas
 */
export const getRoutes = async (req, res) => {
  try {
    const { zone, shift, day } = req.query;

    let routes = [];

    try {
      let query = supabase
        .from('routes')
        .select('*')
        .eq('is_active', true)
        .order('zone', { ascending: true });

      if (zone) {
        query = query.ilike('zone', `%${zone}%`);
      }

      if (shift) {
        query = query.eq('shift', shift);
      }

      if (day) {
        query = query.contains('schedule_days', [day]);
      }

      const { data, error } = await query;
      if (!error && data && data.length > 0) {
        routes = data;
      }
    } catch (dbErr) {
      console.warn('Supabase DB offline o usando dataset municipal oficial por defecto');
    }

    // Si la base de datos no tiene rutas cargadas, usamos el dataset oficial municipal
    if (routes.length === 0) {
      routes = OFFICIAL_ROUTES.filter(r => {
        let match = true;
        if (zone && !r.zone.toLowerCase().includes(zone.toLowerCase())) match = false;
        if (shift && r.shift !== shift) match = false;
        if (day && !r.schedule_days.includes(day)) match = false;
        return match;
      });
    }

    return successResponse(res, 'Rutas de recolección obtenidas correctamente', routes);
  } catch (err) {
    return errorResponse(res, 'Error interno del servidor al consultar rutas', err, 500);
  }
};

/**
 * Obtener detalle de una ruta por ID
 */
export const getRouteById = async (req, res) => {
  try {
    const { id } = req.params;

    const { data, error } = await supabase
      .from('routes')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !data) {
      return errorResponse(res, 'Ruta no encontrada', error, 404);
    }

    return successResponse(res, 'Detalle de la ruta obtenido', data);
  } catch (err) {
    return errorResponse(res, 'Error al obtener la ruta', err, 500);
  }
};

/**
 * Crear una nueva ruta de recolección (Admin)
 */
export const createRoute = async (req, res) => {
  try {
    const { name, zone, shift, schedule_days, start_time, end_time, color_hex, geometry_geojson } = req.body;

    if (!name || !zone || !shift || !schedule_days || !start_time || !end_time) {
      return errorResponse(res, 'Todos los campos requeridos deben ser proporcionados', null, 400);
    }

    const { data, error } = await supabase
      .from('routes')
      .insert([
        {
          name,
          zone,
          shift,
          schedule_days,
          start_time,
          end_time,
          color_hex: color_hex || '#10B981',
          geometry_geojson: geometry_geojson || null,
          is_active: true
        }
      ])
      .select()
      .single();

    if (error) {
      return errorResponse(res, 'Error al crear la ruta', error, 400);
    }

    return successResponse(res, 'Ruta creada exitosamente', data, 201);
  } catch (err) {
    return errorResponse(res, 'Error al procesar la creación de la ruta', err, 500);
  }
};

/**
 * Actualizar una ruta existente (Admin)
 */
export const updateRoute = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    updates.updated_at = new Date().toISOString();

    const { data, error } = await supabase
      .from('routes')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      return errorResponse(res, 'Error al actualizar la ruta', error, 400);
    }

    return successResponse(res, 'Ruta actualizada con éxito', data);
  } catch (err) {
    return errorResponse(res, 'Error al actualizar la ruta', err, 500);
  }
};

/**
 * Desactivar (Soft delete) o eliminar ruta (Admin)
 */
export const deleteRoute = async (req, res) => {
  try {
    const { id } = req.params;

    const { data, error } = await supabase
      .from('routes')
      .update({ is_active: false, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      return errorResponse(res, 'Error al desactivar la ruta', error, 400);
    }

    return successResponse(res, 'Ruta desactivada exitosamente', data);
  } catch (err) {
    return errorResponse(res, 'Error al desactivar la ruta', err, 500);
  }
};
