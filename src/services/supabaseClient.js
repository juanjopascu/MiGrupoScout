import { createClient } from '@supabase/supabase-js';
import { ENV, isSupabaseConfigured } from '../config/env.js';
import {
  getLocalSession,
  signInLocalUser,
  signOutLocalUser,
  signUpLocalUser
} from './localAuthStore.js';

/**
 * Cliente singleton de Supabase con persistencia dual:
 * si VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY estan presentes usa Supabase Auth;
 * de lo contrario opera de forma transparente sobre el motor local de cuentas (estilo Patitas).
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
    return getLocalSession();
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
    return signInLocalUser(email, password);
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
    return signUpLocalUser(email, password, fullName);
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

export async function resetPasswordForEmail(email) {
  if (!supabase) {
    return {
      error: new Error(
        'En modo de cuentas local podes crear una cuenta nueva o iniciar sesion desde este dispositivo.'
      )
    };
  }
  const redirectTo =
    typeof window !== 'undefined' ? `${window.location.origin}/` : undefined;
  return supabase.auth.resetPasswordForEmail(email, { redirectTo });
}

export async function signOutSupabase() {
  if (!supabase) {
    return signOutLocalUser();
  }
  return supabase.auth.signOut();
}
