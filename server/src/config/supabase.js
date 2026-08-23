import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });
dotenv.config({ path: path.resolve(__dirname, '../../.env') });
dotenv.config({ path: path.resolve(process.cwd(), '../.env') });
dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = 
  process.env.SUPABASE_SERVICE_ROLE_KEY || 
  process.env.SUPABASE_SECRET_KEY || 
  process.env.SUPABASE_ANON_KEY || 
  process.env.SUPABASE_PUBLISHABLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.warn(
    '⚠️ [SUPABASE]: Variables SUPABASE_URL o llaves no encontradas en el archivo .env. Asegúrate de configurarlas para interactuar con la base de datos.'
  );
}

/**
 * Cliente de Supabase para el backend.
 * Utiliza SUPABASE_SERVICE_ROLE_KEY para operaciones administrativas seguras
 * o SUPABASE_ANON_KEY si está en modo cliente/público.
 */
export const supabase = createClient(supabaseUrl || 'https://placeholder.supabase.co', supabaseKey || 'placeholder', {
  auth: {
    persistSession: false,
    autoRefreshToken: false
  }
});

export default supabase;
