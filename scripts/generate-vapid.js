#!/usr/bin/env node

import webpush from 'web-push';

function main() {
  const vapidKeys = webpush.generateVAPIDKeys();

  const lines = [
    '# Claves VAPID generadas para ConsejoScout PWA',
    '# Copiar al archivo .env local y a las variables de entorno de Vercel',
    `VITE_VAPID_PUBLIC_KEY=${vapidKeys.publicKey}`,
    `VAPID_PUBLIC_KEY=${vapidKeys.publicKey}`,
    `VAPID_PRIVATE_KEY=${vapidKeys.privateKey}`
  ];

  console.log(lines.join('\n'));
}

main();
