import dotenv from 'dotenv';
dotenv.config();
import { supabase } from '../../server/src/config/supabase.js';
import { getNearestTrucksForReport } from '../../server/src/controllers/reports.controller.js';

async function testNearestTrucks() {
  console.log('=== TEST DIAGNÓSTICO: POST /api/reports/:id/nearest-trucks ===\n');

  // 1. Probar la query exacta que hace getNearestTrucksForReport a Supabase
  console.log('--- 1. Probando query supabase.from("trucks").select("*, profiles:assigned_user_id(name)") ---');
  const { data: qData, error: qErr } = await supabase
    .from('trucks')
    .select('*, profiles:assigned_user_id(name)')
    .in('status', ['DISPONIBLE', 'EN_RUTA']);

  console.log('Error de Supabase:', qErr ? { message: qErr.message, details: qErr.details, hint: qErr.hint, code: qErr.code } : 'Ninguno (OK)');
  console.log('Data devuelta por Supabase:', qData?.length || 0, 'camiones');

  // 2. Probar query simple sin el join roto
  console.log('\n--- 2. Probando query supabase.from("trucks").select("*") ---');
  const { data: simpleData, error: simpleErr } = await supabase
    .from('trucks')
    .select('*')
    .in('status', ['DISPONIBLE', 'EN_RUTA']);

  console.log('Error query simple:', simpleErr?.message || 'Ninguno (OK)');
  console.log('Camiones devueltos:', simpleData?.map(t => ({ id: t.id, code: t.code, status: t.status })));

  // 3. Ejecutar getNearestTrucksForReport controller para una denuncia real (Jara o Bella Vista)
  console.log('\n--- 3. Ejecutando getNearestTrucksForReport controller con denuncia real ---');
  const { data: rep } = await supabase.from('reports').select('*').limit(1).single();

  const req = {
    params: { id: rep.id },
    user: { id: 'admin', app_metadata: { role: 'admin' } }
  };

  const mockRes = {
    statusCode: 200,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(data) {
      console.log(`\nRespuesta de getNearestTrucksForReport (HTTP ${this.statusCode}):`);
      console.log(JSON.stringify(data, null, 2));
      return this;
    }
  };

  await getNearestTrucksForReport(req, mockRes);
}

testNearestTrucks();
