import { ENV, isPushVapidConfigured } from '../config/env.js';
import { DEMO_GROUP_ID, LS_KEYS, readLocalPref, writeLocalPref } from './offlineDb.js';
import { isSupabaseConfigured, supabase } from './supabaseClient.js';

export const DEFAULT_PUSH_PREFS = Object.freeze({
  campDeadlines: true,
  medicalAndMembers: true,
  councilTasks: true,
  localEnabled: false
});

export function isIosDevice() {
  if (typeof navigator === 'undefined') {
    return false;
  }
  const ua = navigator.userAgent || '';
  const isStandardIos = /iPhone|iPad|iPod/i.test(ua);
  const isIpadOs = navigator.platform === 'MacIntel' && (navigator.maxTouchPoints || 0) > 1;
  return isStandardIos || isIpadOs;
}

export function isStandaloneMode() {
  if (typeof window === 'undefined') {
    return false;
  }
  const mediaStandalone =
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(display-mode: standalone)').matches;
  const safariStandalone = window.navigator?.standalone === true;
  return Boolean(mediaStandalone || safariStandalone);
}

export function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

function arrayBufferToBase64Url(buffer) {
  if (!buffer) {
    return '';
  }
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return window
    .btoa(binary)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

export function getPushPreferences() {
  const stored = readLocalPref(LS_KEYS.PUSH_PREFS, null);
  return {
    ...DEFAULT_PUSH_PREFS,
    ...(stored && typeof stored === 'object' ? stored : {})
  };
}

export function savePushPreferences(nextPrefs) {
  const merged = {
    ...getPushPreferences(),
    ...nextPrefs
  };
  writeLocalPref(LS_KEYS.PUSH_PREFS, merged);
  return merged;
}

export async function detectPushState() {
  if (typeof window === 'undefined') {
    return { status: 'unsupported', hasSubscription: false, vapidConfigured: false };
  }

  if (isIosDevice() && !isStandaloneMode()) {
    return {
      status: 'ios-browser-unsupported',
      hasSubscription: false,
      vapidConfigured: isPushVapidConfigured
    };
  }

  const supported =
    'Notification' in window &&
    'serviceWorker' in navigator &&
    'PushManager' in window;

  if (!supported) {
    return {
      status: 'unsupported',
      hasSubscription: false,
      vapidConfigured: isPushVapidConfigured
    };
  }

  const permission = Notification.permission;
  if (permission === 'denied') {
    return {
      status: 'denied',
      hasSubscription: false,
      vapidConfigured: isPushVapidConfigured
    };
  }

  let hasSubscription = false;
  try {
    const registration = await navigator.serviceWorker.getRegistration();
    if (registration) {
      const existingSub = await registration.pushManager.getSubscription();
      hasSubscription = Boolean(existingSub);
    }
  } catch {
    hasSubscription = false;
  }

  const prefs = getPushPreferences();

  if (permission === 'granted' && (hasSubscription || prefs.localEnabled)) {
    return {
      status: 'granted',
      hasSubscription,
      vapidConfigured: isPushVapidConfigured
    };
  }

  return {
    status: 'default',
    hasSubscription,
    vapidConfigured: isPushVapidConfigured
  };
}

export async function subscribeToPush({ groupId, session } = {}) {
  if (
    typeof window === 'undefined' ||
    !('Notification' in window) ||
    !('serviceWorker' in navigator) ||
    !('PushManager' in window)
  ) {
    return {
      ok: false,
      status: 'unsupported',
      error: 'Este navegador no admite notificaciones push web.'
    };
  }

  const permission = await Notification.requestPermission();
  if (permission === 'denied') {
    savePushPreferences({ localEnabled: false });
    return {
      ok: false,
      status: 'denied',
      error: 'El permiso de notificaciones fue bloqueado en el navegador.'
    };
  }
  if (permission !== 'granted') {
    return {
      ok: false,
      status: 'default',
      error: 'Permiso pendiente de confirmacion.'
    };
  }

  if (!isPushVapidConfigured) {
    savePushPreferences({ localEnabled: true });
    return {
      ok: true,
      status: 'granted',
      mode: 'local-preview',
      message:
        'Permiso concedido en este dispositivo. Configura VITE_VAPID_PUBLIC_KEY y una sesion activa para recibir alertas push remotas en segundo plano.'
    };
  }

  const registration = await navigator.serviceWorker.ready;
  let subscription = await registration.pushManager.getSubscription();

  if (!subscription) {
    subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(ENV.VAPID_PUBLIC_KEY)
    });
  }

  const json = typeof subscription.toJSON === 'function' ? subscription.toJSON() : {};
  const p256dh =
    json?.keys?.p256dh || arrayBufferToBase64Url(subscription.getKey?.('p256dh'));
  const auth =
    json?.keys?.auth || arrayBufferToBase64Url(subscription.getKey?.('auth'));

  if (
    isSupabaseConfigured &&
    supabase &&
    session?.user?.id &&
    groupId &&
    groupId !== DEMO_GROUP_ID
  ) {
    const { error } = await supabase.from('push_subscriptions').upsert(
      {
        user_id: session.user.id,
        group_id: groupId,
        endpoint: subscription.endpoint,
        p256dh,
        auth,
        user_agent: navigator.userAgent.slice(0, 240)
      },
      { onConflict: 'endpoint' }
    );

    if (error) {
      return {
        ok: false,
        status: 'default',
        error: `No se pudo registrar la suscripcion en el servidor: ${error.message}`
      };
    }
  }

  savePushPreferences({ localEnabled: true });
  return {
    ok: true,
    status: 'granted',
    mode: 'vapid',
    subscription
  };
}

export async function sendTestPush({ groupId, session } = {}) {
  if (session?.access_token && groupId && groupId !== DEMO_GROUP_ID) {
    const response = await fetch('/api/push/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session.access_token}`
      },
      body: JSON.stringify({
        isTest: true,
        groupId,
        eventType: 'GENERAL_NOTICE',
        title: 'Prueba de notificacion ConsejoScout',
        body: 'Las alertas operativas estan activas y vinculadas a tu Grupo Scout.',
        url: '/dashboard'
      })
    });

    const data = await response.json().catch(() => null);
    if (!response.ok || !data?.success) {
      return {
        ok: false,
        error: data?.error || 'No se pudo enviar la notificacion de prueba desde el servidor.'
      };
    }

    return {
      ok: true,
      mode: 'server',
      message: 'Notificacion de prueba enviada correctamente.'
    };
  }

  // En modo local/demo sin sesion de servidor, emitir prueba local mediante Service Worker o Notification API
  if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
    const title = 'Prueba local ConsejoScout';
    const options = {
      body: 'Vista previa local en este dispositivo. Con sesion activa tambien llegaran con la app cerrada.',
      icon: '/icons/icon-192.png',
      badge: '/icons/badge-72.png',
      tag: 'consejoscout-local-test',
      data: { url: '/dashboard' }
    };

    if ('serviceWorker' in navigator) {
      const registration = await navigator.serviceWorker.getRegistration();
      if (registration?.showNotification) {
        await registration.showNotification(title, options);
        return {
          ok: true,
          mode: 'local-preview',
          message: 'Notificacion de prueba enviada en modo local.'
        };
      }
    }

    new Notification(title, options);
    return {
      ok: true,
      mode: 'local-preview',
      message: 'Notificacion de prueba enviada en modo local.'
    };
  }

  return {
    ok: false,
    error: 'Permiso de notificaciones no disponible para emitir la prueba.'
  };
}

export async function unsubscribeFromPush({ session } = {}) {
  savePushPreferences({ localEnabled: false });

  if (typeof navigator !== 'undefined' && 'serviceWorker' in navigator) {
    try {
      const registration = await navigator.serviceWorker.getRegistration();
      const subscription = await registration?.pushManager?.getSubscription();
      if (subscription) {
        const endpoint = subscription.endpoint;
        await subscription.unsubscribe();

        if (isSupabaseConfigured && supabase && session?.user?.id && endpoint) {
          await supabase
            .from('push_subscriptions')
            .delete()
            .eq('endpoint', endpoint)
            .eq('user_id', session.user.id);
        }
      }
    } catch {
      // Continuar con estado desactivado localmente
    }
  }

  return { ok: true, status: 'default' };
}
