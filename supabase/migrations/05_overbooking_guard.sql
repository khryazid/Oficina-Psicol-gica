-- 05_overbooking_guard.sql
-- Bloqueo atómico para evitar traslapes entre citas activas

CREATE EXTENSION IF NOT EXISTS btree_gist;

ALTER TABLE public.citas
ADD CONSTRAINT citas_no_overbooking
EXCLUDE USING gist (
  tstzrange(fecha_inicio, fecha_fin, '[)') WITH &&
)
WHERE (estado IN ('pending_payment', 'pending_confirmation', 'confirmed'));