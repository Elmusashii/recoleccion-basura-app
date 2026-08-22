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

console.log('| # | Feature Name (GeoJSON) | Normalized Name | Clave DB Exacta | Turno | Grupo | Color | Match Status |');
console.log('|---|------------------------|-----------------|-----------------|-------|-------|-------|--------------|');

let assignedCount = 0;
let sinTurnoCount = 0;
let mismatchCount = 0;

BARRIOS_ASUNCION_GEOJSON.features.forEach((f, i) => {
  const p = f.properties;
  const calcNorm = normalizeBarrioName(p.name);
  const sched = getBarrioSchedule(p);
  const hasExactKey = Boolean(BARRIO_SCHEDULE_DATABASE[calcNorm]);
  
  let matchStatus = '✅ Match 100%';
  if (!hasExactKey) {
    matchStatus = '⚠️ Match por fallback/inclusión';
    mismatchCount++;
  }

  if (sched.group === 'NO_ASIGNADO' || sched.shift === 'Sin Turno') {
    sinTurnoCount++;
  } else {
    assignedCount++;
  }

  console.log(`| ${i+1} | ${p.name} | ${calcNorm} | ${hasExactKey ? calcNorm : 'NO EXACTA'} | ${sched.shift} | ${sched.group} | ${sched.color} | ${matchStatus} |`);
});

console.log('\n--- RESUMEN ---');
console.log(`Total Features: ${BARRIOS_ASUNCION_GEOJSON.features.length}`);
console.log(`Con Turno Asignado: ${assignedCount}`);
console.log(`Sin Turno (Oficial): ${sinTurnoCount}`);
console.log(`Mismatches de clave exacta: ${mismatchCount}`);
