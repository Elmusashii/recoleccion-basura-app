-- ==============================================================================
-- MIGRACIÓN: CREACIÓN DE TABLA INTERMEDIA TRUCK_ROUTES
-- Relación Muchos-a-Muchos entre Camiones (trucks) y Barrios/Rutas (routes)
-- ==============================================================================

-- 1. Crear tabla public.truck_routes si no existe
CREATE TABLE IF NOT EXISTS public.truck_routes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    truck_id UUID NOT NULL REFERENCES public.trucks(id) ON DELETE CASCADE,
    route_id UUID NOT NULL REFERENCES public.routes(id) ON DELETE CASCADE,
    assigned_at TIMESTAMPTZ DEFAULT now(),
    assigned_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    UNIQUE(truck_id, route_id)
);

-- 2. Índices para optimización de consultas de flota y asignación
CREATE INDEX IF NOT EXISTS idx_truck_routes_truck ON public.truck_routes(truck_id);
CREATE INDEX IF NOT EXISTS idx_truck_routes_route ON public.truck_routes(route_id);

-- 3. Habilitar RLS (Row Level Security)
ALTER TABLE public.truck_routes ENABLE ROW LEVEL SECURITY;

-- 4. Políticas de Seguridad (RLS)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'truck_routes' AND policyname = 'Lectura pública de rutas asignadas a camiones'
    ) THEN
        CREATE POLICY "Lectura pública de rutas asignadas a camiones" 
        ON public.truck_routes 
        FOR SELECT 
        TO anon, authenticated 
        USING (true);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'truck_routes' AND policyname = 'Gestión administrativa de rutas de camiones'
    ) THEN
        CREATE POLICY "Gestión administrativa de rutas de camiones" 
        ON public.truck_routes 
        FOR ALL 
        TO authenticated 
        USING (true) 
        WITH CHECK (true);
    END IF;
END $$;
