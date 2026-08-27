import { supabase } from '../server/src/config/supabase.js';

async function runTests() {
  console.log('--- OBTENIENDO TOKEN DE ADMIN ---');
  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email: 'admin@admin.com',
    password: 'AdminPassword123!'
  });

  if (authError || !authData?.session) {
    console.error('Error de autenticación:', authError);
    process.exit(1);
  }

  const token = authData.session.access_token;
  const headers = {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  };

  const API_URL = 'http://localhost:5000/api';

  console.log('\n==================== [PASO a] GET /api/fleet/available-drivers ====================');
  const resA = await fetch(`${API_URL}/fleet/available-drivers`, { headers });
  const jsonA = await resA.json();
  console.log(JSON.stringify(jsonA, null, 2));

  console.log(`\nCantidad de choferes obtenidos: ${jsonA.data?.length}`);

  console.log('\n==================== OBTENIENDO CAMIONES ====================');
  const resTrucks = await fetch(`${API_URL}/fleet/trucks`, { headers });
  const jsonTrucks = await resTrucks.json();
  const truck1 = jsonTrucks.data[0];
  const truck2 = jsonTrucks.data[1];
  const choferA = jsonA.data[0];

  console.log(`Camión 1: ${truck1.code} (${truck1.id})`);
  console.log(`Camión 2: ${truck2.code} (${truck2.id})`);
  console.log(`Chofer A: ${choferA.name} (${choferA.id}) - email: ${choferA.email}`);

  console.log(`\n==================== [PASO b] PUT /api/fleet/trucks/${truck1.id}/assign-driver ====================`);
  console.log(`Payload: { userId: "${choferA.id}" }`);
  const resB = await fetch(`${API_URL}/fleet/trucks/${truck1.id}/assign-driver`, {
    method: 'PUT',
    headers,
    body: JSON.stringify({ userId: choferA.id })
  });
  const jsonB = await resB.json();
  console.log(JSON.stringify(jsonB, null, 2));

  console.log(`\n==================== [PASO c] GET /api/fleet/available-drivers?excludeTruckId=${truck2.id} ====================`);
  const resC = await fetch(`${API_URL}/fleet/available-drivers?excludeTruckId=${truck2.id}`, { headers });
  const jsonC = await resC.json();
  console.log(JSON.stringify(jsonC, null, 2));

  const isChoferAPresent = jsonC.data?.some(d => d.id === choferA.id);
  console.log(`\n¿Chofer A (${choferA.name}) aparece en disponibles para Camión 2?: ${isChoferAPresent ? 'SÍ (ERROR)' : 'NO (CORRECTO: está ocupado en Camión 1)'}`);

  console.log(`\n==================== [PASO d] PUT /api/fleet/trucks/${truck2.id}/assign-driver (Reasignar Chofer A -> Camión 2) ====================`);
  console.log(`Payload: { userId: "${choferA.id}" }`);
  const resD = await fetch(`${API_URL}/fleet/trucks/${truck2.id}/assign-driver`, {
    method: 'PUT',
    headers,
    body: JSON.stringify({ userId: choferA.id })
  });
  const jsonD = await resD.json();
  console.log(JSON.stringify(jsonD, null, 2));

  console.log('\n==================== [PASO e] GET /api/fleet/trucks (Verificar estado final de ambos camiones) ====================');
  const resFinalTrucks = await fetch(`${API_URL}/fleet/trucks`, { headers });
  const jsonFinalTrucks = await resFinalTrucks.json();
  const finalTruck1 = jsonFinalTrucks.data.find(t => t.id === truck1.id);
  const finalTruck2 = jsonFinalTrucks.data.find(t => t.id === truck2.id);

  console.log('ESTADO CAMIÓN 1:');
  console.log(JSON.stringify({
    id: finalTruck1.id,
    code: finalTruck1.code,
    plate_number: finalTruck1.plate_number,
    status: finalTruck1.status,
    assigned_user_id: finalTruck1.assigned_user_id
  }, null, 2));

  console.log('\nESTADO CAMIÓN 2:');
  console.log(JSON.stringify({
    id: finalTruck2.id,
    code: finalTruck2.code,
    plate_number: finalTruck2.plate_number,
    status: finalTruck2.status,
    assigned_user_id: finalTruck2.assigned_user_id
  }, null, 2));
}

runTests().catch(console.error);
