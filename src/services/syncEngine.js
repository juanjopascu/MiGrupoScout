import {
  DEMO_GROUP_ID,
  LS_KEYS,
  deleteCachedRecord,
  enqueueOutboxMutation,
  getCachedCollection,
  getGroupProfile,
  getOutboxQueue,
  readLocalPref,
  removeOutboxItem,
  saveGroupProfile,
  setCachedCollection,
  updateOutboxItem,
  upsertCachedRecord,
  writeLocalPref
} from './offlineDb.js';
import { getCurrentSession, isSupabaseConfigured, supabase } from './supabaseClient.js';

const syncListeners = new Set();
let isSyncRunning = false;
let autoSyncInitialized = false;

async function emitSyncState(extra = {}) {
  const queue = await getOutboxQueue();
  const state = {
    pendingCount: queue.filter((q) => q.status === 'pending').length,
    conflictCount: queue.filter((q) => q.status === 'conflict').length,
    isSyncing: isSyncRunning,
    lastSyncAt: readLocalPref(LS_KEYS.LAST_SYNC_AT, null),
    ...extra
  };
  for (const listener of syncListeners) {
    try {
      listener(state);
    } catch {
      // Evitar propagar errores de suscriptores UI
    }
  }
  return state;
}

export function subscribeSyncStatus(listener) {
  syncListeners.add(listener);
  emitSyncState();
  return () => {
    syncListeners.delete(listener);
  };
}

function toDbPayload(table, record) {
  if (table === 'group_members') {
    return {
      id: record.id,
      group_id: record.group_id,
      member_type: record.member_type,
      branch: record.branch,
      full_name: record.full_name,
      document_number: record.document_number || null,
      cruz_del_sur_status: record.cruz_del_sur_status || 'pendiente',
      medical_form_expires_at: record.medical_form_expires_at || null,
      safe_from_harm_status: record.safe_from_harm_status || 'no_aplica',
      safe_from_harm_expires_at: record.safe_from_harm_expires_at || null,
      is_active: record.is_active !== false
    };
  }
  if (table === 'camp_checklists') {
    return {
      id: record.id,
      group_id: record.group_id,
      title: record.title,
      camp_type: record.camp_type,
      branch_scope: record.branch_scope || 'grupal',
      location: record.location || null,
      start_date: record.start_date,
      end_date: record.end_date,
      district_submission_deadline: record.district_submission_deadline,
      youth_count: record.youth_count ?? 0,
      adult_count: record.adult_count ?? 0,
      required_adults: record.required_adults ?? 2,
      ratio_compliant: Boolean(record.ratio_compliant),
      documentation_status: record.documentation_status || {},
      approval_status: record.approval_status || 'borrador'
    };
  }
  if (table === 'council_tasks') {
    return {
      id: record.id,
      group_id: record.group_id,
      title: record.title,
      description: record.description || null,
      assigned_role: record.assigned_role || 'jefe_grupo',
      due_date: record.due_date || null,
      status: record.status || 'pendiente',
      meeting_date: record.meeting_date || null,
      minutes_reference: record.minutes_reference || null
    };
  }
  if (table === 'scout_groups') {
    return {
      id: record.id,
      number: Number(record.number) || 1,
      name: record.name,
      district: record.district,
      zone: record.zone,
      org_model: record.org_model || 'tradicional'
    };
  }
  return record;
}

export async function saveEntityOfflineFirst({ table, groupId, record, isNewHint }) {
  const { record: savedRecord, list, isNew } = await upsertCachedRecord(
    table,
    groupId,
    record
  );

  const session = await getCurrentSession();
  const isRemoteGroup = isSupabaseConfigured && session && groupId !== DEMO_GROUP_ID;

  if (isRemoteGroup) {
    await enqueueOutboxMutation({
      table,
      operation: isNew || isNewHint ? 'INSERT' : 'UPDATE',
      recordId: savedRecord.id,
      payload: toDbPayload(table, savedRecord)
    });
    await emitSyncState();
    if (typeof navigator !== 'undefined' && navigator.onLine) {
      void syncPendingMutations();
    }
  }

  return { record: savedRecord, list };
}

export async function deleteEntityOfflineFirst({ table, groupId, recordId }) {
  const updated = await deleteCachedRecord(table, groupId, recordId);

  const session = await getCurrentSession();
  const isRemoteGroup = isSupabaseConfigured && session && groupId !== DEMO_GROUP_ID;

  if (isRemoteGroup) {
    await enqueueOutboxMutation({
      table,
      operation: 'DELETE',
      recordId,
      payload: { id: recordId, group_id: groupId }
    });
    await emitSyncState();
    if (typeof navigator !== 'undefined' && navigator.onLine) {
      void syncPendingMutations();
    }
  }

  return updated;
}

export async function saveGroupProfileOfflineFirst(profile) {
  const saved = await saveGroupProfile(profile);
  const session = await getCurrentSession();
  const isRemoteGroup =
    isSupabaseConfigured && session && saved.id && saved.id !== DEMO_GROUP_ID;

  if (isRemoteGroup) {
    await enqueueOutboxMutation({
      table: 'scout_groups',
      operation: 'UPDATE',
      recordId: saved.id,
      payload: toDbPayload('scout_groups', saved)
    });
    await emitSyncState();
    if (typeof navigator !== 'undefined' && navigator.onLine) {
      void syncPendingMutations();
    }
  }

  return saved;
}

export async function syncPendingMutations() {
  if (isSyncRunning || !isSupabaseConfigured || !supabase) {
    return emitSyncState();
  }
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    return emitSyncState();
  }

  const session = await getCurrentSession();
  if (!session) {
    return emitSyncState();
  }

  isSyncRunning = true;
  await emitSyncState({ error: null });

  try {
    const queue = await getOutboxQueue();
    for (const item of queue) {
      if (item.status === 'conflict') {
        continue;
      }

      try {
        let queryError = null;
        let statusCode = null;

        if (item.operation === 'DELETE') {
          const { error, status } = await supabase
            .from(item.table)
            .delete()
            .eq('id', item.recordId);
          queryError = error;
          statusCode = status;
        } else if (item.operation === 'INSERT') {
          const { error, status } = await supabase
            .from(item.table)
            .upsert(item.payload, { onConflict: 'id' });
          queryError = error;
          statusCode = status;
        } else {
          const { error, status } = await supabase
            .from(item.table)
            .upsert(item.payload, { onConflict: 'id' });
          queryError = error;
          statusCode = status;
        }

        if (queryError) {
          if (statusCode === 409 || queryError.code === '23505') {
            await updateOutboxItem({
              ...item,
              status: 'conflict',
              lastError: queryError.message
            });
          } else {
            await updateOutboxItem({
              ...item,
              retries: (item.retries || 0) + 1,
              lastError: queryError.message
            });
          }
          continue;
        }

        await removeOutboxItem(item.localId);
      } catch (err) {
        await updateOutboxItem({
          ...item,
          retries: (item.retries || 0) + 1,
          lastError: err?.message || 'Error de red'
        });
      }
    }

    const syncedAt = new Date().toISOString();
    writeLocalPref(LS_KEYS.LAST_SYNC_AT, syncedAt);
    return await emitSyncState({ lastSyncAt: syncedAt, error: null });
  } finally {
    isSyncRunning = false;
    await emitSyncState();
  }
}

export async function pullRemoteSnapshot(groupId) {
  if (!isSupabaseConfigured || !supabase || !groupId || groupId === DEMO_GROUP_ID) {
    return null;
  }
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    return null;
  }

  const session = await getCurrentSession();
  if (!session) {
    return null;
  }

  const [groupRes, membersRes, campsRes, tasksRes] = await Promise.all([
    supabase.from('scout_groups').select('*').eq('id', groupId).maybeSingle(),
    supabase
      .from('group_members')
      .select('*')
      .eq('group_id', groupId)
      .order('full_name', { ascending: true }),
    supabase
      .from('camp_checklists')
      .select('*')
      .eq('group_id', groupId)
      .order('start_date', { ascending: true }),
    supabase
      .from('council_tasks')
      .select('*')
      .eq('group_id', groupId)
      .order('due_date', { ascending: true })
  ]);

  if (groupRes.data) {
    await saveGroupProfile(groupRes.data);
  }
  if (Array.isArray(membersRes.data)) {
    await setCachedCollection('group_members', groupId, membersRes.data);
  }
  if (Array.isArray(campsRes.data)) {
    // Preservar campos de UI locales enriquecidos si ya existian en cache
    const existingCamps = await getCachedCollection('camp_checklists', groupId);
    const localMap = new Map(existingCamps.map((c) => [c.id, c]));
    const mergedCamps = campsRes.data.map((remote) => {
      const local = localMap.get(remote.id);
      return local
        ? {
            ...local,
            ...remote
          }
        : remote;
    });
    await setCachedCollection('camp_checklists', groupId, mergedCamps);
  }
  if (Array.isArray(tasksRes.data)) {
    await setCachedCollection('council_tasks', groupId, tasksRes.data);
  }

  const syncedAt = new Date().toISOString();
  writeLocalPref(LS_KEYS.LAST_SYNC_AT, syncedAt);
  await emitSyncState({ lastSyncAt: syncedAt });

  return {
    groupProfile: await getGroupProfile(groupId),
    members: await getCachedCollection('group_members', groupId),
    camps: await getCachedCollection('camp_checklists', groupId),
    tasks: await getCachedCollection('council_tasks', groupId)
  };
}

export async function resolveUserActiveGroup(session) {
  if (!isSupabaseConfigured || !supabase || !session?.user?.id) {
    return null;
  }

  try {
    const { data, error } = await supabase
      .from('group_memberships')
      .select('group_id, role, scout_groups (*)')
      .eq('user_id', session.user.id)
      .eq('is_active', true)
      .limit(1)
      .maybeSingle();

    if (error || !data?.group_id) {
      return null;
    }

    if (data.scout_groups) {
      await saveGroupProfile({
        ...data.scout_groups,
        userRole: data.role
      });
    }
    writeLocalPref(LS_KEYS.ACTIVE_GROUP_ID, data.group_id);
    return {
      groupId: data.group_id,
      role: data.role,
      group: data.scout_groups || null
    };
  } catch {
    return null;
  }
}

export function initAutoSync() {
  if (autoSyncInitialized || typeof window === 'undefined') {
    return;
  }
  autoSyncInitialized = true;

  window.addEventListener('online', () => {
    void syncPendingMutations();
  });

  window.addEventListener('focus', () => {
    if (navigator.onLine) {
      void syncPendingMutations();
    }
  });
}
