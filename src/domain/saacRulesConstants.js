/**
 * Constantes normativas y operativos de Scouts de Argentina Asociacion Civil (SAAC).
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
