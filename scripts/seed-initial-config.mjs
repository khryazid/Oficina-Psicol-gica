import { createClient } from '@supabase/supabase-js';

function getEnv(name) {
  return process.env[name] || '';
}

const initialConfig = {
  tiempo_descanso_mins: 15,
  anticipacion_minima_horas: 24,
  anticipacion_maxima_dias: 30,
  datos_bancarios: {
    pagoMovil: {
      activo: true,
      banco: 'Banco de Venezuela (0102)',
      telefono: '04248891670',
      cedula: 'V-27832025',
    },
    transferencia: {
      activo: true,
      banco: 'Banco de Venezuela',
      cuenta: '0102-0000-0000-0000-0000',
      titular: 'Dr. Khris',
      identificacion: 'V-27832025',
    },
    efectivo: {
      activo: true,
      instrucciones: 'Cancelará físicamente el monto al llegar a su cita médica.',
    },
  },
  servicios: [
    { id: 'srv-psicoterapia-individual', nombre: 'Psicoterapia Individual', duracion_mins: 50, precio: 40 },
    { id: 'srv-terapia-pareja', nombre: 'Terapia de Pareja', duracion_mins: 75, precio: 60 },
    { id: 'srv-intervencion-crisis', nombre: 'Intervención en Crisis (Urgente)', duracion_mins: 40, precio: 30 },
  ],
  horario_habitual: {
    '1': { activo: true, inicio: '09:00', fin: '17:00', descansos: [{ inicio: '12:30', fin: '13:30' }] },
    '2': { activo: true, inicio: '09:00', fin: '17:00', descansos: [{ inicio: '12:30', fin: '13:30' }] },
    '3': { activo: true, inicio: '09:00', fin: '17:00', descansos: [{ inicio: '12:30', fin: '13:30' }] },
    '4': { activo: true, inicio: '09:00', fin: '17:00', descansos: [{ inicio: '12:30', fin: '13:30' }] },
    '5': { activo: true, inicio: '09:00', fin: '17:00', descansos: [{ inicio: '12:30', fin: '13:30' }] },
    '6': { activo: false, inicio: '09:00', fin: '13:00', descansos: [] },
    '0': { activo: false, inicio: '09:00', fin: '13:00', descansos: [] },
  },
  bloqueos_especificos: [],
};

async function main() {
  const supabaseUrl = getEnv('NEXT_PUBLIC_SUPABASE_URL');
  const serviceRoleKey = getEnv('SUPABASE_SERVICE_ROLE_KEY');

  if (!supabaseUrl || !serviceRoleKey) {
    console.error('Faltan NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY en el entorno.');
    process.exitCode = 1;
    return;
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  const { data: existing, error: readError } = await supabase
    .from('configuracion_clinica')
    .select('id')
    .limit(1)
    .single();

  if (readError && readError.code !== 'PGRST116' && readError.code !== '42P01') {
    console.error(`No se pudo leer configuracion_clinica: ${readError.message}`);
    process.exitCode = 1;
    return;
  }

  if (readError && readError.code === '42P01') {
    console.error('La tabla configuracion_clinica no existe. Ejecuta las migraciones primero.');
    process.exitCode = 1;
    return;
  }

  if (existing?.id) {
    const { error: updateError } = await supabase
      .from('configuracion_clinica')
      .update(initialConfig)
      .eq('id', existing.id);

    if (updateError) {
      console.error(`No se pudo actualizar la configuración inicial: ${updateError.message}`);
      process.exitCode = 1;
      return;
    }

    console.log('Configuración clínica inicial actualizada correctamente.');
    return;
  }

  const { error: insertError } = await supabase
    .from('configuracion_clinica')
    .insert([initialConfig]);

  if (insertError) {
    console.error(`No se pudo insertar la configuración inicial: ${insertError.message}`);
    process.exitCode = 1;
    return;
  }

  console.log('Configuración clínica inicial creada correctamente.');
}

await main();