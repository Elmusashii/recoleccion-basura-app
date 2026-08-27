-- ==============================================================================
-- MIGRACIÓN: FOREIGN KEY CONSTRAINT TRUCKS.ASSIGNED_USER_ID -> PROFILES.ID
-- ==============================================================================

-- 1. Asegurar que assigned_user_id referencie directamente a public.profiles(id)
-- para que PostgREST pueda resolver relaciones join automáticas.
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'fk_trucks_assigned_user_profile'
        AND table_name = 'trucks'
    ) THEN
        ALTER TABLE public.trucks
        ADD CONSTRAINT fk_trucks_assigned_user_profile
        FOREIGN KEY (assigned_user_id) REFERENCES public.profiles(id)
        ON DELETE SET NULL;
    END IF;
END $$;
