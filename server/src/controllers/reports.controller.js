import { supabase } from '../config/supabase.js';
import { successResponse, errorResponse } from '../utils/response.js';
import { isValidImageBuffer } from '../middlewares/upload.js';
import { getDistanceMatrix } from '../services/ors.service.js';

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

    const parsedLat = parseFloat(latitude);
    const parsedLng = parseFloat(longitude);

    if (isNaN(parsedLat) || isNaN(parsedLng)) {
      return errorResponse(res, 'Las coordenadas geográficas proporcionadas son inválidas.', null, 400);
    }

    // Bounding Box oficial de la jurisdicción de la Ciudad de Asunción
    const ASUNCION_BBOX = {
      minLat: -25.40,
      maxLat: -25.18,
      minLng: -57.72,
      maxLng: -57.48
    };

    if (
      parsedLat < ASUNCION_BBOX.minLat ||
      parsedLat > ASUNCION_BBOX.maxLat ||
      parsedLng < ASUNCION_BBOX.minLng ||
      parsedLng > ASUNCION_BBOX.maxLng
    ) {
      return errorResponse(
        res,
        'Ubicación fuera de rango: Las coordenadas se encuentran fuera de la jurisdicción del municipio de Asunción.',
        null,
        400
      );
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
      latitude: parsedLat,
      longitude: parsedLng,
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
        console.log(`✅ Denuncia ${ticket_number} guardada en Supabase con ID: ${data.id}`);
      } else if (error) {
        console.error('❌ [ERROR Backend createReport] Error al insertar en Supabase reports:', error);
      }
    } catch (dbErr) {
      console.warn('❌ [EXCEPTION Backend createReport] Supabase DB exception:', dbErr);
    }

    // 2. Si no hay Supabase o falló, guardar en la base local en memoria
    if (!savedReport) {
      savedReport = {
        id: `rep-${Date.now().toString().slice(-6)}`,
        ...newReportPayload
      };
      LOCAL_REPORTS.unshift(savedReport);
      console.log('⚠️ [FALLBACK Backend createReport] Denuncia guardada en LOCAL_REPORTS en memoria:', savedReport.id);
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
 * Listar denuncias asignadas al camión del chofer logueado
 * GET /api/reports/assigned-to-me
 */
export const getReportsAssignedToMe = async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return errorResponse(res, 'Usuario no autenticado', null, 401);
    }

    // 1. Obtener el camión asignado al chofer
    let userTruck = null;
    try {
      const { data, error } = await supabase
        .from('trucks')
        .select('id, code, plate_number, model, status')
        .eq('assigned_user_id', userId)
        .maybeSingle();

      if (!error && data) {
        userTruck = data;
      }
    } catch (dbErr) {
      console.warn('DB error buscando camión del usuario:', dbErr.message);
    }

    if (!userTruck) {
      return successResponse(res, 'No tienes un camión asignado actualmente', {
        truck: null,
        reports: [],
        total: 0
      });
    }

    // 2. Obtener denuncias 'EN_PROCESO' asignadas a este camión
    const PUBLIC_COLUMNS = 'id, ticket_number, category, description, status, latitude, longitude, address_reference, photo_urls, created_at, resolved_at, assigned_truck_id, admin_notes';

    let reports = [];
    try {
      const { data, error } = await supabase
        .from('reports')
        .select(PUBLIC_COLUMNS)
        .eq('assigned_truck_id', userTruck.id)
        .eq('status', 'EN_PROCESO')
        .order('created_at', { ascending: false });

      if (!error && data) {
        reports = data;
      }
    } catch (dbErr) {
      console.warn('DB error buscando denuncias asignadas:', dbErr.message);
    }

    if (reports.length === 0 && LOCAL_REPORTS.length > 0) {
      reports = LOCAL_REPORTS
        .filter(r => (r.assigned_truck_id === userTruck.id || r.assigned_truck_id === userTruck.code) && r.status === 'EN_PROCESO')
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
          assigned_truck_id: r.assigned_truck_id,
          admin_notes: r.admin_notes
        }));
    }

    return successResponse(res, 'Denuncias asignadas obtenidas correctamente', {
      truck: userTruck,
      reports,
      total: reports.length
    });
  } catch (err) {
    return errorResponse(res, 'Error al consultar denuncias asignadas', err, 500);
  }
};

/**
 * Actualizar estado de una denuncia (Admin / Supervisor / Operador / Chofer)
 */
export const updateReportStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, admin_notes, assigned_truck_id, photo_urls } = req.body;

    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);

    if (!id) {
      return errorResponse(res, 'ID o Ticket de la denuncia requerido', null, 400);
    }

    const validStatuses = ['PENDIENTE', 'EN_PROCESO', 'RESUELTO', 'RECHAZADO'];
    if (status && !validStatuses.includes(status)) {
      return errorResponse(res, `Estado inválido. Opciones: ${validStatuses.join(', ')}`, null, 400);
    }

    // Validación de pertenencia para el rol 'chofer'
    const userRole = req.user?.app_metadata?.role || req.user?.user_metadata?.role || 'citizen';
    if (userRole === 'chofer') {
      // 1. Obtener la denuncia actual
      let currentReport = null;
      try {
        let q = supabase
          .from('reports')
          .select('id, ticket_number, assigned_truck_id, status');
        if (isUUID) {
          q = q.eq('id', id);
        } else {
          q = q.eq('ticket_number', id);
        }
        const { data, error } = await q.maybeSingle();
        if (!error && data) currentReport = data;
      } catch (e) {}

      if (!currentReport) {
        currentReport = LOCAL_REPORTS.find(r => r.id === id || r.ticket_number === id);
      }

      if (!currentReport) {
        return errorResponse(res, 'Denuncia no encontrada', null, 404);
      }

      // 2. Obtener el camión asignado al chofer
      let userTruck = null;
      try {
        const { data, error } = await supabase
          .from('trucks')
          .select('id, code')
          .eq('assigned_user_id', req.user?.id)
          .maybeSingle();
        if (!error && data) userTruck = data;
      } catch (e) {}

      if (!userTruck) {
        return errorResponse(res, 'Acceso denegado: No tienes ningún camión asignado', null, 403);
      }

      if (currentReport.assigned_truck_id !== userTruck.id && currentReport.assigned_truck_id !== userTruck.code) {
        return errorResponse(
          res,
          'Acceso denegado: Solo puedes resolver o actualizar denuncias asignadas a tu camión',
          null,
          403
        );
      }
    }

    const updates = {};
    if (status) updates.status = status;
    if (admin_notes !== undefined) updates.admin_notes = admin_notes;
    
    if (assigned_truck_id !== undefined && assigned_truck_id !== null && assigned_truck_id !== '') {
      const isTruckUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(assigned_truck_id);
      if (!isTruckUUID) {
        return errorResponse(res, `ID de camión inválido: "${assigned_truck_id}" no es un UUID válido.`, null, 400);
      }
      updates.assigned_truck_id = assigned_truck_id;
    } else if (assigned_truck_id === null || assigned_truck_id === '') {
      updates.assigned_truck_id = null;
    }

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
      let query = supabase.from('reports').update(updates);
      if (isUUID) {
        query = query.eq('id', id);
      } else {
        query = query.eq('ticket_number', id);
      }

      // Bloqueo de concurrencia para asignaciones a EN_PROCESO
      if (status === 'EN_PROCESO') {
        query = query.eq('status', 'PENDIENTE');
      }

      const { data, error } = await query.select().maybeSingle();

      if (!error && data) {
        updatedReport = data;
      } else if (!error && !data && status === 'EN_PROCESO') {
        return errorResponse(
          res,
          'Conflicto: La denuncia ya fue tomada por otro operador o su estado fue modificado.',
          null,
          409
        );
      }
    } catch (dbErr) {
      console.warn('Fallback en updateReportStatus:', dbErr.message);
    }

    if (!updatedReport && Array.isArray(LOCAL_REPORTS)) {
      const index = LOCAL_REPORTS.findIndex(r => r.id === id || r.ticket_number === id);
      if (index !== -1) {
        if (status === 'EN_PROCESO' && LOCAL_REPORTS[index].status !== 'PENDIENTE') {
          return errorResponse(
            res,
            'Conflicto: La denuncia ya fue tomada por otro operador o su estado fue modificado.',
            null,
            409
          );
        }
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

/**
 * Obtener los camiones disponibles/en ruta más cercanos a una denuncia usando ORS Distance Matrix
 * POST /api/reports/:id/nearest-trucks
 */
export const getNearestTrucksForReport = async (req, res) => {
  try {
    const { id } = req.params;

    if (!id) {
      return errorResponse(res, 'ID de denuncia requerido', null, 400);
    }

    // 1. Buscar la denuncia para obtener sus coordenadas geográficas
    let report = null;
    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);

    try {
      let query = supabase.from('reports').select('*');
      if (isUUID) {
        query = query.eq('id', id);
      } else {
        query = query.eq('ticket_number', id);
      }
      const { data, error } = await query.maybeSingle();
      if (!error && data) {
        report = data;
      }
    } catch (dbErr) {
      console.warn('Error consultando denuncia para nearest-trucks en Supabase:', dbErr.message);
    }

    if (!report) {
      report = LOCAL_REPORTS.find(r => r.id === id || r.ticket_number === id);
    }

    if (!report) {
      return errorResponse(res, 'Denuncia no encontrada', null, 404);
    }

    const reportLat = parseFloat(report.latitude);
    const reportLng = parseFloat(report.longitude);

    if (isNaN(reportLat) || isNaN(reportLng)) {
      return errorResponse(res, 'La denuncia no cuenta con coordenadas geográficas válidas', null, 400);
    }

    // 2. Obtener camiones operativos (DISPONIBLE o EN_RUTA) de Supabase
    let candidateTrucks = [];
    try {
      const { data: trucksData, error: trucksErr } = await supabase
        .from('trucks')
        .select('*')
        .in('status', ['DISPONIBLE', 'EN_RUTA']);

      if (!trucksErr && trucksData && trucksData.length > 0) {
        // Enriquecer con nombres de choferes desde la tabla profiles
        const userIds = trucksData.map(t => t.assigned_user_id).filter(Boolean);
        const profilesMap = {};
        if (userIds.length > 0) {
          try {
            const { data: profilesData } = await supabase
              .from('profiles')
              .select('id, name')
              .in('id', userIds);
            if (profilesData) {
              profilesData.forEach(p => {
                profilesMap[p.id] = p.name;
              });
            }
          } catch (pErr) {
            console.warn('No se pudieron consultar perfiles de choferes:', pErr.message);
          }
        }

        candidateTrucks = trucksData.map(t => ({
          ...t,
          driver_name: profilesMap[t.assigned_user_id] || 'Chofer Municipal'
        }));
      } else if (trucksErr) {
        console.warn('Error consultando camiones para nearest-trucks en Supabase:', trucksErr.message);
      }
    } catch (dbErr) {
      console.warn('Error en getNearestTrucksForReport al consultar DB:', dbErr.message);
    }

    if (candidateTrucks.length === 0) {
      return successResponse(res, 'No hay camiones operativos disponibles en este momento', {
        reportId: report.id,
        ticketNumber: report.ticket_number,
        reportLocation: {
          lat: reportLat,
          lng: reportLng,
          address: report.address_reference
        },
        nearestTrucks: []
      });
    }

    // Filtrar camiones que tengan coordenadas válidas
    const validTrucks = candidateTrucks.map(t => ({
      id: t.id,
      code: t.code,
      plate_number: t.plate_number || t.plate || 'S/D',
      model: t.model || 'Camión Recolector',
      capacity_tons: t.capacity_tons || 12.0,
      status: t.status || 'DISPONIBLE',
      driver_name: t.driver_name || 'Chofer Municipal',
      lat: t.current_lat ?? t.lat ?? -25.2867,
      lng: t.current_lng ?? t.lng ?? -57.6470
    }));

    if (validTrucks.length === 0) {
      return successResponse(res, 'No hay camiones operativos disponibles en este momento', {
        reportId: report.id,
        ticketNumber: report.ticket_number,
        nearestTrucks: []
      });
    }

    // 3. Invocar servicio de matriz de distancias ORS
    const matrixResults = await getDistanceMatrix(validTrucks, reportLat, reportLng);

    // 4. Formatear y enriquecer la lista ordenada
    const nearestTrucks = matrixResults.map(item => {
      const truck = item.origin;
      return {
        id: truck.id,
        code: truck.code,
        plate_number: truck.plate_number,
        model: truck.model,
        capacity_tons: truck.capacity_tons,
        status: truck.status,
        driver_name: truck.driver_name,
        current_lat: truck.lat,
        current_lng: truck.lng,
        distanceMeters: item.distanceMeters,
        durationSeconds: item.durationSeconds,
        distanceKm: item.distanceKm,
        durationMinutes: item.durationMinutes,
        formattedDistance: item.distanceKm !== null ? `${item.distanceKm} km` : 'N/D',
        formattedDuration: item.durationMinutes !== null ? `~${item.durationMinutes} min` : 'N/D',
        isEstimate: item.isEstimate || false
      };
    });

    return successResponse(res, 'Camiones más cercanos ordenados por distancia de manejo', {
      reportId: report.id,
      ticketNumber: report.ticket_number,
      reportLocation: { lat: reportLat, lng: reportLng, address: report.address_reference },
      nearestTrucks
    });
  } catch (err) {
    return errorResponse(res, 'Error al calcular camiones cercanos a la denuncia', err, 500);
  }
};
