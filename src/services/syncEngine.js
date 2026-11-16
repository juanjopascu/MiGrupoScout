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
  upsertCachedBatch,
  upsertCachedRecord,
  writeLocalPref
} from './offlineDb.js';
import {
  getLocalGroupById,
  isLocalPlatformAdmin,
  listLocalUserMemberships,
  updateLocalGroupRecord
} from './localAuthStore.js';
import { getCurrentSession, isSupabaseConfigured, supabase } from './supabaseClient.js';

const syncListeners = new Set();
let isSyncRunning = false;
let autoSyncInitialized = false;

export function isManualOfflineMode() {
  return Boolean(readLocalPref(LS_KEYS.MANUAL_OFFLINE, false));
}

export function setManualOfflineMode(enabled) {
  writeLocalPref(LS_KEYS.MANUAL_OFFLINE, Boolean(enabled));
  void emitSyncState();
  return Boolean(enabled);
}

function canAutoSyncNow() {
  return (
    typeof navigator !== 'undefined' &&
    navigator.onLine &&
    !isManualOfflineMode()
  );
}

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
      org_model: record.org_model || 'tradicional',
      primary_color: record.primary_color || '#4D207A',
      accent_color: record.accent_color || '#7C3AED',
      logo_url: record.logo_url || null
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
  const isRemoteGroup =
    isSupabaseConfigured && session && !session.isLocal && groupId !== DEMO_GROUP_ID;

  if (isRemoteGroup) {
    await enqueueOutboxMutation({
      table,
      operation: isNew || isNewHint ? 'INSERT' : 'UPDATE',
      recordId: savedRecord.id,
      payload: toDbPayload(table, savedRecord)
    });
    await emitSyncState();
    if (canAutoSyncNow()) {
      void syncPendingMutations();
    }
  }

  return { record: savedRecord, list };
}

export async function batchSaveMembersOfflineFirst({ groupId, records = [] }) {
  if (!Array.isArray(records) || records.length === 0) {
    return {
      insertedCount: 0,
      list: await getCachedCollection('group_members', groupId)
    };
  }

  const { records: savedRecords, list } = await upsertCachedBatch(
    'group_members',
    groupId,
    records
  );

  const session = await getCurrentSession();
  const isRemoteGroup =
    isSupabaseConfigured && session && !session.isLocal && groupId !== DEMO_GROUP_ID;

  if (isRemoteGroup) {
    const payloads = savedRecords.map((item) => toDbPayload('group_members', item));
    if (canAutoSyncNow() && supabase) {
      let failedChunks = false;
      for (let i = 0; i < payloads.length; i += 100) {
        const chunk = payloads.slice(i, i + 100);
        const { error } = await supabase
          .from('group_members')
          .upsert(chunk, { onConflict: 'id' });
        if (error) {
          failedChunks = true;
          for (const row of chunk) {
            await enqueueOutboxMutation({
              table: 'group_members',
              operation: 'INSERT',
              recordId: row.id,
              payload: row
            });
          }
        }
      }
      if (!failedChunks) {
        const syncedAt = new Date().toISOString();
        writeLocalPref(LS_KEYS.LAST_SYNC_AT, syncedAt);
      }
      await emitSyncState();
    } else {
      for (const row of payloads) {
        await enqueueOutboxMutation({
          table: 'group_members',
          operation: 'INSERT',
          recordId: row.id,
          payload: row
        });
      }
      await emitSyncState();
    }
  }

  return { insertedCount: savedRecords.length, list };
}

export async function deleteEntityOfflineFirst({ table, groupId, recordId }) {
  const updated = await deleteCachedRecord(table, groupId, recordId);

  const session = await getCurrentSession();
  const isRemoteGroup =
    isSupabaseConfigured && session && !session.isLocal && groupId !== DEMO_GROUP_ID;

  if (isRemoteGroup) {
    await enqueueOutboxMutation({
      table,
      operation: 'DELETE',
      recordId,
      payload: { id: recordId, group_id: groupId }
    });
    await emitSyncState();
    if (canAutoSyncNow()) {
      void syncPendingMutations();
    }
  }

  return updated;
}

export async function saveGroupProfileOfflineFirst(profile) {
  const saved = await saveGroupProfile(profile);
  const session = await getCurrentSession();
  if (session?.isLocal || !isSupabaseConfigured) {
    updateLocalGroupRecord(saved);
  }
  const isRemoteGroup =
    isSupabaseConfigured &&
    session &&
    !session.isLocal &&
    saved.id &&
    saved.id !== DEMO_GROUP_ID;

  if (isRemoteGroup) {
    await enqueueOutboxMutation({
      table: 'scout_groups',
      operation: 'UPDATE',
      recordId: saved.id,
      payload: toDbPayload('scout_groups', saved)
    });
    await emitSyncState();
    if (canAutoSyncNow()) {
      void syncPendingMutations();
    }
  }

  return saved;
}

export async function syncPendingMutations({ ignoreManualOffline = false } = {}) {
  if (isSyncRunning || !isSupabaseConfigured || !supabase) {
    return { ...(await emitSyncState()), syncedCount: 0 };
  }
  if (!ignoreManualOffline && isManualOfflineMode()) {
    return { ...(await emitSyncState()), syncedCount: 0 };
  }
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    return { ...(await emitSyncState()), syncedCount: 0 };
  }

  const session = await getCurrentSession();
  if (!session) {
    return { ...(await emitSyncState()), syncedCount: 0 };
  }

  isSyncRunning = true;
  let syncedCount = 0;
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
        syncedCount += 1;
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
    const nextState = await emitSyncState({ lastSyncAt: syncedAt, error: null });
    return { ...nextState, syncedCount };
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
    const existingProfile = await getGroupProfile(groupId);
    await saveGroupProfile({
      ...groupRes.data,
      userRole: existingProfile?.userRole || null,
      userBranch: existingProfile?.userBranch || 'jefatura',
      userDisplayName: existingProfile?.userDisplayName || null
    });
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

async function resolveFromMembershipList(list, preferredGroupId) {
  if (!Array.isArray(list) || list.length === 0) {
    return {
      groupId: null,
      role: null,
      branch: null,
      group: null,
      memberships: []
    };
  }

  const storedGroupId = preferredGroupId || readLocalPref(LS_KEYS.ACTIVE_GROUP_ID, null);
  const activeMembership =
    list.find((m) => m.group_id === storedGroupId) || list[0];

  if (activeMembership.scout_groups) {
    await saveGroupProfile({
      ...activeMembership.scout_groups,
      userRole: activeMembership.role,
      userBranch: activeMembership.branch || 'jefatura',
      userDisplayName: activeMembership.display_name || null
    });
  }
  writeLocalPref(LS_KEYS.ACTIVE_GROUP_ID, activeMembership.group_id);
  return {
    groupId: activeMembership.group_id,
    role: activeMembership.role,
    branch: activeMembership.branch || 'jefatura',
    group: activeMembership.scout_groups || null,
    memberships: list
  };
}

async function detectRemotePlatformAdmin(userId) {
  if (!userId || !isSupabaseConfigured || !supabase) return false;
  try {
    const { data, error } = await supabase.rpc('is_platform_admin');
    if (!error && typeof data === 'boolean') {
      return data;
    }
  } catch {
    // Fallback a consulta directa protegida por RLS
  }
  try {
    const { data, error } = await supabase
      .from('platform_admins')
      .select('user_id')
      .eq('user_id', userId)
      .maybeSingle();
    return !error && Boolean(data?.user_id);
  } catch {
    return false;
  }
}

export async function resolveUserActiveGroup(session, preferredGroupId = null) {
  if (!session?.user?.id) {
    return null;
  }

  const targetGroupId = preferredGroupId || readLocalPref(LS_KEYS.ACTIVE_GROUP_ID, null);

  if (!isSupabaseConfigured || !supabase || session?.isLocal) {
    const isPlatformAdmin = isLocalPlatformAdmin(session.user.id);
    const localItems = listLocalUserMemberships(session.user.id);

    if (isPlatformAdmin && targetGroupId && !localItems.some((m) => m.group_id === targetGroupId)) {
      const adminGroup = getLocalGroupById(targetGroupId);
      if (adminGroup) {
        await saveGroupProfile({
          ...adminGroup,
          userRole: 'jefe_grupo',
          userBranch: 'jefatura',
          userDisplayName: session.user.user_metadata?.full_name || 'Administrador Global'
        });
        writeLocalPref(LS_KEYS.ACTIVE_GROUP_ID, adminGroup.id);
        return {
          groupId: adminGroup.id,
          role: 'jefe_grupo',
          branch: 'jefatura',
          group: adminGroup,
          memberships: localItems,
          isPlatformAdmin: true,
          viaPlatformAdmin: true
        };
      }
    }

    const resolved = await resolveFromMembershipList(localItems, preferredGroupId);
    return {
      ...resolved,
      role: isPlatformAdmin && resolved.groupId ? 'jefe_grupo' : resolved.role,
      isPlatformAdmin,
      viaPlatformAdmin: false
    };
  }

  const readCachedFallback = async () => {
    const cached = readLocalPref(LS_KEYS.CACHED_MEMBERSHIPS, null);
    if (cached && cached.userId === session.user.id && Array.isArray(cached.items)) {
      const cachedAdmin = Boolean(cached.isPlatformAdmin);
      if (cachedAdmin && targetGroupId && !cached.items.some((m) => m.group_id === targetGroupId)) {
        const cachedProfile = await getGroupProfile(targetGroupId);
        if (cachedProfile && cachedProfile.id === targetGroupId) {
          return {
            groupId: cachedProfile.id,
            role: 'jefe_grupo',
            branch: 'jefatura',
            group: cachedProfile,
            memberships: cached.items,
            isPlatformAdmin: true,
            viaPlatformAdmin: true
          };
        }
      }
      const resolved = await resolveFromMembershipList(cached.items, preferredGroupId);
      return {
        ...resolved,
        role: cachedAdmin && resolved.groupId ? 'jefe_grupo' : resolved.role,
        isPlatformAdmin: cachedAdmin,
        viaPlatformAdmin: false
      };
    }
    return null;
  };

  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    return readCachedFallback();
  }

  try {
    const [membershipsRes, isPlatformAdmin] = await Promise.all([
      supabase
        .from('group_memberships')
        .select('id, group_id, role, branch, display_name, scout_groups (*)')
        .eq('user_id', session.user.id)
        .eq('is_active', true)
        .order('created_at', { ascending: true }),
      detectRemotePlatformAdmin(session.user.id)
    ]);

    if (membershipsRes.error) {
      const fallback = await readCachedFallback();
      if (fallback) {
        return fallback;
      }
      return {
        groupId: null,
        role: null,
        branch: null,
        group: null,
        memberships: [],
        isPlatformAdmin,
        viaPlatformAdmin: false
      };
    }

    const items = Array.isArray(membershipsRes.data) ? membershipsRes.data : [];
    writeLocalPref(LS_KEYS.CACHED_MEMBERSHIPS, {
      userId: session.user.id,
      items,
      isPlatformAdmin
    });

    if (isPlatformAdmin && targetGroupId && !items.some((m) => m.group_id === targetGroupId)) {
      const { data: adminGroup, error: adminGroupErr } = await supabase
        .from('scout_groups')
        .select('*')
        .eq('id', targetGroupId)
        .maybeSingle();

      if (!adminGroupErr && adminGroup) {
        await saveGroupProfile({
          ...adminGroup,
          userRole: 'jefe_grupo',
          userBranch: 'jefatura',
          userDisplayName: session.user.user_metadata?.full_name || 'Administrador Global'
        });
        writeLocalPref(LS_KEYS.ACTIVE_GROUP_ID, adminGroup.id);
        return {
          groupId: adminGroup.id,
          role: 'jefe_grupo',
          branch: 'jefatura',
          group: adminGroup,
          memberships: items,
          isPlatformAdmin: true,
          viaPlatformAdmin: true
        };
      }
    }

    const resolved = await resolveFromMembershipList(items, preferredGroupId);
    return {
      ...resolved,
      role: isPlatformAdmin && resolved.groupId ? 'jefe_grupo' : resolved.role,
      isPlatformAdmin,
      viaPlatformAdmin: false
    };
  } catch {
    return readCachedFallback();
  }
}

export function initAutoSync() {
  if (autoSyncInitialized || typeof window === 'undefined') {
    return;
  }
  autoSyncInitialized = true;

  window.addEventListener('online', () => {
    if (!isManualOfflineMode()) {
      void syncPendingMutations();
    }
  });

  window.addEventListener('focus', () => {
    if (navigator.onLine && !isManualOfflineMode()) {
      void syncPendingMutations();
    }
  });
}
