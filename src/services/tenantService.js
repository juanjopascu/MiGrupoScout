import {
  isValidInviteCode,
  normalizeInviteCode,
  validateGroupTenantInput,
  validateInvitationInput
} from '../domain/roles.js';
import { isValidUuid } from '../domain/validators.js';
import {
  acceptLocalInvitation,
  adminAssignLocalTenantLeader,
  adminGetLocalPlatformStats,
  adminListAllLocalTenants,
  adminUpdateLocalTenant,
  createLocalGroupTenant,
  createLocalInvitation,
  deleteLocalGroupTenant,
  getLocalGroupById,
  isLocalPlatformAdmin,
  listLocalGroupTeam,
  listLocalInvitations,
  listLocalUserMemberships,
  previewLocalInvitation,
  removeLocalTeamMember,
  resetLocalUserPassword,
  revokeLocalInvitation,
  updateLocalTeamMember
} from './localAuthStore.js';
import {
  DEMO_GROUP_ID,
  LS_KEYS,
  clearGroupOfflineData,
  getCachedCollection,
  getGroupProfile,
  readLocalPref,
  writeLocalPref
} from './offlineDb.js';
import {
  buildExportFilename,
  buildGroupCsvContent,
  buildGroupJsonContent,
  triggerBrowserDownload
} from '../utils/groupExport.js';
import { isSupabaseConfigured, supabase } from './supabaseClient.js';

export function readPendingInviteCode() {
  return normalizeInviteCode(readLocalPref(LS_KEYS.PENDING_INVITE_CODE, '') || '');
}

export function savePendingInviteCode(code) {
  const normalized = normalizeInviteCode(code || '');
  writeLocalPref(LS_KEYS.PENDING_INVITE_CODE, normalized || null);
  return normalized;
}

export async function listUserGroupMemberships(userId) {
  if (!userId) {
    return [];
  }
  if (!isSupabaseConfigured || !supabase) {
    return listLocalUserMemberships(userId);
  }

  const { data, error } = await supabase
    .from('group_memberships')
    .select('id, group_id, role, branch, display_name, is_active, scout_groups (*)')
    .eq('user_id', userId)
    .eq('is_active', true)
    .order('created_at', { ascending: true });

  if (error || !Array.isArray(data)) {
    return [];
  }

  return data.filter((item) => item.group_id);
}

export async function createScoutGroupTenant(input) {
  if (!isSupabaseConfigured || !supabase) {
    return createLocalGroupTenant(input);
  }

  const validation = validateGroupTenantInput(input);
  if (!validation.valid) {
    const firstError = Object.values(validation.errors)[0] || 'Datos del Grupo invalidos.';
    return { ok: false, error: firstError, errors: validation.errors };
  }

  const { number, name, district, zone, org_model, display_name } = validation.sanitized;

  const { data, error } = await supabase.rpc('create_scout_group_tenant', {
    p_number: number,
    p_name: name,
    p_district: district,
    p_zone: zone,
    p_org_model: org_model,
    p_display_name: display_name
  });

  if (error) {
    return {
      ok: false,
      error: error.message || 'No se pudo crear el tenant del Grupo Scout.'
    };
  }

  return {
    ok: true,
    group: data?.group || null,
    role: data?.role || 'jefe_grupo',
    branch: data?.branch || 'jefatura'
  };
}

export async function previewGroupInvitation(rawCode) {
  const code = normalizeInviteCode(rawCode);
  if (!isValidInviteCode(code)) {
    return { valid: false, error: 'El formato del codigo de invitacion no es valido.' };
  }
  if (!isSupabaseConfigured || !supabase) {
    return previewLocalInvitation(code);
  }

  const { data, error } = await supabase.rpc('preview_group_invitation', {
    p_invite_code: code
  });

  if (error) {
    return {
      valid: false,
      error: error.message || 'No se pudo consultar la invitacion.'
    };
  }

  return data || { valid: false, error: 'Invitacion no encontrada.' };
}

export async function acceptGroupInvitation(rawCode, displayName = '') {
  const code = normalizeInviteCode(rawCode);
  if (!isValidInviteCode(code)) {
    return { ok: false, error: 'Codigo de invitacion invalido.' };
  }
  if (!isSupabaseConfigured || !supabase) {
    const res = acceptLocalInvitation(code, displayName);
    if (res.ok) {
      savePendingInviteCode('');
    }
    return res;
  }

  const { data, error } = await supabase.rpc('accept_group_invitation', {
    p_invite_code: code,
    p_display_name: displayName?.trim() || null
  });

  if (error) {
    return {
      ok: false,
      error: error.message || 'No se pudo aceptar la invitacion.'
    };
  }

  savePendingInviteCode('');
  return {
    ok: true,
    groupId: data?.group_id || null,
    groupNumber: data?.group_number || null,
    groupName: data?.group_name || '',
    role: data?.role || 'educador',
    branch: data?.branch || 'jefatura'
  };
}

export async function listGroupTeamMembers(groupId) {
  if (!isValidUuid(groupId)) {
    return [];
  }
  if (!isSupabaseConfigured || !supabase) {
    return listLocalGroupTeam(groupId);
  }

  const { data, error } = await supabase
    .from('group_memberships')
    .select('id, group_id, user_id, role, branch, display_name, member_email, is_active, created_at')
    .eq('group_id', groupId)
    .order('created_at', { ascending: true });

  if (error || !Array.isArray(data)) {
    return [];
  }
  return data;
}

export async function updateTeamMemberRole({ membershipId, role, branch, isActive }) {
  if (!isValidUuid(membershipId)) {
    return { ok: false, error: 'Parametros invalidos para actualizar rol.' };
  }
  if (!isSupabaseConfigured || !supabase) {
    return updateLocalTeamMember({ membershipId, role, branch, isActive });
  }

  const patch = {};
  if (role) patch.role = role;
  if (branch) patch.branch = branch;
  if (typeof isActive === 'boolean') patch.is_active = isActive;

  const { data, error } = await supabase
    .from('group_memberships')
    .update(patch)
    .eq('id', membershipId)
    .select('*')
    .single();

  if (error) {
    return { ok: false, error: error.message || 'No se pudo actualizar la membresia.' };
  }
  return { ok: true, data };
}

export async function removeTeamMember(membershipId) {
  if (!isValidUuid(membershipId)) {
    return { ok: false, error: 'Identificador de membresia invalido.' };
  }
  if (!isSupabaseConfigured || !supabase) {
    return removeLocalTeamMember(membershipId);
  }

  const { error } = await supabase
    .from('group_memberships')
    .delete()
    .eq('id', membershipId);

  if (error) {
    return { ok: false, error: error.message || 'No se pudo quitar al integrante del equipo.' };
  }
  return { ok: true };
}

export async function listGroupInvitations(groupId) {
  if (!isValidUuid(groupId)) {
    return [];
  }
  if (!isSupabaseConfigured || !supabase) {
    return listLocalInvitations(groupId);
  }

  const { data, error } = await supabase
    .from('group_invitations')
    .select('*')
    .eq('group_id', groupId)
    .order('created_at', { ascending: false });

  if (error || !Array.isArray(data)) {
    return [];
  }
  return data;
}

export async function createGroupInvitation(input, actorRole = 'jefe_grupo') {
  if (!isSupabaseConfigured || !supabase) {
    return createLocalInvitation(input, actorRole);
  }

  const validation = validateInvitationInput(input, actorRole);
  if (!validation.valid) {
    const firstError = Object.values(validation.errors)[0] || 'Datos de invitacion invalidos.';
    return { ok: false, error: firstError, errors: validation.errors };
  }

  const s = validation.sanitized;
  const { data, error } = await supabase.rpc('create_group_invitation', {
    p_group_id: s.groupId,
    p_role: s.role,
    p_branch: s.branch,
    p_invited_email: s.invitedEmail,
    p_invited_name: s.invitedName,
    p_max_uses: s.maxUses,
    p_expires_days: s.expiresDays
  });

  if (error) {
    return { ok: false, error: error.message || 'No se pudo generar la invitacion.' };
  }
  return { ok: true, invitation: data };
}

export async function revokeGroupInvitation(invitationId) {
  if (!isValidUuid(invitationId)) {
    return { ok: false, error: 'Identificador de invitacion invalido.' };
  }
  if (!isSupabaseConfigured || !supabase) {
    return revokeLocalInvitation(invitationId);
  }

  const { error } = await supabase
    .from('group_invitations')
    .update({ status: 'revocada' })
    .eq('id', invitationId);

  if (error) {
    return { ok: false, error: error.message || 'No se pudo revocar la invitacion.' };
  }
  return { ok: true };
}

export async function deleteScoutGroupTenant({ groupId, confirmNumber }) {
  if (!isValidUuid(groupId)) {
    return { ok: false, error: 'Identificador de Grupo invalido.' };
  }

  const parsedNumber = Number.parseInt(String(confirmNumber ?? ''), 10);
  if (!Number.isInteger(parsedNumber) || parsedNumber <= 0) {
    return { ok: false, error: 'Ingresa el numero del Grupo para confirmar la eliminacion.' };
  }

  if (!isSupabaseConfigured || !supabase) {
    const res = deleteLocalGroupTenant(groupId, parsedNumber);
    if (res.ok) {
      await clearGroupOfflineData(groupId);
    }
    return res;
  }

  const { data, error } = await supabase.rpc('delete_scout_group_tenant', {
    p_group_id: groupId,
    p_confirm_number: parsedNumber
  });

  if (error) {
    return {
      ok: false,
      error: error.message || 'No se pudo eliminar el tenant del Grupo Scout.'
    };
  }

  await clearGroupOfflineData(groupId);
  return {
    ok: true,
    deletedGroupId: data?.group_id || groupId,
    groupNumber: data?.group_number || parsedNumber,
    groupName: data?.group_name || ''
  };
}

export async function checkIsPlatformAdmin(userId, userEmail = null) {
  if (!userId && !userEmail) return false;
  if (!isSupabaseConfigured || !supabase) {
    return isLocalPlatformAdmin(userId, userEmail);
  }

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

export async function adminListAllTenants() {
  if (!isSupabaseConfigured || !supabase) {
    return adminListAllLocalTenants();
  }

  const { data, error } = await supabase.rpc('admin_list_all_tenants');
  if (error) {
    return {
      ok: false,
      error: error.message || 'No se pudo obtener el listado global de Grupos.',
      tenants: []
    };
  }

  return {
    ok: true,
    tenants: Array.isArray(data) ? data : []
  };
}

export async function adminGetPlatformStats(fallbackTenants = []) {
  if (!isSupabaseConfigured || !supabase) {
    return adminGetLocalPlatformStats();
  }

  const { data, error } = await supabase.rpc('admin_get_platform_stats');
  if (!error && data && typeof data === 'object') {
    return { ok: true, stats: data };
  }

  // Fallback limpio si la funcion SQL aun no fue creada en el proyecto remoto
  const list = Array.isArray(fallbackTenants) ? fallbackTenants : [];
  return {
    ok: true,
    stats: {
      total_groups: list.length,
      registered_accounts: null,
      active_leaders: list.reduce((acc, t) => acc + (Number(t.team_count) || 0), 0),
      total_youth_members: list.reduce((acc, t) => acc + (Number(t.members_count) || 0), 0)
    }
  };
}

export async function adminUpdateTenant(groupId, input) {
  if (!isValidUuid(groupId)) {
    return { ok: false, error: 'Identificador de Grupo invalido.' };
  }

  const validation = validateGroupTenantInput(input);
  if (!validation.valid) {
    const firstError = Object.values(validation.errors)[0] || 'Datos del Grupo invalidos.';
    return { ok: false, error: firstError, errors: validation.errors };
  }

  if (!isSupabaseConfigured || !supabase) {
    return adminUpdateLocalTenant(groupId, validation.sanitized);
  }

  const { number, name, district, zone, org_model } = validation.sanitized;
  const { data, error } = await supabase.rpc('admin_update_tenant', {
    p_group_id: groupId,
    p_number: number,
    p_name: name,
    p_district: district,
    p_zone: zone,
    p_org_model: org_model
  });

  if (error) {
    return {
      ok: false,
      error: error.message || 'No se pudo actualizar el Grupo Scout.'
    };
  }

  return { ok: true, group: data };
}

export async function adminAssignTenantLeader({
  groupId,
  targetEmail,
  role = 'jefe_grupo',
  branch = 'jefatura'
}) {
  if (!isValidUuid(groupId)) {
    return { ok: false, error: 'Identificador de Grupo invalido.' };
  }

  const cleanEmail = String(targetEmail || '').trim().toLowerCase();
  if (!cleanEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(cleanEmail)) {
    return { ok: false, error: 'Ingresa un correo electronico valido.' };
  }

  if (!isSupabaseConfigured || !supabase) {
    return adminAssignLocalTenantLeader({
      groupId,
      targetEmail: cleanEmail,
      role,
      branch
    });
  }

  const { data, error } = await supabase.rpc('admin_assign_tenant_leader', {
    p_group_id: groupId,
    p_target_email: cleanEmail,
    p_role: role,
    p_branch: branch
  });

  if (error) {
    return {
      ok: false,
      error: error.message || 'No se pudo asignar el responsable del Grupo.'
    };
  }

  return { ok: true, assignment: data };
}

export async function resetMemberPassword({
  groupId,
  targetUserId,
  targetEmail,
  newPassword
}) {
  if (!isValidUuid(groupId)) {
    return { ok: false, error: 'Identificador de Grupo invalido.' };
  }

  if (typeof newPassword !== 'string' || newPassword.length < 6 || newPassword.length > 128) {
    return { ok: false, error: 'La nueva clave debe tener entre 6 y 128 caracteres.' };
  }

  if (!targetUserId && !targetEmail) {
    return { ok: false, error: 'Debes indicar el dirigente o correo a restablecer.' };
  }

  if (!isSupabaseConfigured || !supabase) {
    return resetLocalUserPassword({
      groupId,
      targetUserId,
      targetEmail,
      newPassword
    });
  }

  const { data: sessionData } = await supabase.auth.getSession();
  const accessToken = sessionData?.session?.access_token;
  if (!accessToken) {
    return { ok: false, error: 'Debes iniciar sesion para restablecer claves.' };
  }

  try {
    const response = await fetch('/api/admin/reset-password', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`
      },
      body: JSON.stringify({
        groupId,
        targetUserId: targetUserId || undefined,
        targetEmail: targetEmail || undefined,
        newPassword
      })
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok || !data?.success) {
      return {
        ok: false,
        error: data?.error || 'No se pudo restablecer la clave de la cuenta.'
      };
    }

    return {
      ok: true,
      userId: data.userId,
      email: data.email || targetEmail || '',
      role: data.role
    };
  } catch {
    return {
      ok: false,
      error: 'Error de red al intentar restablecer la clave.'
    };
  }
}

export async function exportGroupSnapshot(groupId, fallbackGroup = null) {
  if (!groupId || (groupId !== DEMO_GROUP_ID && !isValidUuid(groupId))) {
    return { ok: false, error: 'Identificador de Grupo invalido para exportar.' };
  }

  const exportedAt = new Date().toISOString();
  const isOnline = typeof navigator === 'undefined' ? true : navigator.onLine;
  const shouldUseRemote =
    isSupabaseConfigured && supabase && groupId !== DEMO_GROUP_ID && isOnline;

  if (shouldUseRemote) {
    try {
      const [groupRes, teamRes, membersRes, campsRes, tasksRes] = await Promise.all([
        supabase.from('scout_groups').select('*').eq('id', groupId).maybeSingle(),
        supabase
          .from('group_memberships')
          .select('id, role, branch, display_name, member_email, is_active, created_at')
          .eq('group_id', groupId)
          .eq('is_active', true)
          .order('created_at', { ascending: true }),
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

      const group = groupRes.data || fallbackGroup || (await getGroupProfile(groupId));
      if (!group) {
        return { ok: false, error: 'No se encontro la informacion del Grupo Scout.' };
      }

      return {
        ok: true,
        data: {
          exportedAt,
          group,
          team: Array.isArray(teamRes.data) ? teamRes.data : [],
          members: Array.isArray(membersRes.data) ? membersRes.data : [],
          camps: Array.isArray(campsRes.data) ? campsRes.data : [],
          tasks: Array.isArray(tasksRes.data) ? tasksRes.data : []
        }
      };
    } catch {
      // Fallback a cache local si falla la consulta remota
    }
  }

  const localGroup =
    fallbackGroup || getLocalGroupById(groupId) || (await getGroupProfile(groupId));
  if (!localGroup) {
    return { ok: false, error: 'No se encontro la informacion local del Grupo Scout.' };
  }

  const [members, camps, tasks] = await Promise.all([
    getCachedCollection('group_members', groupId),
    getCachedCollection('camp_checklists', groupId),
    getCachedCollection('council_tasks', groupId)
  ]);

  return {
    ok: true,
    data: {
      exportedAt,
      group: localGroup,
      team: groupId === DEMO_GROUP_ID ? [] : listLocalGroupTeam(groupId),
      members: Array.isArray(members) ? members : [],
      camps: Array.isArray(camps) ? camps : [],
      tasks: Array.isArray(tasks) ? tasks : []
    }
  };
}

export async function downloadGroupBackup({
  groupId,
  format = 'csv',
  fallbackGroup = null
}) {
  const snapshot = await exportGroupSnapshot(groupId, fallbackGroup);
  if (!snapshot.ok) {
    return snapshot;
  }

  const safeFormat = format === 'json' ? 'json' : 'csv';
  const filename = buildExportFilename(snapshot.data.group, safeFormat);
  const content =
    safeFormat === 'json'
      ? buildGroupJsonContent(snapshot.data)
      : buildGroupCsvContent(snapshot.data);
  const mimeType =
    safeFormat === 'json'
      ? 'application/json;charset=utf-8'
      : 'text/csv;charset=utf-8';

  const started = triggerBrowserDownload(content, filename, mimeType);
  if (!started) {
    return { ok: false, error: 'Descarga no disponible en este entorno.' };
  }

  return {
    ok: true,
    filename,
    counts: {
      team: snapshot.data.team.length,
      members: snapshot.data.members.length,
      camps: snapshot.data.camps.length,
      tasks: snapshot.data.tasks.length
    }
  };
}
