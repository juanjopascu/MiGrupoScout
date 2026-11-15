import { ENV } from './env.js';

/**
 * Enlaces institucionales oficiales de Scouts de Argentina Asociacion Civil (SAAC).
 * Todos los accesos externos se abren con rel="noopener noreferrer".
 */
export const SAAC_LINKS = Object.freeze([
  Object.freeze({
    id: 'cruz-del-sur',
    title: 'Cruz del Sur',
    subtitle: 'Afiliaciones y nomina',
    url: ENV.SAAC_CRUZ_DEL_SUR_URL,
    iconName: 'Users'
  }),
  Object.freeze({
    id: 'rumbo-sur',
    title: 'Rumbo Sur',
    subtitle: 'Gestion administrativa',
    url: ENV.SAAC_RUMBO_SUR_URL,
    iconName: 'Compass'
  }),
  Object.freeze({
    id: 'biblioteca-saac',
    title: 'Biblioteca SAAC',
    subtitle: 'Reglamentos y guias',
    url: ENV.SAAC_BIBLIOTECA_URL,
    iconName: 'Library'
  }),
  Object.freeze({
    id: 'campus-saac',
    title: 'Campus SAAC',
    subtitle: 'Formacion de adultos',
    url: ENV.SAAC_CAMPUS_URL,
    iconName: 'GraduationCap'
  })
]);
