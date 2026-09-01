import * as turf from '@turf/turf';

console.log('================================================================');
console.log('🧪 PRUEBA OBLIGATORIA 3: LÓGICA DE INTERSECCIÓN ESPACIAL (TURF.JS)');
console.log('================================================================\n');

// 1. Definir polígono de prueba (Área delimitada en Asunción)
const testPolygon = turf.polygon([[
  [-57.6500, -25.3000],
  [-57.6000, -25.3000],
  [-57.6000, -25.2600],
  [-57.6500, -25.2600],
  [-57.6500, -25.3000]
]]);

// 2. Definir 3 puntos de prueba (2 dentro del polígono, 1 fuera)
const mockReports = [
  {
    id: 'rep-inside-01',
    ticket_number: 'ASU-2026-001',
    category: 'VERTEDERO_CLANDESTINO',
    longitude: -57.6250,
    latitude: -25.2800 // DENTRO
  },
  {
    id: 'rep-inside-02',
    ticket_number: 'ASU-2026-002',
    category: 'CONTENEDOR_DANADO',
    longitude: -57.6150,
    latitude: -25.2750 // DENTRO
  },
  {
    id: 'rep-outside-03',
    ticket_number: 'ASU-2026-003',
    category: 'RECOLECCION_PENDIENTE',
    longitude: -57.5500,
    latitude: -25.2200 // FUERA (Lejos)
  }
];

// 3. Función idéntica a la implementada en ReportsMapView.jsx
function executeSpatialIntersection(reportsList, drawnPolygon) {
  const pointsFc = turf.featureCollection(
    reportsList.map((r) =>
      turf.point([parseFloat(r.longitude), parseFloat(r.latitude)], {
        reportId: r.id,
        ticketNumber: r.ticket_number
      })
    )
  );

  const polyFeature =
    drawnPolygon.type === 'Feature'
      ? drawnPolygon
      : turf.feature(drawnPolygon.geometry || drawnPolygon);

  const matched = turf.pointsWithinPolygon(pointsFc, polyFeature);
  return (matched.features || []).map((f) => f.properties.reportId);
}

// 4. Ejecutar cruce
const matchedIds = executeSpatialIntersection(mockReports, testPolygon);

console.log('Puntos evaluados: 3');
console.log('Punto 1 [-57.6250, -25.2800] -> Esperado: DENTRO');
console.log('Punto 2 [-57.6150, -25.2750] -> Esperado: DENTRO');
console.log('Punto 3 [-57.5500, -25.2200] -> Esperado: FUERA\n');

console.log('Resultado Obtenido:');
console.log('Cantidad de coincidencias:', matchedIds.length);
console.log('IDs capturados:', matchedIds);

const isSuccess =
  matchedIds.length === 2 &&
  matchedIds.includes('rep-inside-01') &&
  matchedIds.includes('rep-inside-02') &&
  !matchedIds.includes('rep-outside-03');

console.log('\nVERIFICACIÓN LÓGICA TURF.JS:', isSuccess ? '✅ ÉXITO TOTAL (PASSED)' : '❌ ERROR');
console.log('================================================================');
