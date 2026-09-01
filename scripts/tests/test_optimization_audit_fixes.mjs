import dotenv from 'dotenv';
dotenv.config();
import { supabase } from '../../server/src/config/supabase.js';
import { dispatchOptimizedRoute } from '../../server/src/controllers/fleet.controller.js';
import { requireRole } from '../../server/src/middlewares/auth.js';

async function runAuditFixesVerification() {
  console.log('================================================================');
  console.log('PRUEBA 1: Acotar rol de optimize-reports (Test de Middleware)');
  console.log('================================================================');
  const middleware = requireRole(['admin', 'supervisor']);
  
  let operatorBlocked = false;
  let choferBlocked = false;
  let adminPassed = false;

  const mockRes = (onBlocked) => ({
    status: (code) => {
      if (code === 403) onBlocked();
      return { json: () => {} };
    }
  });

  // Probar Operador
  middleware({ user: { app_metadata: { role: 'operator' } } }, mockRes(() => { operatorBlocked = true; }), () => {});
  // Probar Chofer
  middleware({ user: { app_metadata: { role: 'chofer' } } }, mockRes(() => { choferBlocked = true; }), () => {});
  // Probar Admin
  middleware({ user: { app_metadata: { role: 'admin' } } }, mockRes(() => {}), () => { adminPassed = true; });

  console.log(`Operador bloqueado con 403: ${operatorBlocked ? 'PASS' : 'FAIL'}`);
  console.log(`Chofer bloqueado con 403:   ${choferBlocked ? 'PASS' : 'FAIL'}`);
  console.log(`Admin autorizado con next(): ${adminPassed ? 'PASS' : 'FAIL'}`);

  console.log('\n================================================================');
  console.log('PRUEBA 2: Despacho Normal (Sin Conflictos)');
  console.log('================================================================');
  const { data: trucks } = await supabase.from('trucks').select('*').limit(2);
  const truck1 = trucks[0];
  const truck2 = trucks[1];

  const { data: reports } = await supabase.from('reports').select('*').limit(3);
  const rep1 = reports[0];
  const rep2 = reports[1];
  const rep3 = reports[2];

  // Preparar rep1 y rep2 como PENDIENTE
  await supabase.from('reports').update({ status: 'PENDIENTE', assigned_truck_id: null }).in('id', [rep1.id, rep2.id]);

  let resData1 = null;
  let resStatus1 = 200;
  await dispatchOptimizedRoute(
    { params: { id: truck1.id }, body: { reportIds: [rep1.id, rep2.id] } },
    {
      status: (c) => { resStatus1 = c; return { json: (d) => { resData1 = d; } }; },
      json: (d) => { resData1 = d; }
    }
  );

  console.log(`Despacho normal status: ${resStatus1} (Expected 200)`);
  console.log(`Denuncias actualizadas: ${resData1?.data?.updated_count} (Expected 2)`);
  console.log(`Conflictos omitidos: ${resData1?.data?.skipped_conflicts?.length} (Expected 0)`);

  console.log('\n================================================================');
  console.log('PRUEBA 3: Prevención de Sobreescritura (Detección de Conflictos)');
  console.log('================================================================');
  // rep1 está asignada a truck1 ('EN_PROCESO').
  // rep3 está 'PENDIENTE'.
  await supabase.from('reports').update({ status: 'PENDIENTE', assigned_truck_id: null }).eq('id', rep3.id);

  // Intentamos despachar [rep1, rep3] hacia truck2 (CAM-02). rep1 debe ser omitida y rep3 despachada.
  let resData2 = null;
  let resStatus2 = 200;
  await dispatchOptimizedRoute(
    { params: { id: truck2.id }, body: { reportIds: [rep1.id, rep3.id] } },
    {
      status: (c) => { resStatus2 = c; return { json: (d) => { resData2 = d; } }; },
      json: (d) => { resData2 = d; }
    }
  );

  console.log(`Despacho con conflicto status: ${resStatus2}`);
  console.log(`Denuncias efectivamente asignadas a ${truck2.code}: ${resData2?.data?.updated_count} (Expected 1)`);
  console.log(`Denuncias en skipped_conflicts: ${resData2?.data?.skipped_conflicts?.length} (Expected 1)`);
  console.log('Detalle de conflicto omitido:', resData2?.data?.skipped_conflicts);

  // Verificar en DB que rep1 sigue perteneciendo a truck1 y rep3 pertenece a truck2
  const { data: checkRep1 } = await supabase.from('reports').select('id, assigned_truck_id').eq('id', rep1.id).single();
  const { data: checkRep3 } = await supabase.from('reports').select('id, assigned_truck_id').eq('id', rep3.id).single();
  console.log(`Rep1 sigue asignada a ${truck1.code}? ${checkRep1.assigned_truck_id === truck1.id ? 'SI (Protegida)' : 'NO (Sobreescrita)'}`);
  console.log(`Rep3 fue asignada a ${truck2.code}? ${checkRep3.assigned_truck_id === truck2.id ? 'SI' : 'NO'}`);

  console.log('\n================================================================');
  console.log('PRUEBA 4: Validación de Capacidad en Backend (Sobrecarga directa)');
  console.log('================================================================');
  // Crear una lista sintética o enviar un camión de baja capacidad con exceso de peso
  // Modificamos temporalmente el camión de prueba para tener 1 Tonelada (1000 kg)
  await supabase.from('trucks').update({ capacity_tons: 1.0 }).eq('id', truck1.id);

  // rep1 (500kg) + rep2 (500kg) + rep3 (500kg) = 1500 kg > 1.0 Tn (1000 kg)
  let resData3 = null;
  let resStatus3 = 200;
  await dispatchOptimizedRoute(
    { params: { id: truck1.id }, body: { reportIds: [rep1.id, rep2.id, rep3.id] } },
    {
      status: (c) => { resStatus3 = c; return { json: (d) => { resData3 = d; } }; },
      json: (d) => { resData3 = d; }
    }
  );

  console.log(`Respuesta ante sobrecarga status: ${resStatus3} (Expected 400)`);
  console.log(`Mensaje de rechazo: ${resData3?.message}`);

  // Restaurar datos originales
  await supabase.from('trucks').update({ capacity_tons: truck1.capacity_tons }).eq('id', truck1.id);
  await supabase.from('reports').update({ status: rep1.status, assigned_truck_id: rep1.assigned_truck_id }).eq('id', rep1.id);
  await supabase.from('reports').update({ status: rep2.status, assigned_truck_id: rep2.assigned_truck_id }).eq('id', rep2.id);
  await supabase.from('reports').update({ status: rep3.status, assigned_truck_id: rep3.assigned_truck_id }).eq('id', rep3.id);
  console.log('Datos restaurados con éxito.');
}

runAuditFixesVerification().catch(console.error);
