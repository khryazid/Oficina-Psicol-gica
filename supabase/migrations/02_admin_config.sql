-- 02_admin_config.sql
-- Ejecutar en el SQL Editor de Supabase para añadir el panel de configuración clínica.

DROP TABLE IF EXISTS public.configuracion_clinica;

CREATE TABLE public.configuracion_clinica (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  tiempo_descanso_mins int DEFAULT 15,
  servicios jsonb DEFAULT '[
    {"id": "c1a-2", "nombre": "Psicoterapia Individual", "duracion_mins": 50, "precio": 40},
    {"id": "d1e-5", "nombre": "Terapia de Pareja", "duracion_mins": 75, "precio": 60}
  ]'::jsonb,
  horario_habitual jsonb DEFAULT '{
    "1": { "activo": true, "inicio": "09:00", "fin": "17:00", "descansos": [] },
    "2": { "activo": true, "inicio": "09:00", "fin": "17:00", "descansos": [] },
    "3": { "activo": true, "inicio": "09:00", "fin": "17:00", "descansos": [] },
    "4": { "activo": true, "inicio": "09:00", "fin": "17:00", "descansos": [] },
    "5": { "activo": true, "inicio": "09:00", "fin": "17:00", "descansos": [] },
    "6": { "activo": false, "inicio": "09:00", "fin": "13:00", "descansos": [] },
    "0": { "activo": false, "inicio": "09:00", "fin": "13:00", "descansos": [] }
  }'::jsonb,
  bloqueos_especificos jsonb DEFAULT '[]'::jsonb,
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Permisos
ALTER TABLE public.configuracion_clinica ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Permitir lectura general de la configuración"
  ON public.configuracion_clinica FOR SELECT USING (true);

CREATE POLICY "Permitir actualizar la configuración al psicologo"
  ON public.configuracion_clinica FOR ALL USING (auth.jwt() ->> 'role' = 'psicologo');

-- Insertar Configuración Origen
INSERT INTO public.configuracion_clinica (tiempo_descanso_mins)
SELECT 15
WHERE NOT EXISTS (SELECT 1 FROM public.configuracion_clinica);
