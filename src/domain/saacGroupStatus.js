/**
 * Calculos puros de vigencia medica y semaforo operativo general del Grupo Scout.
 */

import {
  CAMP_DEADLINE_WARNING_DAYS,
  COUNCIL_TASK_WARNING_DAYS,
  MEDICAL_EXPIRY_WARNING_DAYS
} from './saacRulesConstants.js';
import { MS_PER_DAY, formatUtcDateIso, parseUtcDateMs } from './saacDateUtils.js';
import { calculateDistrictDeadline } from './saacCampRules.js';

/**
 * Evalua la vigencia de la ficha medica de un miembro.
 */
export function calculateMedicalStatus(expiresAt, referenceDate = new Date()) {
  const expiryMs = parseUtcDateMs(expiresAt);
  const refMs = parseUtcDateMs(referenceDate) ?? parseUtcDateMs(new Date());

  if (expiryMs === null) {
    return {
      status: 'sin_datos',
      trafficLight: 'rojo',
      daysRemaining: null,
      expiresAt: null
    };
  }

  const daysRemaining = Math.round((expiryMs - refMs) / MS_PER_DAY);
  const isoExpiry = formatUtcDateIso(expiryMs);

  if (daysRemaining < 0) {
    return {
      status: 'vencida',
      trafficLight: 'rojo',
      daysRemaining,
      expiresAt: isoExpiry
    };
  }

  if (daysRemaining <= MEDICAL_EXPIRY_WARNING_DAYS) {
    return {
      status: 'por_vencer',
      trafficLight: 'amarillo',
      daysRemaining,
      expiresAt: isoExpiry
    };
  }

  return {
    status: 'vigente',
    trafficLight: 'verde',
    daysRemaining,
    expiresAt: isoExpiry
  };
}

/**
 * Calcula el semaforo operativo general del Grupo Scout combinando
 * nomina (fichas medicas y A Salvo del Peligro), salidas/campamentos y tareas de Consejo.
 * No incluye PII ni nombres propios en la salida.
 */
export function calculateGroupTrafficLight(
  members = [],
  camps = [],
  tasks = [],
  referenceDate = new Date()
) {
  const refMs = parseUtcDateMs(referenceDate) ?? parseUtcDateMs(new Date());

  const counters = {
    activeMembers: 0,
    medicalExpired: 0,
    medicalExpiring: 0,
    medicalMissing: 0,
    safeFromHarmIssues: 0,
    cruzDelSurIssues: 0,
    campsPendingReview: 0,
    campsOverdue: 0,
    campsUrgent: 0,
    campsNonCompliantRatio: 0,
    tasksOverdue: 0,
    tasksDueSoon: 0
  };

  for (const member of Array.isArray(members) ? members : []) {
    if (member?.is_active === false) {
      continue;
    }
    counters.activeMembers += 1;

    const medical = calculateMedicalStatus(member?.medical_form_expires_at, refMs);
    if (medical.status === 'vencida') {
      counters.medicalExpired += 1;
    } else if (medical.status === 'por_vencer') {
      counters.medicalExpiring += 1;
    } else if (medical.status === 'sin_datos') {
      counters.medicalMissing += 1;
    }

    if (
      member?.member_type === 'educador' &&
      member?.safe_from_harm_status !== 'vigente'
    ) {
      counters.safeFromHarmIssues += 1;
    }

    if (
      member?.cruz_del_sur_status &&
      member.cruz_del_sur_status !== 'afiliado' &&
      member.cruz_del_sur_status !== 'baja'
    ) {
      counters.cruzDelSurIssues += 1;
    }
  }

  for (const camp of Array.isArray(camps) ? camps : []) {
    const approval = camp?.approval_status;
    if (approval === 'aprobada' || approval === 'presentada_distrito') {
      continue;
    }
    counters.campsPendingReview += 1;

    if (camp?.ratio_compliant === false) {
      counters.campsNonCompliantRatio += 1;
    }

    const deadlineInfo = calculateDistrictDeadline({
      startDate: camp?.start_date,
      campType: camp?.camp_type,
      referenceDate: refMs
    });

    const explicitDeadlineMs = parseUtcDateMs(camp?.district_submission_deadline);
    const effectiveDaysUntil =
      explicitDeadlineMs !== null
        ? Math.round((explicitDeadlineMs - refMs) / MS_PER_DAY)
        : deadlineInfo.daysUntilDeadline;

    if (effectiveDaysUntil !== null) {
      if (effectiveDaysUntil <= 0) {
        counters.campsOverdue += 1;
      } else if (effectiveDaysUntil <= CAMP_DEADLINE_WARNING_DAYS) {
        counters.campsUrgent += 1;
      }
    }
  }

  for (const task of Array.isArray(tasks) ? tasks : []) {
    if (task?.status === 'completada') {
      continue;
    }
    const dueMs = parseUtcDateMs(task?.due_date);
    if (task?.status === 'vencida') {
      counters.tasksOverdue += 1;
      continue;
    }
    if (dueMs !== null) {
      const daysUntilDue = Math.round((dueMs - refMs) / MS_PER_DAY);
      if (daysUntilDue < 0) {
        counters.tasksOverdue += 1;
      } else if (daysUntilDue <= COUNCIL_TASK_WARNING_DAYS) {
        counters.tasksDueSoon += 1;
      }
    }
  }

  const reasons = [];
  if (counters.medicalExpired > 0) {
    reasons.push(`Hay ${counters.medicalExpired} fichas medicas vencidas.`);
  }
  if (counters.medicalMissing > 0) {
    reasons.push(`Hay ${counters.medicalMissing} miembros activos sin fecha de ficha medica.`);
  }
  if (counters.safeFromHarmIssues > 0) {
    reasons.push(
      `Hay ${counters.safeFromHarmIssues} educadores sin A Salvo del Peligro vigente.`
    );
  }
  if (counters.campsOverdue > 0) {
    reasons.push(`Hay ${counters.campsOverdue} carpetas de campamento con plazo distrital vencido.`);
  }
  if (counters.campsNonCompliantRatio > 0) {
    reasons.push(
      `Hay ${counters.campsNonCompliantRatio} salidas que no cumplen el ratio adulto/beneficiario.`
    );
  }
  if (counters.tasksOverdue > 0) {
    reasons.push(`Hay ${counters.tasksOverdue} tareas del Consejo vencidas.`);
  }
  if (counters.medicalExpiring > 0) {
    reasons.push(`Hay ${counters.medicalExpiring} fichas medicas por vencer en 15 dias.`);
  }
  if (counters.campsUrgent > 0) {
    reasons.push(`Hay ${counters.campsUrgent} carpetas distritales por vencer en 7 dias.`);
  }
  if (counters.tasksDueSoon > 0) {
    reasons.push(`Hay ${counters.tasksDueSoon} tareas del Consejo con vencimiento proximo.`);
  }

  let status = 'verde';
  const hasRed =
    counters.medicalExpired > 0 ||
    counters.safeFromHarmIssues > 0 ||
    counters.campsOverdue > 0 ||
    counters.campsNonCompliantRatio > 0 ||
    counters.tasksOverdue > 0;

  const hasYellow =
    counters.medicalExpiring > 0 ||
    counters.medicalMissing > 0 ||
    counters.cruzDelSurIssues > 0 ||
    counters.campsUrgent > 0 ||
    counters.tasksDueSoon > 0;

  if (hasRed) {
    status = 'rojo';
  } else if (hasYellow) {
    status = 'amarillo';
  }

  return {
    status,
    counters,
    reasons
  };
}
