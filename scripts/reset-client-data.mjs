import { createClient } from '@supabase/supabase-js';

const DEFAULT_ADMIN_EMAIL = 'admin@test.com';

function getEnv(name) {
  return process.env[name] || '';
}

async function deleteAllFromTable(supabase, tableName) {
  const { error } = await supabase.from(tableName).delete().neq('id', '00000000-0000-0000-0000-000000000000');
  if (error && error.code !== '42P01') {
    throw new Error(`No se pudo limpiar ${tableName}: ${error.message}`);
  }
}

async function listAllUsers(supabase) {
  const allUsers = [];
  let page = 1;
  const perPage = 200;

  while (true) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage });
    if (error) {
      throw new Error(`No se pudo listar usuarios auth: ${error.message}`);
    }

    const users = data.users || [];
    allUsers.push(...users);

    if (users.length < perPage) {
      break;
    }

    page += 1;
  }

  return allUsers;
}

async function main() {
  const supabaseUrl = getEnv('NEXT_PUBLIC_SUPABASE_URL');
  const serviceRoleKey = getEnv('SUPABASE_SERVICE_ROLE_KEY');
  const keepAdminEmail = (process.argv[2] || DEFAULT_ADMIN_EMAIL).trim().toLowerCase();

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

  try {
    await deleteAllFromTable(supabase, 'pagos');
    await deleteAllFromTable(supabase, 'citas');
    await deleteAllFromTable(supabase, 'expedientes_clinicos');
    await deleteAllFromTable(supabase, 'pacientes');
    await deleteAllFromTable(supabase, 'configuracion_clinica');

    const users = await listAllUsers(supabase);
    let removedUsers = 0;

    for (const user of users) {
      const email = (user.email || '').toLowerCase();
      if (!email || email === keepAdminEmail) {
        continue;
      }

      const { error } = await supabase.auth.admin.deleteUser(user.id);
      if (error) {
        throw new Error(`No se pudo eliminar usuario auth ${user.id}: ${error.message}`);
      }

      removedUsers += 1;
    }

    console.log('Reset comercial completado.');
    console.log('Tablas limpiadas: pagos, citas, expedientes_clinicos, pacientes, configuracion_clinica.');
    console.log(`Usuarios auth eliminados (excepto ${keepAdminEmail}): ${removedUsers}`);
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}

await main();