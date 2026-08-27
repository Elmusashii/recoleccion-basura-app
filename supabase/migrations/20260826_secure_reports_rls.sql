-- ==============================================================================
-- Migración: Asegurar política RLS de UPDATE en tabla reports
-- Restringe la actualización de denuncias exclusivamente a personal autorizado
-- (admin, supervisor, chofer, operator) evitando elevación de privilegios de citizens
-- ==============================================================================

-- 1. Eliminar política permisiva anterior si existe
DROP POLICY IF EXISTS "Administradores pueden actualizar denuncias" ON public.reports;
DROP POLICY IF EXISTS "Personal autorizado puede actualizar denuncias" ON public.reports;

-- 2. Crear política estricta con verificación de roles
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
