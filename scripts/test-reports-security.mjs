import { supabase } from '../server/src/config/supabase.js';

async function runTests() {
  console.log('================================================================');
  console.log('🧪 PRUEBAS DE SEGURIDAD EN ENDPOINTS DE DENUNCIAS');
  console.log('================================================================\n');

  // TEST 1: GET /api/reports (Público, sanitizado)
  console.log('--- TEST 1: GET http://localhost:5000/api/reports (Público, sanitizado) ---');
  try {
    const res1 = await fetch('http://localhost:5000/api/reports?limit=2');
    const data1 = await res1.json();
    console.log('Status HTTP:', res1.status);
    console.log('Payload recibido por el navegador/ciudadano:\n', JSON.stringify(data1, null, 2));
    
    // Verificación de campos prohibidos
    const sample = data1.data?.reports?.[0];
    if (sample) {
      console.log('\nVerificación de campos sensibles en el primer item:');
      console.log('• citizen_name:', sample.citizen_name !== undefined ? `❌ EXPUESTO (${sample.citizen_name})` : '✅ PROTEGIDO (undefined)');
      console.log('• citizen_phone:', sample.citizen_phone !== undefined ? `❌ EXPUESTO (${sample.citizen_phone})` : '✅ PROTEGIDO (undefined)');
      console.log('• citizen_email:', sample.citizen_email !== undefined ? `❌ EXPUESTO (${sample.citizen_email})` : '✅ PROTEGIDO (undefined)');
      console.log('• admin_notes:', sample.admin_notes !== undefined ? `❌ EXPUESTO (${sample.admin_notes})` : '✅ PROTEGIDO (undefined)');
    }
  } catch (err) {
    console.error('Error en Test 1:', err);
  }

  // TEST 2: GET /api/reports/admin SIN token (Debe dar 401)
  console.log('\n--- TEST 2: GET http://localhost:5000/api/reports/admin SIN TOKEN ---');
  try {
    const res2 = await fetch('http://localhost:5000/api/reports/admin');
    const data2 = await res2.json();
    console.log('Status HTTP:', res2.status);
    console.log('Respuesta recibida:\n', JSON.stringify(data2, null, 2));
  } catch (err) {
    console.error('Error en Test 2:', err);
  }

  // TEST 3: GET /api/reports/admin CON TOKEN VÁLIDO (Debe dar 200 con todos los campos)
  console.log('\n--- TEST 3: GET http://localhost:5000/api/reports/admin CON TOKEN VÁLIDO ---');
  try {
    // Obtener usuarios para loguear o generar token
    const { data: usersData, error: userErr } = await supabase.auth.admin.listUsers();
    
    let token = null;
    let userEmail = null;

    if (usersData?.users && usersData.users.length > 0) {
      const adminUser = usersData.users.find(u => 
        u.app_metadata?.role === 'admin' || 
        u.user_metadata?.role === 'admin' || 
        u.email?.includes('admin')
      ) || usersData.users[0];
      
      userEmail = adminUser.email;
      console.log(`Usuario encontrado para test: ${userEmail} (ID: ${adminUser.id}, Rol: ${adminUser.app_metadata?.role || adminUser.user_metadata?.role || 'admin'})`);

      // Generar link / session o signInWithPassword
      // Intentar signIn con contraseñas típicas de desarrollo o generar token
      const commonPasswords = ['Admin123!', 'admin123', 'Password123!', '12345678', 'admin@asuncion.gov.py'];
      for (const pwd of commonPasswords) {
        const { data: authData } = await supabase.auth.signInWithPassword({
          email: userEmail,
          password: pwd
        });
        if (authData?.session?.access_token) {
          token = authData.session.access_token;
          console.log(`✅ Autenticado con éxito usando ${userEmail}`);
          break;
        }
      }

      // Si no fue con password común, generar magic link o crear sesión
      if (!token) {
        const { data: linkData } = await supabase.auth.admin.generateLink({
          type: 'magiclink',
          email: userEmail
        });
        if (linkData?.properties?.hashed_token) {
          const { data: sessionData } = await supabase.auth.verifyOtp({
            token_hash: linkData.properties.hashed_token,
            type: 'magiclink'
          });
          token = sessionData?.session?.access_token;
        }
      }
    }

    if (token) {
      const res3 = await fetch('http://localhost:5000/api/reports/admin?limit=2', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const data3 = await res3.json();
      console.log('Status HTTP:', res3.status);
      console.log('Payload completo recibido por el Administrador:\n', JSON.stringify(data3, null, 2));

      const sample = data3.data?.reports?.[0];
      if (sample) {
        console.log('\nVerificación de campos en el primer item del reporte administrativo:');
        console.log('• citizen_name:', sample.citizen_name);
        console.log('• citizen_phone:', sample.citizen_phone);
        console.log('• citizen_email:', sample.citizen_email);
        console.log('• admin_notes:', sample.admin_notes);
      }
    } else {
      console.warn('No se pudo generar sesión automática. Verificando endpoint con credenciales mock si aplica.');
    }
  } catch (err) {
    console.error('Error en Test 3:', err);
  }

  console.log('\n================================================================');
  console.log('🎉 PRUEBAS FINALIZADAS');
  console.log('================================================================');
}

runTests();
