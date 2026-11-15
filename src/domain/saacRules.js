/**
 * Reglas operativas puras de Scouts de Argentina Asociacion Civil (SAAC).
 * Todas las funciones de este modulo son puras, deterministas y sin dependencias
 * de React, navegador ni Supabase.
 */

export const MIN_REQUIRED_ADULTS = 2;

export const MEDICAL_EXPIRY_WARNING_DAYS = 15;
export const CAMP_DEADLINE_WARNING_DAYS = 7;
export const COUNCIL_TASK_WARNING_DAYS = 3;

export const BRANCHES = Object.freeze({
  manada: Object.freeze({
    id: 'manada',
    label: 'Manada',
    youthLabel: 'Lobatos y Lobeznas',
    ageRange: '7 a 11 anos',
    isYouthBranch: true
  }),
  unidad: Object.freeze({
    id: 'unidad',
    label: 'Unidad Scout',
    youthLabel: 'Scouts',
    ageRange: '11 a 14 anos',
    isYouthBranch: true
  }),
  caminantes: Object.freeze({
    id: 'caminantes',
    label: 'Comunidad de Caminantes',
    youthLabel: 'Caminantes',
    ageRange: '14 a 17 anos',
    isYouthBranch: true
  }),
  rovers: Object.freeze({
    id: 'rovers',
    label: 'Comunidad Rover',
    youthLabel: 'Rovers',
    ageRange: '17 a 21 anos',
    isYouthBranch: true
  }),
  jefatura: Object.freeze({
    id: 'jefatura',
    label: 'Jefatura de Grupo',
    youthLabel: 'Educadores y Conduccion',
    ageRange: 'Adultos',
    isYouthBranch: false
  })
});

export const YOUTH_BRANCH_KEYS = Object.freeze([
  'manada',
  'unidad',
  'caminantes',
  'rovers'
]);

export const BRANCH_RATIO_RULES = Object.freeze({
  manada: Object.freeze({
    branch: 'manada',
    youthPerAdult: 6,
    minAdults: MIN_REQUIRED_ADULTS,
    ratioLabel: '1 adulto cada 6 beneficiarios (minimo 2)'
  }),
  unidad: Object.freeze({
    branch: 'unidad',
    youthPerAdult: 8,
    minAdults: MIN_REQUIRED_ADULTS,
    ratioLabel: '1 adulto cada 8 beneficiarios (minimo 2)'
  }),
  caminantes: Object.freeze({
    branch: 'caminantes',
    youthPerAdult: 10,
    minAdults: MIN_REQUIRED_ADULTS,
    ratioLabel: '1 adulto cada 10 beneficiarios (minimo 2)'
  }),
  rovers: Object.freeze({
    branch: 'rovers',
    youthPerAdult: 12,
    minAdults: MIN_REQUIRED_ADULTS,
    ratioLabel: '1 adulto cada 12 beneficiarios (minimo 2)'
  })
});

export const CAMP_DEADLINE_DAYS = Object.freeze({
  salida_dia: 7,
  acantonamiento: 15,
  campamento_corto: 15,
  campamento_largo: 30,
  fuera_distrito: 45
});

export const CAMP_DOCUMENTATION_KEYS = Object.freeze([
  'carpeta_medica',
  'autorizaciones',
  'seguro_cruz_del_sur',
  'proyecto_educativo',
  'a_salvo_del_peligro'
]);

export const SCOUT_CENTER_PRESETS = Object.freeze([
  Object.freeze({
    id: 'centro-scout-necochea',
    name: 'Centro Scout Necochea',
    locality: 'Necochea',
    province: 'Provincia de Buenos Aires',
    addressOrArea: 'Parque Miguel Lillo, Sector Campo Scout, Necochea',
    recommendedCampTypes: ['campamento_corto', 'campamento_largo', 'fuera_distrito'],
    operationalNotes:
      'Zona costera con amplitud termica y vientos intensos; prever anclaje reforzado de carpas, proteccion solar y gestion anticipada de reserva institucional ante salida fuera de distrito.'
  }),
  Object.freeze({
    id: 'centro-scout-mar-del-plata',
    name: 'Centro Scout Mar del Plata',
    locality: 'Mar del Plata',
    province: 'Provincia de Buenos Aires',
    addressOrArea: 'Partido de General Pueyrredon, Mar del Plata',
    recommendedCampTypes: ['acantonamiento', 'campamento_corto', 'campamento_largo', 'fuera_distrito'],
    operationalNotes:
      'Apto para acantonamientos y campamentos de unidad o grupo; verificar disponibilidad de espacios cubiertos para contingencias climaticas y coordinacion de ingreso con administracion zonal.'
  }),
  Object.freeze({
    id: 'campo-scout-el-jaguel',
    name: 'Campo Scout El Jaguel',
    locality: 'El Jaguel',
    province: 'Provincia de Buenos Aires',
    addressOrArea: 'Partido de Esteban Echeverria, El Jaguel',
    recommendedCampTypes: ['salida_dia', 'acantonamiento', 'campamento_corto'],
    operationalNotes:
      'Predio cercano al area metropolitana de Buenos Aires; ideal para salidas de dia y campamentos cortos. Verificar control de acceso, asignacion de parcelas y cupo sanitario previo.'
  })
]);

const MS_PER_DAY = 86_400_000;

/**
 * Parsea una fecha YYYY-MM-DD o Date a un timestamp UTC al inicio del dia (00:00:00Z).
 * Retorna null si la entrada es invalida.
 */
function parseUtcDateMs(input) {
  if (input === null || input === undefined || input === '') {
    return null;
  }

  if (input instanceof Date) {
    if (Number.isNaN(input.getTime())) {
      return null;
    }
    return Date.UTC(input.getUTCFullYear(), input.getUTCMonth(), input.getUTCDate());
  }

  if (typeof input === 'number' && Number.isFinite(input)) {
    const parsedFromNum = new Date(input);
    if (Number.isNaN(parsedFromNum.getTime())) {
      return null;
    }
    return Date.UTC(
      parsedFromNum.getUTCFullYear(),
      parsedFromNum.getUTCMonth(),
      parsedFromNum.getUTCDate()
    );
  }

  if (typeof input !== 'string') {
    return null;
  }

  const trimmed = input.trim();
  const isoDateMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(trimmed);
  if (isoDateMatch) {
    const year = Number(isoDateMatch[1]);
    const month = Number(isoDateMatch[2]);
    const day = Number(isoDateMatch[3]);
    const utcMs = Date.UTC(year, month - 1, day);
    const check = new Date(utcMs);
    if (
      check.getUTCFullYear() !== year ||
      check.getUTCMonth() !== month - 1 ||
      check.getUTCDate() !== day
    ) {
      return null;
    }
    return utcMs;
  }

  const parsed = new Date(trimmed);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }
  return Date.UTC(parsed.getUTCFullYear(), parsed.getUTCMonth(), parsed.getUTCDate());
}

/**
 * Formatea milisegundos UTC a cadena YYYY-MM-DD.
 */
function formatUtcDateIso(utcMs) {
  const date = new Date(utcMs);
  const year = String(date.getUTCFullYear()).padStart(4, '0');
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function normalizeNonNegativeInt(value) {
  const num = Number(value);
  if (!Number.isFinite(num) || num <= 0) {
    return 0;
  }
  return Math.floor(num);
}

/**
 * Calcula la cantidad minima de adultos requeridos segun las reglas SAAC.
 * Soporta calculo para una rama individual (`branch`, `youthCount`) o desglose
 * multiple (`branchCounts: { manada, unidad, caminantes, rovers }`).
 *
 * @param {object} params
 * @param {string} [params.branch] - Rama individual o 'grupal'.
 * @param {number} [params.youthCount] - Cantidad de beneficiarios en calculo simple.
 * @param {Record<string, number>} [params.branchCounts] - Desglose por rama.
 * @returns {{
 *   requiredAdults: number,
 *   totalYouth: number,
 *   breakdown: Array<{ branch: string, youthCount: number, youthPerAdult: number, proportionalAdults: number }>,
 *   minAdultsApplied: boolean,
 *   ratioLabel: string
 * }}
 */
export function calculateRequiredAdults({ branch, youthCount = 0, branchCounts } = {}) {
  const hasBranchCounts =
    branchCounts &&
    typeof branchCounts === 'object' &&
    YOUTH_BRANCH_KEYS.some((key) => branchCounts[key] !== undefined && branchCounts[key] !== null);

  if (hasBranchCounts) {
    const breakdown = [];
    let totalYouth = 0;
    let proportionalSum = 0;

    for (const key of YOUTH_BRANCH_KEYS) {
      const count = normalizeNonNegativeInt(branchCounts[key]);
      if (count > 0) {
        const rule = BRANCH_RATIO_RULES[key];
        const proportionalAdults = Math.ceil(count / rule.youthPerAdult);
        totalYouth += count;
        proportionalSum += proportionalAdults;
        breakdown.push({
          branch: key,
          youthCount: count,
          youthPerAdult: rule.youthPerAdult,
          proportionalAdults
        });
      }
    }

    const requiredAdults = Math.max(MIN_REQUIRED_ADULTS, proportionalSum);
    const minAdultsApplied = proportionalSum < MIN_REQUIRED_ADULTS;

    let ratioLabel = `Minimo operativo obligatorio (${MIN_REQUIRED_ADULTS} adultos)`;
    if (breakdown.length === 1) {
      ratioLabel = BRANCH_RATIO_RULES[breakdown[0].branch].ratioLabel;
    } else if (breakdown.length > 1) {
      ratioLabel = `Calculo grupal por sub-rama (minimo ${MIN_REQUIRED_ADULTS} adultos)`;
    }

    return {
      requiredAdults,
      totalYouth,
      breakdown,
      minAdultsApplied,
      ratioLabel
    };
  }

  const normalizedYouth = normalizeNonNegativeInt(youthCount);
  const normalizedBranch =
    typeof branch === 'string' ? branch.trim().toLowerCase() : 'manada';

  // Para alcance 'grupal' sin desglose por sub-rama se aplica el ratio mas estricto (1:6).
  const rule =
    BRANCH_RATIO_RULES[normalizedBranch] || BRANCH_RATIO_RULES.manada;

  const proportionalAdults =
    normalizedYouth > 0 ? Math.ceil(normalizedYouth / rule.youthPerAdult) : 0;
  const requiredAdults = Math.max(MIN_REQUIRED_ADULTS, proportionalAdults);
  const minAdultsApplied = proportionalAdults < MIN_REQUIRED_ADULTS;

  const ratioLabel =
    normalizedBranch === 'grupal'
      ? `Criterio grupal estricto: 1 adulto cada ${rule.youthPerAdult} beneficiarios (minimo ${MIN_REQUIRED_ADULTS})`
      : rule.ratioLabel;

  return {
    requiredAdults,
    totalYouth: normalizedYouth,
    breakdown: [
      {
        branch: normalizedBranch === 'grupal' ? 'grupal' : rule.branch,
        youthCount: normalizedYouth,
        youthPerAdult: rule.youthPerAdult,
        proportionalAdults
      }
    ],
    minAdultsApplied,
    ratioLabel
  };
}

/**
 * Calcula la fecha limite de presentacion ante el Distrito y el semaforo de plazo.
 *
 * @param {object} params
 * @param {string|Date} params.startDate
 * @param {string} params.campType
 * @param {string|Date} [params.referenceDate]
 * @returns {{
 *   districtDeadline: string | null,
 *   daysBeforeStart: number,
 *   daysUntilDeadline: number | null,
 *   deadlineStatus: 'verde' | 'amarillo' | 'rojo'
 * }}
 */
export function calculateDistrictDeadline({
  startDate,
  campType = 'campamento_corto',
  referenceDate = new Date()
} = {}) {
  const daysBeforeStart = CAMP_DEADLINE_DAYS[campType] ?? CAMP_DEADLINE_DAYS.campamento_corto;
  const startMs = parseUtcDateMs(startDate);
  const refMs = parseUtcDateMs(referenceDate) ?? parseUtcDateMs(new Date());

  if (startMs === null) {
    return {
      districtDeadline: null,
      daysBeforeStart,
      daysUntilDeadline: null,
      deadlineStatus: 'rojo'
    };
  }

  const deadlineMs = startMs - daysBeforeStart * MS_PER_DAY;
  const daysUntilDeadline = Math.round((deadlineMs - refMs) / MS_PER_DAY);

  let deadlineStatus = 'verde';
  if (daysUntilDeadline <= 0) {
    deadlineStatus = 'rojo';
  } else if (daysUntilDeadline <= CAMP_DEADLINE_WARNING_DAYS) {
    deadlineStatus = 'amarillo';
  }

  return {
    districtDeadline: formatUtcDateIso(deadlineMs),
    daysBeforeStart,
    daysUntilDeadline,
    deadlineStatus
  };
}

/**
 * Evalua el cumplimiento normativo integral de una salida o campamento SAAC.
 *
 * @param {object} params
 * @param {Record<string, number>} [params.branchCounts]
 * @param {string} [params.branch]
 * @param {number} [params.youthCount]
 * @param {number} params.adultCount
 * @param {number} params.safeFromHarmCount
 * @param {string} params.campType
 * @param {string|Date} params.startDate
 * @param {Record<string, boolean>} [params.documentationStatus]
 * @param {string|Date} [params.referenceDate]
 */
export function evaluateCampCompliance({
  branchCounts,
  branch,
  youthCount = 0,
  adultCount = 0,
  safeFromHarmCount = 0,
  campType = 'campamento_corto',
  startDate,
  documentationStatus = {},
  referenceDate = new Date()
} = {}) {
  const ratioEvaluation = calculateRequiredAdults({
    branch,
    youthCount,
    branchCounts
  });

  const normalizedAdults = normalizeNonNegativeInt(adultCount);
  const normalizedSafeFromHarm = normalizeNonNegativeInt(safeFromHarmCount);

  const ratioCompliant = normalizedAdults >= ratioEvaluation.requiredAdults;
  const safeFromHarmCompliant =
    normalizedAdults > 0 && normalizedSafeFromHarm >= normalizedAdults;
  const safeFromHarmPercentage =
    normalizedAdults > 0
      ? Math.min(100, Math.round((normalizedSafeFromHarm / normalizedAdults) * 100))
      : 0;

  const deadlineEvaluation = calculateDistrictDeadline({
    startDate,
    campType,
    referenceDate
  });

  const docs = documentationStatus && typeof documentationStatus === 'object' ? documentationStatus : {};
  const missingDocs = [];
  let completedDocs = 0;

  for (const key of CAMP_DOCUMENTATION_KEYS) {
    if (docs[key] === true) {
      completedDocs += 1;
    } else {
      missingDocs.push(key);
    }
  }

  const totalDocs = CAMP_DOCUMENTATION_KEYS.length;
  const documentationComplete = missingDocs.length === 0;
  const completionPercentage = Math.round((completedDocs / totalDocs) * 100);

  const issues = [];
  if (!ratioCompliant) {
    issues.push(
      `Cantidad insuficiente de adultos: se requieren ${ratioEvaluation.requiredAdults} y hay ${normalizedAdults}.`
    );
  }
  if (!safeFromHarmCompliant) {
    issues.push(
      'El 100% de los adultos participantes debe contar con certificacion A Salvo del Peligro vigente.'
    );
  }
  if (deadlineEvaluation.deadlineStatus === 'rojo') {
    issues.push('El plazo de presentacion de carpeta ante el Distrito esta vencido o vence hoy.');
  } else if (deadlineEvaluation.deadlineStatus === 'amarillo') {
    issues.push(
      `El plazo de presentacion ante el Distrito vence en ${deadlineEvaluation.daysUntilDeadline} dias.`
    );
  }
  if (!documentationComplete) {
    issues.push(
      `Documentacion incompleta: faltan ${missingDocs.length} de ${totalDocs} requisitos.`
    );
  }

  const isCompliant =
    ratioCompliant &&
    safeFromHarmCompliant &&
    documentationComplete &&
    deadlineEvaluation.deadlineStatus !== 'rojo';

  let overallStatus = 'verde';
  if (!ratioCompliant || !safeFromHarmCompliant || deadlineEvaluation.deadlineStatus === 'rojo') {
    overallStatus = 'rojo';
  } else if (!documentationComplete || deadlineEvaluation.deadlineStatus === 'amarillo') {
    overallStatus = 'amarillo';
  }

  return {
    ...ratioEvaluation,
    adultCount: normalizedAdults,
    safeFromHarmCount: normalizedSafeFromHarm,
    ratioCompliant,
    safeFromHarmCompliant,
    safeFromHarmPercentage,
    districtDeadline: deadlineEvaluation.districtDeadline,
    daysBeforeStart: deadlineEvaluation.daysBeforeStart,
    daysUntilDeadline: deadlineEvaluation.daysUntilDeadline,
    deadlineStatus: deadlineEvaluation.deadlineStatus,
    completedDocs,
    totalDocs,
    missingDocs,
    documentationComplete,
    completionPercentage,
    isCompliant,
    overallStatus,
    issues
  };
}

/**
 * Evalua la vigencia de la ficha medica de un miembro.
 *
 * @param {string|Date|null|undefined} expiresAt
 * @param {string|Date} [referenceDate]
 * @returns {{
 *   status: 'vigente' | 'por_vencer' | 'vencida' | 'sin_datos',
 *   trafficLight: 'verde' | 'amarillo' | 'rojo',
 *   daysRemaining: number | null,
 *   expiresAt: string | null
 * }}
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
 *
 * @param {Array<object>} members
 * @param {Array<object>} camps
 * @param {Array<object>} tasks
 * @param {string|Date} [referenceDate]
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
