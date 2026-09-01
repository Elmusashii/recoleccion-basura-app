import { supabase } from '../../server/src/config/supabase.js';
import { optimizeDenunciasRoute } from '../../server/src/services/ors.service.js';

async function runTests() {
  console.log('=== TEST 1: Prueba Directa de optimizeDenunciasRoute ===');
  const mockDenuncias = [
    {
      id: 'rep-mock-01',
      ticket_number: 'DEN-2026-001',
      category: 'VERTEDERO_CLANDESTINO',
      latitude: -25.2930,
      longitude: -57.5810,
      estimated_weight_kg: 1500
    },
    {
      id: 'rep-mock-02',
      ticket_number: 'DEN-2026-002',
      category: 'RECOLECCION_PENDIENTE',
      latitude: -25.2970,
      longitude: -57.6560,
      estimated_weight_kg: 600
    },
    {
      id: 'rep-mock-03',
      ticket_number: 'DEN-2026-003',
      category: 'CONTENEDOR_DANADO',
      latitude: -25.2850,
      longitude: -57.6200,
      estimated_weight_kg: 900
    }
  ];

  const directResult = await optimizeDenunciasRoute(
    12.0, // 12 Toneladas
    { lat: -25.2867, lng: -57.6470 }, // Base Central
    { lat: -25.3350, lng: -57.6580 }, // Cateura
    mockDenuncias
  );

  console.log('Resultado optimizeDenunciasRoute:');
  console.log(JSON.stringify(directResult, null, 2));

  console.log('\n=== TEST 2: Prueba del Endpoint HTTP POST /api/fleet/trucks/:id/optimize-reports ===');
  // Obtener token de admin
  const { data: authData } = await supabase.auth.signInWithPassword({
    email: 'admin@admin.com',
    password: 'AdminPassword123!'
  });

  if (!authData?.session) {
    console.error('No se pudo autenticar usuario admin');
    return;
  }

  const token = authData.session.access_token;
  const headers = {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  };

  // Obtener camiones y denuncias existentes en Supabase
  const { data: trucks } = await supabase.from('trucks').select('id, code, capacity_tons').limit(1);
  const { data: reports } = await supabase.from('reports').select('id, ticket_number, category').limit(4);

  const targetTruck = trucks?.[0] || { id: '51c26ab0-8601-46e7-8b97-48a7de1d9c17', code: 'CAM-01' };
  const reportIds = reports?.map(r => r.id) || ['rep-01', 'rep-02'];

  console.log(`Camión seleccionado: ${targetTruck.code} (${targetTruck.id})`);
  console.log(`Denuncias enviadas (${reportIds.length}):`, reportIds);

  const httpRes = await fetch(`http://localhost:5000/api/fleet/trucks/${targetTruck.id}/optimize-reports`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      reportIds,
      startCoords: { lat: -25.2867, lng: -57.6470 },
      endCoords: { lat: -25.3350, lng: -57.6580 }
    })
  });

  const httpJson = await httpRes.json();
  console.log('\nRespuesta del Endpoint HTTP:');
  console.log(JSON.stringify(httpJson, null, 2));
}

runTests().catch(console.error);
