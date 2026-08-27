-- ==============================================================================
-- MIGRACIÓN: CREACIÓN DE TABLA PROFILES, TRIGGER DE SINCRONIZACIÓN Y BACKFILL
-- ==============================================================================

-- 1. Crear tabla public.profiles si no existe
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(150) NOT NULL,
    role VARCHAR(50) DEFAULT 'operator', -- 'admin', 'supervisor', 'chofer', 'operator', 'inspector'
    department VARCHAR(150) DEFAULT 'Dirección General de Servicios Urbanos',
    phone VARCHAR(50),
    status VARCHAR(20) DEFAULT 'ACTIVO',
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Políticas de RLS
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'profiles' AND policyname = 'Lectura de perfiles para autenticados'
    ) THEN
        CREATE POLICY "Lectura de perfiles para autenticados" 
        ON public.profiles 
        FOR SELECT 
        TO authenticated 
        USING (true);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'profiles' AND policyname = 'Administración de perfiles para administradores'
    ) THEN
        CREATE POLICY "Administración de perfiles para administradores" 
        ON public.profiles 
        FOR ALL 
        TO authenticated 
        USING (true) 
        WITH CHECK (true);
    END IF;
END $$;

-- 2. Función de sincronización automática desde auth.users
CREATE OR REPLACE FUNCTION public.sync_profile_on_user_change()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, name, role, phone, department, status)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.raw_app_meta_data->>'role', NEW.raw_user_meta_data->>'role', 'operator'),
    COALESCE(NEW.raw_user_meta_data->>'phone', ''),
    COALESCE(NEW.raw_user_meta_data->>'department', 'Dirección General de Servicios Urbanos'),
    COALESCE(NEW.raw_user_meta_data->>'status', 'ACTIVO')
  )
  ON CONFLICT (id) DO UPDATE SET
    email      = EXCLUDED.email,
    name       = EXCLUDED.name,
    role       = EXCLUDED.role,
    phone      = EXCLUDED.phone,
    department = EXCLUDED.department,
    status     = EXCLUDED.status,
    updated_at = now();
  RETURN NEW;
END;
$$;

-- Trigger sobre auth.users al insertar o actualizar
DROP TRIGGER IF EXISTS on_auth_user_upsert ON auth.users;
CREATE TRIGGER on_auth_user_upsert
  AFTER INSERT OR UPDATE ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.sync_profile_on_user_change();

-- 3. Backfill inicial para sincronizar todos los usuarios existentes en auth.users
INSERT INTO public.profiles (id, email, name, role, phone, department, status)
SELECT 
  id,
  email, 
  COALESCE(raw_user_meta_data->>'name', split_part(email, '@', 1)),
  COALESCE(raw_app_meta_data->>'role', raw_user_meta_data->>'role', 'operator'),
  COALESCE(raw_user_meta_data->>'phone', ''),
  COALESCE(raw_user_meta_data->>'department', 'Dirección General de Servicios Urbanos'),
  COALESCE(raw_user_meta_data->>'status', 'ACTIVO')
FROM auth.users
ON CONFLICT (id) DO UPDATE SET
  email      = EXCLUDED.email,
  name       = EXCLUDED.name,
  role       = EXCLUDED.role,
  phone      = EXCLUDED.phone,
  department = EXCLUDED.department,
  status     = EXCLUDED.status,
  updated_at = now();
