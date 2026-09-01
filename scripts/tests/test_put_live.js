import dotenv from 'dotenv';
dotenv.config();
import { supabase } from '../../server/src/config/supabase.js';

async function testPutEndpoint() {
  console.log('=== TEST DIRECTO CONTRA EL SERVIDOR EXPRESS (PORT 5000) ===\n');

  // 1. Obtener usuario admin de auth.users en Supabase
  const { data: users, error: uErr } = await supabase.auth.admin.listUsers();
  const adminUser = users?.users?.find(u => (u.app_metadata?.role === 'admin' || u.user_metadata?.role === 'admin'));

  console.log('Admin user found:', adminUser?.email, adminUser?.id);

  // 2. Generar sesión / token para el admin
  let token = null;
  if (adminUser) {
    // Si tenemos password o podemos generar un token
    // Probemos con las credenciales demo: admin@asuncion.gov.py
    const { data: loginData, error: loginErr } = await supabase.auth.signInWithPassword({
      email: adminUser.email,
      password: 'Password123!' // o la password del seed
    });

    if (loginData?.session) {
      token = loginData.session.access_token;
      console.log('Login exitoso como:', adminUser.email);
    } else {
      console.log('No se pudo loguear con password estándar:', loginErr?.message);
    }
  }

  // 3. Probar PUT a la API
  const truckId = '9f5133b2-6dc2-4c23-b710-e17765b38bc6'; // CAM-04
  const routeIds = [
    '8fd7216d-c0b2-4d5c-aa34-dce79dc22e02', // Bella Vista
    '54a5d0fa-0e2f-4b38-8ffc-2295ffa530f2'  // Banco San Miguel
  ];

  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  try {
    const res = await fetch(`http://localhost:5000/api/fleet/trucks/${truckId}/routes`, {
      method: 'PUT',
      headers,
      body: JSON.stringify({ routeIds })
    });

    const resJson = await res.json();
    console.log('\nRespuesta del servidor Express:');
    console.log('Status HTTP:', res.status);
    console.log('Payload:', JSON.stringify(resJson, null, 2));
  } catch (fetchErr) {
    console.error('Error de red al consultar el servidor:', fetchErr.message);
  }
}

testPutEndpoint();
