-- ==============================================================================
-- MIGRACIÓN: ASIGNACIÓN DE CHOFERES Y REPORTE DE AVERÍAS
-- ==============================================================================

-- 1. Agregar columna assigned_user_id en la tabla public.trucks
ALTER TABLE public.trucks 
ADD COLUMN IF NOT EXISTS assigned_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;

-- 2. Índice para consultas rápidas por chofer asignado
CREATE INDEX IF NOT EXISTS idx_trucks_assigned_user ON public.trucks(assigned_user_id);

-- 3. Agregar valor 'AVERIA' al enum fleet_action
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_enum 
        WHERE enumlabel = 'AVERIA' 
        AND enumtypid = 'fleet_action'::regtype
    ) THEN
        ALTER TYPE fleet_action ADD VALUE 'AVERIA';
    END IF;
END $$;
