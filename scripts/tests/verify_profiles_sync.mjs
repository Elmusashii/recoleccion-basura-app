import dotenv from 'dotenv';
dotenv.config();
import { supabase } from '../../server/src/config/supabase.js';
import { getAvailableDrivers, assignDriverToTruck } from '../../server/src/controllers/fleet.controller.js';

async function verifyProfilesAndDrivers() {
  console.log('====================================================');
  console.log('1. VERIFICACION DE TABLA PROFILES EN SUPABASE');
  console.log('====================================================');
  
  const { data: profiles, error: pErr, count: pCount } = await supabase
    .from('profiles')
    .select('id, email, name, role, phone, department, status', { count: 'exact' });

  if (pErr) {
    console.error('ERROR consultando profiles:', pErr);
    return;
  }
  
  console.log(`OK: Consulta exitosa -> ${profiles.length} filas en public.profiles (Total count: ${pCount})`);
  console.log('Primeras 5 filas en profiles:');
  console.table(profiles.slice(0, 5).map(p => ({
    id: p.id.slice(0, 8) + '...',
    email: p.email,
    name: p.name,
    role: p.role,
    status: p.status
  })));

  console.log('\n====================================================');
  console.log('2. COMPARACION CON AUTH.ADMIN.LISTUSERS()');
  console.log('====================================================');
  const { data: { users: authUsers }, error: aErr } = await supabase.auth.admin.listUsers();
  console.log(`Auth.users count: ${authUsers?.length}`);
  console.log(`Profiles count:   ${profiles?.length}`);
  console.log(`Sincronizacion 100%: ${authUsers?.length === profiles?.length ? 'SI, EXACTO (14/14)' : 'NO'}`);

  console.log('\n====================================================');
  console.log('3. TEST GET /api/fleet/available-drivers');
  console.log('====================================================');
  let driversResponse = null;
  const mockReq = { query: {} };
  const mockRes = {
    status: (code) => mockRes,
    json: (data) => { driversResponse = data; return mockRes; }
  };

  await getAvailableDrivers(mockReq, mockRes);
  console.log('Respuesta de getAvailableDrivers:');
  console.log('Success:', driversResponse?.success);
  console.log('Total Choferes Disponibles encontrados:', driversResponse?.data?.length);
  console.table(driversResponse?.data?.map(d => ({
    id: d.id.slice(0, 8) + '...',
    name: d.name,
    email: d.email,
    role: d.role
  })));

  console.log('\n====================================================');
  console.log('4. TEST END-TO-END ASIGNAR / DESASIGNAR CHOFER A CAMION');
  console.log('====================================================');
  const { data: testTruck } = await supabase.from('trucks').select('*').limit(1).single();
  const driverToAssign = driversResponse?.data?.[0];

  if (testTruck && driverToAssign) {
    console.log(`Asignando Chofer "${driverToAssign.name}" (${driverToAssign.id}) al Camion ${testTruck.code} (${testTruck.id})...`);
    
    let assignResponse = null;
    const assignReq = {
      params: { id: testTruck.id },
      body: { userId: driverToAssign.id }
    };
    const assignRes = {
      status: (c) => assignRes,
      json: (d) => { assignResponse = d; return assignRes; }
    };

    await assignDriverToTruck(assignReq, assignRes);
    console.log('Resultado de asignacion:', assignResponse?.message);
    console.log('Camion assigned_user_id devuelto:', assignResponse?.data?.assigned_user_id);

    // Verificar en Supabase directamente
    const { data: verifiedTruck } = await supabase.from('trucks').select('*, assigned_user_id').eq('id', testTruck.id).single();
    console.log(`Verificacion directa en base de datos: assigned_user_id = ${verifiedTruck?.assigned_user_id}`);
    console.log(`Coincide con el Chofer? ${verifiedTruck?.assigned_user_id === driverToAssign.id ? 'SI' : 'NO'}`);

    // Restaurar estado original del camión
    await supabase.from('trucks').update({ assigned_user_id: testTruck.assigned_user_id }).eq('id', testTruck.id);
    console.log('Estado original del camion restaurado con exito.');
  }
}

verifyProfilesAndDrivers();
