import webpush from 'web-push';

let vapidConfigured = false;

function ensureVapidConfigured() {
  if (vapidConfigured) {
    return;
  }

  const subject = process.env.VAPID_SUBJECT;
  const publicKey = process.env.VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;

  if (!subject || !publicKey || !privateKey) {
    throw new Error(
      'Faltan variables de entorno VAPID requeridas: VAPID_SUBJECT, VAPID_PUBLIC_KEY y VAPID_PRIVATE_KEY.'
    );
  }

  webpush.setVapidDetails(subject, publicKey, privateKey);
  vapidConfigured = true;
}

/**
 * Despacha notificaciones Web Push en lotes paralelos controlados y elimina
 * suscripciones expiradas (HTTP 404 / 410) de `push_subscriptions`.
 *
 * @param {object} params
 * @param {Array<{ id?: string, endpoint: string, p256dh: string, auth: string }>} params.subscriptions
 * @param {object} params.payload
 * @param {import('@supabase/supabase-js').SupabaseClient} params.supabaseAdmin
 * @param {number} [params.concurrency=10]
 * @returns {Promise<{ sent: number, failed: number, prunedExpired: number }>}
 */
export async function dispatchPushNotifications({
  subscriptions = [],
  payload,
  supabaseAdmin,
  concurrency = 10
}) {
  if (!Array.isArray(subscriptions) || subscriptions.length === 0) {
    return { sent: 0, failed: 0, prunedExpired: 0 };
  }

  ensureVapidConfigured();

  const serializedPayload = JSON.stringify(payload);
  const batchSize = Math.max(1, Math.min(Number(concurrency) || 10, 25));

  let sent = 0;
  let failed = 0;
  const expiredEndpoints = [];

  for (let i = 0; i < subscriptions.length; i += batchSize) {
    const batch = subscriptions.slice(i, i + batchSize);
    const results = await Promise.allSettled(
      batch.map(async (sub) => {
        const pushSubscription = {
          endpoint: sub.endpoint,
          keys: {
            p256dh: sub.p256dh,
            auth: sub.auth
          }
        };

        await webpush.sendNotification(pushSubscription, serializedPayload, {
          TTL: 86400
        });
        return sub.endpoint;
      })
    );

    results.forEach((result, index) => {
      if (result.status === 'fulfilled') {
        sent += 1;
        return;
      }

      const statusCode = result.reason?.statusCode;
      if (statusCode === 404 || statusCode === 410) {
        expiredEndpoints.push(batch[index].endpoint);
      } else {
        failed += 1;
      }
    });
  }

  let prunedExpired = 0;
  if (expiredEndpoints.length > 0 && supabaseAdmin) {
    const { error: deleteError, count } = await supabaseAdmin
      .from('push_subscriptions')
      .delete({ count: 'exact' })
      .in('endpoint', expiredEndpoints);

    if (!deleteError) {
      prunedExpired = typeof count === 'number' ? count : expiredEndpoints.length;
    }
  }

  return {
    sent,
    failed,
    prunedExpired
  };
}
