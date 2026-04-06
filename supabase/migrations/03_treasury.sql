-- 03_treasury.sql
-- Ejecutar en el Editor SQL de Supabase para repotenciar la tabla Citas y asentar Pagos

-- 1. Añadir campos financieros a la tabla citas
ALTER TABLE public.citas
ADD COLUMN IF NOT EXISTS servicio_id TEXT,
ADD COLUMN IF NOT EXISTS servicio_nombre TEXT,
ADD COLUMN IF NOT EXISTS precio_final NUMERIC(10, 2);

-- La tabla pagos ya fue creada en schema.sql base, pero asegurémonos de que el Constraint Anti-Fraude exista:
ALTER TABLE public.pagos DROP CONSTRAINT IF EXISTS pagos_fraude_uq;
ALTER TABLE public.pagos ADD CONSTRAINT pagos_fraude_uq UNIQUE (banco_origen, telefono_origen, referencia);

-- Otorgar Política general para poder Ingestar y visualizar:
DROP POLICY IF EXISTS "Insertar pagos desde API" ON public.pagos;
CREATE POLICY "Insertar pagos desde API"
  ON public.pagos FOR INSERT
  WITH CHECK (true); -- La validacion del servidor/api maneja todo, supabase solo hace el storage
