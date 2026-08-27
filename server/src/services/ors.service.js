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

export default {
  getTruckRoute,
  getDistanceMatrix,
  calculateHaversineDistance
};
