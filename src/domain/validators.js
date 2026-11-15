/**
 * Validadores puros de formularios, sanitizacion de cadenas y rutas relativas
 * seguras para ConsejoScout. Sin dependencias de navegador ni servidor.
 */

import {
  BRANCHES,
  CAMP_DEADLINE_DAYS
} from './saacRules.js';

export const ALLOWED_MEMBER_TYPES = Object.freeze([
  'beneficiario',
  'educador',
  'colaborador'
]);

export const ALLOWED_CRUZ_DEL_SUR_STATUS = Object.freeze([
  'afiliado',
  'pendiente',
  'vencido',
  'baja'
]);

export const ALLOWED_SAFE_FROM_HARM_STATUS = Object.freeze([
  'vigente',
  'pendiente',
  'vencido',
  'no_aplica'
]);

export const ALLOWED_BRANCH_SCOPES = Object.freeze([
  'manada',
  'unidad',
  'caminantes',
  'rovers',
  'grupal'
]);

export const ALLOWED_CAMP_APPROVAL_STATUS = Object.freeze([
  'borrador',
  'en_revision_consejo',
  'presentada_distrito',
  'aprobada',
  'observada'
]);

export const ALLOWED_ASSIGNED_ROLES = Object.freeze([
  'jefe_grupo',
  'subjefe_grupo',
  'jefe_rama',
  'educador',
  'secretario',
  'tesorero',
  'consejo_pleno'
]);

export const ALLOWED_TASK_STATUS = Object.freeze([
  'pendiente',
  'en_progreso',
  'completada',
  'vencida'
]);

export const ALLOWED_PUSH_EVENT_TYPES = Object.freeze([
  'CAMP_DEADLINE',
  'MEDICAL_EXPIRY',
  'COUNCIL_TASK',
  'GENERAL_NOTICE'
]);

const RELATIVE_URL_REGEX = /^\/[a-zA-Z0-9\-\/\?=&]*$/;
const UUID_V4_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const ISO_DATE_REGEX = /^(\d{4})-(\d{2})-(\d{2})$/;

/**
 * Elimina caracteres de control, etiquetas HTML y espacios redundantes.
 *
 * @param {unknown} value
 * @param {object} [options]
 * @param {number} [options.maxLength=500]
 * @param {boolean} [options.allowNewlines=false]
 * @returns {string}
 */
export function sanitizeString(value, { maxLength = 500, allowNewlines = false } = {}) {
  if (typeof value !== 'string') {
    return '';
  }

  let cleaned = value
    .replace(/<[^>]*>/g, '')
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '');

  if (allowNewlines) {
    cleaned = cleaned
      .replace(/\r\n?/g, '\n')
      .replace(/[^\S\n]+/g, ' ')
      .replace(/\n{3,}/g, '\n\n')
      .trim();
  } else {
    cleaned = cleaned.replace(/\s+/g, ' ').trim();
  }

  if (Number.isFinite(maxLength) && maxLength > 0 && cleaned.length > maxLength) {
    cleaned = cleaned.slice(0, maxLength).trim();
  }

  return cleaned;
}

/**
 * Valida que una URL sea una ruta relativa interna segura para navegacion PWA.
 * Bloquea esquemas externos (http:, javascript:, data:) y protocol-relative (//).
 *
 * @param {unknown} url
 * @returns {boolean}
 */
export function isValidSafeRelativeUrl(url) {
  if (typeof url !== 'string') {
    return false;
  }
  const trimmed = url.trim();
  if (!trimmed || trimmed.startsWith('//') || trimmed.includes('..')) {
    return false;
  }
  return RELATIVE_URL_REGEX.test(trimmed);
}

/**
 * Valida formato UUID estandar.
 */
export function isValidUuid(value) {
  return typeof value === 'string' && UUID_V4_REGEX.test(value.trim());
}

/**
 * Valida fecha calendario real en formato YYYY-MM-DD.
 */
export function isValidIsoDate(value) {
  if (typeof value !== 'string') {
    return false;
  }
  const match = ISO_DATE_REGEX.exec(value.trim());
  if (!match) {
    return false;
  }
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day));
  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
}

/**
 * Valida los datos de un integrante de nomina (`group_members`).
 */
export function validateMemberInput(input) {
  const errors = {};
  const data = input && typeof input === 'object' ? input : {};

  const fullName = sanitizeString(data.full_name, { maxLength: 140 });
  if (fullName.length < 3) {
    errors.full_name = 'El nombre completo debe tener al menos 3 caracteres.';
  }

  if (!ALLOWED_MEMBER_TYPES.includes(data.member_type)) {
    errors.member_type = 'Tipo de miembro invalido.';
  }

  if (!Object.prototype.hasOwnProperty.call(BRANCHES, data.branch)) {
    errors.branch = 'Rama scout invalida.';
  }

  const cruzStatus = data.cruz_del_sur_status ?? 'pendiente';
  if (!ALLOWED_CRUZ_DEL_SUR_STATUS.includes(cruzStatus)) {
    errors.cruz_del_sur_status = 'Estado de afiliacion Cruz del Sur invalido.';
  }

  const sfhStatus = data.safe_from_harm_status ?? 'no_aplica';
  if (!ALLOWED_SAFE_FROM_HARM_STATUS.includes(sfhStatus)) {
    errors.safe_from_harm_status = 'Estado de A Salvo del Peligro invalido.';
  }

  if (
    data.medical_form_expires_at !== undefined &&
    data.medical_form_expires_at !== null &&
    data.medical_form_expires_at !== '' &&
    !isValidIsoDate(data.medical_form_expires_at)
  ) {
    errors.medical_form_expires_at = 'La fecha de vencimiento medico debe tener formato YYYY-MM-DD.';
  }

  if (
    data.safe_from_harm_expires_at !== undefined &&
    data.safe_from_harm_expires_at !== null &&
    data.safe_from_harm_expires_at !== '' &&
    !isValidIsoDate(data.safe_from_harm_expires_at)
  ) {
    errors.safe_from_harm_expires_at =
      'La fecha de vencimiento de A Salvo del Peligro debe tener formato YYYY-MM-DD.';
  }

  const docNumber = sanitizeString(data.document_number ?? '', { maxLength: 32 });
  if (docNumber && !/^[a-zA-Z0-9.\-]{5,20}$/.test(docNumber)) {
    errors.document_number = 'El numero de documento contiene caracteres no permitidos.';
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors,
    sanitized: {
      full_name: fullName,
      member_type: data.member_type,
      branch: data.branch,
      document_number: docNumber || null,
      cruz_del_sur_status: cruzStatus,
      medical_form_expires_at: data.medical_form_expires_at || null,
      safe_from_harm_status: sfhStatus,
      safe_from_harm_expires_at: data.safe_from_harm_expires_at || null,
      is_active: data.is_active !== false
    }
  };
}

/**
 * Valida formulario de salida o campamento (`camp_checklists`).
 */
export function validateCampInput(input) {
  const errors = {};
  const data = input && typeof input === 'object' ? input : {};

  const title = sanitizeString(data.title, { maxLength: 160 });
  if (title.length < 3) {
    errors.title = 'El titulo de la salida o campamento debe tener al menos 3 caracteres.';
  }

  if (!Object.prototype.hasOwnProperty.call(CAMP_DEADLINE_DAYS, data.camp_type)) {
    errors.camp_type = 'Tipo de campamento o salida invalido.';
  }

  if (!ALLOWED_BRANCH_SCOPES.includes(data.branch_scope)) {
    errors.branch_scope = 'Alcance de rama invalido.';
  }

  if (!isValidIsoDate(data.start_date)) {
    errors.start_date = 'La fecha de inicio debe tener formato YYYY-MM-DD.';
  }

  if (!isValidIsoDate(data.end_date)) {
    errors.end_date = 'La fecha de finalizacion debe tener formato YYYY-MM-DD.';
  }

  if (
    isValidIsoDate(data.start_date) &&
    isValidIsoDate(data.end_date) &&
    data.end_date < data.start_date
  ) {
    errors.end_date = 'La fecha de finalizacion no puede ser anterior a la de inicio.';
  }

  const youthCount = Number(data.youth_count ?? 0);
  if (!Number.isInteger(youthCount) || youthCount < 0) {
    errors.youth_count = 'La cantidad de beneficiarios debe ser un entero mayor o igual a 0.';
  }

  const adultCount = Number(data.adult_count ?? 0);
  if (!Number.isInteger(adultCount) || adultCount < 0) {
    errors.adult_count = 'La cantidad de adultos debe ser un entero mayor o igual a 0.';
  }

  const approvalStatus = data.approval_status ?? 'borrador';
  if (!ALLOWED_CAMP_APPROVAL_STATUS.includes(approvalStatus)) {
    errors.approval_status = 'Estado de aprobacion invalido.';
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors,
    sanitized: {
      title,
      camp_type: data.camp_type,
      branch_scope: data.branch_scope,
      location: sanitizeString(data.location ?? '', { maxLength: 200 }) || null,
      start_date: data.start_date,
      end_date: data.end_date,
      youth_count: Number.isInteger(youthCount) && youthCount >= 0 ? youthCount : 0,
      adult_count: Number.isInteger(adultCount) && adultCount >= 0 ? adultCount : 0,
      approval_status: approvalStatus
    }
  };
}

/**
 * Valida formulario de tarea o acuerdo de Consejo de Grupo (`council_tasks`).
 */
export function validateCouncilTaskInput(input) {
  const errors = {};
  const data = input && typeof input === 'object' ? input : {};

  const title = sanitizeString(data.title, { maxLength: 160 });
  if (title.length < 3) {
    errors.title = 'El titulo de la tarea debe tener al menos 3 caracteres.';
  }

  if (!ALLOWED_ASSIGNED_ROLES.includes(data.assigned_role)) {
    errors.assigned_role = 'Rol asignado invalido.';
  }

  const status = data.status ?? 'pendiente';
  if (!ALLOWED_TASK_STATUS.includes(status)) {
    errors.status = 'Estado de tarea invalido.';
  }

  if (data.due_date !== undefined && data.due_date !== null && data.due_date !== '' && !isValidIsoDate(data.due_date)) {
    errors.due_date = 'La fecha limite debe tener formato YYYY-MM-DD.';
  }

  if (
    data.meeting_date !== undefined &&
    data.meeting_date !== null &&
    data.meeting_date !== '' &&
    !isValidIsoDate(data.meeting_date)
  ) {
    errors.meeting_date = 'La fecha de reunion de Consejo debe tener formato YYYY-MM-DD.';
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors,
    sanitized: {
      title,
      description:
        sanitizeString(data.description ?? '', { maxLength: 1000, allowNewlines: true }) || null,
      assigned_role: data.assigned_role,
      due_date: data.due_date || null,
      status,
      meeting_date: data.meeting_date || null,
      minutes_reference: sanitizeString(data.minutes_reference ?? '', { maxLength: 80 }) || null
    }
  };
}
