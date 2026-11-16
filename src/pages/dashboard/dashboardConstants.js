import { Compass, GraduationCap, Library, Users } from 'lucide-react';

export const BRANCH_FILTERS = Object.freeze([
  { id: 'todas', label: 'Todas' },
  { id: 'manada', label: 'Manada' },
  { id: 'unidad', label: 'Unidad' },
  { id: 'caminantes', label: 'Caminantes' },
  { id: 'rovers', label: 'Rovers' },
  { id: 'jefatura', label: 'Adultos' }
]);

export const BRANCH_BADGE_STYLES = Object.freeze({
  manada: 'bg-amber-100 border-amber-700 text-amber-900',
  unidad: 'bg-green-100 border-green-700 text-green-900',
  caminantes: 'bg-blue-100 border-blue-700 text-blue-900',
  rovers: 'bg-red-100 border-red-700 text-red-900',
  jefatura: 'bg-slate-100 border-slate-600 text-slate-900'
});

export const BRANCH_SHORT_LABELS = Object.freeze({
  manada: 'Manada',
  unidad: 'Unidad',
  caminantes: 'Caminantes',
  rovers: 'Rovers',
  jefatura: 'Adultos'
});

export const ROLE_LABELS = Object.freeze({
  jefe_grupo: 'Jefe de Grupo',
  subjefe_grupo: 'Subjefe de Grupo',
  jefe_rama: 'Jefe de Rama',
  educador: 'Educador',
  secretario: 'Secretario/a',
  tesorero: 'Tesorero/a',
  consejo_pleno: 'Consejo Pleno'
});

export const SAAC_ICON_MAP = Object.freeze({
  Users,
  Compass,
  Library,
  GraduationCap
});
