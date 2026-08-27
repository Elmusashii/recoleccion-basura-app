import dotenv from 'dotenv';
dotenv.config();
import { supabase } from './src/config/supabase.js';
import { updateReportStatus } from './src/controllers/reports.controller.js';

async function testAssignReport() {
  console.log('=== TEST REPRODUCCIÓN: ASIGNAR DENUNCIA (BELLA VISTA -> CAM-01) ===\n');

  // 1. Obtener la denuncia de Bella Vista
  const { data: reports, error: rErr } = await supabase
    .from('reports')
    .select('*')
    .ilike('address_reference', '%Bella Vista%')
    .order('created_at', { ascending: false });

  console.log('Denuncias de Bella Vista en Supabase:', reports?.length || 0);
  const targetReport = reports?.[0];
  if (targetReport) {
    console.log('Reporte seleccionado:', {
      id: targetReport.id,
      ticket_number: targetReport.ticket_number,
      category: targetReport.category,
      address_reference: targetReport.address_reference,
      status: targetReport.status
    });
  }

  // 2. Obtener camión CAM-01
  const { data: trucks } = await supabase
    .from('trucks')
    .select('id, code, plate_number, status')
    .eq('code', 'CAM-01');

  const targetTruck = trucks?.[0] || { id: '51c26ab0-8601-46e7-8b97-48a7de1d9c17', code: 'CAM-01' };
  console.log('Camión seleccionado:', targetTruck);

  // 3. Simular el Frontend (AssignReportModal.jsx)
  console.log('\n--- SIMULACIÓN FRONTEND (AssignReportModal.jsx) ---');
  const reportPropReceived = targetReport;
  const selectedTruckId = targetTruck.id;
  const adminNotes = 'Asignado a turno mañana. Limpieza inmediata requerida.';

  const payload = {
    status: 'EN_PROCESO',
    assigned_truck_id: selectedTruckId || null,
    admin_notes: adminNotes.trim() || null
  };

  const reportIdentifier = reportPropReceived.id || reportPropReceived.ticket_number;
  console.log('[DEBUG Frontend AssignReportModal] report prop received:', JSON.stringify({
    id: reportPropReceived.id,
    ticket_number: reportPropReceived.ticket_number,
    category: reportPropReceived.category,
    status: reportPropReceived.status
  }, null, 2));
  console.log('[DEBUG Frontend AssignReportModal] Submitting reportIdentifier:', reportIdentifier, 'payload:', payload);

  // 4. Simular el Backend (updateReportStatus)
  console.log('\n--- EJECUCIÓN BACKEND (updateReportStatus) ---');
  const req = {
    params: { id: reportIdentifier },
    body: payload,
    user: { id: 'admin-user-id', app_metadata: { role: 'admin' } }
  };

  const mockRes = {
    statusCode: 200,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(data) {
      console.log(`[Backend Response HTTP ${this.statusCode}]:`, JSON.stringify(data, null, 2));
      return this;
    }
  };

  await updateReportStatus(req, mockRes);

  // 5. Simular llamada pasando ticket_number
  console.log('\n--- EJECUCIÓN BACKEND CON TICKET_NUMBER ("ASU-20260825-3594") ---');
  const reqTicket = {
    params: { id: targetReport.ticket_number },
    body: {
      status: 'PENDIENTE',
      assigned_truck_id: null,
      admin_notes: 'Reestablecido a PENDIENTE'
    },
    user: { id: 'admin-user-id', app_metadata: { role: 'admin' } }
  };
  await updateReportStatus(reqTicket, mockRes);
}

testAssignReport();

