import dotenv from 'dotenv';
dotenv.config();
import { supabase } from './src/config/supabase.js';
import { getNearestTrucksForReport, updateReportStatus } from './src/controllers/reports.controller.js';

async function testJaraAssignment() {
  console.log('=== TEST ASIGNACIÓN DENUNCIA JARA ===\n');

  // 1. Buscar la denuncia de Jara
  const jaraId = '0a8b2236-5c7f-42d2-812e-e1f286f20004';
  let { data: jaraReport, error: jaraErr } = await supabase
    .from('reports')
    .select('*')
    .eq('id', jaraId)
    .maybeSingle();

  if (!jaraReport) {
    console.log('No se encontró denuncia con ID exacto:', jaraId, '. Buscando por barrio Jara...');
    const { data: byBarrio } = await supabase
      .from('reports')
      .select('*')
      .ilike('address_reference', '%Jara%')
      .limit(1);

    if (byBarrio && byBarrio.length > 0) {
      jaraReport = byBarrio[0];
    } else {
      console.log('Creando denuncia de prueba para Barrio Jara con ese UUID...');
      const { data: created, error: cErr } = await supabase
        .from('reports')
        .insert([{
          id: jaraId,
          ticket_number: 'ASU-20260825-9901',
          citizen_name: 'Vecino Barrio Jara',
          category: 'VERTEDERO_CLANDESTINO',
          description: 'Basura acumulada en esquina Barrio Jara',
          address_reference: 'Barrio Jara - Av. Brasilia y San Salvador',
          latitude: -25.2750,
          longitude: -57.6050,
          status: 'PENDIENTE'
        }])
        .select()
        .single();
      
      if (cErr) {
        console.error('Error creando denuncia con UUID específico:', cErr.message);
        // Crear sin especificar ID
        const { data: autoId } = await supabase.from('reports').insert([{
          ticket_number: 'ASU-20260825-9901',
          citizen_name: 'Vecino Barrio Jara',
          category: 'VERTEDERO_CLANDESTINO',
          description: 'Basura acumulada en esquina Barrio Jara',
          address_reference: 'Barrio Jara - Av. Brasilia y San Salvador',
          latitude: -25.2750,
          longitude: -57.6050,
          status: 'PENDIENTE'
        }]).select().single();
        jaraReport = autoId;
      } else {
        jaraReport = created;
      }
    }
  }

  console.log('Denuncia de Jara a probar:', {
    id: jaraReport?.id,
    ticket_number: jaraReport?.ticket_number,
    address_reference: jaraReport?.address_reference,
    status: jaraReport?.status
  });

  // 2. Probar POST /api/reports/:id/nearest-trucks
  console.log('\n--- 1. CONSULTANDO NEAREST TRUCKS PARA LA DENUNCIA ---');
  const reqNearest = {
    params: { id: jaraReport.id },
    user: { id: 'admin', app_metadata: { role: 'admin' } }
  };

  let nearestList = [];
  const mockResNearest = {
    statusCode: 200,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(data) {
      console.log(`Respuesta HTTP ${this.statusCode} de nearest-trucks:`);
      nearestList = data?.data?.nearestTrucks || [];
      console.log('Camiones devueltos con distancias reales:');
      nearestList.forEach((t, i) => {
        console.log(`[#${i + 1}] ID: ${t.id} | Código: ${t.code} | Distancia: ${t.formattedDistance} (${t.formattedDuration}) | Chofer: ${t.driver_name} | Status: ${t.status}`);
      });
      return this;
    }
  };

  await getNearestTrucksForReport(reqNearest, mockResNearest);

  // 3. Simular selección de camión más cercano y PATCH
  const chosenTruck = nearestList[0];
  if (!chosenTruck) {
    console.error('No se obtuvieron camiones en nearestTrucks');
    return;
  }

  console.log('\n--- 2. SIMULANDO ASIGNACIÓN CON EL CAMIÓN MÁS CERCANO ---');
  console.log('Camión elegido:', chosenTruck.code, 'con UUID:', chosenTruck.id);

  const assignPayload = {
    status: 'EN_PROCESO',
    assigned_truck_id: chosenTruck.id,
    admin_notes: `Asignado prioritariamente a ${chosenTruck.code} (${chosenTruck.formattedDistance})`
  };

  const reqPatch = {
    params: { id: jaraReport.id },
    body: assignPayload,
    user: { id: 'admin-user-id', app_metadata: { role: 'admin' } }
  };

  const mockResPatch = {
    statusCode: 200,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(data) {
      console.log(`\n[PATCH /api/reports/:id/status Response HTTP ${this.statusCode}]:`);
      console.log(JSON.stringify(data, null, 2));
      return this;
    }
  };

  await updateReportStatus(reqPatch, mockResPatch);

  // 4. Probar validación estricta de UUID enviando un string inválido como 'trk-02'
  console.log('\n--- 3. PROBANDO RED DE SEGURIDAD: ENVIAR assigned_truck_id INVÁLIDO ("trk-02") ---');
  const reqInvalid = {
    params: { id: jaraReport.id },
    body: {
      status: 'EN_PROCESO',
      assigned_truck_id: 'trk-02',
      admin_notes: 'Intento con id falso'
    },
    user: { id: 'admin-user-id', app_metadata: { role: 'admin' } }
  };

  const mockResInvalid = {
    statusCode: 200,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(data) {
      console.log(`[Respuesta esperada HTTP ${this.statusCode}]:`, JSON.stringify(data, null, 2));
      return this;
    }
  };

  await updateReportStatus(reqInvalid, mockResInvalid);
}

testJaraAssignment();
