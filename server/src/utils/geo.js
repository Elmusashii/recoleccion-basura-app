import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

let ZONE_CENTROIDS = {};
try {
  const jsonPath = path.resolve(__dirname, '../data/zoneCentroids.json');
  if (fs.existsSync(jsonPath)) {
    ZONE_CENTROIDS = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
  }
} catch (e) {
  console.warn('[Geo Util] No se pudo cargar zoneCentroids.json:', e.message);
}

// Alias y equivalencias conocidas de zonas / barrios en Asunción
const ZONE_ALIASES = {
  'sajonia': { lat: -25.2970, lng: -57.6560, name: 'Sajonia (Carlos A. López)' },
  'carlos antonio lopez': { lat: -25.2970, lng: -57.6560, name: 'Sajonia' },
  'centro historico': { lat: -25.2825, lng: -57.6350, name: 'Centro Histórico (Catedral)' },
  'centro': { lat: -25.2825, lng: -57.6350, name: 'Centro' },
  'catedral': { lat: -25.2825, lng: -57.6350, name: 'Catedral' },
  'encarnacion': { lat: -25.2840, lng: -57.6410, name: 'La Encarnación' },
  'san roque': { lat: -25.2880, lng: -57.6300, name: 'San Roque' },
  'mercado 4': { lat: -25.3050, lng: -57.6210, name: 'Mercado 4 (Pettirossi)' },
  'pettirossi': { lat: -25.3050, lng: -57.6210, name: 'Silvio Pettirossi' },
  'silvio pettirossi': { lat: -25.3050, lng: -57.6210, name: 'Silvio Pettirossi' },
  'villa morra': { lat: -25.2930, lng: -57.5810, name: 'Villa Morra' },
  'eje corporativo': { lat: -25.2850, lng: -57.5650, name: 'Eje Corporativo' },
  'loma pyta': { lat: -25.2420, lng: -57.5550, name: 'Loma Pytã' },
  'zeballos cue': { lat: -25.2156, lng: -57.5711, name: 'Zeballos Cué' },
  'santissima trinidad': { lat: -25.2570, lng: -57.5780, name: 'Santísima Trinidad' },
  'trinidad': { lat: -25.2570, lng: -57.5780, name: 'Santísima Trinidad' },
  'recoleta': { lat: -25.3010, lng: -57.5910, name: 'Recoleta' },
  'san vicente': { lat: -25.3180, lng: -57.6180, name: 'San Vicente' },
  'tacumbu': { lat: -25.3090, lng: -57.6450, name: 'Tacumbú' },
  'obrero': { lat: -25.3040, lng: -57.6420, name: 'Barrio Obrero' },
  'republicano': { lat: -25.3280, lng: -57.6420, name: 'Republicano' },
  'ita enramada': { lat: -25.3520, lng: -57.6580, name: 'Itá Enramada' },
  'herrera': { lat: -25.2940, lng: -57.5580, name: 'Herrera' },
  'villa aurelia': { lat: -25.3080, lng: -57.5620, name: 'Villa Aurelia' },
  'los laureles': { lat: -25.3120, lng: -57.5750, name: 'Los Laureles' },
  'terminal': { lat: -25.3240, lng: -57.5940, name: 'Terminal' },
  'las mercedes': { lat: -25.2830, lng: -57.6160, name: 'Las Mercedes' },
  'jara': { lat: -25.2750, lng: -57.6050, name: 'Barrio Jara' },
  'las lomas': { lat: -25.2810, lng: -57.5680, name: 'Las Lomas (Carmelitas)' },
  'carmelitas': { lat: -25.2810, lng: -57.5680, name: 'Carmelitas' },
  'mbocayaty': { lat: -25.2710, lng: -57.5520, name: 'Mbocayaty' },
  'mburucuya': { lat: -25.2670, lng: -57.5680, name: 'Mburucuyá' },
  'san jorge': { lat: -25.2870, lng: -57.5520, name: 'San Jorge' },
  'pinoza': { lat: -25.3120, lng: -57.6150, name: 'Pinozá' }
};

const normalizeStr = (s) => {
  if (!s || typeof s !== 'string') return '';
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\b(barrio|b°|b\.|ruta)\b/gi, '')
    .replace(/[^a-z0-9]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
};

/**
 * Resuelve el centroide { lat, lng } para una zona, barrio o nombre de ruta
 */
export const getZoneCentroid = (zoneOrRouteName) => {
  if (!zoneOrRouteName) return null;

  const normalized = normalizeStr(zoneOrRouteName);

  // 1. Búsqueda directa en alias predefinidos
  if (ZONE_ALIASES[normalized]) {
    return ZONE_ALIASES[normalized];
  }

  // 2. Búsqueda por subcadena en alias
  for (const [key, val] of Object.entries(ZONE_ALIASES)) {
    if (normalized.includes(key) || key.includes(normalized)) {
      return val;
    }
  }

  // 3. Búsqueda en el archivo de centroides extraídos de GeoJSON
  for (const [barrio, coords] of Object.entries(ZONE_CENTROIDS)) {
    const normBarrio = normalizeStr(barrio);
    if (normalized === normBarrio || normalized.includes(normBarrio) || normBarrio.includes(normalized)) {
      return {
        lat: coords.lat,
        lng: coords.lng,
        name: barrio
      };
    }
  }

  // 4. Centro por defecto de Asunción (Plaza Uruguaya / Microcentro)
  return { lat: -25.2867, lng: -57.6350, name: 'Asunción Central (Referencia)' };
};

export default {
  getZoneCentroid
};
