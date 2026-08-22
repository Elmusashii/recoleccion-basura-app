import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import osmtogeojson from 'osmtogeojson';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Importar base de datos y normalizador existente
const scheduleMapPath = path.resolve(__dirname, '../client/src/data/barrioScheduleMap.js');
const targetGeoJSONPath = path.resolve(__dirname, '../client/src/data/barriosAsuncionGeoJSON.js');

// Import dinámico de barrioScheduleMap
const { BARRIO_SCHEDULE_DATABASE, normalizeBarrioName, OFFICIAL_PALETTE } = await import(`file://${scheduleMapPath}`);

// Importar el GeoJSON actual para rescatar las geometrías de los barrios no mapeados en OSM
let currentGeoJSON = null;
try {
  const currentModule = await import(`file://${targetGeoJSONPath}`);
  currentGeoJSON = currentModule.BARRIOS_ASUNCION_GEOJSON;
} catch (e) {
  console.warn('No se pudo leer GeoJSON previo:', e.message);
}

console.log('================================================================');
console.log('📡 CONSULTANDO OVERPASS API (OSM) - LÍMITES REALES DE ASUNCIÓN');
console.log('================================================================');

const OVERPASS_QUERY = `
[out:json][timeout:90];
area["name"="Asunción"]["admin_level"="8"]["boundary"="administrative"]->.asu;
(
  relation["boundary"="administrative"]["admin_level"="10"](area.asu);
);
out body;
>;
out skel qt;
`.trim();

async function fetchFromOverpass() {
  const endpoints = [
    'https://overpass-api.de/api/interpreter',
    'https://overpass.kumi.systems/api/interpreter',
    'https://maps.mail.ru/osm/tools/overpass/api/interpreter'
  ];

  for (const endpoint of endpoints) {
    try {
      console.log(`Intentando conectar con: ${endpoint}...`);
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'User-Agent': 'AsuncionBarriosFetcher/1.0'
        },
        body: `data=${encodeURIComponent(OVERPASS_QUERY)}`
      });

      if (!response.ok) {
        console.warn(`HTTP ${response.status} en ${endpoint}, probando siguiente endpoint...`);
        continue;
      }

      const data = await response.json();
      console.log(`✅ Datos recibidos exitosamente de ${endpoint}`);
      return data;
    } catch (err) {
      console.warn(`Error conectando a ${endpoint}: ${err.message}`);
    }
  }

  throw new Error('No se pudo conectar a ningún endpoint de Overpass API.');
}

async function run() {
  try {
    const osmRawData = await fetchFromOverpass();
    console.log(`Elementos OSM crudos recibidos: ${osmRawData.elements ? osmRawData.elements.length : 0}`);

    // 2. Convertir OSM a GeoJSON
    console.log('Convirtiendo OSM a GeoJSON...');
    const geojson = osmtogeojson(osmRawData);

    // 3. Filtrar polígonos válidos con nombre
    const validFeatures = (geojson.features || []).filter(f => {
      const hasName = Boolean(f.properties && (f.properties.name || f.properties['name:es']));
      const isPolygon = f.geometry && (f.geometry.type === 'Polygon' || f.geometry.type === 'MultiPolygon');
      return hasName && isPolygon;
    });

    console.log(`Polígonos vectoriales válidos encontrados en OSM: ${validFeatures.length}\n`);

    // 4. Cruce de datos y análisis de coincidencia
    const dbNormalizedKeys = Object.keys(BARRIO_SCHEDULE_DATABASE);
    const dbNormalizedSet = new Set(dbNormalizedKeys);

    const osmMatched = [];
    const osmUnmatched = [];
    const matchedDbKeys = new Set();

    // Map para almacenar features normalizados
    const normalizedOsmFeatures = [];

    for (const f of validFeatures) {
      const rawName = f.properties.name || f.properties['name:es'] || 'Sin Nombre';
      const normName = normalizeBarrioName(rawName);

      // Limpiar propiedades innecesarias de OSM y mantener las útiles
      const cleanedProperties = {
        name: rawName,
        normalized_name: normName,
        osm_id: f.id,
        admin_level: f.properties.admin_level || '10',
        approx: false
      };

      f.properties = cleanedProperties;
      normalizedOsmFeatures.push(f);

      // Comprobar si existe match en la base de datos de cronogramas
      let matchedKey = null;

      if (dbNormalizedSet.has(normName)) {
        matchedKey = normName;
      } else {
        // Intento de match por inclusión o variación fonética conocida
        for (const dbKey of dbNormalizedKeys) {
          if (normName.includes(dbKey) || dbKey.includes(normName)) {
            matchedKey = dbKey;
            break;
          }
        }
      }

      if (matchedKey) {
        osmMatched.push({
          osmName: rawName,
          normName: normName,
          matchedSchedule: BARRIO_SCHEDULE_DATABASE[matchedKey].name,
          shift: BARRIO_SCHEDULE_DATABASE[matchedKey].shift,
          group: BARRIO_SCHEDULE_DATABASE[matchedKey].groupLabel
        });
        matchedDbKeys.add(matchedKey);
      } else {
        osmUnmatched.push({
          osmName: rawName,
          normName: normName,
          osmId: f.id
        });
      }
    }

    // 5. Extraer los 6 barrios aproximados conservados
    const targetApproxList = [
      { key: 'de la residenta', name: 'De la Residenta', altName: 'De las Residentas' },
      { key: 'botanico', name: 'Botánico', altName: 'Botánico' },
      { key: 'banado cara cara', name: 'Bañado Cara Cará', altName: 'Bañado Cara Cará' },
      { key: 'san antonio', name: 'San Antonio', altName: 'San Antonio' },
      { key: 'banado', name: 'Bañado', altName: 'Bañado' },
      { key: 'banco san miguel', name: 'Banco San Miguel', altName: 'Banco San Miguel' }
    ];

    const preservedApproxFeatures = [];
    if (currentGeoJSON && currentGeoJSON.features) {
      for (const item of targetApproxList) {
        const foundFeat = currentGeoJSON.features.find(f => {
          const raw = f.properties?.name || f.properties?.barrio || f.properties?.BARRIO || '';
          const norm = normalizeBarrioName(raw);
          return norm === item.key || norm === normalizeBarrioName(item.altName) || norm.includes(item.key) || item.key.includes(norm);
        });

        if (foundFeat) {
          preservedApproxFeatures.push({
            type: 'Feature',
            properties: {
              name: item.name,
              normalized_name: normalizeBarrioName(item.name),
              approx: true
            },
            geometry: foundFeat.geometry
          });
          matchedDbKeys.add(item.key);
        }
      }
    }

    // Total combinado
    const finalFeatures = [...normalizedOsmFeatures, ...preservedApproxFeatures];

    // Barrios en la base de datos de cronograma que NO aparecieron ni en OSM ni en approx
    const dbUnmatched = dbNormalizedKeys
      .filter(k => !matchedDbKeys.has(k))
      .map(k => ({
        key: k,
        name: BARRIO_SCHEDULE_DATABASE[k].name,
        shift: BARRIO_SCHEDULE_DATABASE[k].shift
      }));

    console.log('================================================================');
    console.log('📊 RESUMEN DE COINCIDENCIAS (JOIN OSM + APPROX <-> CRONOGRAMA)');
    console.log('================================================================');
    console.log(`✅ Barrios con polígonos reales de OSM: ${normalizedOsmFeatures.length}`);
    console.log(`🔷 Barrios aproximados conservados (approx=true): ${preservedApproxFeatures.length}`);
    console.log(`🗺️ Total de barrios en el GeoJSON final: ${finalFeatures.length}`);
    console.log(`⚠️ Barrios del cronograma sin geometría: ${dbUnmatched.length}\n`);

    const shouldWrite = process.argv.includes('--write');

    if (shouldWrite) {
      console.log('💾 Escribiendo archivo barriosAsuncionGeoJSON.js...');
      
      const outputGeoJSON = {
        type: 'FeatureCollection',
        name: 'Mapa Oficial de Asunción y sus Barrios - Delimitación Cartográfica Real OSM + Aproximados',
        crs: {
          type: 'name',
          properties: {
            name: 'urn:ogc:def:crs:OGC:1.3:CRS84'
          }
        },
        features: finalFeatures
      };

      const fileContent = `/**
 * Módulo de Capa GeoJSON Vectorial Oficial de Barrios de Asunción
 * Extraído de OpenStreetMap (admin_level=10) mediante Overpass API + Geometrías complementarias.
 * 
 * Contiene ${normalizedOsmFeatures.length} polígonos vectoriales reales y ${preservedApproxFeatures.length} aproximados (EPSG:4326).
 */

export const OFFICIAL_SHIFT_COLORS = {
  Mañana: {
    base: '#10b981',
    light: '#4ade80',
    border: '#059669',
    badgeBg: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
  },
  Tarde: {
    base: '#f97316',
    light: '#fb923c',
    border: '#ea580c',
    badgeBg: 'bg-orange-500/10 text-orange-400 border-orange-500/30'
  },
  Noche: {
    base: '#334155',
    light: '#475569',
    border: '#1e293b',
    badgeBg: 'bg-slate-500/10 text-slate-300 border-slate-500/30'
  }
};

export const BARRIOS_ASUNCION_GEOJSON = ${JSON.stringify(outputGeoJSON, null, 2)};

export default BARRIOS_ASUNCION_GEOJSON;
`;

      fs.writeFileSync(targetGeoJSONPath, fileContent, 'utf-8');
      console.log(`✅ Archivo generado exitosamente en: ${targetGeoJSONPath}`);
    } else {
      console.log('ℹ️ Modo de solo análisis ejecutado. Para escribir el archivo ejecuta con --write.');
    }

  } catch (err) {
    console.error('❌ Error durante la ejecución:', err);
    process.exit(1);
  }
}

run();
