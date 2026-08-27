import path from 'path';
import { supabase } from '../config/supabase.js';
import { successResponse, errorResponse } from '../utils/response.js';
import { isValidImageBuffer } from '../middlewares/upload.js';
import { getTruckRoute } from '../services/ors.service.js';
import { getZoneCentroid } from '../utils/geo.js';
import { OFFICIAL_ROUTES } from '../data/officialRoutes.js';

// Cache en memoria para rutas de camiones (TTL: 3 minutos)
const ROUTE_CACHE_TTL_MS = 3 * 60 * 1000;
const truckRouteCache = new Map();

let LOCAL_TRUCKS = [
  { id: 'trk-01', code: 'CAM-01', plate_number: 'AABC 101', model: 'Mercedes-Benz Atego 1726', capacity_tons: 12.0, status: 'EN_RUTA', current_lat: -25.2930, current_lng: -57.5810 },
  { id: 'trk-02', code: 'CAM-02', plate_number: 'AABC 202', model: 'Scania P280 Basurero', capacity_tons: 15.0, status: 'EN_RUTA', current_lat: -25.2970, current_lng: -57.6560 },
  { id: 'trk-03', code: 'CAM-03', plate_number: 'AABC 303', model: 'Volkswagen Constellation', capacity_tons: 10.0, status: 'DISPONIBLE', current_lat: -25.2430, current_lng: -57.5520 },
  { id: 'trk-04', code: 'CAM-04', plate_number: 'AABC 404', model: 'Iveco Tector Attack', capacity_tons: 12.0, status: 'DISPONIBLE', current_lat: -25.3080, current_lng: -57.6350 },
  { id: 'trk-05', code: 'CAM-05', plate_number: 'AABC 505', model: 'Mercedes-Benz Atego 1729', capacity_tons: 14.0, status: 'DISPONIBLE', current_lat: -25.2940, current_lng: -57.5580 },
  { id: 'trk-06', code: 'CAM-06', plate_number: 'AABC 606', model: 'Ford Cargo 1723 Compactador', capacity_tons: 11.0, status: 'DISPONIBLE', current_lat: -25.2570, current_lng: -57.5780 }
];

// Asignaciones en memoria de rutas a camiones (N:M fallback)
let LOCAL_TRUCK_ROUTES = [];

let LOCAL_FLEET_LOGS = [
  { id: 'log-01', truck_id: 'trk-01', driver_name: 'Ramón González', action: 'SALIDA', odometer_km: 45210, fuel_level_percent: 90, waste_weight_kg: 0, notes: 'Ruta Villa Morra Nocturna', timestamp: '2026-08-20T18:45:00.000Z' },
  { id: 'log-02', truck_id: 'trk-02', driver_name: 'Jorge Benítez', action: 'ENTRADA', odometer_km: 68140, fuel_level_percent: 45, waste_weight_kg: 6800, notes: 'Descarga completa en Cateura', timestamp: '2026-08-20T17:30:00.000Z' },
  { id: 'log-03', truck_id: 'trk-03', driver_name: 'Alcides Martínez', action: 'SALIDA', odometer_km: 32100, fuel_level_percent: 100, waste_weight_kg: 0, notes: 'Ruta Loma Pytã Matutina', timestamp: '2026-08-20T06:00:00.000Z' }
];

/**
 * Choferes disponibles para asignar (rol 'chofer' sin camión asignado actualmente)
 * GET /api/fleet/available-drivers?excludeTruckId=UUID
 * - excludeTruckId: si se pasa, el chofer actualmente asignado a ese camión
 *   también se incluye en la lista (útil para pre-seleccionar al editar).
 */
export const getAvailableDrivers = async (req, res) => {
  try {
    const { excludeTruckId } = req.query;

    // 1. Obtener IDs de choferes ya ocupados en otros camiones
    let occupiedUserIds = [];
    try {
      let query = supabase
        .from('trucks')
        .select('assigned_user_id')
        .not('assigned_user_id', 'is', null);

      // Si se excluye un camión concreto, no contamos su chofer como "ocupado"
      if (excludeTruckId) {
        query = query.neq('id', excludeTruckId);
      }

      const { data: occupiedRows, error } = await query;
      if (!error && occupiedRows) {
        occupiedUserIds = occupiedRows.map(r => r.assigned_user_id).filter(Boolean);
      }
    } catch (dbErr) {
      console.warn('Error consultando choferes ocupados:', dbErr.message);
    }

    // 2. Traer todos los usuarios con rol 'chofer' desde la tabla profiles
    let availableDrivers = [];
    try {
      let query = supabase
        .from('profiles')
        .select('id, name, email, phone, role')
        .eq('role', 'chofer')
        .order('name', { ascending: true });

      if (occupiedUserIds.length > 0) {
        query = query.not('id', 'in', `(${occupiedUserIds.map(id => `"${id}"`).join(',')})`);
      }

      const { data, error } = await query;
      if (!error && data && data.length > 0) {
        availableDrivers = data;
      } else if (error) {
        console.warn('Error consultando choferes disponibles en profiles, usando fallback auth.admin:', error.message);
      }
    } catch (dbErr) {
      console.warn('Error en getAvailableDrivers:', dbErr.message);
    }

    // Fallback a Supabase Auth Admin si profiles aún no tiene los registros
    if (availableDrivers.length === 0) {
      try {
        const { data: { users }, error: authErr } = await supabase.auth.admin.listUsers();
        if (!authErr && users) {
          availableDrivers = users
            .filter(u => (u.app_metadata?.role || u.user_metadata?.role) === 'chofer')
            .filter(u => !occupiedUserIds.includes(u.id))
            .map(u => ({
              id: u.id,
              name: u.user_metadata?.name || u.email.split('@')[0],
              email: u.email,
              phone: u.user_metadata?.phone || '',
              role: 'chofer'
            }));
        }
      } catch (authFallbackErr) {
        console.warn('Fallback auth.admin error:', authFallbackErr.message);
      }
    }

    return successResponse(res, 'Choferes disponibles obtenidos', availableDrivers);
  } catch (err) {
    return errorResponse(res, 'Error al consultar choferes disponibles', err, 500);
  }
};

/**
 * Listar camiones recolectores
 */
export const getTrucks = async (req, res) => {
  try {
    let trucks = [];

    try {
      const { data, error } = await supabase
        .from('trucks')
        .select('*, routes(name, zone), truck_routes(*, routes(*))')
        .order('code', { ascending: true });

      if (!error && data && data.length > 0) {
        trucks = data.map(t => ({
          ...t,
          assigned_routes: t.truck_routes?.map(tr => tr.routes).filter(Boolean) || []
        }));
      }
    } catch (dbErr) {
      console.warn('Fallback a camiones locales:', dbErr.message);
    }

    if (trucks.length === 0) {
      trucks = LOCAL_TRUCKS.map(t => {
        const localTR = LOCAL_TRUCK_ROUTES.filter(tr => tr.truck_id === t.id);
        const routeIds = localTR.map(tr => tr.route_id);
        const assigned_routes = OFFICIAL_ROUTES.filter(r => routeIds.includes(r.id) || routeIds.includes(r.name));
        return {
          ...t,
          assigned_routes
        };
      });
    }

    return successResponse(res, 'Flota de camiones obtenida', trucks);
  } catch (err) {
    return errorResponse(res, 'Error en el servidor al consultar flota', err, 500);
  }
};

/**
 * Registrar un nuevo camión en la flota
 */
export const createTruck = async (req, res) => {
  try {
    const { code, plate_number, model, capacity_tons, assigned_route_id } = req.body;

    if (!code || !plate_number) {
      return errorResponse(res, 'Código y número de chapa son obligatorios', null, 400);
    }

    const payload = {
      code,
      plate_number,
      model: model || 'Camión Recolector Compactador',
      capacity_tons: capacity_tons ? parseFloat(capacity_tons) : 12.0,
      status: 'DISPONIBLE',
      assigned_route_id: assigned_route_id || null,
      current_lat: -25.2867,
      current_lng: -57.6470
    };

    let savedTruck = null;

    try {
      const { data, error } = await supabase
        .from('trucks')
        .insert([payload])
        .select()
        .single();

      if (!error && data) {
        savedTruck = data;
      } else if (error) {
        console.warn('Error al insertar camión en Supabase:', error.message);
      }
    } catch (dbErr) {
      console.warn('Supabase DB error en createTruck:', dbErr.message);
    }

    if (!savedTruck) {
      savedTruck = {
        id: `trk-${Date.now().toString().slice(-4)}`,
        ...payload,
        created_at: new Date().toISOString()
      };
      LOCAL_TRUCKS.push(savedTruck);
    }

    return successResponse(res, 'Camión incorporado a la flota', savedTruck, 201);
  } catch (err) {
    return errorResponse(res, 'Error al crear camión', err, 500);
  }
};

/**
 * Registrar Entrada / Salida en la Bitácora de Flota
 */
export const registerFleetLog = async (req, res) => {
  try {
    const { truck_id, driver_name, action, odometer_km, fuel_level_percent, waste_weight_kg, notes } = req.body;

    if (!truck_id || !driver_name || !action) {
      return errorResponse(res, 'ID de camión, nombre del conductor y acción (ENTRADA/SALIDA) son requeridos', null, 400);
    }

    let realTruckUUID = truck_id;
    let truckCode = truck_id;
    let truckPlate = '';
    let currentTruckStatus = null;

    // 1. Resolver información y estado actual del camión
    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(truck_id);
    
    try {
      let query = supabase.from('trucks').select('id, code, status, plate_number');
      if (isUUID) {
        query = query.eq('id', truck_id);
      } else {
        query = query.eq('code', truck_id);
      }
      const { data: foundTruck } = await query.maybeSingle();
      if (foundTruck) {
        realTruckUUID = foundTruck.id;
        truckCode = foundTruck.code;
        truckPlate = foundTruck.plate_number;
        currentTruckStatus = foundTruck.status;
      }
    } catch (e) {
      console.warn('Error resolviendo camión en Supabase:', e.message);
    }

    // Fallback local en caso de que no esté en Supabase
    const localTruck = LOCAL_TRUCKS.find(t => t.id === truck_id || t.code === truck_id || t.id === realTruckUUID);
    if (localTruck) {
      if (!currentTruckStatus) currentTruckStatus = localTruck.status;
      if (!truckCode) truckCode = localTruck.code;
      if (!truckPlate) truckPlate = localTruck.plate_number;
    }

    // 2. Validaciones de consistencia física y rangos
    if (fuel_level_percent !== undefined && (fuel_level_percent < 0 || fuel_level_percent > 100)) {
      return errorResponse(res, 'El nivel de combustible debe estar entre 0% y 100%.', null, 400);
    }
    if (waste_weight_kg !== undefined && parseFloat(waste_weight_kg) < 0) {
      return errorResponse(res, 'El peso descargado no puede ser un valor negativo.', null, 400);
    }
    if (odometer_km !== undefined && parseFloat(odometer_km) < 0) {
      return errorResponse(res, 'El kilometraje del odómetro no puede ser un valor negativo.', null, 400);
    }

    // 3. Validar ciclo de operación
    if (action === 'SALIDA' && currentTruckStatus === 'EN_RUTA') {
      return errorResponse(
        res,
        'La unidad ya se encuentra en ruta. Debe registrar su ENTRADA antes de registrar una nueva salida.',
        null,
        400
      );
    }

    if (action === 'ENTRADA' && currentTruckStatus === 'DISPONIBLE') {
      return errorResponse(
        res,
        'La unidad ya se encuentra en base como disponible. Debe registrar una SALIDA primero.',
        null,
        400
      );
    }

    const payload = {
      truck_id: realTruckUUID,
      driver_name,
      action,
      odometer_km: odometer_km ? parseFloat(odometer_km) : 0,
      fuel_level_percent: fuel_level_percent !== undefined ? parseInt(fuel_level_percent, 10) : 100,
      waste_weight_kg: waste_weight_kg ? parseFloat(waste_weight_kg) : 0,
      notes: notes || '',
      timestamp: new Date().toISOString()
    };

    let savedLog = null;
    const newTruckStatus = action === 'SALIDA' ? 'EN_RUTA' : 'DISPONIBLE';

    try {
      const { data: logData, error: logError } = await supabase
        .from('fleet_logs')
        .insert([payload])
        .select('*, trucks(code, plate_number, model)')
        .single();

      if (!logError && logData) {
        savedLog = logData;
        const truckUpdates = { status: newTruckStatus };
        if (payload.odometer_km && payload.odometer_km > 0) {
          truckUpdates.current_odometer = payload.odometer_km;
        }
        await supabase.from('trucks').update(truckUpdates).eq('id', realTruckUUID);
      } else if (logError) {
        console.warn('Error al insertar en fleet_logs de Supabase:', logError.message);
      }
    } catch (dbErr) {
      console.warn('Error conectando a fleet_logs:', dbErr.message);
    }

    if (localTruck) {
      localTruck.status = newTruckStatus;
      if (payload.odometer_km && payload.odometer_km > 0) {
        localTruck.current_odometer = payload.odometer_km;
      }
    }

    if (!savedLog) {
      savedLog = {
        id: `log-${Date.now().toString().slice(-4)}`,
        ...payload,
        trucks: { code: truckCode, plate_number: truckPlate || 'AABC' }
      };
      LOCAL_FLEET_LOGS.unshift(savedLog);
    }

    return successResponse(res, `Registro de ${action} grabado con éxito`, savedLog, 201);
  } catch (err) {
    return errorResponse(res, 'Error al procesar el registro de flota', err, 500);
  }
};

/**
 * Consultar historial de bitácora de entradas/salidas
 */
export const getFleetLogs = async (req, res) => {
  try {
    const { truck_id, limit = 50 } = req.query;

    let logs = [];

    try {
      let query = supabase
        .from('fleet_logs')
        .select('*, trucks(code, plate_number, model)')
        .order('timestamp', { ascending: false })
        .limit(Number(limit));

      if (truck_id) query = query.eq('truck_id', truck_id);

      const { data, error } = await query;
      if (!error && data) {
        logs = data;
      }
    } catch (dbErr) {
      console.warn('Fallback en getFleetLogs:', dbErr.message);
    }

    if (logs.length === 0) {
      logs = LOCAL_FLEET_LOGS;
    }

    return successResponse(res, 'Historial de bitácora obtenido', logs);
  } catch (err) {
    return errorResponse(res, 'Error al consultar bitácora', err, 500);
  }
};

/**
 * Actualizar telemetría GPS del camión
 */
export const updateTruckLocation = async (req, res) => {
  try {
    const { id } = req.params;
    const { latitude, longitude } = req.body;

    if (latitude === undefined || longitude === undefined) {
      return errorResponse(res, 'Coordenadas requeridas', null, 400);
    }

    const lat = parseFloat(latitude);
    const lng = parseFloat(longitude);
    const last_ping = new Date().toISOString();

    try {
      const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
      let query = supabase.from('trucks').update({ current_lat: lat, current_lng: lng, last_ping });
      if (isUUID) {
        query = query.eq('id', id);
      } else {
        query = query.eq('code', id);
      }
      await query;
    } catch (dbErr) {
      console.warn('Fallback en updateTruckLocation');
    }

    const tIdx = LOCAL_TRUCKS.findIndex(t => t.id === id || t.code === id);
    if (tIdx !== -1) {
      LOCAL_TRUCKS[tIdx].current_lat = lat;
      LOCAL_TRUCKS[tIdx].current_lng = lng;
    }

    return successResponse(res, 'Ubicación de camión actualizada', { id, latitude: lat, longitude: lng });
  } catch (err) {
    return errorResponse(res, 'Error al procesar GPS de camión', err, 500);
  }
};

/**
 * Asignar o desasignar un chofer a un camión (Admin / Supervisor)
 * PUT /api/fleet/trucks/:id/assign-driver
 * Body: { userId: string | null }
 */
export const assignDriverToTruck = async (req, res) => {
  try {
    const { id } = req.params;
    const { userId } = req.body;

    const assignedUserId = userId && typeof userId === 'string' && userId.trim() ? userId.trim() : null;

    let updatedTruck = null;

    try {
      // Resolver el ID real del camión destino
      const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
      let targetTruckId = id;

      if (!isUUID) {
        // Resolver UUID a partir del código
        const { data: truckByCode } = await supabase
          .from('trucks')
          .select('id')
          .eq('code', id)
          .maybeSingle();
        if (truckByCode?.id) targetTruckId = truckByCode.id;
      }

      // Si se va a asignar un chofer concreto, liberar primero su camión anterior (si existe)
      if (assignedUserId) {
        const { data: previousTruck } = await supabase
          .from('trucks')
          .select('id, code')
          .eq('assigned_user_id', assignedUserId)
          .neq('id', targetTruckId)
          .maybeSingle();

        if (previousTruck) {
          await supabase
            .from('trucks')
            .update({ assigned_user_id: null })
            .eq('id', previousTruck.id);

          // Sincronizar fallback local
          const localPrev = LOCAL_TRUCKS.find(t => t.id === previousTruck.id);
          if (localPrev) localPrev.assigned_user_id = null;

          console.info(`Chofer ${assignedUserId} desvinculado del camión anterior ${previousTruck.code} antes de reasignar.`);
        }
      }

      // Asignar al camión destino
      const { data, error } = await supabase
        .from('trucks')
        .update({ assigned_user_id: assignedUserId })
        .eq('id', targetTruckId)
        .select('*, routes(name, zone)')
        .single();

      if (!error && data) {
        updatedTruck = data;
      } else if (error) {
        console.warn('Error al asignar chofer en Supabase:', error.message);
      }
    } catch (dbErr) {
      console.warn('Supabase DB error en assignDriverToTruck:', dbErr.message);
    }

    if (!updatedTruck) {
      const tIdx = LOCAL_TRUCKS.findIndex(t => t.id === id || t.code === id);
      if (tIdx !== -1) {
        LOCAL_TRUCKS[tIdx].assigned_user_id = assignedUserId;
        updatedTruck = LOCAL_TRUCKS[tIdx];
      }
    }

    if (!updatedTruck) {
      return errorResponse(res, 'Camión no encontrado para asignar chofer', null, 404);
    }

    const msg = assignedUserId
      ? 'Chofer asignado al camión exitosamente'
      : 'Camión desasignado correctamente';

    return successResponse(res, msg, updatedTruck);
  } catch (err) {
    return errorResponse(res, 'Error al asignar chofer al camión', err, 500);
  }
};

/**
 * Obtener el camión asignado al usuario logueado
 * GET /api/fleet/my-truck
 */
export const getMyTruck = async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return errorResponse(res, 'Usuario no autenticado', null, 401);
    }

    let myTruck = null;

    try {
      const { data, error } = await supabase
        .from('trucks')
        .select('*, routes(name, zone, shift, schedule_days, start_time, end_time)')
        .eq('assigned_user_id', userId)
        .maybeSingle();

      if (!error && data) {
        myTruck = data;
      }
    } catch (dbErr) {
      console.warn('DB error en getMyTruck:', dbErr.message);
    }

    if (!myTruck) {
      myTruck = LOCAL_TRUCKS.find(t => t.assigned_user_id === userId) || null;
    }

    if (!myTruck) {
      return successResponse(res, 'No tenés un camión asignado, contactá a tu supervisor', null);
    }

    return successResponse(res, 'Camión asignado obtenido exitosamente', myTruck);
  } catch (err) {
    return errorResponse(res, 'Error al consultar camión del usuario', err, 500);
  }
};

/**
 * Reportar una avería o problema mecánico en el camión asignado
 * POST /api/fleet/trucks/:id/report-issue
 * Body: { issueType: string, description: string } (con foto opcional)
 */
export const reportTruckIssue = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;
    const { issueType, description } = req.body;

    if (!userId) {
      return errorResponse(res, 'Usuario no autenticado', null, 401);
    }

    // 1. Obtener y validar pertenencia del camión
    let targetTruck = null;
    try {
      const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
      let query = supabase.from('trucks').select('*');
      if (isUUID) {
        query = query.eq('id', id);
      } else {
        query = query.eq('code', id);
      }
      const { data, error } = await query.single();
      if (!error && data) {
        targetTruck = data;
      }
    } catch (dbErr) {
      console.warn('DB error buscando camión:', dbErr.message);
    }

    if (!targetTruck) {
      targetTruck = LOCAL_TRUCKS.find(t => t.id === id || t.code === id);
    }

    if (!targetTruck) {
      return errorResponse(res, 'Camión no encontrado', null, 404);
    }

    // Validar que el camión esté asignado a este usuario
    if (targetTruck.assigned_user_id !== userId) {
      return errorResponse(
        res,
        'Acceso denegado: Solo puedes reportar averías en el camión que tienes asignado',
        null,
        403
      );
    }

    // 2. Procesar fotografía opcional si viene adjunta
    let photoUrl = null;
    if (req.file) {
      if (!isValidImageBuffer(req.file.buffer)) {
        return errorResponse(res, 'El archivo adjunto no es una imagen válida o está dañado.', null, 400);
      }

      const ext = path.extname(req.file.originalname).toLowerCase() || '.jpg';
      const fileName = `issues/${Date.now()}-${targetTruck.code || 'cam'}${ext}`;

      try {
        const { error: uploadError } = await supabase.storage
          .from('denuncias-fotos')
          .upload(fileName, req.file.buffer, {
            contentType: req.file.mimetype || 'image/jpeg',
            cacheControl: '3600',
            upsert: false
          });

        if (!uploadError) {
          const { data: publicUrlData } = supabase.storage
            .from('denuncias-fotos')
            .getPublicUrl(fileName);
          photoUrl = publicUrlData?.publicUrl || null;
        } else {
          console.warn('Error subiendo foto de avería a Supabase Storage:', uploadError.message);
        }
      } catch (uploadErr) {
        console.warn('Fallo en subida de imagen de avería:', uploadErr.message);
      }
    }

    // 3. Registrar en fleet_logs
    const driverName = req.user.user_metadata?.name || req.user.email || 'Chofer Municipal';
    const notesText = `[AVERÍA - ${issueType || 'MECÁNICA'}] ${description || 'Sin detalles'}${photoUrl ? ` | Foto: ${photoUrl}` : ''}`;

    const logPayload = {
      truck_id: targetTruck.id,
      driver_name: driverName,
      action: 'AVERIA',
      odometer_km: targetTruck.odometer_km || 0,
      fuel_level_percent: 100,
      waste_weight_kg: 0,
      notes: notesText,
      timestamp: new Date().toISOString()
    };

    let savedLog = null;
    try {
      const { data, error } = await supabase
        .from('fleet_logs')
        .insert([logPayload])
        .select('*, trucks(code, plate_number, model)')
        .single();
      if (!error && data) {
        savedLog = data;
      }
    } catch (logErr) {
      console.warn('Error insertando fleet_log de avería:', logErr.message);
    }

    if (!savedLog) {
      savedLog = {
        id: `log-${Date.now().toString().slice(-4)}`,
        ...logPayload,
        trucks: { code: targetTruck.code, plate_number: targetTruck.plate_number }
      };
      LOCAL_FLEET_LOGS.unshift(savedLog);
    }

    // 4. Actualizar status del camión a 'FUERA_DE_SERVICIO'
    const newStatus = 'FUERA_DE_SERVICIO';
    try {
      await supabase
        .from('trucks')
        .update({ status: newStatus })
        .eq('id', targetTruck.id);
    } catch (updateErr) {
      console.warn('Error actualizando estado del camión averiado:', updateErr.message);
    }

    targetTruck.status = newStatus;
    const localT = LOCAL_TRUCKS.find(t => t.id === targetTruck.id);
    if (localT) localT.status = newStatus;

    return successResponse(
      res,
      'Avería reportada exitosamente. La unidad ha sido marcada como FUERA DE SERVICIO.',
      {
        log: savedLog,
        truck: { ...targetTruck, status: newStatus },
        photoUrl
      },
      201
    );
  } catch (err) {
    return errorResponse(res, 'Error al procesar el reporte de avería', err, 500);
  }
};

/**
 * Obtener la ruta de navegación activa de un camión recolector (OpenRouteService + Cache)
 * Calcula el destino usando el CENTROIDE ponderado de los barrios asignados en truck_routes.
 * GET /api/fleet/trucks/:id/route
 */
export const getTruckRouteById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!id) {
      return errorResponse(res, 'ID de camión requerido', null, 400);
    }

    // 1. Verificar Cache en Memoria (TTL: 3 minutos)
    const cached = truckRouteCache.get(id);
    if (cached && (Date.now() - cached.timestamp < ROUTE_CACHE_TTL_MS)) {
      return successResponse(res, 'Ruta de camión obtenida (cache)', cached.data);
    }

    // 2. Buscar camión en base de datos o fallback
    let truck = null;
    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);

    try {
      let query = supabase
        .from('trucks')
        .select('*');

      if (isUUID) {
        query = query.eq('id', id);
      } else {
        query = query.eq('code', id);
      }

      const { data, error } = await query.maybeSingle();
      if (!error && data) {
        truck = data;
      }
    } catch (dbErr) {
      console.warn('Error buscando camión para ruta:', dbErr.message);
    }

    if (!truck) {
      truck = LOCAL_TRUCKS.find(t => t.id === id || t.code === id);
    }

    if (!truck) {
      const notFoundPayload = { route: null, reason: 'camion_no_encontrado', id };
      truckRouteCache.set(id, { data: notFoundPayload, timestamp: Date.now() });
      return successResponse(res, 'Camión no encontrado o sin ruta', notFoundPayload);
    }

    // 3. Resolver los barrios/rutas asignados vía truck_routes (N:M)
    let assignedRoutes = [];
    try {
      const { data: trData, error: trErr } = await supabase
        .from('truck_routes')
        .select('*, routes(*)')
        .eq('truck_id', truck.id);

      if (!trErr && trData && trData.length > 0) {
        assignedRoutes = trData.map(tr => tr.routes).filter(Boolean);
      }
    } catch (dbErr) {
      console.warn('Fallback a truck_routes locales:', dbErr.message);
    }

    if (assignedRoutes.length === 0) {
      const localTR = LOCAL_TRUCK_ROUTES.filter(tr => tr.truck_id === truck.id || tr.truck_id === truck.code);
      if (localTR.length > 0) {
        const routeIds = localTR.map(tr => tr.route_id);
        try {
          const { data: rData } = await supabase.from('routes').select('*').in('id', routeIds);
          if (rData && rData.length > 0) assignedRoutes = rData;
        } catch (e) {}
        if (assignedRoutes.length === 0) {
          assignedRoutes = OFFICIAL_ROUTES.filter(r => routeIds.includes(r.id) || routeIds.includes(r.name));
        }
      }
    }

    // Si el camión no tiene rutas asignadas en truck_routes
    if (assignedRoutes.length === 0) {
      const emptyResult = {
        route: null,
        reason: 'sin_ruta_asignada',
        truck: {
          id: truck.id,
          code: truck.code,
          status: truck.status
        }
      };
      // Cachear respuesta vacía para no re-ejecutar en bucle
      truckRouteCache.set(id, { data: emptyResult, timestamp: Date.now() });
      return successResponse(res, 'Camión sin ruta asignada', emptyResult);
    }

    // 4. Calcular CENTROIDE ponderado del conjunto de barrios asignados
    let sumLat = 0;
    let sumLng = 0;
    let validCentroids = 0;

    for (const r of assignedRoutes) {
      const centroid = getZoneCentroid(r.name || r.zone);
      if (centroid && !isNaN(centroid.lat) && !isNaN(centroid.lng)) {
        sumLat += centroid.lat;
        sumLng += centroid.lng;
        validCentroids++;
      }
    }

    if (validCentroids === 0) {
      return successResponse(res, 'No se pudo resolver el centroide de los barrios asignados', {
        route: null,
        reason: 'centroide_invalido',
        truck: { id: truck.id, code: truck.code }
      });
    }

    const firstRoute = assignedRoutes[0];
    const targetCentroid = {
      lat: Number((sumLat / validCentroids).toFixed(5)),
      lng: Number((sumLng / validCentroids).toFixed(5)),
      name: assignedRoutes.length === 1 
        ? firstRoute.name 
        : `Circuito ${firstRoute.shift || ''} (${assignedRoutes.length} barrios)`
    };

    // 5. Coordenadas de origen del camión (con fallback a base municipal)
    const truckLat = truck.current_lat ?? truck.lat ?? -25.2867;
    const truckLng = truck.current_lng ?? truck.lng ?? -57.6470;

    // 6. Consultar servicio OpenRouteService
    const orsRouteResult = await getTruckRoute(truckLat, truckLng, targetCentroid.lat, targetCentroid.lng);

    const payload = {
      truck: {
        id: truck.id,
        code: truck.code,
        plate_number: truck.plate_number || 'S/D',
        status: truck.status || 'DISPONIBLE',
        current_lat: truckLat,
        current_lng: truckLng
      },
      routeInfo: {
        id: firstRoute.id || null,
        name: targetCentroid.name,
        zone: firstRoute.zone || 'Circuito Asignado',
        shift: firstRoute.shift || 'Mañana',
        schedule_days: firstRoute.schedule_days || [],
        color_hex: firstRoute.color_hex || '#0284c7',
        assignedCount: assignedRoutes.length,
        barrios: assignedRoutes.map(r => r.name)
      },
      destination: targetCentroid,
      route: orsRouteResult
    };

    // 7. Guardar en Cache en memoria
    truckRouteCache.set(id, { data: payload, timestamp: Date.now() });
    if (truck.id && truck.id !== id) {
      truckRouteCache.set(truck.id, { data: payload, timestamp: Date.now() });
    }
    if (truck.code && truck.code !== id) {
      truckRouteCache.set(truck.code, { data: payload, timestamp: Date.now() });
    }

    return successResponse(res, 'Ruta de camión obtenida exitosamente', payload);
  } catch (err) {
    return errorResponse(res, 'Error al procesar la ruta del camión', err, 500);
  }
};

/**
 * Obtener las rutas/barrios asignados a un camión específico
 * GET /api/fleet/trucks/:id/routes
 */
export const getTruckRoutes = async (req, res) => {
  try {
    const { id } = req.params;
    let targetTruckId = id;

    // Resolver ID canónico si viene código (ej. CAM-01)
    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
    if (!isUUID) {
      try {
        const { data: t } = await supabase.from('trucks').select('id').eq('code', id).maybeSingle();
        if (t?.id) targetTruckId = t.id;
      } catch (e) {}
      if (targetTruckId === id) {
        const localT = LOCAL_TRUCKS.find(t => t.code === id || t.id === id);
        if (localT) targetTruckId = localT.id;
      }
    }

    let assignedRoutes = [];
    try {
      const { data, error } = await supabase
        .from('truck_routes')
        .select('*, routes(*)')
        .eq('truck_id', targetTruckId);

      if (!error && data && data.length > 0) {
        assignedRoutes = data.map(tr => tr.routes).filter(Boolean);
      }
    } catch (dbErr) {
      console.warn('Fallback a truck_routes locales:', dbErr.message);
    }

    if (assignedRoutes.length === 0) {
      const localTR = LOCAL_TRUCK_ROUTES.filter(tr => tr.truck_id === targetTruckId || tr.truck_id === id);
      if (localTR.length > 0) {
        const routeIds = localTR.map(tr => tr.route_id);
        try {
          const { data: rData } = await supabase.from('routes').select('*').in('id', routeIds);
          if (rData && rData.length > 0) assignedRoutes = rData;
        } catch (e) {}
        if (assignedRoutes.length === 0) {
          assignedRoutes = OFFICIAL_ROUTES.filter(r => routeIds.includes(r.id) || routeIds.includes(r.name));
        }
      }
    }

    return successResponse(res, 'Rutas asignadas al camión obtenidas', assignedRoutes);
  } catch (err) {
    return errorResponse(res, 'Error al consultar rutas del camión', err, 500);
  }
};

/**
 * Listar barrios/rutas disponibles para asignar a un camión
 * Filtra por turno y días requeridos, excluyendo los ya asignados a otros camiones
 * GET /api/fleet/routes/available-for-truck?shift=X&days=Y&excludeTruckId=Z
 */
export const getAvailableRoutesForTruck = async (req, res) => {
  try {
    const { shift, days, excludeTruckId } = req.query;

    let allRoutes = [];
    try {
      const { data, error } = await supabase
        .from('routes')
        .select('*')
        .eq('is_active', true)
        .order('name', { ascending: true });

      if (!error && data && data.length > 0) {
        allRoutes = data;
      }
    } catch (dbErr) {
      console.warn('Error consultando routes en Supabase:', dbErr.message);
    }

    if (allRoutes.length === 0) {
      allRoutes = OFFICIAL_ROUTES;
    }

    // Filtrar por shift si se especificó
    if (shift && shift !== 'ALL') {
      allRoutes = allRoutes.filter(r => r.shift?.toLowerCase() === shift.toLowerCase());
    }

    // Filtrar por schedule_days si se especificó
    if (days && days !== 'ALL') {
      const targetDaysStr = typeof days === 'string' ? days : JSON.stringify(days);
      const isMJS = targetDaysStr.includes('Martes') || targetDaysStr.includes('M-J-S') || targetDaysStr.includes('MARTES');
      const isLMV = targetDaysStr.includes('Lunes') || targetDaysStr.includes('L-M-V') || targetDaysStr.includes('LUNES');

      allRoutes = allRoutes.filter(r => {
        const rDays = Array.isArray(r.schedule_days) ? r.schedule_days.join(',') : (r.schedule_days || '');
        if (isMJS) return rDays.includes('Martes') || rDays.includes('Jueves');
        if (isLMV) return rDays.includes('Lunes') || rDays.includes('Miércoles');
        return true;
      });
    }

    // Obtener IDs de rutas ocupadas por OTROS camiones
    const occupiedRouteIds = new Set();
    try {
      const { data: occupiedData, error } = await supabase.from('truck_routes').select('route_id, truck_id');
      if (!error && occupiedData) {
        occupiedData.forEach(row => {
          if (!excludeTruckId || (row.truck_id !== excludeTruckId)) {
            occupiedRouteIds.add(row.route_id);
          }
        });
      }
    } catch (e) {
      console.warn('Error verificando truck_routes ocupadas:', e.message);
    }

    LOCAL_TRUCK_ROUTES.forEach(row => {
      if (!excludeTruckId || (row.truck_id !== excludeTruckId)) {
        occupiedRouteIds.add(row.route_id);
      }
    });

    const availableRoutes = allRoutes.filter(r => !occupiedRouteIds.has(r.id));

    return successResponse(res, 'Rutas disponibles para asignación obtenidas', availableRoutes);
  } catch (err) {
    return errorResponse(res, 'Error al consultar rutas disponibles', err, 500);
  }
};

/**
 * Reemplazar / Sincronizar el conjunto de rutas asignadas a un camión
 * PUT /api/fleet/trucks/:id/routes
 * Body: { routeIds: [uuid, uuid, ...] }
 */
export const updateTruckRoutes = async (req, res) => {
  try {
    const { id } = req.params;
    const { routeIds } = req.body;
    const userId = req.user?.id || null;

    if (!Array.isArray(routeIds)) {
      return errorResponse(res, 'El campo routeIds debe ser un arreglo de IDs de rutas', null, 400);
    }

    // 1. Resolver el camión
    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
    let targetTruck = null;

    try {
      let query = supabase.from('trucks').select('id, code');
      if (isUUID) query = query.eq('id', id);
      else query = query.eq('code', id);
      const { data } = await query.maybeSingle();
      if (data) targetTruck = data;
    } catch (e) {}

    if (!targetTruck) {
      targetTruck = LOCAL_TRUCKS.find(t => t.id === id || t.code === id);
    }

    if (!targetTruck) {
      return errorResponse(res, 'Camión no encontrado', null, 404);
    }

    const targetTruckId = targetTruck.id;

    // Caso de limpieza de circuito (array vacío)
    if (routeIds.length === 0) {
      try {
        await supabase.from('truck_routes').delete().eq('truck_id', targetTruckId);
      } catch (e) {}
      LOCAL_TRUCK_ROUTES = LOCAL_TRUCK_ROUTES.filter(tr => tr.truck_id !== targetTruckId && tr.truck_id !== targetTruck.code);
      truckRouteCache.delete(id);
      truckRouteCache.delete(targetTruckId);
      truckRouteCache.delete(targetTruck.code);

      return successResponse(res, 'Circuito de rutas limpiado correctamente', []);
    }

    // 2. Cargar detalles de las rutas seleccionadas
    let selectedRoutes = [];
    try {
      const { data: routesData, error } = await supabase
        .from('routes')
        .select('*')
        .in('id', routeIds);

      if (!error && routesData && routesData.length > 0) {
        selectedRoutes = routesData;
      }
    } catch (e) {}

    if (selectedRoutes.length === 0) {
      selectedRoutes = OFFICIAL_ROUTES.filter(r => routeIds.includes(r.id) || routeIds.includes(r.name));
    }

    if (selectedRoutes.length === 0) {
      return errorResponse(res, 'No se encontraron las rutas especificadas', null, 404);
    }

    // 3. VALIDACIÓN 1: Homogeneidad de Turno y Cronograma de Días
    const uniqueShifts = new Set(selectedRoutes.map(r => r.shift));
    const uniqueDaySignatures = new Set(
      selectedRoutes.map(r => {
        const days = Array.isArray(r.schedule_days) ? r.schedule_days : (r.schedule_days ? [r.schedule_days] : []);
        return days.slice().sort().join(',');
      })
    );

    if (uniqueShifts.size > 1 || uniqueDaySignatures.size > 1) {
      return errorResponse(
        res,
        'Inconsistencia de circuito: Todos los barrios asignados a un camión deben compartir el mismo Turno y el mismo Cronograma de Días.',
        {
          shifts: [...uniqueShifts],
          daySchedules: [...uniqueDaySignatures]
        },
        400
      );
    }

    // 4. VALIDACIÓN 2: Exclusividad Barrial (no asignado a otro camión)
    try {
      const { data: occupiedData, error: occErr } = await supabase
        .from('truck_routes')
        .select('route_id, truck_id, trucks(code, plate_number), routes(name)')
        .in('route_id', routeIds)
        .neq('truck_id', targetTruckId);

      if (!occErr && occupiedData && occupiedData.length > 0) {
        const conflict = occupiedData[0];
        const conflictBarrio = conflict.routes?.name || conflict.route_id;
        const conflictTruckCode = conflict.trucks?.code || conflict.truck_id;

        return res.status(409).json({
          success: false,
          message: `El barrio "${conflictBarrio}" ya se encuentra asignado a la unidad ${conflictTruckCode}. Debe desasignarlo antes de transferirlo.`,
          conflict: {
            routeId: conflict.route_id,
            barrio: conflictBarrio,
            truckId: conflict.truck_id,
            truckCode: conflictTruckCode
          }
        });
      }
    } catch (e) {
      console.warn('Error validando exclusividad en Supabase:', e.message);
    }

    // Validación local de exclusividad
    const localConflict = LOCAL_TRUCK_ROUTES.find(
      tr => routeIds.includes(tr.route_id) && tr.truck_id !== targetTruckId && tr.truck_id !== targetTruck.code
    );
    if (localConflict) {
      const confTruck = LOCAL_TRUCKS.find(t => t.id === localConflict.truck_id);
      const confRoute = OFFICIAL_ROUTES.find(r => r.id === localConflict.route_id || r.name === localConflict.route_id);
      return res.status(409).json({
        success: false,
        message: `El barrio "${confRoute?.name || localConflict.route_id}" ya se encuentra asignado a la unidad ${confTruck?.code || localConflict.truck_id}.`,
        conflict: {
          routeId: localConflict.route_id,
          truckId: localConflict.truck_id,
          truckCode: confTruck?.code
        }
      });
    }

    // 5. Persistencia / Sync en Supabase
    try {
      // Eliminar asignaciones anteriores
      await supabase.from('truck_routes').delete().eq('truck_id', targetTruckId);

      // Insertar nuevas
      const insertPayload = routeIds.map(rId => ({
        truck_id: targetTruckId,
        route_id: rId,
        assigned_at: new Date().toISOString(),
        assigned_by: userId
      }));

      const { error: insertErr } = await supabase.from('truck_routes').insert(insertPayload);
      if (insertErr) {
        console.warn('Error insertando en truck_routes Supabase:', insertErr.message);
      }
    } catch (dbErr) {
      console.warn('Error en sync de truck_routes en Supabase:', dbErr.message);
    }

    // Sincronizar estado en memoria
    LOCAL_TRUCK_ROUTES = LOCAL_TRUCK_ROUTES.filter(tr => tr.truck_id !== targetTruckId && tr.truck_id !== targetTruck.code);
    routeIds.forEach(rId => {
      LOCAL_TRUCK_ROUTES.push({
        id: `tr-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        truck_id: targetTruckId,
        route_id: rId,
        assigned_at: new Date().toISOString(),
        assigned_by: userId
      });
    });

    // 6. Invalidar Caché de Rutas ORS
    truckRouteCache.delete(id);
    truckRouteCache.delete(targetTruckId);
    truckRouteCache.delete(targetTruck.code);

    return successResponse(res, `Circuito asignado exitosamente (${selectedRoutes.length} barrios)`, selectedRoutes);
  } catch (err) {
    return errorResponse(res, 'Error al actualizar rutas del camión', err, 500);
  }
};

/**
 * Obtener rutas asignadas al chofer logueado
 * GET /api/fleet/my-routes
 */
export const getMyRoutes = async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return errorResponse(res, 'Usuario no autenticado', null, 401);
    }

    // 1. Obtener camión asignado al chofer
    let myTruck = null;
    try {
      const { data, error } = await supabase
        .from('trucks')
        .select('*')
        .eq('assigned_user_id', userId)
        .maybeSingle();

      if (!error && data) myTruck = data;
    } catch (e) {}

    if (!myTruck) {
      myTruck = LOCAL_TRUCKS.find(t => t.assigned_user_id === userId) || null;
    }

    if (!myTruck) {
      return successResponse(res, 'No tienes un camión asignado actualmente', { truck: null, routes: [] });
    }

    // 2. Obtener rutas asignadas a este camión
    let assignedRoutes = [];
    try {
      const { data, error } = await supabase
        .from('truck_routes')
        .select('*, routes(*)')
        .eq('truck_id', myTruck.id);

      if (!error && data && data.length > 0) {
        assignedRoutes = data.map(tr => tr.routes).filter(Boolean);
      }
    } catch (e) {}

    if (assignedRoutes.length === 0) {
      const localTR = LOCAL_TRUCK_ROUTES.filter(tr => tr.truck_id === myTruck.id);
      if (localTR.length > 0) {
        const routeIds = localTR.map(tr => tr.route_id);
        try {
          const { data: rData } = await supabase.from('routes').select('*').in('id', routeIds);
          if (rData && rData.length > 0) assignedRoutes = rData;
        } catch (e) {}
        if (assignedRoutes.length === 0) {
          assignedRoutes = OFFICIAL_ROUTES.filter(r => routeIds.includes(r.id) || routeIds.includes(r.name));
        }
      }
    }

    return successResponse(res, 'Rutas asignadas al chofer obtenidas', {
      truck: myTruck,
      routes: assignedRoutes
    });
  } catch (err) {
    return errorResponse(res, 'Error al consultar rutas del chofer', err, 500);
  }
};

/**
 * Resetea el contador de mantenimiento preventivo de un camión
 * PATCH /api/fleet/trucks/:id/maintenance
 */
export const resetTruckMaintenance = async (req, res) => {
  try {
    const { id } = req.params;
    if (!id) {
      return errorResponse(res, 'El ID del camión es obligatorio', null, 400);
    }

    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
    let currentOdometer = 0;
    let updatedTruck = null;

    // 1. Obtener odómetro actual y actualizar en Supabase
    try {
      let query = supabase.from('trucks').select('*');
      if (isUUID) {
        query = query.eq('id', id);
      } else {
        query = query.eq('code', id);
      }
      const { data: foundTruck } = await query.maybeSingle();
      if (foundTruck) {
        currentOdometer = foundTruck.current_odometer || 0;
        const realId = foundTruck.id;

        const { data: updated, error } = await supabase
          .from('trucks')
          .update({
            last_maintenance_km: currentOdometer
          })
          .eq('id', realId)
          .select()
          .single();

        if (!error && updated) {
          updatedTruck = updated;
        }
      }
    } catch (dbErr) {
      console.warn('Error en Supabase resetTruckMaintenance:', dbErr.message);
    }

    // Fallback local en memoria
    const localTruck = LOCAL_TRUCKS.find(t => t.id === id || t.code === id);
    if (localTruck) {
      currentOdometer = localTruck.current_odometer || currentOdometer || 0;
      localTruck.last_maintenance_km = currentOdometer;
      if (!updatedTruck) {
        updatedTruck = { ...localTruck };
      }
    }

    if (!updatedTruck) {
      return errorResponse(res, 'No se encontró el camión para registrar el mantenimiento', null, 404);
    }

    return successResponse(
      res,
      `Mantenimiento registrado con éxito. Odómetro base actualizado a ${currentOdometer} km.`,
      updatedTruck
    );
  } catch (err) {
    return errorResponse(res, 'Error al resetear mantenimiento del camión', err, 500);
  }
};

