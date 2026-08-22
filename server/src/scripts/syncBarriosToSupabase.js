import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Falta SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY en el entorno');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Leer los datos oficiales desde client/src/data/barriosAsuncionGeoJSON.js
const geojsonModulePath = path.resolve(__dirname, '../../../client/src/data/barriosAsuncionGeoJSON.js');

async function syncBarrios() {
  console.log('🚀 Iniciando sincronización de barrios y polígonos hacia Supabase...');

  const importedModule = await import(`file://${geojsonModulePath}`);
  const geojson = importedModule.BARRIOS_ASUNCION_GEOJSON;

  if (!geojson || !geojson.features) {
    console.error('❌ No se pudo cargar BARRIOS_ASUNCION_GEOJSON');
    process.exit(1);
  }

  const features = geojson.features;
  console.log(`📦 Encontrados ${features.length} barrios oficiales en la cartografía catastral.`);

  // Mapear cada feature al esquema de routes en Supabase
  const routesToInsert = features.map((f) => {
    const p = f.properties;
    let startTime = '06:00:00';
    let endTime = '12:00:00';
    if (p.turno === 'Tarde') {
      startTime = '12:00:00';
      endTime = '18:00:00';
    } else if (p.turno === 'Noche') {
      startTime = '19:00:00';
      endTime = '02:00:00';
    }

    const scheduleDays = p.frecuencia_codigo === 'MARTES_JUEVES_SABADO'
      ? ['Martes', 'Jueves', 'Sábado']
      : p.frecuencia_codigo === 'LUNES_MIERCOLES_VIERNES'
      ? ['Lunes', 'Miércoles', 'Viernes']
      : ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

    // Coordenadas Leaflet [lat, lng]
    const leafletCoords = (f.geometry?.coordinates[0] || []).map(pt => [pt[1], pt[0]]);
    const centerLat = leafletCoords.reduce((acc, c) => acc + c[0], 0) / (leafletCoords.length || 1);
    const centerLng = leafletCoords.reduce((acc, c) => acc + c[1], 0) / (leafletCoords.length || 1);

    return {
      name: p.barrio,
      zone: p.zona || p.barrio,
      shift: p.turno,
      schedule_days: scheduleDays,
      start_time: startTime,
      end_time: endTime,
      color_hex: p.color_hex,
      geometry_geojson: {
        type: 'Polygon',
        coordinates: leafletCoords,
        center: [centerLat, centerLng],
        group: p.frecuencia_codigo,
        groupLabel: p.frecuencia,
        shiftHours: p.horario,
        mainStreets: p.calles_principales,
        recommendation: p.recomendacion
      },
      is_active: true
    };
  });

  // 1. Limpiar rutas existentes previas o sincronizar
  console.log('🧹 Limpiando tabla routes previa para recargar dataset completo con GeoJSON...');
  const { error: deleteErr } = await supabase.from('routes').delete().neq('name', '___NON_EXISTENT___');
  if (deleteErr) {
    console.warn('Nota al limpiar routes:', deleteErr.message);
  }

  // 2. Insertar en lotes de 20
  const chunkSize = 20;
  let insertedCount = 0;
  for (let i = 0; i < routesToInsert.length; i += chunkSize) {
    const chunk = routesToInsert.slice(i, i + chunkSize);
    const { data, error } = await supabase.from('routes').insert(chunk).select('id');
    if (error) {
      console.error(`❌ Error insertando lote ${i}:`, error);
    } else {
      insertedCount += data.length;
      console.log(`✅ Insertados ${insertedCount}/${routesToInsert.length} barrios en Supabase...`);
    }
  }

  console.log(`🎉 Sincronización completa: ${insertedCount} barrios y rutas cargados en Supabase.`);
}

syncBarrios().catch(console.error);
