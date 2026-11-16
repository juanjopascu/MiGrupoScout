import { createClient } from '@supabase/supabase-js';
import { ENV, isSupabaseConfigured } from '../config/env.js';

/**
 * Cliente singleton de Supabase con inicializacion condicional segura.
 * Si faltan variables VITE_SUPABASE_URL o VITE_SUPABASE_ANON_KEY, expone
 * isSupabaseConfigured = false para operar en modo local/demo sin errores.
 */
export const supabase = isSupabaseConfigured
  ? createClient(ENV.SUPABASE_URL, ENV.SUPABASE_ANON_KEY, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true
      }
    })
  : null;

export { isSupabaseConfigured };

export async function getCurrentSession() {
  if (!supabase) {
    return null;
  }
  try {
    const { data, error } = await supabase.auth.getSession();
    if (error) {
      return null;
    }
    return data?.session || null;
  } catch {
    return null;
  }
}

export async function signInWithEmailPassword(email, password) {
  if (!supabase) {
    return {
      session: null,
      user: null,
      error: new Error('Supabase no esta configurado en este entorno.')
    };
  }
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password
  });
  return {
    session: data?.session || null,
    user: data?.user || null,
    error
  };
}

export async function signUpWithEmailPassword(email, password, fullName = '') {
  if (!supabase) {
    return {
      session: null,
      user: null,
      error: new Error('Supabase no esta configurado en este entorno.')
    };
  }
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: fullName
      ? {
          data: {
            full_name: fullName
          }
        }
      : undefined
  });
  return {
    session: data?.session || null,
    user: data?.user || null,
    error
  };
}

export async function signOutSupabase() {
  if (!supabase) {
    return { error: null };
  }
  return supabase.auth.signOut();
}
