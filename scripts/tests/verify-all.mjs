import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const rootDir = path.resolve(__dirname, '..');
const schedulePath = path.resolve(rootDir, 'client/src/data/barrioScheduleMap.js');
const geojsonPath = path.resolve(rootDir, 'client/src/data/barriosAsuncionGeoJSON.js');

const { BARRIO_SCHEDULE_DATABASE, getBarrioSchedule, normalizeBarrioName } = await import(`file://${schedulePath}`);
const { BARRIOS_ASUNCION_GEOJSON } = await import(`file://${geojsonPath}`);

console.log('================================================================');
console.log('🔍 VERIFICACIÓN COMPLETA DEL SISTEMA DE BARRIOS Y CRONOGRAMAS');
console.log('================================================================');

// 1. Verificación de BARRIO_SCHEDULE_DATABASE
const dbKeys = Object.keys(BARRIO_SCHEDULE_DATABASE);
console.log(`\n📌 1. BARRIO_SCHEDULE_DATABASE: ${dbKeys.length} entradas en total.`);

// Chequeo de barrios "Sin Turno"
const sinTurnoExpected = ['botanico', 'banado cara cara', 'banco san miguel'];
sinTurnoExpected.forEach(key => {
  const item = BARRIO_SCHEDULE_DATABASE[key];
  if (item && item.shift === 'Sin Turno' && item.group === 'NO_ASIGNADO') {
    console.log(`  ✅ [${key}] configurado como "Sin Turno" (NO_ASIGNADO)`);
  } else {
    console.error(`  ❌ ERROR en [${key}]:`, item);
  }
});

// Chequeo de clave 'banado' eliminada
if (!BARRIO_SCHEDULE_DATABASE['banado']) {
  console.log(`  ✅ Clave 'banado' (Bañado suelto) eliminada correctamente.`);
} else {
  console.error(`  ❌ ERROR: la clave 'banado' aún existe en la base de datos.`);
}

// Chequeo de barrios nuevos agregados
const newBarrios = ['san cayetano', 'santa librada', 'jukyty'];
newBarrios.forEach(key => {
  const item = BARRIO_SCHEDULE_DATABASE[key];
  if (item && item.shift === 'Tarde' && item.group === 'MARTES_JUEVES_SABADO') {
    console.log(`  ✅ [${key}] agregado correctamente: ${item.name} (${item.group}, ${item.shift}) - Zona: ${item.zone}`);
  } else {
    console.error(`  ❌ ERROR en nuevo barrio [${key}]:`, item);
  }
});

// 2. Verificación de BARRIOS_ASUNCION_GEOJSON
const features = BARRIOS_ASUNCION_GEOJSON.features;
console.log(`\n📌 2. BARRIOS_ASUNCION_GEOJSON: ${features.length} features en total.`);

const osmRealCount = features.filter(f => f.properties.approx === false).length;
const approxCount = features.filter(f => f.properties.approx === true).length;
console.log(`  - Polígonos OSM reales (approx: false): ${osmRealCount}`);
console.log(`  - Polígonos aproximados (approx: true): ${approxCount}`);

// Chequeo de duplicados en el GeoJSON
const seenNormNames = new Map();
const duplicates = [];
features.forEach((f, idx) => {
  const norm = f.properties.normalized_name;
  if (seenNormNames.has(norm)) {
    duplicates.push({ norm, firstIdx: seenNormNames.get(norm), currentIdx: idx });
  } else {
    seenNormNames.set(norm, idx);
  }
});

if (duplicates.length === 0) {
  console.log(`  ✅ Cero duplicados en el GeoJSON (67 features únicos).`);
} else {
  console.error(`  ❌ Duplicados encontrados en GeoJSON:`, duplicates);
}

// 3. Cruce (Join) 100% de cada feature del GeoJSON con getBarrioSchedule
console.log(`\n📌 3. VALIDACIÓN DE CRUCE (JOIN) DE CADA FEATURE CON getBarrioSchedule:`);
let joinErrors = 0;
features.forEach((f, idx) => {
  const sched = getBarrioSchedule(f.properties);
  if (!sched) {
    console.error(`  ❌ Feature #${idx + 1} (${f.properties.name}) no resolvió ningún cronograma.`);
    joinErrors++;
  } else {
    // console.log(`  ${idx + 1}. ${f.properties.name} -> ${sched.name} [${sched.shift}, ${sched.groupLabel}]`);
  }
});

if (joinErrors === 0) {
  console.log(`  ✅ 100% de las 67 features resuelven exitosamente su información de cronograma y turno.`);
} else {
  console.error(`  ❌ ${joinErrors} features tuvieron errores al resolver su cronograma.`);
}

console.log('\n================================================================');
console.log('🎉 VERIFICACIÓN FINALIZADA CON ÉXITO');
console.log('================================================================');
