import { SCOUT_CENTER_PRESETS } from '../../domain/saacRules.js';
import { getTodayIsoLocal } from '../../utils/textSanitizer.js';

export const BRANCH_PILL_CLASSES = Object.freeze({
  manada: 'bg-amber-100 border-amber-700 text-amber-900',
  unidad: 'bg-green-100 border-green-700 text-green-900',
  caminantes: 'bg-blue-100 border-blue-700 text-blue-900',
  rovers: 'bg-red-100 border-red-700 text-red-900'
});

export const DOC_CHECKLIST_ITEMS = Object.freeze([
  { key: 'seguro_cruz_del_sur', label: 'Nomina de participantes (Cruz del Sur)' },
  { key: 'carpeta_medica', label: 'Fichas medicas vigentes de todos los asistentes' },
  { key: 'autorizaciones', label: 'Autorizaciones firmadas por familias' },
  { key: 'proyecto_educativo', label: 'Programa de actividades y proyecto educativo' },
  {
    key: 'a_salvo_del_peligro',
    label: 'Plan de emergencias, ficha de traslado y resguardo A Salvo del Peligro'
  },
  { key: 'nota_pedido_acampe', label: 'Nota formal de Pedido de Acampe' }
]);

export const DOC_STATE_OPTIONS = Object.freeze([
  {
    value: 'pendiente',
    label: 'Pendiente',
    style: 'bg-red-100 border-red-700 text-red-900'
  },
  {
    value: 'en_proceso',
    label: 'En proceso',
    style: 'bg-amber-100 border-amber-700 text-amber-900'
  },
  {
    value: 'completo',
    label: 'Completo',
    style: 'bg-green-100 border-green-700 text-green-900'
  }
]);

export function addDaysToIso(baseIso, days) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(baseIso || '');
  const baseMs = match
    ? Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3]))
    : Date.now();
  return new Date(baseMs + days * 86_400_000).toISOString().slice(0, 10);
}

export function createEmptyCampForm() {
  const start = addDaysToIso(getTodayIsoLocal(), 21);
  const end = addDaysToIso(start, 2);
  return {
    id: null,
    title: '',
    activityCategory: 'acampe',
    camp_type: 'campamento_corto',
    start_date: start,
    end_date: end,
    presetId: 'campo-scout-el-jaguel',
    location: SCOUT_CENTER_PRESETS[2].name,
    locality: SCOUT_CENTER_PRESETS[2].locality,
    province: SCOUT_CENTER_PRESETS[2].province,
    operational_notes: SCOUT_CENTER_PRESETS[2].operationalNotes,
    branch_counts: {
      manada: 10,
      unidad: 12,
      caminantes: 0,
      rovers: 0
    },
    adult_count: 4,
    safe_from_harm_count: 4,
    qualified_leaders_count: 2,
    documentation_progress: {
      seguro_cruz_del_sur: 'en_proceso',
      carpeta_medica: 'en_proceso',
      autorizaciones: 'pendiente',
      proyecto_educativo: 'pendiente',
      a_salvo_del_peligro: 'pendiente',
      nota_pedido_acampe: 'pendiente'
    },
    push_reminders: {
      days15: true,
      days7: true,
      hours48: true
    },
    approval_status: 'borrador'
  };
}

export function campRecordToForm(camp) {
  if (!camp) {
    return createEmptyCampForm();
  }
  const matchedPreset = SCOUT_CENTER_PRESETS.find(
    (p) => p.name.toLowerCase() === (camp.location || '').toLowerCase()
  );

  const progress = {
    seguro_cruz_del_sur: camp.documentation_status?.seguro_cruz_del_sur ? 'completo' : 'pendiente',
    carpeta_medica: camp.documentation_status?.carpeta_medica ? 'completo' : 'pendiente',
    autorizaciones: camp.documentation_status?.autorizaciones ? 'completo' : 'pendiente',
    proyecto_educativo: camp.documentation_status?.proyecto_educativo ? 'completo' : 'pendiente',
    a_salvo_del_peligro: camp.documentation_status?.a_salvo_del_peligro ? 'completo' : 'pendiente',
    nota_pedido_acampe: camp.documentation_status?.nota_pedido_acampe ? 'completo' : 'pendiente',
    ...(camp.documentation_progress || {})
  };

  return {
    id: camp.id || null,
    title: camp.title || '',
    activityCategory: camp.camp_type === 'salida_dia' ? 'salida' : 'acampe',
    camp_type: camp.camp_type || 'campamento_corto',
    start_date: camp.start_date || getTodayIsoLocal(),
    end_date: camp.end_date || camp.start_date || getTodayIsoLocal(),
    presetId: matchedPreset ? matchedPreset.id : 'custom',
    location: camp.location || '',
    locality: camp.locality || matchedPreset?.locality || '',
    province: camp.province || matchedPreset?.province || '',
    operational_notes: camp.operational_notes || matchedPreset?.operationalNotes || '',
    branch_counts: {
      manada: camp.branch_counts?.manada ?? 0,
      unidad: camp.branch_counts?.unidad ?? 0,
      caminantes: camp.branch_counts?.caminantes ?? 0,
      rovers: camp.branch_counts?.rovers ?? 0
    },
    adult_count: camp.adult_count ?? 2,
    safe_from_harm_count: camp.safe_from_harm_count ?? camp.adult_count ?? 2,
    qualified_leaders_count: camp.qualified_leaders_count ?? 1,
    documentation_progress: progress,
    push_reminders: {
      days15: camp.push_reminders?.days15 ?? true,
      days7: camp.push_reminders?.days7 ?? true,
      hours48: camp.push_reminders?.hours48 ?? true
    },
    approval_status: camp.approval_status || 'borrador'
  };
}
