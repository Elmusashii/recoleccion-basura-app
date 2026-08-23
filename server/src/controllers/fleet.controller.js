import path from 'path';
import { supabase } from '../config/supabase.js';
import { successResponse, errorResponse } from '../utils/response.js';
import { isValidImageBuffer } from '../middlewares/upload.js';

let LOCAL_TRUCKS = [
  { id: 'trk-01', code: 'CAM-01', plate_number: 'AABC 101', model: 'Mercedes-Benz Atego 1726', capacity_tons: 12.0, status: 'EN_RUTA', current_lat: -25.2930, current_lng: -57.5810 },
  { id: 'trk-02', code: 'CAM-02', plate_number: 'AABC 202', model: 'Scania P280 Basurero', capacity_tons: 15.0, status: 'EN_RUTA', current_lat: -25.2970, current_lng: -57.6560 },
  { id: 'trk-03', code: 'CAM-03', plate_number: 'AABC 303', model: 'Volkswagen Constellation', capacity_tons: 10.0, status: 'DISPONIBLE', current_lat: -25.2430, current_lng: -57.5520 },
  { id: 'trk-04', code: 'CAM-04', plate_number: 'AABC 404', model: 'Iveco Tector Attack', capacity_tons: 12.0, status: 'DISPONIBLE', current_lat: -25.3080, current_lng: -57.6350 }
];

let LOCAL_FLEET_LOGS = [
  { id: 'log-01', truck_id: 'trk-01', driver_name: 'Ramón González', action: 'SALIDA', odometer_km: 45210, fuel_level_percent: 90, waste_weight_kg: 0, notes: 'Ruta Villa Morra Nocturna', timestamp: '2026-08-20T18:45:00.000Z' },
  { id: 'log-02', truck_id: 'trk-02', driver_name: 'Jorge Benítez', action: 'ENTRADA', odometer_km: 68140, fuel_level_percent: 45, waste_weight_kg: 6800, notes: 'Descarga completa en Cateura', timestamp: '2026-08-20T17:30:00.000Z' },
  { id: 'log-03', truck_id: 'trk-03', driver_name: 'Alcides Martínez', action: 'SALIDA', odometer_km: 32100, fuel_level_percent: 100, waste_weight_kg: 0, notes: 'Ruta Loma Pytã Matutina', timestamp: '2026-08-20T06:00:00.000Z' }
];

/**
 * Listar camiones recolectores
 */
export const getTrucks = async (req, res) => {
  try {
    let trucks = [];

    try {
      const { data, error } = await supabase
        .from('trucks')
        .select('*, routes(name, zone)')
        .order('code', { ascending: true });

      if (!error && data && data.length > 0) {
        trucks = data;
      }
    } catch (dbErr) {
      console.warn('Fallback a camiones locales:', dbErr.message);
    }

    if (trucks.length === 0) {
      trucks = LOCAL_TRUCKS;
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

    currentTruckStatus = currentTruckStatus || 'DISPONIBLE';

    // 2. Validar ciclo de operación
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
        await supabase.from('trucks').update({ status: newTruckStatus }).eq('id', realTruckUUID);
      } else if (logError) {
        console.warn('Error al insertar en fleet_logs de Supabase:', logError.message);
      }
    } catch (dbErr) {
      console.warn('Error conectando a fleet_logs:', dbErr.message);
    }

    if (localTruck) {
      localTruck.status = newTruckStatus;
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
      const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
      let query = supabase
        .from('trucks')
        .update({ assigned_user_id: assignedUserId })
        .select('*, routes(name, zone)');

      if (isUUID) {
        query = query.eq('id', id);
      } else {
        query = query.eq('code', id);
      }

      const { data, error } = await query.single();
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

