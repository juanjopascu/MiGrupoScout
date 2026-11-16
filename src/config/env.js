/**
 * Lectura segura de variables de entorno publicas (prefijo VITE_).
 * Nunca expone secretos privados de servidor en el bundle del cliente.
 */

/* global __APP_SUPABASE_URL__, __APP_SUPABASE_ANON_KEY__, __APP_VAPID_PUBLIC_KEY__ */

function readEnvString(keys, buildFallback = '', defaultFallback = '') {
  const keyList = Array.isArray(keys) ? keys : [keys];
  for (const key of keyList) {
    const raw = import.meta?.env?.[key];
    if (typeof raw === 'string' && raw.trim()) {
      return raw.trim();
    }
  }
  if (typeof buildFallback === 'string' && buildFallback.trim()) {
    return buildFallback.trim();
  }
  return defaultFallback;
}

const buildSupabaseUrl =
  typeof __APP_SUPABASE_URL__ === 'string' ? __APP_SUPABASE_URL__ : '';
const buildSupabaseAnonKey =
  typeof __APP_SUPABASE_ANON_KEY__ === 'string' ? __APP_SUPABASE_ANON_KEY__ : '';
const buildVapidPublicKey =
  typeof __APP_VAPID_PUBLIC_KEY__ === 'string' ? __APP_VAPID_PUBLIC_KEY__ : '';

export const ENV = Object.freeze({
  SUPABASE_URL: readEnvString(
    ['VITE_SUPABASE_URL', 'NEXT_PUBLIC_SUPABASE_URL'],
    buildSupabaseUrl
  ),
  SUPABASE_ANON_KEY: readEnvString(
    [
      'VITE_SUPABASE_ANON_KEY',
      'NEXT_PUBLIC_SUPABASE_ANON_KEY',
      'NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY'
    ],
    buildSupabaseAnonKey
  ),
  VAPID_PUBLIC_KEY: readEnvString(['VITE_VAPID_PUBLIC_KEY'], buildVapidPublicKey),
  SAAC_CRUZ_DEL_SUR_URL: readEnvString(
    'VITE_SAAC_CRUZ_DEL_SUR_URL',
    '',
    'https://cruzdelsur.scouts.org.ar'
  ),
  SAAC_RUMBO_SUR_URL: readEnvString(
    'VITE_SAAC_RUMBO_SUR_URL',
    '',
    'https://rumbosur.scouts.org.ar'
  ),
  SAAC_BIBLIOTECA_URL: readEnvString(
    'VITE_SAAC_BIBLIOTECA_URL',
    '',
    'https://scouts.org.ar/biblioteca'
  ),
  SAAC_CAMPUS_URL: readEnvString(
    'VITE_SAAC_CAMPUS_URL',
    '',
    'https://campus.scouts.org.ar'
  )
});

export const isSupabaseConfigured = Boolean(
  ENV.SUPABASE_URL && ENV.SUPABASE_ANON_KEY
);

export const isPushVapidConfigured = Boolean(ENV.VAPID_PUBLIC_KEY);
