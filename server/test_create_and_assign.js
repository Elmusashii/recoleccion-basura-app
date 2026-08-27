import dotenv from 'dotenv';
dotenv.config();
import { supabase } from './src/config/supabase.js';
import { createReport, updateReportStatus } from './src/controllers/reports.controller.js';

async function testCreateAndAssign() {
  console.log('=== TEST REPRODUCCIÓN: CREAR DENUNCIA NUEVA Y ASIGNARLA ===\n');

  // 1. Simular la creación de una nueva denuncia ciudadana desde ReportModal
  console.log('--- PASO 1: CIUDADANO CREA DENUNCIA (POST /api/reports) ---');
  const citizenPayload = {
    citizen_name: 'Carlos Benítez',
    citizen_phone: '+595 981 112233',
    citizen_email: 'carlos@gmail.com',
    category: 'VERTEDERO_CLANDESTINO',
    description: 'Basural clandestino acumulado en esquina de Bella Vista',
    barrio: 'Bella Vista',
    address_reference: 'Barrio Bella Vista - Calle Itapúa y Tte. Silverio Mendoza',
    latitude: -25.2680,
    longitude: -57.5850,
    photo_urls: ['https://ejemplo.com/foto-denuncia-test.jpg']
  };

  const createReq = {
    body: citizenPayload
  };

  let createResponseData = null;
  const createMockRes = {
    statusCode: 200,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(data) {
      createResponseData = data;
      console.log(`\n[POST /api/reports Response HTTP ${this.statusCode}]:`, JSON.stringify(data, null, 2));
      return this;
    }
  };

  await createReport(createReq, createMockRes);

  const createdReport = createResponseData?.data;
  console.log('\n--- PASO 2: INSPECCIÓN DEL OBJETO RETORNADO AL FRONTEND ---');
  console.log('createdReport.id:', createdReport?.id);
  console.log('createdReport.ticket_number:', createdReport?.ticket_number);
  console.log('Es UUID válido?', /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(createdReport?.id));

  // 2. Verificar si la denuncia quedó en Supabase PostgreSQL
  console.log('\n--- PASO 3: CONSULTA DIRECTA A SUPABASE POSTGRESQL ---');
  const { data: dbCheck, error: dbCheckErr } = await supabase
    .from('reports')
    .select('*')
    .eq('ticket_number', createdReport?.ticket_number)
    .maybeSingle();

  console.log('¿Existe en Supabase reports?:', !!dbCheck);
  if (dbCheck) {
    console.log('Registro real en Supabase:', {
      id: dbCheck.id,
      ticket_number: dbCheck.ticket_number,
      status: dbCheck.status,
      address_reference: dbCheck.address_reference
    });
  } else {
    console.log('Error o ausencia en Supabase:', dbCheckErr);
  }

  // 3. Simular que AdminDashboard abre AssignReportModal con esta denuncia recién creada
  console.log('\n--- PASO 4: ADMIN ABRE MODAL ATENDER Y ASIGNAR ---');
  console.log('[DEBUG Frontend AssignReportModal] report prop received:', JSON.stringify(createdReport, null, 2));

  const targetTruckId = '51c26ab0-8601-46e7-8b97-48a7de1d9c17'; // CAM-01
  const assignPayload = {
    status: 'EN_PROCESO',
    assigned_truck_id: targetTruckId,
    admin_notes: 'Asignado a CAM-01 para limpieza prioritaria'
  };

  const reportIdentifier = createdReport?.id || createdReport?.ticket_number;
  console.log('[DEBUG Frontend AssignReportModal] Submitting reportIdentifier:', reportIdentifier, 'payload:', assignPayload);

  // 4. Ejecutar PATCH /api/reports/:id/status
  console.log('\n--- PASO 5: EJECUCIÓN BACKEND (PATCH /api/reports/:id/status) ---');
  const patchReq = {
    params: { id: reportIdentifier },
    body: assignPayload,
    user: { id: 'admin-user-id', app_metadata: { role: 'admin' } }
  };

  const patchMockRes = {
    statusCode: 200,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(data) {
      console.log(`\n[PATCH /api/reports/:id/status Response HTTP ${this.statusCode}]:`, JSON.stringify(data, null, 2));
      return this;
    }
  };

  await updateReportStatus(patchReq, patchMockRes);
}

testCreateAndAssign();
