/* eslint-disable no-restricted-globals */
import { clientsClaim } from 'workbox-core';
import { cleanupOutdatedCaches, matchPrecache, precacheAndRoute } from 'workbox-precaching';
import { NavigationRoute, registerRoute } from 'workbox-routing';
import { NetworkFirst, NetworkOnly } from 'workbox-strategies';

const SAFE_RELATIVE_URL_REGEX = /^\/[a-zA-Z0-9\-\/\?=&]*$/;

function toSafeRelativeUrl(rawUrl) {
  if (typeof rawUrl !== 'string') {
    return '/dashboard';
  }
  const trimmed = rawUrl.trim();
  if (!trimmed || trimmed.startsWith('//') || trimmed.includes('..')) {
    return '/dashboard';
  }
  return SAFE_RELATIVE_URL_REGEX.test(trimmed) ? trimmed : '/dashboard';
}

function cleanNotificationText(value, fallback, maxLength) {
  if (typeof value !== 'string') {
    return fallback;
  }
  const cleaned = value
    .replace(/<[^>]*>/g, '')
    .replace(/[\u0000-\u001F\u007F]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  if (!cleaned) {
    return fallback;
  }
  return cleaned.length > maxLength ? `${cleaned.slice(0, maxLength - 3).trim()}...` : cleaned;
}

clientsClaim();
cleanupOutdatedCaches();
precacheAndRoute(self.__WB_MANIFEST || []);

// Exclusion estricta de Cache Storage para APIs y datos sensibles de menores en Supabase
registerRoute(
  ({ url }) => url.pathname.startsWith('/api/') || url.hostname.endsWith('supabase.co'),
  new NetworkOnly()
);

// Navegacion SPA con NetworkFirst (3s timeout) y fallback offline seguro
const navigationStrategy = new NetworkFirst({
  cacheName: 'consejoscout-pages',
  networkTimeoutSeconds: 3
});

const navigationRoute = new NavigationRoute(
  async (params) => {
    try {
      const response = await navigationStrategy.handle(params);
      if (response) {
        return response;
      }
    } catch {
      // Fallback a shell precacheado o pagina offline dedicada
    }
    const cachedIndex = await matchPrecache('/index.html');
    if (cachedIndex) {
      return cachedIndex;
    }
    const cachedOffline = await matchPrecache('/offline.html');
    if (cachedOffline) {
      return cachedOffline;
    }
    return Response.error();
  },
  {
    denylist: [/^\/api\//]
  }
);

registerRoute(navigationRoute);

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

self.addEventListener('push', (event) => {
  let payload = {};
  if (event.data) {
    try {
      payload = event.data.json();
    } catch {
      try {
        payload = { body: event.data.text() };
      } catch {
        payload = {};
      }
    }
  }

  const title = cleanNotificationText(payload.title, 'Alerta ConsejoScout', 64);
  const body = cleanNotificationText(
    payload.body,
    'Hay novedades operativas pendientes de revision en tu Grupo Scout.',
    160
  );
  const tag = cleanNotificationText(payload.tag, 'consejoscout-notice', 64);
  const targetUrl = toSafeRelativeUrl(payload.url);

  event.waitUntil(
    self.registration.showNotification(title, {
      body,
      icon: '/icons/icon-192.png',
      badge: '/icons/badge-72.png',
      tag,
      renotify: false,
      data: {
        url: targetUrl
      }
    })
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = toSafeRelativeUrl(event.notification?.data?.url);

  event.waitUntil(
    (async () => {
      const windowClients = await self.clients.matchAll({
        type: 'window',
        includeUncontrolled: true
      });

      for (const client of windowClients) {
        if (!client.url) {
          continue;
        }
        try {
          const clientOrigin = new URL(client.url).origin;
          if (clientOrigin === self.location.origin) {
            await client.focus();
            if (typeof client.navigate === 'function') {
              await client.navigate(targetUrl);
            } else {
              client.postMessage({ type: 'PUSH_NAVIGATE', url: targetUrl });
            }
            return;
          }
        } catch {
          // Continuar evaluando clientes
        }
      }

      if (self.clients.openWindow) {
        await self.clients.openWindow(targetUrl);
      }
    })()
  );
});
