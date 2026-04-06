import { createInterface } from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';
import { createClient } from '@supabase/supabase-js';

const DEFAULT_ADMIN_EMAIL = 'admin@test.com';
const DEFAULT_ADMIN_PASSWORD = 'admin123456';
const DEFAULT_ADMIN_NAME = 'Administrador';

function getEnv(name) {
  return process.env[name] || '';
}

async function promptValue(rl, label, hidden = false) {
  const value = await rl.question(`${label}: `);
  return hidden ? value.trim() : value.trim();
}

async function main() {
  const supabaseUrl = getEnv('NEXT_PUBLIC_SUPABASE_URL');
  const serviceRoleKey = getEnv('SUPABASE_SERVICE_ROLE_KEY');

  if (!supabaseUrl || !serviceRoleKey) {
    console.error('Faltan NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY en el entorno.');
    process.exitCode = 1;
    return;
  }

  const rl = createInterface({ input, output });

  try {
    const email = (process.argv[2] || DEFAULT_ADMIN_EMAIL || await promptValue(rl, 'Email del admin')).trim();
    const password = (process.argv[3] || DEFAULT_ADMIN_PASSWORD || await promptValue(rl, 'Password del admin')).trim();
    const fullName = (process.argv[4] || DEFAULT_ADMIN_NAME || await promptValue(rl, 'Nombre para el admin', false)).trim();

    if (!email || !password) {
      console.error('Email y password son obligatorios.');
      process.exitCode = 1;
      return;
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    const { data, error } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        role: 'psicologo',
        nombre_completo: fullName || 'Administrador',
      },
    });

    if (error) {
      console.error('No se pudo crear el usuario admin:', error.message);
      process.exitCode = 1;
      return;
    }

    console.log('Usuario admin creado correctamente.');
    console.log(`User ID: ${data.user?.id || 'sin id'}`);
    console.log(`Email: ${data.user?.email || email}`);
    console.log('Rol: psicologo');
    console.log('Estos datos pueden cambiarse después desde el panel administrativo.');
  } finally {
    rl.close();
  }
}

await main();