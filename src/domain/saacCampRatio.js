/**
 * Calculos puros de ratio adulto/beneficiario y plazos distritales SAAC.
 */

import {
  BRANCH_RATIO_RULES,
  CAMP_DEADLINE_DAYS,
  CAMP_DEADLINE_WARNING_DAYS,
  MIN_REQUIRED_ADULTS,
  YOUTH_BRANCH_KEYS
} from './saacRulesConstants.js';
import {
  MS_PER_DAY,
  formatUtcDateIso,
  normalizeNonNegativeInt,
  parseUtcDateMs
} from './saacDateUtils.js';

/**
 * Calcula la cantidad minima de adultos requeridos segun las reglas SAAC.
 * Soporta calculo para una rama individual (`branch`, `youthCount`) o desglose
 * multiple (`branchCounts: { manada, unidad, caminantes, rovers }`).
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
