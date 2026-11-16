/**
 * Reglas operativas puras de Scouts de Argentina Asociacion Civil (SAAC).
 * Reexporta constantes y calculos puros sin dependencias de React ni navegador.
 */

export {
  MIN_REQUIRED_ADULTS,
  MEDICAL_EXPIRY_WARNING_DAYS,
  CAMP_DEADLINE_WARNING_DAYS,
  COUNCIL_TASK_WARNING_DAYS,
  BRANCHES,
  YOUTH_BRANCH_KEYS,
  BRANCH_RATIO_RULES,
  CAMP_DEADLINE_DAYS,
  CAMP_DOCUMENTATION_KEYS,
  SCOUT_CENTER_PRESETS
} from './saacRulesConstants.js';

export {
  calculateRequiredAdults,
  calculateDistrictDeadline,
  evaluateCampCompliance
} from './saacCampRules.js';

export {
  calculateMedicalStatus,
  calculateGroupTrafficLight
} from './saacGroupStatus.js';
