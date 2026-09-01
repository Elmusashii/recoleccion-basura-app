import { supabase } from '../../server/src/config/supabase.js';

async function runUploadSecurityTests() {
  console.log('================================================================');
  console.log('🛡️ PRUEBAS DE BLINDAJE Y SEGURIDAD EN CARGA DE ARCHIVOS');
  console.log('================================================================\n');

  const UPLOAD_URL = 'http://localhost:5000/api/reports/upload';

  // 1. TEST 1: Subida de archivo .xlsx real (application/vnd.openxmlformats-officedocument.spreadsheetml.sheet)
  console.log('--- TEST 1: Subiendo archivo Excel .xlsx ---');
  try {
    const xlsxBuffer = Buffer.from('PK\x03\x04MockExcelContentForTestingSecurity12345');
    const formData = new FormData();
    const blob = new Blob([xlsxBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    formData.append('photo', blob, 'reporte_invalido.xlsx');

    const res = await fetch(UPLOAD_URL, {
      method: 'POST',
      body: formData
    });
    const data = await res.json();
    console.log('Status HTTP:', res.status, res.status === 400 ? '✅ (RECHAZADO CORRECTAMENTE CON 400)' : '❌ FALLÓ');
    console.log('Respuesta del servidor:', JSON.stringify(data, null, 2));
  } catch (err) {
    console.error('Error en Test 1:', err.message);
  }

  // 2. TEST 2: Archivo .xlsx disfrazado de .jpg (con extensión .jpg y mimetype image/jpeg pero contenido no binario de imagen)
  console.log('\n--- TEST 2: Archivo falso disfrazado (.xlsx con nombre foto.jpg y mimetype image/jpeg) ---');
  try {
    const fakeJpgBuffer = Buffer.from('PK\x03\x04FakeZipOrExcelPayloadPosingAsJpegImage');
    const formData = new FormData();
    const blob = new Blob([fakeJpgBuffer], { type: 'image/jpeg' });
    formData.append('photo', blob, 'foto_trampa.jpg');

    const res = await fetch(UPLOAD_URL, {
      method: 'POST',
      body: formData
    });
    const data = await res.json();
    console.log('Status HTTP:', res.status, res.status === 400 ? '✅ (DETECTADO Y RECHAZADO POR MAGIC BYTES)' : '❌ FALLÓ');
    console.log('Respuesta del servidor:', JSON.stringify(data, null, 2));
  } catch (err) {
    console.error('Error en Test 2:', err.message);
  }

  // 3. TEST 3: Archivo que excede el límite de 8MB (> 8MB)
  console.log('\n--- TEST 3: Archivo de imagen válido que excede 8MB (ej: 9MB) ---');
  try {
    // Generar buffer de 9MB con header PNG válido
    const largePngHeader = Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]);
    const largePayload = Buffer.alloc(9 * 1024 * 1024);
    largePngHeader.copy(largePayload, 0);

    const formData = new FormData();
    const blob = new Blob([largePayload], { type: 'image/png' });
    formData.append('photo', blob, 'foto_gigante.png');

    const res = await fetch(UPLOAD_URL, {
      method: 'POST',
      body: formData
    });
    const data = await res.json();
    console.log('Status HTTP:', res.status, res.status === 400 ? '✅ (RECHAZADO POR EXCEDER 8MB)' : '❌ FALLÓ');
    console.log('Respuesta del servidor:', JSON.stringify(data, null, 2));
  } catch (err) {
    console.error('Error en Test 3:', err.message);
  }

  // 4. TEST 4: Imagen válida real (PNG 1x1 pixel)
  console.log('\n--- TEST 4: Imagen válida real (PNG válido < 8MB) ---');
  let validUploadedUrl = null;
  try {
    // PNG 1x1 transparente mínimo válido
    const validPngBuffer = Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=',
      'base64'
    );
    const formData = new FormData();
    const blob = new Blob([validPngBuffer], { type: 'image/png' });
    formData.append('photo', blob, 'evidencia_valida.png');

    const res = await fetch(UPLOAD_URL, {
      method: 'POST',
      body: formData
    });
    const data = await res.json();
    console.log('Status HTTP:', res.status, res.status === 201 ? '✅ (SUBIDA EXITOSA)' : '❌ FALLÓ');
    console.log('Respuesta del servidor:', JSON.stringify(data, null, 2));
    validUploadedUrl = data.data?.url;
  } catch (err) {
    console.error('Error en Test 4:', err.message);
  }

  // 5. Limpieza opcional del archivo .xlsx previo en el bucket
  console.log('\n--- LIMPIEZA: Eliminando archivo .xlsx del bucket de Supabase ---');
  try {
    const { data: removeData, error: removeErr } = await supabase.storage
      .from('denuncias-fotos')
      .remove(['reports/1787420597434-6z3mr7a.xlsx']);

    if (!removeErr) {
      console.log('✅ Archivo reports/1787420597434-6z3mr7a.xlsx eliminado de Supabase Storage.');
    } else {
      console.warn('Nota sobre eliminación storage:', removeErr.message);
    }

    // Actualizar reporte en base de datos para limpiar URL xlsx
    const { error: dbErr } = await supabase
      .from('reports')
      .update({ photo_urls: [] })
      .eq('ticket_number', 'ASU-20260822-9968');

    if (!dbErr) {
      console.log('✅ Reporte ASU-20260822-9968 actualizado con photo_urls limpio ([]).');
    }
  } catch (cleanErr) {
    console.warn('Error en limpieza:', cleanErr.message);
  }

  console.log('\n================================================================');
  console.log('🎉 TODAS LAS PRUEBAS DE SEGURIDAD COMPLETADAS');
  console.log('================================================================');
}

runUploadSecurityTests();
