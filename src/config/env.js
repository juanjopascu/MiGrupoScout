/**
 * Lectura segura de variables de entorno publicas (prefijo VITE_).
 * Nunca expone secretos privados de servidor en el bundle del cliente.
 */

function readEnvString(key, fallback = '') {
  const raw = import.meta?.env?.[key];
  if (typeof raw !== 'string') {
    return fallback;
  }
  const trimmed = raw.trim();
  return trimmed || fallback;
}

export const ENV = Object.freeze({
  SUPABASE_URL: readEnvString('VITE_SUPABASE_URL'),
  SUPABASE_ANON_KEY: readEnvString('VITE_SUPABASE_ANON_KEY'),
  VAPID_PUBLIC_KEY: readEnvString('VITE_VAPID_PUBLIC_KEY'),
  SAAC_CRUZ_DEL_SUR_URL: readEnvString(
    'VITE_SAAC_CRUZ_DEL_SUR_URL',
    'https://cruzdelsur.scouts.org.ar'
  ),
  SAAC_RUMBO_SUR_URL: readEnvString(
    'VITE_SAAC_RUMBO_SUR_URL',
    'https://rumbosur.scouts.org.ar'
  ),
  SAAC_BIBLIOTECA_URL: readEnvString(
    'VITE_SAAC_BIBLIOTECA_URL',
    'https://scouts.org.ar/biblioteca'
  ),
  SAAC_CAMPUS_URL: readEnvString(
    'VITE_SAAC_CAMPUS_URL',
    'https://campus.scouts.org.ar'
  )
});

export const isSupabaseConfigured = Boolean(
  ENV.SUPABASE_URL && ENV.SUPABASE_ANON_KEY
);

export const isPushVapidConfigured = Boolean(ENV.VAPID_PUBLIC_KEY);
