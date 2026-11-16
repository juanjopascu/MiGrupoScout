/**
 * Modelo de roles multi-tenant, matriz de permisos y validadores de
 * provisionamiento de Grupos Scout (tenants) e invitaciones de dirigentes.
 * Sin dependencias de navegador ni servidor.
 */

import { BRANCHES } from './saacRulesConstants.js';
import { isValidUuid, sanitizeString } from './validators.js';

export const GROUP_ROLES = Object.freeze([
  'jefe_grupo',
  'subjefe_grupo',
  'jefe_rama',
  'educador'
]);

export const INVITABLE_ROLES = Object.freeze([
  'subjefe_grupo',
  'jefe_rama',
  'educador'
]);

export const GROUP_ORG_MODELS = Object.freeze([
  'tradicional',
  'nucleo',
  'comunitario',
  'escolar'
]);

export const GROUP_ROLE_LABELS = Object.freeze({
  jefe_grupo: 'Jefe de Grupo',
  subjefe_grupo: 'Subjefe de Grupo',
  jefe_rama: 'Jefe de Rama',
  educador: 'Educador',
  consejo_pleno: 'Consejo Pleno'
});

export const GROUP_ROLE_DESCRIPTIONS = Object.freeze({
  jefe_grupo: 'Administra el Grupo (tenant), edita datos institucionales, gestiona roles y envia invitaciones.',
  subjefe_grupo: 'Co-conduce el Grupo, gestiona nominas, salidas e invita Jefes de Rama y Educadores.',
  jefe_rama: 'Coordina su rama, carga miembros/fichas medicas, planifica salidas y envia avisos push.',
  educador: 'Participa del Consejo, planifica salidas de su rama, gestiona tareas y consulta nomina.'
});

export const ASSIGNABLE_TEAM_BRANCHES = Object.freeze([
  'jefatura',
  'manada',
  'unidad',
  'caminantes',
  'rovers'
]);

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const INVITE_CODE_REGEX = /^[A-Z0-9-]{6,32}$/;

export function getRoleLabel(role) {
  return GROUP_ROLE_LABELS[role] || 'Educador';
}

export function canEditGroupSettings(role) {
  return role === 'jefe_grupo' || role === 'subjefe_grupo';
}

export function canEditGroupBranding(role) {
  return role === 'jefe_grupo';
}

export function canDeleteTenant(role) {
  return role === 'jefe_grupo';
}

export function canManageInvitations(role) {
  return role === 'jefe_grupo' || role === 'subjefe_grupo';
}

export function canInviteTargetRole(actorRole, targetRole) {
  if (!INVITABLE_ROLES.includes(targetRole)) {
    return false;
  }
  if (actorRole === 'jefe_grupo') {
    return true;
  }
  if (actorRole === 'subjefe_grupo') {
    return targetRole === 'jefe_rama' || targetRole === 'educador';
  }
  return false;
}

export function canManageTeamRoles(role) {
  return role === 'jefe_grupo';
}

export function canEditMembers(role) {
  return role === 'jefe_grupo' || role === 'subjefe_grupo' || role === 'jefe_rama';
}

export function canDeleteRecords(role) {
  return role === 'jefe_grupo' || role === 'subjefe_grupo';
}

export function canSendGroupPush(role) {
  return role === 'jefe_grupo' || role === 'subjefe_grupo' || role === 'jefe_rama';
}

export function normalizeInviteCode(value) {
  if (typeof value !== 'string') {
    return '';
  }
  return value.trim().toUpperCase().replace(/[^A-Z0-9-]/g, '');
}

export function isValidInviteCode(value) {
  return INVITE_CODE_REGEX.test(normalizeInviteCode(value));
}

export function validateGroupTenantInput(input) {
  const errors = {};
  const data = input && typeof input === 'object' ? input : {};

  const parsedNumber = Number.parseInt(String(data.number ?? ''), 10);
  if (!Number.isInteger(parsedNumber) || parsedNumber < 1 || parsedNumber > 99999) {
    errors.number = 'Ingresa un numero de Grupo Scout valido (1 a 99999).';
  }

  const name = sanitizeString(data.name, { maxLength: 120 });
  if (name.length < 3) {
    errors.name = 'El nombre del Grupo debe tener al menos 3 caracteres.';
  }

  const district = sanitizeString(data.district, { maxLength: 80 });
  if (district.length < 2) {
    errors.district = 'Indica el Distrito al que pertenece el Grupo.';
  }

  const zone = sanitizeString(data.zone, { maxLength: 80 });
  if (zone.length < 2) {
    errors.zone = 'Indica la Zona Scout a la que pertenece el Grupo.';
  }

  const orgModel = data.org_model || 'tradicional';
  if (!GROUP_ORG_MODELS.includes(orgModel)) {
    errors.org_model = 'Modalidad organizativa invalida.';
  }

  const displayName = sanitizeString(data.display_name ?? '', { maxLength: 100 });

  return {
    valid: Object.keys(errors).length === 0,
    errors,
    sanitized: {
      number: Number.isInteger(parsedNumber) && parsedNumber > 0 ? parsedNumber : 1,
      name,
      district,
      zone,
      org_model: GROUP_ORG_MODELS.includes(orgModel) ? orgModel : 'tradicional',
      display_name: displayName || null
    }
  };
}

export function validateInvitationInput(input, actorRole = 'jefe_grupo') {
  const errors = {};
  const data = input && typeof input === 'object' ? input : {};

  if (!isValidUuid(data.groupId)) {
    errors.groupId = 'Identificador de grupo invalido.';
  }

  if (!INVITABLE_ROLES.includes(data.role)) {
    errors.role = 'Rol de invitacion invalido.';
  } else if (!canInviteTargetRole(actorRole, data.role)) {
    errors.role = 'Tu rol actual no tiene permisos para invitar con ese cargo.';
  }

  const branch = data.branch || 'jefatura';
  if (!ASSIGNABLE_TEAM_BRANCHES.includes(branch)) {
    errors.branch = 'Rama asignada invalida.';
  }

  const rawEmail = sanitizeString(data.invitedEmail ?? '', { maxLength: 160 }).toLowerCase();
  if (rawEmail && !EMAIL_REGEX.test(rawEmail)) {
    errors.invitedEmail = 'El correo electronico del invitado no es valido.';
  }

  const invitedName = sanitizeString(data.invitedName ?? '', { maxLength: 120 });

  const maxUses = Number.parseInt(String(data.maxUses ?? 1), 10);
  if (!Number.isInteger(maxUses) || maxUses < 1 || maxUses > 100) {
    errors.maxUses = 'El cupo de usos debe ser entre 1 y 100.';
  }

  const expiresDays = Number.parseInt(String(data.expiresDays ?? 14), 10);
  if (!Number.isInteger(expiresDays) || expiresDays < 1 || expiresDays > 90) {
    errors.expiresDays = 'La vigencia debe ser entre 1 y 90 dias.';
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors,
    sanitized: {
      groupId: typeof data.groupId === 'string' ? data.groupId.trim() : '',
      role: data.role,
      branch,
      invitedEmail: rawEmail || null,
      invitedName: invitedName || null,
      maxUses: Number.isInteger(maxUses) ? maxUses : 1,
      expiresDays: Number.isInteger(expiresDays) ? expiresDays : 14
    }
  };
}

export function buildInvitationUrl(inviteCode, origin = '') {
  const code = normalizeInviteCode(inviteCode);
  if (!code) {
    return '';
  }
  const base = origin ? origin.replace(/\/+$/, '') : '';
  return `${base}/?invite=${encodeURIComponent(code)}`;
}

export function buildInvitationShareText({
  inviteCode,
  groupName,
  groupNumber,
  role,
  branch,
  origin = ''
}) {
  const code = normalizeInviteCode(inviteCode);
  const roleLabel = getRoleLabel(role);
  const branchLabel = BRANCHES[branch]?.label || 'Jefatura de Grupo';
  const link = buildInvitationUrl(code, origin);

  const lines = [
    `Invitacion al Consejo de Grupo - ${groupName || `Grupo Scout Nro. ${groupNumber || ''}`}`.trim(),
    `Rol asignado: ${roleLabel} (${branchLabel})`,
    `Codigo de invitacion: ${code}`
  ];
  if (link) {
    lines.push(`Enlace directo para sumarte: ${link}`);
  }
  lines.push('Ingresa con tu cuenta o create una nueva y pega el codigo para vincularte al Grupo.');
  return lines.join('\n');
}

const TEMP_PASSWORD_CHARSET = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789';

export function generateTemporaryPassword(length = 10) {
  const safeLength = Math.max(8, Math.min(24, Number(length) || 10));
  const randomBytes = new Uint8Array(safeLength);
  if (typeof globalThis !== 'undefined' && globalThis.crypto?.getRandomValues) {
    globalThis.crypto.getRandomValues(randomBytes);
  } else {
    for (let i = 0; i < safeLength; i += 1) {
      randomBytes[i] = (i * 37 + 17) % 256;
    }
  }
  let out = 'CS-';
  for (let i = 0; i < safeLength; i += 1) {
    out += TEMP_PASSWORD_CHARSET[randomBytes[i] % TEMP_PASSWORD_CHARSET.length];
  }
  return out;
}
