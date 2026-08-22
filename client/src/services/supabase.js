import { createClient } from '@supabase/supabase-js';
import axios from 'axios';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://lujxxwpczayatecdqpcu.supabase.co';
const supabaseAnonKey = 
  import.meta.env.VITE_SUPABASE_ANON_KEY || 
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || 
  'sb_publishable_Y25woXutnYVF8n75wp1Fsw_DtyFgTR_';

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

/**
 * Cliente de Supabase para el frontend (Browser)
 * Usado para autenticación de administradores y consultas públicas
 */
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

/**
 * Sube una fotografía de denuncia al bucket de Supabase Storage
 * Primero intenta a través del backend Express (con Service Role Key segura)
 * y si falla, intenta subida directa con el cliente Supabase.
 * 
 * @param {File} file - Archivo de imagen desde el input o cámara
 * @returns {Promise<string>} - URL pública de la imagen
 */
export const uploadReportPhoto = async (file) => {
  if (!file) return null;

  // 1. Intento prioritario: Vía Backend Express /api/reports/upload
  try {
    const formData = new FormData();
    formData.append('photo', file);

    const res = await axios.post(`${API_BASE_URL}/reports/upload`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });

    const publicUrl = res.data?.data?.url;
    if (publicUrl) {
      console.log('✅ Foto subida exitosamente mediante backend:', publicUrl);
      return publicUrl;
    }
  } catch (apiErr) {
    // Si el backend rechazó por validación (400 / tipo o tamaño inválido), propagar el error inmediatamente
    if (apiErr.response?.status === 400 || apiErr.response?.data?.message) {
      throw new Error(apiErr.response?.data?.message || 'Archivo no permitido por el servidor.');
    }
    console.warn('Backend upload no disponible o falló, intentando subida directa:', apiErr.message);
  }

  // 2. Intento de respaldo: Subida directa con Supabase Client
  try {
    const fileExt = file.name ? file.name.split('.').pop() : 'jpg';
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
    const filePath = `reports/${fileName}`;

    const { data, error } = await supabase.storage
      .from('denuncias-fotos')
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false
      });

    if (error) {
      console.error('Error al subir imagen directamente a Supabase Storage:', error);
      throw error;
    }

    const { data: publicUrlData } = supabase.storage
      .from('denuncias-fotos')
      .getPublicUrl(filePath);

    return publicUrlData.publicUrl;
  } catch (err) {
    console.error('Fallo en uploadReportPhoto:', err);
    throw err;
  }
};

