import { supabase } from '../config/supabase.js';
import { successResponse, errorResponse } from '../utils/response.js';

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

