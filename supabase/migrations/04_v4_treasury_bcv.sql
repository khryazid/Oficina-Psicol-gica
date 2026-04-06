-- 04_v4_treasury_bcv.sql
-- Inyectar nuevas reglas macro a la Clinica y extender Pagos

ALTER TABLE public.configuracion_clinica
ADD COLUMN IF NOT EXISTS anticipacion_minima_horas int DEFAULT 24,
ADD COLUMN IF NOT EXISTS anticipacion_maxima_dias int DEFAULT 30,
ADD COLUMN IF NOT EXISTS datos_bancarios jsonb DEFAULT '{
  "pagoMovil": { "activo": true, "banco": "Banco de Venezuela (0102)", "telefono": "0424-8891670", "cedula": "V-27832025" },
  "transferencia": { "activo": true, "banco": "Banco de Venezuela", "cuenta": "0102-XXXX-XXXX-XXXX-XXXX", "titular": "Khris", "identificacion": "V-27832025" },
  "efectivo": { "activo": true, "instrucciones": "Pagar en taquilla al ingresar a la consulta." }
}'::jsonb;

-- Ampliar la tabla pagos para tolerar metodologias y relajar nulos (para efectivo u otros)
-- Un metodo sera 'pago_movil', 'transferencia', 'efectivo'
ALTER TABLE public.pagos
ADD COLUMN IF NOT EXISTS metodo TEXT DEFAULT 'pago_movil';

-- Cambiaremos la constraint vieja si hace falta. Para efectivo enviaremos N/A o saltaremos la inserccion.
