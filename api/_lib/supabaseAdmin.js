import { createClient } from '@supabase/supabase-js';

let cachedAdminClient = null;

/**
 * Retorna el cliente singleton de Supabase con credenciales de servicio.
 * Solo debe ejecutarse en funciones Serverless de servidor (/api/**) o scripts CLI.
 * Nunca utiliza variables VITE_* expuestas al cliente.
 *
 * @returns {import('@supabase/supabase-js').SupabaseClient}
 */
export function getSupabaseAdmin() {
  if (cachedAdminClient) {
    return cachedAdminClient;
  }

  const supabaseUrl =
    process.env.SUPABASE_URL ||
    process.env.NEXT_PUBLIC_SUPABASE_URL ||
    process.env.VITE_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error(
      'Faltan variables de entorno de servidor requeridas: SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY.'
    );
  }

  cachedAdminClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });

  return cachedAdminClient;
}
