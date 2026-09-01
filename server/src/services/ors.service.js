import axios from 'axios';

const ORS_BASE_URL = 'https://api.openrouteservice.org/v2';
const REQUEST_TIMEOUT_MS = 8000;

/**
 * Obtiene la API Key de OpenRouteService limpia
 */
const getApiKey = () => {
  return process.env.ORS_API_KEY?.trim() || null;
};

/**
 * Calcula la distancia Haversine en metros entre dos coordenadas (Fallback geográfico)
 */
export const calculateHaversineDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371e3; // Radio de la Tierra en metros
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c; // Metros
};

/**
 * Obtiene la ruta detallada para un camión recolector (driving-hgv)
 * 
 * @param {number} originLat - Latitud de origen
 * @param {number} originLng - Longitud de origen
 * @param {number} destLat - Latitud de destino
 * @param {number} destLng - Longitud de destino
 * @returns {Promise<{ geometry: Object, distanceMeters: number, durationSeconds: number, distanceKm: number, durationMinutes: number } | null>}
 */
export const getTruckRoute = async (originLat, originLng, destLat, destLng) => {
  const apiKey = getApiKey();

  if (!apiKey) {
    console.warn('[ORS Service] ORS_API_KEY no configurada. Omitiendo cálculo de ruta real.');
    return null;
  }

  const oLat = parseFloat(originLat);
  const oLng = parseFloat(originLng);
  const dLat = parseFloat(destLat);
  const dLng = parseFloat(destLng);

  if (isNaN(oLat) || isNaN(oLng) || isNaN(dLat) || isNaN(dLng)) {
    console.warn('[ORS Service] Coordenadas inválidas para cálculo de ruta:', { originLat, originLng, destLat, destLng });
    return null;
  }

  try {
    const url = `${ORS_BASE_URL}/directions/driving-hgv/geojson`;
    const body = {
      coordinates: [
        [oLng, oLat],
        [dLng, dLat]
      ]
    };

    const response = await axios.post(url, body, {
      headers: {
        'Authorization': apiKey,
        'Content-Type': 'application/json',
        'Accept': 'application/json, application/geo+json'
      },
      timeout: REQUEST_TIMEOUT_MS
    });

    const feature = response.data?.features?.[0];
    if (!feature || !feature.geometry) {
      console.warn('[ORS Service] Respuesta de ORS sin geometría válida');
      return null;
    }

    const summary = feature.properties?.summary || {};
    const distanceMeters = summary.distance ? Math.round(summary.distance) : 0;
    const durationSeconds = summary.duration ? Math.round(summary.duration) : 0;

    return {
      geometry: feature.geometry, // GeoJSON LineString: { type: 'LineString', coordinates: [[lng, lat], ...] }
      distanceMeters,
      durationSeconds,
      distanceKm: Number((distanceMeters / 1000).toFixed(2)),
      durationMinutes: Math.round(durationSeconds / 60)
    };
  } catch (err) {
    const status = err.response?.status;
    const errorMessage = err.response?.data?.error?.message || err.message;
    console.error(`[ORS Service Error - getTruckRoute] Status: ${status || 'TIMEOUT/NETWORK'} - ${errorMessage}`);
    return null;
  }
};

/**
 * Calcula matriz de distancias y tiempos de múltiples orígenes (camiones) a un destino (denuncia)
 * 
 * @param {Array<Object|Array<number>>} originsArray - Lista de camiones u orígenes [{ lat, lng, ... }]
 * @param {number} destinationLat - Latitud de destino
 * @param {number} destinationLng - Longitud de destino
 * @returns {Promise<Array<{ originIndex: number, origin: any, distanceMeters: number, durationSeconds: number, distanceKm: number, durationMinutes: number }>>}
 */
export const getDistanceMatrix = async (originsArray, destinationLat, destinationLng) => {
  if (!Array.isArray(originsArray) || originsArray.length === 0) {
    return [];
  }

  const dLat = parseFloat(destinationLat);
  const dLng = parseFloat(destinationLng);

  if (isNaN(dLat) || isNaN(dLng)) {
    console.warn('[ORS Service] Coordenadas de destino inválidas en getDistanceMatrix:', { destinationLat, destinationLng });
    return [];
  }

  // Parsear y estructurar coordenadas de origen
  const parsedOrigins = originsArray.map((orig, index) => {
    let lat = orig.lat ?? orig.latitude ?? orig.current_lat;
    let lng = orig.lng ?? orig.longitude ?? orig.current_lng;

    if (Array.isArray(orig) && orig.length >= 2) {
      // Si viene como [lng, lat] o [lat, lng]
      lng = orig[0];
      lat = orig[1];
    }

    return {
      raw: orig,
      lat: parseFloat(lat),
      lng: parseFloat(lng),
      index
    };
  });

  const validOrigins = parsedOrigins.filter(o => !isNaN(o.lat) && !isNaN(o.lng));

  if (validOrigins.length === 0) {
    return [];
  }

  const apiKey = getApiKey();

  // Si no hay API Key o falla el servicio externo, usamos fallback por Haversine + velocidad promedio estimada (25 km/h)
  const buildHaversineFallback = () => {
    return validOrigins.map(o => {
      const distMeters = Math.round(calculateHaversineDistance(o.lat, o.lng, dLat, dLng));
      const durSecs = Math.round((distMeters / (25 * 1000 / 3600))); // ~25 km/h promedio urbano
      return {
        originIndex: o.index,
        origin: o.raw,
        distanceMeters: distMeters,
        durationSeconds: durSecs,
        distanceKm: Number((distMeters / 1000).toFixed(2)),
        durationMinutes: Math.max(1, Math.round(durSecs / 60)),
        isEstimate: true
      };
    }).sort((a, b) => a.distanceMeters - b.distanceMeters);
  };

  if (!apiKey) {
    console.warn('[ORS Service] ORS_API_KEY ausente. Usando estimación de distancias geodésicas.');
    return buildHaversineFallback();
  }

  try {
    // Locations: [...origins, destination]
    const locations = [
      ...validOrigins.map(o => [o.lng, o.lat]),
      [dLng, dLat]
    ];

    const destinationIndex = locations.length - 1;
    const sourceIndices = validOrigins.map((_, idx) => idx);

    const url = `${ORS_BASE_URL}/matrix/driving-hgv`;
    const body = {
      locations,
      sources: sourceIndices,
      destinations: [destinationIndex],
      metrics: ['distance', 'duration']
    };

    const response = await axios.post(url, body, {
      headers: {
        'Authorization': apiKey,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      timeout: REQUEST_TIMEOUT_MS
    });

    const distances = response.data?.distances || [];
    const durations = response.data?.durations || [];

    const results = validOrigins.map((o, idx) => {
      const dist = distances[idx]?.[0];
      const dur = durations[idx]?.[0];

      const distanceMeters = dist !== undefined && dist !== null ? Math.round(dist) : null;
      const durationSeconds = dur !== undefined && dur !== null ? Math.round(dur) : null;

      return {
        originIndex: o.index,
        origin: o.raw,
        distanceMeters,
        durationSeconds,
        distanceKm: distanceMeters !== null ? Number((distanceMeters / 1000).toFixed(2)) : null,
        durationMinutes: durationSeconds !== null ? Math.round(durationSeconds / 60) : null,
        isEstimate: false
      };
    });

    // Ordenar de menor a mayor distancia
    results.sort((a, b) => {
      if (a.distanceMeters === null) return 1;
      if (b.distanceMeters === null) return -1;
      return a.distanceMeters - b.distanceMeters;
    });

    return results;
  } catch (err) {
    const status = err.response?.status;
    const errorMessage = err.response?.data?.error?.message || err.message;
    console.error(`[ORS Service Error - getDistanceMatrix] Status: ${status || 'TIMEOUT/NETWORK'} - ${errorMessage}. Usando fallback Haversine.`);
    return buildHaversineFallback();
  }
};

/**
 * Estima el peso en kilogramos de una denuncia según su categoría o pesaje registrado
 * @param {Object} d - Objeto de denuncia
 * @returns {number} Peso en kg
 */
export const estimateReportWeightKg = (d) => {
  if (!d) return 500;
  let weight = d.estimated_weight_kg ?? d.weight_kg;
  if (!weight || isNaN(parseFloat(weight))) {
    switch (d.category) {
      case 'VERTEDERO_CLANDESTINO':
        return 1200; // Vertedero clandestino: ~1.2 Tn
      case 'CONTENEDOR_DANADO':
        return 800;  // Contenedor desbordado: ~800 kg
      case 'RECOLECCION_PENDIENTE':
        return 500;  // Basura residencial acumulada: ~500 kg
      default:
        return 500;
    }
  }
  return Math.max(1, Math.round(parseFloat(weight)));
};

/**
 * Optimiza la ruta de recolección de múltiples denuncias respetando la capacidad máxima del camión (VROOM Engine)
 * 
 * @param {number} truckCapacity - Capacidad del camión (en toneladas o kilogramos)
 * @param {{ lat: number, lng: number }|Array<number>} startCoords - Ubicación inicial del camión
 * @param {{ lat: number, lng: number }|Array<number>} [endCoords] - Destino final (ej: Vertedero Cateura o Base)
 * @param {Array<Object>} denuncias - Lista de denuncias con { id, latitude, longitude, ticket_number, category, estimated_weight_kg }
 * @returns {Promise<Object>} Ruta optimizada con paradas ordenadas, métricas y denuncias no asignadas
 */
export const optimizeDenunciasRoute = async (truckCapacity, startCoords, endCoords, denuncias) => {
  if (!Array.isArray(denuncias) || denuncias.length === 0) {
    return {
      success: true,
      engine: 'none',
      is_fallback: false,
      summary: {
        total_stops: 0,
        total_distance_km: 0,
        total_duration_minutes: 0,
        total_weight_kg: 0,
        unassigned_count: 0
      },
      stops: [],
      unassigned: [],
      geometry: null
    };
  }

  // 1. Normalizar capacidad del camión a Kilogramos
  const capNum = parseFloat(truckCapacity) || 12;
  const capacityKg = capNum <= 50 ? Math.round(capNum * 1000) : Math.round(capNum);

  // 2. Normalizar coordenadas [lng, lat] para ORS / VROOM
  const DEFAULT_DEPOT_LNG_LAT = [-57.6470, -25.2867]; // Base Central Asunción
  const DEFAULT_CATEURA_LNG_LAT = [-57.6580, -25.3350]; // Vertedero Cateura

  const parseLngLat = (coords, fallbackLngLat) => {
    if (!coords) return fallbackLngLat;
    if (Array.isArray(coords) && coords.length >= 2) {
      // Si el primer valor es latitud (~ -25), invertir a [lng, lat]
      if (coords[0] < 0 && coords[0] > -30) {
        return [parseFloat(coords[1]), parseFloat(coords[0])];
      }
      return [parseFloat(coords[0]), parseFloat(coords[1])];
    }
    const lat = coords.lat ?? coords.latitude ?? coords.current_lat;
    const lng = coords.lng ?? coords.longitude ?? coords.current_lng;
    if (lat !== undefined && lng !== undefined && !isNaN(parseFloat(lat)) && !isNaN(parseFloat(lng))) {
      return [parseFloat(lng), parseFloat(lat)];
    }
    return fallbackLngLat;
  };

  const startLngLat = parseLngLat(startCoords, DEFAULT_DEPOT_LNG_LAT);
  const endLngLat = parseLngLat(endCoords, DEFAULT_CATEURA_LNG_LAT);

  // 3. Estructurar jobs (denuncias) con pesos estimados y mapa de referencia
  const jobMap = new Map();
  const validJobs = [];

  denuncias.forEach((d, index) => {
    const lat = parseFloat(d.latitude ?? d.lat);
    const lng = parseFloat(d.longitude ?? d.lng);

    if (isNaN(lat) || isNaN(lng)) {
      console.warn(`[ORS Optimization] Denuncia omitida por coordenadas inválidas:`, d.id || d.ticket_number);
      return;
    }

    const jobId = index + 1; // VROOM requiere enteros positivos

    const weightKg = estimateReportWeightKg(d);

    const normalizedDenuncia = {
      ...d,
      numeric_id: jobId,
      latitude: lat,
      longitude: lng,
      estimated_weight_kg: weightKg
    };

    jobMap.set(jobId, normalizedDenuncia);

    validJobs.push({
      id: jobId,
      description: d.ticket_number || d.id || `Denuncia #${jobId}`,
      location: [lng, lat],
      service: 300, // 5 minutos de tiempo de recolección en el punto
      pickup: [weightKg] // Dimensión de recolección acumulativa
    });
  });

  if (validJobs.length === 0) {
    return {
      success: true,
      engine: 'none',
      is_fallback: false,
      summary: {
        total_stops: 0,
        total_distance_km: 0,
        total_duration_minutes: 0,
        total_weight_kg: 0,
        unassigned_count: 0
      },
      stops: [],
      unassigned: [],
      geometry: null
    };
  }

  // 4. Algoritmo Heurístico de Respaldo (Nearest Neighbor + Control de Capacidad)
  const runFallbackOptimization = (warningReason = '') => {
    let currentLngLat = [...startLngLat];
    let currentWeight = 0;
    let totalDistanceMeters = 0;
    let totalDurationSeconds = 0;
    const remainingJobs = [...validJobs];
    const orderedStops = [];
    const unassignedList = [];

    let stopIndex = 1;

    while (remainingJobs.length > 0) {
      // Buscar el job más cercano a la posición actual
      let closestIdx = -1;
      let minDistance = Infinity;

      for (let i = 0; i < remainingJobs.length; i++) {
        const job = remainingJobs[i];
        const dist = calculateHaversineDistance(
          currentLngLat[1],
          currentLngLat[0],
          job.location[1],
          job.location[0]
        );

        if (dist < minDistance) {
          minDistance = dist;
          closestIdx = i;
        }
      }

      if (closestIdx === -1) break;

      const nextJob = remainingJobs.splice(closestIdx, 1)[0];
      const jobWeight = nextJob.pickup[0];
      const originalDenuncia = jobMap.get(nextJob.id);

      // Verificar si excede la capacidad del camión
      if (currentWeight + jobWeight <= capacityKg) {
        currentWeight += jobWeight;
        totalDistanceMeters += minDistance;
        const driveDurationSecs = Math.round((minDistance / (25 * 1000 / 3600))); // ~25 km/h
        totalDurationSeconds += driveDurationSecs + (nextJob.service || 300);

        orderedStops.push({
          stop_order: stopIndex++,
          type: 'job',
          job_id: nextJob.id,
          denuncia_id: originalDenuncia.id,
          ticket_number: originalDenuncia.ticket_number,
          category: originalDenuncia.category,
          address_reference: originalDenuncia.address_reference,
          latitude: originalDenuncia.latitude,
          longitude: originalDenuncia.longitude,
          weight_kg: jobWeight,
          accumulated_weight_kg: currentWeight,
          service_duration_seconds: nextJob.service || 300,
          estimated_distance_from_previous_m: Math.round(minDistance),
          denuncia: originalDenuncia
        });

        currentLngLat = nextJob.location;
      } else {
        // Excede capacidad: se marca como no asignado
        unassignedList.push({
          job_id: nextJob.id,
          denuncia_id: originalDenuncia.id,
          ticket_number: originalDenuncia.ticket_number,
          category: originalDenuncia.category,
          latitude: originalDenuncia.latitude,
          longitude: originalDenuncia.longitude,
          weight_kg: jobWeight,
          reason: `Excede la capacidad disponible del camión (${(capacityKg / 1000).toFixed(1)} Tn)`
        });
      }
    }

    // Tramo final hasta el destino (Cateura o Base)
    const finalLegDistance = calculateHaversineDistance(
      currentLngLat[1],
      currentLngLat[0],
      endLngLat[1],
      endLngLat[0]
    );
    totalDistanceMeters += finalLegDistance;
    totalDurationSeconds += Math.round((finalLegDistance / (25 * 1000 / 3600)));

    return {
      success: true,
      engine: 'haversine-nearest-neighbor',
      is_fallback: true,
      warning: warningReason || 'Calculado con optimizador heurístico local.',
      truck_capacity_kg: capacityKg,
      truck_capacity_tons: Number((capacityKg / 1000).toFixed(1)),
      start_coordinates: { lng: startLngLat[0], lat: startLngLat[1] },
      end_coordinates: { lng: endLngLat[0], lat: endLngLat[1] },
      summary: {
        total_stops: orderedStops.length,
        total_distance_m: Math.round(totalDistanceMeters),
        total_distance_km: Number((totalDistanceMeters / 1000).toFixed(2)),
        total_duration_seconds: totalDurationSeconds,
        total_duration_minutes: Math.round(totalDurationSeconds / 60),
        total_weight_kg: currentWeight,
        total_weight_tons: Number((currentWeight / 1000).toFixed(2)),
        capacity_utilization_percent: Math.min(100, Math.round((currentWeight / capacityKg) * 100)),
        unassigned_count: unassignedList.length
      },
      stops: orderedStops,
      unassigned: unassignedList,
      geometry: null
    };
  };

  // 5. Preparar Payload para endpoint /optimization de OpenRouteService
  const apiKey = getApiKey();

  if (!apiKey) {
    console.warn('[ORS Optimization] ORS_API_KEY no configurada. Ejecutando optimización heurística.');
    return runFallbackOptimization('ORS_API_KEY no configurada.');
  }

  const payload = {
    jobs: validJobs,
    vehicles: [
      {
        id: 1,
        profile: 'driving-hgv',
        start: startLngLat,
        end: endLngLat,
        capacity: [capacityKg]
      }
    ],
    options: {
      g: true // Solicitar geometría del recorrido si está disponible
    }
  };

  try {
    const ORS_OPTIMIZATION_URL = 'https://api.openrouteservice.org/optimization';

    const response = await axios.post(ORS_OPTIMIZATION_URL, payload, {
      headers: {
        'Authorization': apiKey,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      timeout: 12000 // 12 segundos para optimizaciones complejas
    });

    const vroomData = response.data;
    const vroomRoute = vroomData?.routes?.[0];

    if (!vroomRoute) {
      console.warn('[ORS Optimization] Respuesta de VROOM sin rutas generadas. Ejecutando fallback.');
      return runFallbackOptimization('No se generaron rutas en el motor VROOM.');
    }

    // 6. Mapear steps de VROOM a paradas con información completa de denuncias
    let accumulatedWeight = 0;
    let stopOrder = 1;
    const orderedStops = [];

    (vroomRoute.steps || []).forEach(step => {
      if (step.type === 'job') {
        const originalDenuncia = jobMap.get(step.id);
        const jobWeight = originalDenuncia?.estimated_weight_kg || 500;
        accumulatedWeight += jobWeight;

        orderedStops.push({
          stop_order: stopOrder++,
          type: 'job',
          job_id: step.id,
          denuncia_id: originalDenuncia?.id,
          ticket_number: originalDenuncia?.ticket_number,
          category: originalDenuncia?.category,
          address_reference: originalDenuncia?.address_reference,
          latitude: originalDenuncia?.latitude || step.location[1],
          longitude: originalDenuncia?.longitude || step.location[0],
          weight_kg: jobWeight,
          accumulated_weight_kg: accumulatedWeight,
          arrival_seconds: step.arrival,
          duration_seconds: step.duration,
          distance_meters: step.distance,
          service_seconds: step.service || 300,
          denuncia: originalDenuncia
        });
      }
    });

    // Mapear denuncias no asignadas (overflow de capacidad o inaccesibles)
    const unassignedList = (vroomData.unassigned || []).map(u => {
      const originalDenuncia = jobMap.get(u.id);
      return {
        job_id: u.id,
        denuncia_id: originalDenuncia?.id,
        ticket_number: originalDenuncia?.ticket_number,
        category: originalDenuncia?.category,
        latitude: originalDenuncia?.latitude || u.location?.[1],
        longitude: originalDenuncia?.longitude || u.location?.[0],
        weight_kg: originalDenuncia?.estimated_weight_kg || 500,
        reason: 'Capacidad del camión excedida o restricciones de maniobrabilidad HGV'
      };
    });

    const totalDistMeters = vroomRoute.distance ? Math.round(vroomRoute.distance) : 0;
    const totalDurSeconds = vroomRoute.duration ? Math.round(vroomRoute.duration) : 0;

    return {
      success: true,
      engine: 'openrouteservice-vroom',
      is_fallback: false,
      truck_capacity_kg: capacityKg,
      truck_capacity_tons: Number((capacityKg / 1000).toFixed(1)),
      start_coordinates: { lng: startLngLat[0], lat: startLngLat[1] },
      end_coordinates: { lng: endLngLat[0], lat: endLngLat[1] },
      summary: {
        total_stops: orderedStops.length,
        total_distance_m: totalDistMeters,
        total_distance_km: Number((totalDistMeters / 1000).toFixed(2)),
        total_duration_seconds: totalDurSeconds,
        total_duration_minutes: Math.round(totalDurSeconds / 60),
        total_weight_kg: accumulatedWeight,
        total_weight_tons: Number((accumulatedWeight / 1000).toFixed(2)),
        capacity_utilization_percent: Math.min(100, Math.round((accumulatedWeight / capacityKg) * 100)),
        unassigned_count: unassignedList.length
      },
      stops: orderedStops,
      unassigned: unassignedList,
      geometry: vroomRoute.geometry || null
    };
  } catch (err) {
    const status = err.response?.status;
    const errorMessage = err.response?.data?.error?.message || err.message;
    console.error(`[ORS Optimization Error] Status: ${status || 'TIMEOUT/NETWORK'} - ${errorMessage}. Activando optimización de respaldo.`);
    return runFallbackOptimization(`Error en servicio ORS (${status || 'TIMEOUT'}): ${errorMessage}`);
  }
};

export default {
  getTruckRoute,
  getDistanceMatrix,
  calculateHaversineDistance,
  optimizeDenunciasRoute
};

