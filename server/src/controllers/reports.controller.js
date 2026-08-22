import { supabase } from '../config/supabase.js';
import { successResponse, errorResponse } from '../utils/response.js';
import { isValidImageBuffer } from '../middlewares/upload.js';

/**
 * Base de datos en memoria para denuncias (Modo fallback/offline)
 */
let LOCAL_REPORTS = [
  {
    id: 'rep-01',
    ticket_number: 'ASU-20260820-1011',
    citizen_name: 'Anónimo',
    citizen_phone: '',
    citizen_email: '',
    category: 'VERTEDERO_CLANDESTINO',
    description: 'Acumulación de ramas y basura sobre la acera frente al baldío.',
    address_reference: 'Av. Fernando de la Mora y Bartolomé de las Casas (Barrio Vista Alegre)',
    latitude: -25.3210,
    longitude: -57.6090,
    photo_urls: [],
    status: 'PENDIENTE',
    admin_notes: null,
    created_at: '2026-08-20T10:15:00.000Z',
    resolved_at: null
  },
  {
    id: 'rep-02',
    ticket_number: 'ASU-20260820-2022',
    citizen_name: 'Vecinos de Sajonia',
    citizen_phone: '+595 981 334455',
    citizen_email: 'vecinos@sajonia.com',
    category: 'CONTENEDOR_DANADO',
    description: 'Contenedor metálico desbordado y con tapa rota.',
    address_reference: 'Av. Carlos A. López y Cnel. Gracia',
    latitude: -25.2970,
    longitude: -57.6560,
    photo_urls: [],
    status: 'EN_PROCESO',
    admin_notes: 'Cuadrilla de herreros municipales asignada para cambio de tapa.',
    created_at: '2026-08-20T08:30:00.000Z',
    resolved_at: null
  }
];

/**
 * Generador de tickets de denuncias
 */
const generateTicketNumber = () => {
  const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const randomSuffix = Math.floor(1000 + Math.random() * 9000);
  return `ASU-${dateStr}-${randomSuffix}`;
};

/**
 * Listar denuncias públicas sanitizadas (Portal Ciudadano / Mapa)
 * Solo expone coordenadas y metadata general, sin datos personales (PII)
 */
export const getReports = async (req, res) => {
  try {
    const { status, category, limit = 50, offset = 0 } = req.query;

    const PUBLIC_COLUMNS = 'id, ticket_number, category, description, status, latitude, longitude, address_reference, photo_urls, created_at, resolved_at, assigned_truck_id';

    let reports = [];
    let total = 0;

    try {
      let query = supabase
        .from('reports')
        .select(PUBLIC_COLUMNS, { count: 'exact' })
        .order('created_at', { ascending: false })
        .range(Number(offset), Number(offset) + Number(limit) - 1);

      if (status) query = query.eq('status', status);
      if (category) query = query.eq('category', category);

      const { data, count, error } = await query;
      if (!error && data) {
        reports = data;
        total = count || data.length;
      }
    } catch (dbErr) {
      // Supabase no conectado o error
    }

    // Fallback a denuncias locales en memoria (sanitizadas)
    if (reports.length === 0 && LOCAL_REPORTS.length > 0) {
      let filtered = [...LOCAL_REPORTS];
      if (status) filtered = filtered.filter(r => r.status === status);
      if (category) filtered = filtered.filter(r => r.category === category);
      total = filtered.length;
      reports = filtered
        .slice(Number(offset), Number(offset) + Number(limit))
        .map(r => ({
          id: r.id,
          ticket_number: r.ticket_number,
          category: r.category,
          description: r.description,
          status: r.status,
          latitude: r.latitude,
          longitude: r.longitude,
          address_reference: r.address_reference,
          photo_urls: r.photo_urls,
          created_at: r.created_at,
          resolved_at: r.resolved_at,
          assigned_truck_id: r.assigned_truck_id
        }));
    }

    return successResponse(res, 'Denuncias obtenidas correctamente', {
      reports,
      total,
      limit: Number(limit),
      offset: Number(offset)
    });
  } catch (err) {
    return errorResponse(res, 'Error al obtener denuncias', err, 500);
  }
};

/**
 * Listar denuncias completas para el panel de administración y supervisión (Requiere Auth)
 * Incluye datos de contacto ciudadano (citizen_name, citizen_phone, citizen_email) y notas internas
 */
export const getReportsAdmin = async (req, res) => {
  try {
    const { status, category, limit = 50, offset = 0 } = req.query;

    let reports = [];
    let total = 0;

    try {
      let query = supabase
        .from('reports')
        .select('*', { count: 'exact' })
        .order('created_at', { ascending: false })
        .range(Number(offset), Number(offset) + Number(limit) - 1);

      if (status) query = query.eq('status', status);
      if (category) query = query.eq('category', category);

      const { data, count, error } = await query;
      if (!error && data) {
        reports = data;
        total = count || data.length;
      }
    } catch (dbErr) {
      // Supabase no conectado o error
    }

    // Fallback a denuncias locales en memoria
    if (reports.length === 0 && LOCAL_REPORTS.length > 0) {
      let filtered = [...LOCAL_REPORTS];
      if (status) filtered = filtered.filter(r => r.status === status);
      if (category) filtered = filtered.filter(r => r.category === category);
      total = filtered.length;
      reports = filtered.slice(Number(offset), Number(offset) + Number(limit));
    }

    return successResponse(res, 'Denuncias completas obtenidas correctamente', {
      reports,
      total,
      limit: Number(limit),
      offset: Number(offset)
    });
  } catch (err) {
    return errorResponse(res, 'Error al obtener denuncias administrativas', err, 500);
  }
};

/**
 * Obtener datos geográficos optimizados para Mapa de Calor (Heatmap)
 */
export const getReportsHeatmap = async (req, res) => {
  try {
    let rawReports = [];

    try {
      const { data, error } = await supabase
        .from('reports')
        .select('id, latitude, longitude, category, status, created_at')
        .not('latitude', 'is', null)
        .not('longitude', 'is', null);

      if (!error && data && data.length > 0) {
        rawReports = data;
      }
    } catch (dbErr) {
      // Fallback
    }

    if (rawReports.length === 0) {
      rawReports = LOCAL_REPORTS;
    }

    const points = rawReports.map((item) => ({
      id: item.id,
      lat: item.latitude,
      lng: item.longitude,
      intensity: item.status === 'PENDIENTE' ? 1.0 : 0.5,
      category: item.category,
      status: item.status
    }));

    return successResponse(res, 'Datos de mapa de calor listos', points);
  } catch (err) {
    return errorResponse(res, 'Error al procesar mapa de calor', err, 500);
  }
};

/**
 * Subir fotografía de denuncia ciudadana a Supabase Storage
 */
export const uploadReportPhotoController = async (req, res) => {
  try {
    if (!req.file) {
      return errorResponse(res, 'No se proporcionó ningún archivo de imagen', null, 400);
    }

    // Validación por contenido binario real (Magic Bytes)
    if (!isValidImageBuffer(req.file.buffer)) {
      return errorResponse(
        res,
        'Tipo de archivo no permitido. Solo se aceptan imágenes JPG, PNG, WEBP o HEIC.',
        null,
        400
      );
    }

    const file = req.file;
    const fileExt = file.originalname ? file.originalname.split('.').pop().toLowerCase() : 'jpg';
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}.${fileExt}`;
    const filePath = `reports/${fileName}`;

    const { data, error } = await supabase.storage
      .from('denuncias-fotos')
      .upload(filePath, file.buffer, {
        contentType: file.mimetype || 'image/jpeg',
        cacheControl: '3600',
        upsert: false
      });

    if (error) {
      console.error('Error subiendo imagen a Supabase Storage:', error);
      return errorResponse(res, 'Error al almacenar la imagen en el servidor', error, 500);
    }

    const { data: publicUrlData } = supabase.storage
      .from('denuncias-fotos')
      .getPublicUrl(filePath);

    return successResponse(res, 'Fotografía de denuncia subida correctamente', {
      url: publicUrlData.publicUrl,
      path: filePath
    }, 201);
  } catch (err) {
    console.error('Error en uploadReportPhotoController:', err);
    return errorResponse(res, 'Fallo inesperado al procesar la imagen', err, 500);
  }
};

/**
 * Registrar una nueva denuncia ciudadana (Público)
 */
export const createReport = async (req, res) => {
  try {
    const {
      citizen_name,
      citizen_phone,
      citizen_email,
      category,
      description,
      address_reference,
      barrio,
      latitude,
      longitude,
      photo_urls
    } = req.body;

    if (!description || latitude === undefined || longitude === undefined) {
      return errorResponse(res, 'La descripción y las coordenadas geográficas son obligatorias', null, 400);
    }

    // Normalizar arreglo de URLs de fotos
    let formattedPhotos = [];
    if (Array.isArray(photo_urls)) {
      formattedPhotos = photo_urls.filter(p => typeof p === 'string' && p.trim().length > 0);
    } else if (typeof photo_urls === 'string' && photo_urls.trim().length > 0) {
      try {
        const parsed = JSON.parse(photo_urls);
        if (Array.isArray(parsed)) {
          formattedPhotos = parsed.filter(p => typeof p === 'string' && p.trim().length > 0);
        } else {
          formattedPhotos = [photo_urls];
        }
      } catch (e) {
        formattedPhotos = [photo_urls];
      }
    }

    const ticket_number = generateTicketNumber();
    const newReportPayload = {
      ticket_number,
      citizen_name: citizen_name || 'Ciudadano Anónimo',
      citizen_phone: citizen_phone || '',
      citizen_email: citizen_email || '',
      category: category || 'VERTEDERO_CLANDESTINO',
      description,
      address_reference: address_reference || (barrio ? `Barrio ${barrio}` : ''),
      latitude: parseFloat(latitude),
      longitude: parseFloat(longitude),
      photo_urls: formattedPhotos,
      status: 'PENDIENTE',
      created_at: new Date().toISOString(),
      admin_notes: null,
      resolved_at: null
    };

    let savedReport = null;

    // 1. Guardar en Supabase PostgreSQL
    try {
      const { data, error } = await supabase
        .from('reports')
        .insert([newReportPayload])
        .select()
        .single();

      if (!error && data) {
        savedReport = data;
        console.log(`✅ Denuncia ${ticket_number} guardada en Supabase con ${formattedPhotos.length} fotos.`);
      } else if (error) {
        console.error('Error al insertar en Supabase reports:', error);
      }
    } catch (dbErr) {
      console.warn('Supabase DB no disponible. Guardando en memoria local:', dbErr);
    }

    // 2. Si no hay Supabase o falló, guardar en la base local en memoria
    if (!savedReport) {
      savedReport = {
        id: `rep-${Date.now().toString().slice(-6)}`,
        ...newReportPayload
      };
      LOCAL_REPORTS.unshift(savedReport);
    }

    return successResponse(
      res,
      'Denuncia registrada correctamente. Guarda tu número de ticket para seguimiento.',
      savedReport,
      201
    );
  } catch (err) {
    return errorResponse(res, 'Error al crear la denuncia', err, 500);
  }
};

/**
 * Consultar estado de denuncia mediante código de Ticket (Público)
 */
export const getReportByTicket = async (req, res) => {
  try {
    const { ticket } = req.params;

    let report = null;

    try {
      const { data, error } = await supabase
        .from('reports')
        .select('ticket_number, category, description, status, created_at, resolved_at, admin_notes')
        .eq('ticket_number', ticket)
        .single();

      if (!error && data) {
        report = data;
      }
    } catch (dbErr) {
      // Fallback
    }

    if (!report) {
      report = LOCAL_REPORTS.find(r => r.ticket_number?.toLowerCase() === ticket.toLowerCase().trim());
    }

    if (!report) {
      return errorResponse(res, 'No se encontró ninguna denuncia con el ticket proporcionado', null, 404);
    }

    return successResponse(res, 'Estado de la denuncia recuperado', report);
  } catch (err) {
    return errorResponse(res, 'Error al consultar el ticket', err, 500);
  }
};

/**
 * Actualizar estado de una denuncia (Admin / Operador)
 */
export const updateReportStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, admin_notes, assigned_truck_id, photo_urls } = req.body;

    const validStatuses = ['PENDIENTE', 'EN_PROCESO', 'RESUELTO', 'RECHAZADO'];
    if (status && !validStatuses.includes(status)) {
      return errorResponse(res, `Estado inválido. Opciones válidas: ${validStatuses.join(', ')}`, null, 400);
    }

    const updates = {};
    if (status) updates.status = status;
    if (admin_notes !== undefined) updates.admin_notes = admin_notes;
    if (assigned_truck_id !== undefined) updates.assigned_truck_id = assigned_truck_id;
    if (photo_urls !== undefined) {
      if (Array.isArray(photo_urls)) {
        updates.photo_urls = photo_urls;
      } else if (typeof photo_urls === 'string') {
        updates.photo_urls = [photo_urls];
      }
    }
    if (status === 'RESUELTO') updates.resolved_at = new Date().toISOString();

    let updatedReport = null;

    try {
      const { data, error } = await supabase
        .from('reports')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (!error && data) {
        updatedReport = data;
      }
    } catch (dbErr) {
      // Fallback
    }

    if (!updatedReport) {
      const index = LOCAL_REPORTS.findIndex(r => r.id === id);
      if (index !== -1) {
        LOCAL_REPORTS[index] = { ...LOCAL_REPORTS[index], ...updates };
        updatedReport = LOCAL_REPORTS[index];
      }
    }

    if (!updatedReport) {
      return errorResponse(res, 'Denuncia no encontrada para actualizar', null, 404);
    }

    return successResponse(res, 'Denuncia actualizada exitosamente', updatedReport);
  } catch (err) {
    return errorResponse(res, 'Error al actualizar denuncia', err, 500);
  }
};

/**
 * Obtener estadísticas de denuncias resueltas en los últimos 7 días
 */
export const getWeeklyReportStats = async (req, res) => {
  try {
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    let count = 0;

    try {
      const { data, count: dbCount, error } = await supabase
        .from('reports')
        .select('*', { count: 'exact' })
        .eq('status', 'RESUELTO')
        .gte('resolved_at', sevenDaysAgo);

      if (!error && dbCount !== null && dbCount !== undefined) {
        count = dbCount;
      } else if (!error && data) {
        count = data.length;
      }
    } catch (dbErr) {
      console.warn('Error consultando estadísticas semanales en Supabase:', dbErr.message);
    }

    // Fallback con LOCAL_REPORTS
    if (count === 0 && LOCAL_REPORTS.length > 0) {
      const localResolved = LOCAL_REPORTS.filter(r => {
        if (r.status !== 'RESUELTO') return false;
        const resDate = r.resolved_at ? new Date(r.resolved_at) : new Date();
        return resDate >= new Date(sevenDaysAgo);
      });
      count = localResolved.length;
    }

    return res.status(200).json({
      success: true,
      count: count,
      data: { count }
    });
  } catch (err) {
    return errorResponse(res, 'Error al consultar estadísticas semanales', err, 500);
  }
};
