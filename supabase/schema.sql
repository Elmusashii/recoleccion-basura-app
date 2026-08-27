-- ==============================================================================
-- SISTEMA DE RUTAS Y DENUNCIAS MUNICIPALES - ASUNCIÓN
-- Script de Base de Datos PostgreSQL + PostGIS en Supabase
-- ==============================================================================

-- 1. Habilitar extensión PostGIS para geolocalización avanzada
CREATE EXTENSION IF NOT EXISTS postgis;

-- 2. ENUMS para estados y roles
CREATE TYPE report_status AS ENUM ('PENDIENTE', 'EN_PROCESO', 'RESUELTO', 'RECHAZADO');
CREATE TYPE report_category AS ENUM ('VERTEDERO_CLANDESTINO', 'RECOLECCION_PENDIENTE', 'CONTENEDOR_DANADO', 'OTROS');
CREATE TYPE truck_status AS ENUM ('DISPONIBLE', 'EN_RUTA', 'EN_MANTENIMIENTO', 'FUERA_DE_SERVICIO');
CREATE TYPE fleet_action AS ENUM ('SALIDA', 'ENTRADA', 'AVERIA');

-- ==============================================================================
-- 3. TABLA DE RUTAS Y HORARIOS DE RECOLECCIÓN (Zonas y Barrios de Asunción)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.routes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(150) NOT NULL,
    zone VARCHAR(100) NOT NULL, -- Ej: "Sajonia", "Villa Morra", "Centro Histórico"
    shift VARCHAR(50) NOT NULL, -- "Mañana", "Tarde", "Noche"
    schedule_days TEXT[] NOT NULL, -- ['Lunes', 'Miércoles', 'Viernes']
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    color_hex VARCHAR(7) DEFAULT '#10B981', -- Color para representación en mapa Leaflet
    geometry_geojson JSONB, -- GeoJSON para representación de trazado
    geom GEOMETRY(LineString, 4326), -- PostGIS: Trazado espacial de la ruta
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Índice espacial para consultas ultra rápidas por coordenadas
CREATE INDEX IF NOT EXISTS idx_routes_geom ON public.routes USING GIST (geom);

-- ==============================================================================
-- 4. TABLA DE DENUNCIAS CIUDADANAS (Georreferenciadas con Fotos)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ticket_number VARCHAR(20) UNIQUE NOT NULL, -- Ej: "DEN-2026-0001"
    citizen_name VARCHAR(150),
    citizen_phone VARCHAR(50),
    citizen_email VARCHAR(150),
    category report_category DEFAULT 'VERTEDERO_CLANDESTINO',
    description TEXT NOT NULL,
    address_reference TEXT,
    latitude DOUBLE PRECISION NOT NULL,
    longitude DOUBLE PRECISION NOT NULL,
    location_geom GEOMETRY(Point, 4326) GENERATED ALWAYS AS (ST_SetSRID(ST_MakePoint(longitude, latitude), 4326)) STORED,
    photo_urls TEXT[] DEFAULT '{}', -- URLs de imágenes almacenadas en Supabase Storage
    status report_status DEFAULT 'PENDIENTE',
    admin_notes TEXT,
    assigned_truck_id UUID,
    created_at TIMESTAMPTZ DEFAULT now(),
    resolved_at TIMESTAMPTZ
);

-- Índices para búsqueda de denuncias y mapas de calor
CREATE INDEX IF NOT EXISTS idx_reports_geom ON public.reports USING GIST (location_geom);
CREATE INDEX IF NOT EXISTS idx_reports_status ON public.reports(status);
CREATE INDEX IF NOT EXISTS idx_reports_created_at ON public.reports(created_at DESC);

-- ==============================================================================
-- 5. TABLA DE FLOTA DE CAMIONES RECOLECTORES
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.trucks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(50) UNIQUE NOT NULL, -- Ej: "CAM-01"
    plate_number VARCHAR(20) UNIQUE NOT NULL, -- Chapa paraguaya: Ej: "AABC 123"
    model VARCHAR(100),
    capacity_tons NUMERIC(4, 1),
    status truck_status DEFAULT 'DISPONIBLE',
    assigned_route_id UUID REFERENCES public.routes(id) ON DELETE SET NULL,
    assigned_user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL, -- Chofer municipal asignado (perfil)
    current_lat DOUBLE PRECISION,
    current_lng DOUBLE PRECISION,
    last_ping TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_trucks_assigned_user ON public.trucks(assigned_user_id);

-- ==============================================================================
-- 6. TABLA DE CONTROL DE ENTRADA Y SALIDA (Bitácora de Flota)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.fleet_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    truck_id UUID NOT NULL REFERENCES public.trucks(id) ON DELETE CASCADE,
    driver_name VARCHAR(150) NOT NULL,
    action fleet_action NOT NULL, -- SALIDA / ENTRADA
    odometer_km NUMERIC(8, 2),
    fuel_level_percent INT CHECK (fuel_level_percent BETWEEN 0 AND 100),
    waste_weight_kg NUMERIC(8, 2) DEFAULT 0, -- Peso recolectado registrado al regresar a base/vertedero
    notes TEXT,
    timestamp TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_fleet_logs_truck ON public.fleet_logs(truck_id, timestamp DESC);

-- ==============================================================================
-- 7. POLÍTICAS DE SEGURIDAD (RLS - Row Level Security)
-- ==============================================================================
ALTER TABLE public.routes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trucks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fleet_logs ENABLE ROW LEVEL SECURITY;

-- Rutas: Lectura pública para cualquier ciudadano (anon / authenticated)
CREATE POLICY "Lectura pública de rutas activas" 
ON public.routes 
FOR SELECT 
TO anon, authenticated 
USING (is_active = true);

-- Rutas: Escritura solo para usuarios autenticados / administradores
CREATE POLICY "Gestión administrativa de rutas" 
ON public.routes 
FOR ALL 
TO authenticated 
USING (true)
WITH CHECK (true);

-- Denuncias: Creación permitida para cualquier ciudadano (anon / authenticated)
CREATE POLICY "Ciudadanos pueden registrar denuncias" 
ON public.reports 
FOR INSERT 
TO anon, authenticated 
WITH CHECK (true);

-- Denuncias: Lectura pública de puntos para visualización ciudadana
CREATE POLICY "Lectura pública de denuncias registradas" 
ON public.reports 
FOR SELECT 
TO anon, authenticated 
USING (true);

-- Denuncias: Edición / Resolución solo para personal autorizado (admin, supervisor, chofer, operator)
CREATE POLICY "Personal autorizado puede actualizar denuncias" 
ON public.reports 
FOR UPDATE 
TO authenticated 
USING (
  COALESCE((auth.jwt() -> 'app_metadata' ->> 'role'), (auth.jwt() -> 'user_metadata' ->> 'role')) IN ('admin', 'supervisor', 'chofer', 'operator')
  OR EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.id = auth.uid() 
      AND profiles.role IN ('admin', 'supervisor', 'chofer', 'operator')
  )
)
WITH CHECK (true);

-- Flota y Bitácora: Solo administradores / operadores autenticados
CREATE POLICY "Lectura de camiones para operadores" 
ON public.trucks 
FOR SELECT 
TO authenticated 
USING (true);

CREATE POLICY "Modificación de camiones para administradores" 
ON public.trucks 
FOR ALL 
TO authenticated 
USING (true)
WITH CHECK (true);

CREATE POLICY "Control de bitácora para operadores" 
ON public.fleet_logs 
FOR ALL 
TO authenticated 
USING (true)
WITH CHECK (true);

-- ==============================================================================
-- 8. TABLA DE PERFILES Y FUNCIONARIOS MUNICIPALES (Sincronizada con auth.users)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(150) NOT NULL,
    role VARCHAR(50) DEFAULT 'operator', -- 'admin', 'supervisor', 'operator', 'inspector'
    department VARCHAR(150) DEFAULT 'Dirección General de Servicios Urbanos',
    phone VARCHAR(50),
    status VARCHAR(20) DEFAULT 'ACTIVO',
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Lectura de perfiles para autenticados" 
ON public.profiles 
FOR SELECT 
TO authenticated 
USING (true);

CREATE POLICY "Administración de perfiles para administradores" 
ON public.profiles 
FOR ALL 
TO authenticated 
USING (true) 
WITH CHECK (true);

-- Función y trigger de sincronización automática de profiles con auth.users
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

DROP TRIGGER IF EXISTS on_auth_user_upsert ON auth.users;
CREATE TRIGGER on_auth_user_upsert
  AFTER INSERT OR UPDATE ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.sync_profile_on_user_change();

-- ==============================================================================
-- 9. STORAGE BUCKET PARA FOTOS DE DENUNCIAS
-- ==============================================================================
-- En el panel de Supabase Storage, crear el bucket: 'denuncias-fotos' (Público)
-- Política de Storage: Insert para anon y authenticated, Select para todos.

-- ==============================================================================
-- 10. TABLA INTERMEDIA: ASIGNACIÓN DE CIRCUITOS DE RUTAS A CAMIONES (N:M)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.truck_routes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    truck_id UUID NOT NULL REFERENCES public.trucks(id) ON DELETE CASCADE,
    route_id UUID NOT NULL REFERENCES public.routes(id) ON DELETE CASCADE,
    assigned_at TIMESTAMPTZ DEFAULT now(),
    assigned_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    UNIQUE(truck_id, route_id)
);

CREATE INDEX IF NOT EXISTS idx_truck_routes_truck ON public.truck_routes(truck_id);
CREATE INDEX IF NOT EXISTS idx_truck_routes_route ON public.truck_routes(route_id);

ALTER TABLE public.truck_routes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Lectura pública de rutas asignadas a camiones" 
ON public.truck_routes 
FOR SELECT 
TO anon, authenticated 
USING (true);

CREATE POLICY "Gestión administrativa de rutas de camiones" 
ON public.truck_routes 
FOR ALL 
TO authenticated 
USING (true) 
WITH CHECK (true);
