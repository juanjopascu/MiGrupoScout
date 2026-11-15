import crypto from 'node:crypto';
import { getSupabaseAdmin } from '../_lib/supabaseAdmin.js';
import { sanitizePushPayload } from '../_lib/payloadSanitizer.js';
import { dispatchPushNotifications } from '../_lib/pushDispatcher.js';

const RECIPIENT_ROLES = ['jefe_grupo', 'subjefe_grupo', 'secretario'];

function verifyCronAuthorization(authHeader, expectedSecret) {
  if (typeof authHeader !== 'string' || typeof expectedSecret !== 'string' || !expectedSecret) {
    return false;
  }

  const match = /^Bearer\s+(.+)$/i.exec(authHeader.trim());
  if (!match) {
    return false;
  }

  const providedHash = crypto.createHash('sha256').update(match[1].trim(), 'utf8').digest();
  const expectedHash = crypto.createHash('sha256').update(expectedSecret, 'utf8').digest();

  return crypto.timingSafeEqual(providedHash, expectedHash);
}

function addDaysIsoUtc(baseDate, days) {
  const utc = Date.UTC(
    baseDate.getUTCFullYear(),
    baseDate.getUTCMonth(),
    baseDate.getUTCDate() + days
  );
  return new Date(utc).toISOString().slice(0, 10);
}

function buildAggregatedSummaryText({ campsCount, medicalCount, tasksCount }) {
  const parts = [];
  if (medicalCount > 0) {
    parts.push(
      medicalCount === 1
        ? '1 ficha medica por vencer'
        : `${medicalCount} fichas medicas por vencer`
    );
  }
  if (campsCount > 0) {
    parts.push(
      campsCount === 1
        ? '1 carpeta distrital proxima a fecha limite'
        : `${campsCount} carpetas distritales proximas a fecha limite`
    );
  }
  if (tasksCount > 0) {
    parts.push(
      tasksCount === 1
        ? '1 tarea de Consejo por vencer'
        : `${tasksCount} tareas de Consejo por vencer`
    );
  }

  if (parts.length === 0) {
    return '';
  }

  if (parts.length === 1) {
    return `Tenes ${parts[0]}.`;
  }
  if (parts.length === 2) {
    return `Tenes ${parts[0]} y ${parts[1]}.`;
  }
  return `Tenes ${parts[0]}, ${parts[1]} y ${parts[2]}.`;
}

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({
      success: false,
      error: 'Metodo no permitido.'
    });
  }

  const cronSecret = process.env.CRON_SECRET;
  if (!verifyCronAuthorization(req.headers?.authorization, cronSecret)) {
    return res.status(401).json({
      success: false,
      error: 'CRON_SECRET invalido o ausente.'
    });
  }

  try {
    const supabaseAdmin = getSupabaseAdmin();
    const now = new Date();
    const campDeadlineCutoff = addDaysIsoUtc(now, 7);
    const medicalExpiryCutoff = addDaysIsoUtc(now, 15);
    const taskDueCutoff = addDaysIsoUtc(now, 3);

    const [campsRes, membersRes, tasksRes] = await Promise.all([
      supabaseAdmin
        .from('camp_checklists')
        .select('group_id')
        .not('approval_status', 'in', '("aprobada","presentada_distrito")')
        .lte('district_submission_deadline', campDeadlineCutoff),
      supabaseAdmin
        .from('group_members')
        .select('group_id')
        .eq('is_active', true)
        .not('medical_form_expires_at', 'is', null)
        .lte('medical_form_expires_at', medicalExpiryCutoff),
      supabaseAdmin
        .from('council_tasks')
        .select('group_id')
        .in('status', ['pendiente', 'en_progreso'])
        .not('due_date', 'is', null)
        .lte('due_date', taskDueCutoff)
    ]);

    if (campsRes.error) throw campsRes.error;
    if (membersRes.error) throw membersRes.error;
    if (tasksRes.error) throw tasksRes.error;

    const groupStats = new Map();
    const ensureGroup = (groupId) => {
      if (!groupStats.has(groupId)) {
        groupStats.set(groupId, { campsCount: 0, medicalCount: 0, tasksCount: 0 });
      }
      return groupStats.get(groupId);
    };

    for (const row of campsRes.data || []) {
      ensureGroup(row.group_id).campsCount += 1;
    }
    for (const row of membersRes.data || []) {
      ensureGroup(row.group_id).medicalCount += 1;
    }
    for (const row of tasksRes.data || []) {
      ensureGroup(row.group_id).tasksCount += 1;
    }

    const groupIds = Array.from(groupStats.keys());
    if (groupIds.length === 0) {
      return res.status(200).json({
        success: true,
        data: {
          groupsEvaluated: 0,
          notificationsSent: 0,
          subscriptionsPruned: 0,
          executedAt: now.toISOString()
        }
      });
    }

    const [groupsRes, membershipsRes, subscriptionsRes] = await Promise.all([
      supabaseAdmin
        .from('scout_groups')
        .select('id, number')
        .in('id', groupIds),
      supabaseAdmin
        .from('group_memberships')
        .select('group_id, user_id')
        .in('group_id', groupIds)
        .eq('is_active', true)
        .in('role', RECIPIENT_ROLES),
      supabaseAdmin
        .from('push_subscriptions')
        .select('id, group_id, user_id, endpoint, p256dh, auth')
        .in('group_id', groupIds)
    ]);

    if (groupsRes.error) throw groupsRes.error;
    if (membershipsRes.error) throw membershipsRes.error;
    if (subscriptionsRes.error) throw subscriptionsRes.error;

    const groupNumberById = new Map(
      (groupsRes.data || []).map((g) => [g.id, g.number])
    );

    const eligibleUsersByGroup = new Map();
    for (const m of membershipsRes.data || []) {
      if (!eligibleUsersByGroup.has(m.group_id)) {
        eligibleUsersByGroup.set(m.group_id, new Set());
      }
      eligibleUsersByGroup.get(m.group_id).add(m.user_id);
    }

    const subsByGroup = new Map();
    for (const sub of subscriptionsRes.data || []) {
      const eligibleUsers = eligibleUsersByGroup.get(sub.group_id);
      if (!eligibleUsers || !eligibleUsers.has(sub.user_id)) {
        continue;
      }
      if (!subsByGroup.has(sub.group_id)) {
        subsByGroup.set(sub.group_id, []);
      }
      subsByGroup.get(sub.group_id).push(sub);
    }

    let notificationsSent = 0;
    let subscriptionsPruned = 0;

    for (const groupId of groupIds) {
      const stats = groupStats.get(groupId);
      const groupSubscriptions = subsByGroup.get(groupId) || [];
      if (groupSubscriptions.length === 0) {
        continue;
      }

      const groupNumber = groupNumberById.get(groupId);
      const title = groupNumber
        ? `Alertas del Grupo ${groupNumber}`
        : 'Alertas operativas del Grupo';
      const body = buildAggregatedSummaryText(stats);

      if (!body) {
        continue;
      }

      const sanitized = sanitizePushPayload({
        eventType:
          stats.campsCount > 0
            ? 'CAMP_DEADLINE'
            : stats.medicalCount > 0
              ? 'MEDICAL_EXPIRY'
              : 'COUNCIL_TASK',
        title,
        body,
        url: '/dashboard',
        tag: `daily-reminders-${groupId.slice(0, 8)}`
      });

      if (!sanitized.valid) {
        continue;
      }

      const result = await dispatchPushNotifications({
        subscriptions: groupSubscriptions,
        payload: sanitized.payload,
        supabaseAdmin
      });

      notificationsSent += result.sent;
      subscriptionsPruned += result.prunedExpired;
    }

    return res.status(200).json({
      success: true,
      data: {
        groupsEvaluated: groupIds.length,
        notificationsSent,
        subscriptionsPruned,
        executedAt: now.toISOString()
      }
    });
  } catch (error) {
    console.error('[push/check-reminders] Error:', error?.message || error);
    return res.status(500).json({
      success: false,
      error: 'Fallo en proceso de verificacion diaria.'
    });
  }
}
