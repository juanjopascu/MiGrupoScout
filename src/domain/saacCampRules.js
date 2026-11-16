/**
 * Evaluacion integral de cumplimiento normativo para salidas y campamentos SAAC.
 */

import { CAMP_DOCUMENTATION_KEYS } from './saacRulesConstants.js';
import { normalizeNonNegativeInt } from './saacDateUtils.js';
import { calculateDistrictDeadline, calculateRequiredAdults } from './saacCampRatio.js';

export { calculateRequiredAdults, calculateDistrictDeadline };

/**
 * Evalua el cumplimiento normativo integral de una salida o campamento SAAC.
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
