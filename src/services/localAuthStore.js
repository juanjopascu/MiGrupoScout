/**
 * Motor local de cuentas, tenants de Grupos Scout e invitaciones.
 * Se utiliza automaticamente cuando Supabase no esta configurado en el entorno
 * para ofrecer persistencia dual sin bloquear el registro ni el inicio de sesion.
 */

import { DEFAULT_BRANDING } from '../domain/branding.js';
import {
  canInviteTargetRole,
  normalizeInviteCode,
  validateGroupTenantInput,
  validateInvitationInput
} from '../domain/roles.js';
import { sanitizeString } from '../domain/validators.js';
import { generateLocalId } from './offlineDb.js';

const LOCAL_STORE_KEYS = Object.freeze({
  USERS: 'consejoscout:local_users_v1',
  SESSION: 'consejoscout:local_session_v1',
  GROUPS: 'consejoscout:local_groups_v1',
  MEMBERSHIPS: 'consejoscout:local_memberships_v1',
  INVITATIONS: 'consejoscout:local_invitations_v1',
  PLATFORM_ADMINS: 'consejoscout:local_platform_admins_v1'
});

const DEFAULT_PLATFORM_ADMIN_EMAIL = 'juanjo.pascuzzi@gmail.com';

const memoryFallback = new Map();

function readStoreJson(key, fallback) {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      const raw = window.localStorage.getItem(key);
      if (!raw) return fallback;
      return JSON.parse(raw);
    }
    return memoryFallback.has(key) ? JSON.parse(memoryFallback.get(key)) : fallback;
  } catch {
    return fallback;
  }
}

function writeStoreJson(key, value) {
  try {
    const serialized = JSON.stringify(value);
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.setItem(key, serialized);
    } else {
      memoryFallback.set(key, serialized);
    }
  } catch {
    // Ignorar errores de cuota de almacenamiento
  }
}

function createUuidV4() {
  if (typeof globalThis !== 'undefined' && globalThis.crypto?.randomUUID) {
    return globalThis.crypto.randomUUID();
  }
  const bytes = new Uint8Array(16);
  if (typeof globalThis !== 'undefined' && globalThis.crypto?.getRandomValues) {
    globalThis.crypto.getRandomValues(bytes);
  } else {
    for (let i = 0; i < 16; i += 1) {
      bytes[i] = Math.floor(Math.random() * 256);
    }
  }
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

function generateSaltHex() {
  const bytes = new Uint8Array(16);
  if (typeof globalThis !== 'undefined' && globalThis.crypto?.getRandomValues) {
    globalThis.crypto.getRandomValues(bytes);
  } else {
    for (let i = 0; i < 16; i += 1) {
      bytes[i] = Math.floor(Math.random() * 256);
    }
  }
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}

async function hashPasswordWithSalt(password, salt) {
  const input = `${salt}:${password}`;
  if (typeof globalThis !== 'undefined' && globalThis.crypto?.subtle?.digest) {
    const data = new TextEncoder().encode(input);
    const digest = await globalThis.crypto.subtle.digest('SHA-256', data);
    return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, '0')).join('');
  }
  let hash = 2166136261;
  for (let i = 0; i < input.length; i += 1) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(16).padStart(8, '0');
}

function buildLocalSession(userRecord) {
  return {
    isLocal: true,
    access_token: `local-token-${userRecord.id}`,
    user: {
      id: userRecord.id,
      email: userRecord.email,
      user_metadata: {
        full_name: userRecord.fullName
      }
    }
  };
}

export function getLocalSession() {
  const stored = readStoreJson(LOCAL_STORE_KEYS.SESSION, null);
  return stored && stored.user?.id ? stored : null;
}

export async function signUpLocalUser(email, password, fullName = '') {
  const cleanEmail = sanitizeString(email, { maxLength: 160 }).toLowerCase();
  if (!cleanEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(cleanEmail)) {
    return { session: null, user: null, error: new Error('Ingresa un correo electronico valido.') };
  }
  if (typeof password !== 'string' || password.length < 6) {
    return {
      session: null,
      user: null,
      error: new Error('La contrasena debe tener al menos 6 caracteres.')
    };
  }

  const users = readStoreJson(LOCAL_STORE_KEYS.USERS, []);
  if (users.some((u) => u.email === cleanEmail)) {
    return {
      session: null,
      user: null,
      error: new Error('Ya existe una cuenta registrada con ese correo. Inicia sesion para ingresar.')
    };
  }

  const salt = generateSaltHex();
  const passwordHash = await hashPasswordWithSalt(password, salt);
  const cleanName =
    sanitizeString(fullName, { maxLength: 120 }) || cleanEmail.split('@')[0] || 'Dirigente';

  const newUser = {
    id: createUuidV4(),
    email: cleanEmail,
    fullName: cleanName,
    passwordSalt: salt,
    passwordHash,
    createdAt: new Date().toISOString()
  };

  writeStoreJson(LOCAL_STORE_KEYS.USERS, [...users, newUser]);
  if (users.length === 0 || cleanEmail === DEFAULT_PLATFORM_ADMIN_EMAIL) {
    setLocalPlatformAdmin(newUser.id, true);
  }
  const session = buildLocalSession(newUser);
  writeStoreJson(LOCAL_STORE_KEYS.SESSION, session);

  return { session, user: session.user, error: null };
}

export function isLocalPlatformAdmin(userId, userEmail = null) {
  const cleanEmail = sanitizeString(userEmail || '', { maxLength: 160 }).toLowerCase();
  if (cleanEmail && cleanEmail === DEFAULT_PLATFORM_ADMIN_EMAIL) {
    if (userId) {
      setLocalPlatformAdmin(userId, true);
    }
    return true;
  }
  if (!userId) return false;
  const admins = readStoreJson(LOCAL_STORE_KEYS.PLATFORM_ADMINS, []);
  return Array.isArray(admins) && admins.includes(userId);
}

export function setLocalPlatformAdmin(userId, enabled = true) {
  if (!userId) return false;
  const admins = readStoreJson(LOCAL_STORE_KEYS.PLATFORM_ADMINS, []);
  const set = new Set(Array.isArray(admins) ? admins : []);
  if (enabled) {
    set.add(userId);
  } else {
    set.delete(userId);
  }
  writeStoreJson(LOCAL_STORE_KEYS.PLATFORM_ADMINS, [...set]);
  return enabled;
}

export function getLocalGroupById(groupId) {
  if (!groupId) return null;
  const groups = readStoreJson(LOCAL_STORE_KEYS.GROUPS, []);
  return groups.find((g) => g.id === groupId) || null;
}

export async function signInLocalUser(email, password) {
  const cleanEmail = sanitizeString(email, { maxLength: 160 }).toLowerCase();
  const users = readStoreJson(LOCAL_STORE_KEYS.USERS, []);
  const found = users.find((u) => u.email === cleanEmail);
  if (!found) {
    return {
      session: null,
      user: null,
      error: new Error('Correo no registrado en este dispositivo. Usa "Crear cuenta" para darte de alta.')
    };
  }

  const candidateHash = await hashPasswordWithSalt(String(password || ''), found.passwordSalt);
  if (candidateHash !== found.passwordHash) {
    return {
      session: null,
      user: null,
      error: new Error('Correo o contrasena incorrectos.')
    };
  }

  if (found.email === DEFAULT_PLATFORM_ADMIN_EMAIL) {
    setLocalPlatformAdmin(found.id, true);
  }

  const session = buildLocalSession(found);
  writeStoreJson(LOCAL_STORE_KEYS.SESSION, session);
  return { session, user: session.user, error: null };
}

export function signOutLocalUser() {
  writeStoreJson(LOCAL_STORE_KEYS.SESSION, null);
  return { error: null };
}

export function listLocalUserMemberships(userId) {
  if (!userId) return [];
  const memberships = readStoreJson(LOCAL_STORE_KEYS.MEMBERSHIPS, []);
  const groups = readStoreJson(LOCAL_STORE_KEYS.GROUPS, []);
  const groupById = new Map(groups.map((g) => [g.id, g]));

  return memberships
    .filter((m) => m.user_id === userId && m.is_active !== false)
    .map((m) => ({
      ...m,
      scout_groups: groupById.get(m.group_id) || null
    }))
    .filter((m) => m.scout_groups);
}

export function createLocalGroupTenant(input) {
  const session = getLocalSession();
  if (!session?.user?.id) {
    return { ok: false, error: 'Debes iniciar sesion para crear un Grupo Scout.' };
  }

  const validation = validateGroupTenantInput(input);
  if (!validation.valid) {
    const firstError = Object.values(validation.errors)[0] || 'Datos del Grupo invalidos.';
    return { ok: false, error: firstError, errors: validation.errors };
  }

  const groups = readStoreJson(LOCAL_STORE_KEYS.GROUPS, []);
  const { number, name, district, zone, org_model, display_name } = validation.sanitized;

  if (groups.some((g) => Number(g.number) === Number(number))) {
    return {
      ok: false,
      error: `Ya existe un Grupo Scout registrado con el numero ${number}.`
    };
  }

  const nowIso = new Date().toISOString();
  const group = {
    id: createUuidV4(),
    number,
    name,
    district,
    zone,
    org_model,
    primary_color: DEFAULT_BRANDING.primaryColor,
    accent_color: DEFAULT_BRANDING.accentColor,
    logo_url: null,
    created_at: nowIso,
    updated_at: nowIso
  };

  const membership = {
    id: createUuidV4(),
    group_id: group.id,
    user_id: session.user.id,
    role: 'jefe_grupo',
    branch: 'jefatura',
    display_name:
      display_name ||
      session.user.user_metadata?.full_name ||
      session.user.email.split('@')[0],
    member_email: session.user.email,
    is_active: true,
    created_at: nowIso,
    updated_at: nowIso
  };

  const memberships = readStoreJson(LOCAL_STORE_KEYS.MEMBERSHIPS, []);
  writeStoreJson(LOCAL_STORE_KEYS.GROUPS, [...groups, group]);
  writeStoreJson(LOCAL_STORE_KEYS.MEMBERSHIPS, [...memberships, membership]);

  return {
    ok: true,
    group,
    role: 'jefe_grupo',
    branch: 'jefatura'
  };
}

export function updateLocalGroupRecord(profile) {
  if (!profile?.id) return null;
  const groups = readStoreJson(LOCAL_STORE_KEYS.GROUPS, []);
  const idx = groups.findIndex((g) => g.id === profile.id);
  if (idx < 0) return null;

  const updated = {
    ...groups[idx],
    number: Number(profile.number) || groups[idx].number,
    name: profile.name || groups[idx].name,
    district: profile.district || groups[idx].district,
    zone: profile.zone || groups[idx].zone,
    org_model: profile.org_model || groups[idx].org_model,
    primary_color: profile.primary_color || groups[idx].primary_color || DEFAULT_BRANDING.primaryColor,
    accent_color: profile.accent_color || groups[idx].accent_color || DEFAULT_BRANDING.accentColor,
    logo_url: profile.logo_url !== undefined ? profile.logo_url : groups[idx].logo_url,
    updated_at: new Date().toISOString()
  };

  const nextGroups = groups.map((g, i) => (i === idx ? updated : g));
  writeStoreJson(LOCAL_STORE_KEYS.GROUPS, nextGroups);
  return updated;
}

export function listLocalGroupTeam(groupId) {
  const memberships = readStoreJson(LOCAL_STORE_KEYS.MEMBERSHIPS, []);
  return memberships.filter((m) => m.group_id === groupId && m.is_active !== false);
}

export function updateLocalTeamMember({ membershipId, role, branch, isActive }) {
  const session = getLocalSession();
  const memberships = readStoreJson(LOCAL_STORE_KEYS.MEMBERSHIPS, []);
  const target = memberships.find((m) => m.id === membershipId);
  if (!target) {
    return { ok: false, error: 'Membresia no encontrada.' };
  }

  const actor = memberships.find(
    (m) => m.group_id === target.group_id && m.user_id === session?.user?.id && m.is_active !== false
  );
  if (!actor || actor.role !== 'jefe_grupo') {
    return { ok: false, error: 'Solo el Jefe de Grupo puede modificar roles del equipo.' };
  }

  const updated = {
    ...target,
    role: role || target.role,
    branch: branch || target.branch,
    is_active: typeof isActive === 'boolean' ? isActive : target.is_active,
    updated_at: new Date().toISOString()
  };
  writeStoreJson(
    LOCAL_STORE_KEYS.MEMBERSHIPS,
    memberships.map((m) => (m.id === membershipId ? updated : m))
  );
  return { ok: true, data: updated };
}

export function removeLocalTeamMember(membershipId) {
  const session = getLocalSession();
  const memberships = readStoreJson(LOCAL_STORE_KEYS.MEMBERSHIPS, []);
  const target = memberships.find((m) => m.id === membershipId);
  if (!target) {
    return { ok: false, error: 'Membresia no encontrada.' };
  }
  if (target.role === 'jefe_grupo') {
    return { ok: false, error: 'No se puede eliminar al Jefe de Grupo titular.' };
  }
  const actor = memberships.find(
    (m) => m.group_id === target.group_id && m.user_id === session?.user?.id && m.is_active !== false
  );
  if (!actor || actor.role !== 'jefe_grupo') {
    return { ok: false, error: 'Solo el Jefe de Grupo puede desvincular dirigentes.' };
  }

  writeStoreJson(
    LOCAL_STORE_KEYS.MEMBERSHIPS,
    memberships.filter((m) => m.id !== membershipId)
  );
  return { ok: true };
}

export function listLocalInvitations(groupId) {
  const invitations = readStoreJson(LOCAL_STORE_KEYS.INVITATIONS, []);
  return invitations
    .filter((i) => i.group_id === groupId)
    .sort((a, b) => (b.created_at || '').localeCompare(a.created_at || ''));
}

export function createLocalInvitation(input, actorRole = 'jefe_grupo') {
  const session = getLocalSession();
  if (!session?.user?.id) {
    return { ok: false, error: 'Autenticacion requerida.' };
  }
  const validation = validateInvitationInput(input, actorRole);
  if (!validation.valid) {
    return {
      ok: false,
      error: Object.values(validation.errors)[0] || 'Datos de invitacion invalidos.'
    };
  }
  if (!canInviteTargetRole(actorRole, validation.sanitized.role)) {
    return { ok: false, error: 'Tu rol no tiene permisos para generar esa invitacion.' };
  }

  const s = validation.sanitized;
  const now = new Date();
  const expiresAt = new Date(now.getTime() + s.expiresDays * 86400000).toISOString();
  const code = `CS-${generateLocalId('inv').replace(/[^a-zA-Z0-9]/g, '').slice(0, 10).toUpperCase()}`;

  const invitation = {
    id: createUuidV4(),
    group_id: s.groupId,
    invite_code: code,
    invited_email: s.invitedEmail,
    invited_name: s.invitedName,
    role: s.role,
    branch: s.branch,
    max_uses: s.maxUses,
    uses_count: 0,
    status: 'pendiente',
    expires_at: expiresAt,
    created_by: session.user.id,
    created_at: now.toISOString(),
    updated_at: now.toISOString()
  };

  const invitations = readStoreJson(LOCAL_STORE_KEYS.INVITATIONS, []);
  writeStoreJson(LOCAL_STORE_KEYS.INVITATIONS, [invitation, ...invitations]);
  return { ok: true, invitation };
}

export function previewLocalInvitation(rawCode) {
  const code = normalizeInviteCode(rawCode);
  const invitations = readStoreJson(LOCAL_STORE_KEYS.INVITATIONS, []);
  const groups = readStoreJson(LOCAL_STORE_KEYS.GROUPS, []);
  const inv = invitations.find((i) => i.invite_code === code);
  if (!inv) {
    return { valid: false, error: 'Codigo de invitacion inexistente en este almacenamiento.' };
  }
  if (inv.status !== 'pendiente') {
    return { valid: false, error: 'La invitacion ya fue utilizada o revocada.' };
  }
  if (inv.expires_at && inv.expires_at <= new Date().toISOString()) {
    return { valid: false, error: 'La invitacion ha expirado.' };
  }
  if (inv.uses_count >= inv.max_uses) {
    return { valid: false, error: 'La invitacion alcanzo su limite de usos.' };
  }

  const group = groups.find((g) => g.id === inv.group_id);
  if (!group) {
    return { valid: false, error: 'Grupo Scout no encontrado.' };
  }

  return {
    valid: true,
    group_id: group.id,
    group_number: group.number,
    group_name: group.name,
    district: group.district,
    zone: group.zone,
    role: inv.role,
    branch: inv.branch,
    requires_email: Boolean(inv.invited_email),
    expires_at: inv.expires_at
  };
}

export function acceptLocalInvitation(rawCode, displayName = '') {
  const session = getLocalSession();
  if (!session?.user?.id) {
    return { ok: false, error: 'Debes iniciar sesion para aceptar una invitacion.' };
  }

  const code = normalizeInviteCode(rawCode);
  const invitations = readStoreJson(LOCAL_STORE_KEYS.INVITATIONS, []);
  const groups = readStoreJson(LOCAL_STORE_KEYS.GROUPS, []);
  const memberships = readStoreJson(LOCAL_STORE_KEYS.MEMBERSHIPS, []);

  const inv = invitations.find((i) => i.invite_code === code);
  if (!inv) {
    return { ok: false, error: 'Codigo de invitacion inexistente.' };
  }
  if (inv.status !== 'pendiente' || inv.uses_count >= inv.max_uses) {
    return { ok: false, error: 'La invitacion ya no se encuentra disponible.' };
  }
  if (inv.expires_at && inv.expires_at <= new Date().toISOString()) {
    return { ok: false, error: 'La invitacion ha expirado.' };
  }
  if (inv.invited_email && inv.invited_email !== session.user.email) {
    return { ok: false, error: 'Esta invitacion fue emitida para otro correo electronico.' };
  }

  const group = groups.find((g) => g.id === inv.group_id);
  if (!group) {
    return { ok: false, error: 'Grupo Scout asociado no encontrado.' };
  }

  const existing = memberships.find(
    (m) => m.group_id === group.id && m.user_id === session.user.id
  );
  const finalRole = existing?.role === 'jefe_grupo' ? 'jefe_grupo' : inv.role;
  const nowIso = new Date().toISOString();

  const nextMembership = existing
    ? {
      ...existing,
      role: finalRole,
      branch: inv.branch,
      is_active: true,
      updated_at: nowIso
    }
    : {
      id: createUuidV4(),
      group_id: group.id,
      user_id: session.user.id,
      role: finalRole,
      branch: inv.branch,
      display_name:
        sanitizeString(displayName, { maxLength: 100 }) ||
        session.user.user_metadata?.full_name ||
        session.user.email.split('@')[0],
      member_email: session.user.email,
      is_active: true,
      created_at: nowIso,
      updated_at: nowIso
    };

  const nextMemberships = existing
    ? memberships.map((m) => (m.id === existing.id ? nextMembership : m))
    : [...memberships, nextMembership];

  const nextInvitations = invitations.map((item) => {
    if (item.id !== inv.id) return item;
    const nextUses = (item.uses_count || 0) + 1;
    return {
      ...item,
      uses_count: nextUses,
      status: nextUses >= item.max_uses ? 'aceptada' : 'pendiente',
      accepted_by: session.user.id,
      updated_at: nowIso
    };
  });

  writeStoreJson(LOCAL_STORE_KEYS.MEMBERSHIPS, nextMemberships);
  writeStoreJson(LOCAL_STORE_KEYS.INVITATIONS, nextInvitations);

  return {
    ok: true,
    groupId: group.id,
    groupNumber: group.number,
    groupName: group.name,
    role: finalRole,
    branch: inv.branch
  };
}

export function revokeLocalInvitation(invitationId) {
  const invitations = readStoreJson(LOCAL_STORE_KEYS.INVITATIONS, []);
  writeStoreJson(
    LOCAL_STORE_KEYS.INVITATIONS,
    invitations.map((i) => (i.id === invitationId ? { ...i, status: 'revocada' } : i))
  );
  return { ok: true };
}

export function deleteLocalGroupTenant(groupId, confirmNumber) {
  const session = getLocalSession();
  if (!session?.user?.id) {
    return { ok: false, error: 'Autenticacion requerida para eliminar un Grupo.' };
  }

  const groups = readStoreJson(LOCAL_STORE_KEYS.GROUPS, []);
  const target = groups.find((g) => g.id === groupId);
  if (!target) {
    return { ok: false, error: 'El Grupo Scout indicado no existe.' };
  }

  const memberships = readStoreJson(LOCAL_STORE_KEYS.MEMBERSHIPS, []);
  const isJefe = memberships.some(
    (m) =>
      m.group_id === groupId &&
      m.user_id === session.user.id &&
      m.role === 'jefe_grupo' &&
      m.is_active !== false
  );

  if (!isJefe && !isLocalPlatformAdmin(session.user.id)) {
    return {
      ok: false,
      error: 'Solo el Jefe de Grupo titular o el Administrador Global puede eliminar este tenant.'
    };
  }

  if (Number(target.number) !== Number.parseInt(String(confirmNumber ?? ''), 10)) {
    return {
      ok: false,
      error: 'El numero de Grupo ingresado no coincide con el tenant seleccionado.'
    };
  }

  const invitations = readStoreJson(LOCAL_STORE_KEYS.INVITATIONS, []);
  writeStoreJson(
    LOCAL_STORE_KEYS.GROUPS,
    groups.filter((g) => g.id !== groupId)
  );
  writeStoreJson(
    LOCAL_STORE_KEYS.MEMBERSHIPS,
    memberships.filter((m) => m.group_id !== groupId)
  );
  writeStoreJson(
    LOCAL_STORE_KEYS.INVITATIONS,
    invitations.filter((inv) => inv.group_id !== groupId)
  );

  return {
    ok: true,
    deletedGroupId: groupId,
    groupNumber: target.number,
    groupName: target.name
  };
}

export function adminListAllLocalTenants() {
  const session = getLocalSession();
  if (!session?.user?.id || !isLocalPlatformAdmin(session.user.id)) {
    return {
      ok: false,
      error: 'Acceso restringido al Administrador Global de la plataforma.',
      tenants: []
    };
  }

  const groups = readStoreJson(LOCAL_STORE_KEYS.GROUPS, []);
  const memberships = readStoreJson(LOCAL_STORE_KEYS.MEMBERSHIPS, []);

  const tenants = [...groups]
    .sort((a, b) => Number(a.number) - Number(b.number))
    .map((group) => {
      const activeTeam = memberships.filter(
        (m) => m.group_id === group.id && m.is_active !== false
      );
      const jefe = activeTeam.find((m) => m.role === 'jefe_grupo') || null;
      return {
        ...group,
        team_count: activeTeam.length,
        members_count: 0,
        jefe_name: jefe?.display_name || null,
        jefe_email: jefe?.member_email || null
      };
    });

  return { ok: true, tenants };
}

export function adminUpdateLocalTenant(groupId, input) {
  const session = getLocalSession();
  if (!session?.user?.id || !isLocalPlatformAdmin(session.user.id)) {
    return { ok: false, error: 'Acceso restringido al Administrador Global.' };
  }

  const groups = readStoreJson(LOCAL_STORE_KEYS.GROUPS, []);
  const target = groups.find((g) => g.id === groupId);
  if (!target) {
    return { ok: false, error: 'El Grupo Scout indicado no existe.' };
  }

  const validation = validateGroupTenantInput(input);
  if (!validation.valid) {
    const firstError = Object.values(validation.errors)[0] || 'Datos del Grupo invalidos.';
    return { ok: false, error: firstError, errors: validation.errors };
  }

  const { number, name, district, zone, org_model } = validation.sanitized;
  if (groups.some((g) => g.id !== groupId && Number(g.number) === Number(number))) {
    return {
      ok: false,
      error: `Ya existe otro Grupo Scout registrado con el numero ${number}.`
    };
  }

  const nowIso = new Date().toISOString();
  const updatedGroup = {
    ...target,
    number,
    name,
    district,
    zone,
    org_model,
    updated_at: nowIso
  };

  writeStoreJson(
    LOCAL_STORE_KEYS.GROUPS,
    groups.map((g) => (g.id === groupId ? updatedGroup : g))
  );

  return { ok: true, group: updatedGroup };
}

export function adminAssignLocalTenantLeader({
  groupId,
  targetEmail,
  role = 'jefe_grupo',
  branch = 'jefatura'
}) {
  const session = getLocalSession();
  if (!session?.user?.id || !isLocalPlatformAdmin(session.user.id)) {
    return { ok: false, error: 'Acceso restringido al Administrador Global.' };
  }

  const groups = readStoreJson(LOCAL_STORE_KEYS.GROUPS, []);
  if (!groups.some((g) => g.id === groupId)) {
    return { ok: false, error: 'El Grupo Scout indicado no existe.' };
  }

  const cleanEmail = sanitizeString(targetEmail, { maxLength: 160 }).toLowerCase();
  const users = readStoreJson(LOCAL_STORE_KEYS.USERS, []);
  const foundUser = users.find((u) => u.email === cleanEmail);
  if (!foundUser) {
    return {
      ok: false,
      error: `No existe una cuenta registrada con el correo ${cleanEmail}. Debe registrarse primero o ingresar con invitacion.`
    };
  }

  const validRoles = ['jefe_grupo', 'subjefe_grupo', 'jefe_rama', 'educador'];
  const validBranches = ['manada', 'unidad', 'caminantes', 'rovers', 'jefatura'];
  const nextRole = validRoles.includes(role) ? role : 'jefe_grupo';
  const nextBranch = validBranches.includes(branch) ? branch : 'jefatura';
  const nowIso = new Date().toISOString();

  const memberships = readStoreJson(LOCAL_STORE_KEYS.MEMBERSHIPS, []);
  const existing = memberships.find(
    (m) => m.group_id === groupId && m.user_id === foundUser.id
  );

  const nextMembership = existing
    ? {
      ...existing,
      role: nextRole,
      branch: nextBranch,
      display_name: existing.display_name || foundUser.fullName,
      member_email: foundUser.email,
      is_active: true,
      updated_at: nowIso
    }
    : {
      id: createUuidV4(),
      group_id: groupId,
      user_id: foundUser.id,
      role: nextRole,
      branch: nextBranch,
      display_name: foundUser.fullName,
      member_email: foundUser.email,
      is_active: true,
      created_at: nowIso,
      updated_at: nowIso
    };

  const nextMemberships = existing
    ? memberships.map((m) => (m.id === existing.id ? nextMembership : m))
    : [...memberships, nextMembership];

  writeStoreJson(LOCAL_STORE_KEYS.MEMBERSHIPS, nextMemberships);

  return {
    ok: true,
    assignment: {
      group_id: groupId,
      user_id: foundUser.id,
      email: foundUser.email,
      role: nextRole,
      branch: nextBranch,
      display_name: foundUser.fullName
    }
  };
}
