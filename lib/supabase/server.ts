import { createClient } from '@supabase/supabase-js';

// Usaremos estas mismas variables nativamente. 
// ADVERTENCIA MÁXIMA: La variable SERVICE_ROLE_KEY JAMÁS debe tener el prefijo NEXT_PUBLIC_
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

if (!supabaseUrl || !supabaseServiceRoleKey) {
  console.warn("Faltan credenciales críticas de Supabase (URL o SERVICE_ROLE) en el entorno.");
}

// Inicializamos un Cliente Privilegiado.
// Este cliente se salta las políticas RLS y SOLO debe usarse de forma severamente controlada
// dentro de Servidores Node (como nuestra ruta API de webhooks).
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});
