-- Habilitar extensión UUID
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =========================================================
-- TABLA: pacientes
-- =========================================================
CREATE TABLE IF NOT EXISTS public.pacientes (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  nombre_completo TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  telefono TEXT,
  fecha_registro TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- =========================================================
-- TABLA: expedientes_clinicos
-- =========================================================
CREATE TABLE IF NOT EXISTS public.expedientes_clinicos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  paciente_id UUID REFERENCES public.pacientes(id) ON DELETE CASCADE,
  diagnostico_principal TEXT,
  notas_sesion TEXT,
  fecha_creacion TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  fecha_actualizacion TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- =========================================================
-- TABLA: citas (Calendly webhook data)
-- =========================================================
CREATE TABLE IF NOT EXISTS public.citas (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  paciente_id UUID REFERENCES public.pacientes(id) ON DELETE CASCADE,
  calendly_event_id TEXT UNIQUE NOT NULL,
  fecha_inicio TIMESTAMP WITH TIME ZONE NOT NULL,
  fecha_fin TIMESTAMP WITH TIME ZONE NOT NULL,
  estado TEXT DEFAULT 'pending_payment', -- pending_payment, confirmed, cancelled
  creado_en TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- =========================================================
-- TABLA: pagos
-- =========================================================
CREATE TABLE IF NOT EXISTS public.pagos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  cita_id UUID REFERENCES public.citas(id) ON DELETE CASCADE,
  banco_origen TEXT NOT NULL,
  telefono_origen TEXT NOT NULL,
  referencia TEXT NOT NULL,
  monto_recibido NUMERIC(10, 2) NOT NULL,
  fecha_pago TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE(banco_origen, telefono_origen, referencia) -- Mitigación contra fraude de referencias
);

-- =========================================================
-- SEGURIDAD ROW LEVEL SECURITY (RLS)
-- =========================================================

ALTER TABLE public.pacientes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expedientes_clinicos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.citas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pagos ENABLE ROW LEVEL SECURITY;

-- POLÍTICAS PARA pacientes
-- El paciente solo puede ver su propio registro
CREATE POLICY "Pacientes pueden ver su propio perfil" ON public.pacientes
  FOR SELECT USING (auth.uid() = id);

-- El paciente puede actualizar su propio registro
CREATE POLICY "Pacientes pueden actualizar su propio perfil" ON public.pacientes
  FOR UPDATE USING (auth.uid() = id);

-- Psicólogos pueden ver a todos los pacientes
CREATE POLICY "Psicologos pueden ver pacientes" ON public.pacientes
  FOR SELECT USING (auth.jwt() ->> 'role' = 'psicologo');


-- POLÍTICAS PARA expedientes_clinicos
-- Solo el psicólogo puede acceder a los expedientes. (Se bloquea acceso total a pacientes)
CREATE POLICY "Psicologos tienen acceso total a expedientes" ON public.expedientes_clinicos
  FOR ALL USING (auth.jwt() ->> 'role' = 'psicologo');


-- POLÍTICAS PARA citas
-- Los pacientes solo pueden ver y crear sus propias citas (vía webhook/api)
CREATE POLICY "Pacientes pueden ver sus citas" ON public.citas
  FOR SELECT USING (
    paciente_id = auth.uid() OR
    auth.jwt() ->> 'role' = 'psicologo'
  );


-- POLÍTICAS PARA pagos
-- Los pacientes solo pueden ver/registrar sus pagos
-- Normalmente los pagos se registran por un API backend de todos modos (Service Role)
CREATE POLICY "Pacientes pueden ver sus pagos" ON public.pagos
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.citas WHERE citas.id = pagos.cita_id AND citas.paciente_id = auth.uid()) OR
    auth.jwt() ->> 'role' = 'psicologo'
  );

-- =========================================================
-- TRIGGERS DE SEGURIDAD / AUDITORÍA
-- =========================================================

-- Trigger para actualizar `fecha_actualizacion` en expediente
CREATE OR REPLACE FUNCTION update_fecha_actualizacion()
RETURNS TRIGGER AS $$
BEGIN
    NEW.fecha_actualizacion = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_expedientes_mod_time
    BEFORE UPDATE ON public.expedientes_clinicos
    FOR EACH ROW
    EXECUTE FUNCTION update_fecha_actualizacion();
