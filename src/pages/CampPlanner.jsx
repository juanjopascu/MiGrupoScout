import { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  BellPlus,
  BellRing,
  CalendarClock,
  CheckCircle2,
  FileText,
  Info,
  MapPin,
  Minus,
  Plus,
  Save,
  ShieldAlert,
  Tent,
  Trash2,
  XCircle
} from 'lucide-react';
import {
  BRANCHES,
  BRANCH_RATIO_RULES,
  SCOUT_CENTER_PRESETS,
  YOUTH_BRANCH_KEYS,
  evaluateCampCompliance
} from '../domain/saacRules.js';
import { validateCampInput } from '../domain/validators.js';
import { LS_KEYS, writeLocalPref } from '../services/offlineDb.js';
import { cleanUserText, formatDateAr, getTodayIsoLocal } from '../utils/textSanitizer.js';

const BRANCH_PILL_CLASSES = Object.freeze({
  manada: 'bg-amber-100 border-amber-700 text-amber-900',
  unidad: 'bg-green-100 border-green-700 text-green-900',
  caminantes: 'bg-blue-100 border-blue-700 text-blue-900',
  rovers: 'bg-red-100 border-red-700 text-red-900'
});

const DOC_CHECKLIST_ITEMS = Object.freeze([
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

const DOC_STATE_OPTIONS = Object.freeze([
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

function addDaysToIso(baseIso, days) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(baseIso || '');
  const baseMs = match
    ? Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3]))
    : Date.now();
  return new Date(baseMs + days * 86_400_000).toISOString().slice(0, 10);
}

function createEmptyCampForm() {
  const start = addDaysToIso(getTodayIsoLocal(), 21);
  const end = addDaysToIso(start, 2);
  return {
    id: null,
    title: '',
    activityCategory: 'acampe', // 'salida' | 'acampe'
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

function campRecordToForm(camp) {
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

function StepperRow({
  id,
  label,
  helper,
  badgeClass,
  value,
  onChange,
  min = 0,
  max = 999
}) {
  const numericValue = Number.isFinite(Number(value)) ? Number(value) : 0;

  return (
    <div className="min-h-[56px] p-3 rounded-xl border border-slate-300 bg-white flex items-center justify-between gap-3">
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          {badgeClass ? (
            <span
              className={`px-2.5 py-0.5 rounded-full text-xs font-semibold border ${badgeClass}`}
            >
              {label}
            </span>
          ) : (
            <label htmlFor={id} className="text-sm font-semibold text-slate-900">
              {label}
            </label>
          )}
        </div>
        {helper && <p className="text-xs text-slate-600 mt-1">{helper}</p>}
      </div>

      <div className="flex items-center gap-1.5 shrink-0">
        <button
          type="button"
          onClick={() => onChange(Math.max(min, numericValue - 1))}
          disabled={numericValue <= min}
          aria-label={`Disminuir ${label}`}
          className="w-12 h-12 rounded-lg border border-slate-400 bg-slate-50 hover:bg-slate-200 text-slate-900 inline-flex items-center justify-center disabled:opacity-40"
        >
          <Minus className="w-5 h-5" aria-hidden="true" />
        </button>

        <input
          id={id}
          type="number"
          min={min}
          max={max}
          aria-label={`Cantidad para ${label}`}
          value={numericValue}
          onChange={(e) => {
            const parsed = Number.parseInt(e.target.value, 10);
            onChange(Number.isNaN(parsed) ? min : Math.max(min, Math.min(max, parsed)));
          }}
          className="w-16 h-12 text-center font-mono text-lg font-bold text-slate-900 rounded-lg border border-slate-500 bg-white"
        />

        <button
          type="button"
          onClick={() => onChange(Math.min(max, numericValue + 1))}
          disabled={numericValue >= max}
          aria-label={`Aumentar ${label}`}
          className="w-12 h-12 rounded-lg border border-slate-400 bg-slate-50 hover:bg-slate-200 text-slate-900 inline-flex items-center justify-center disabled:opacity-40"
        >
          <Plus className="w-5 h-5" aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}

export default function CampPlanner({
  camps,
  selectedCampId,
  onSelectCampId,
  onSaveCamp,
  onDeleteCamp,
  pushState,
  onOpenPushManager,
  onOpenDocGeneratorWithCamp
}) {
  const [step, setStep] = useState(1);
  const [form, setForm] = useState(() => {
    const initialCamp =
      (camps || []).find((c) => c.id === selectedCampId) || (camps || [])[0] || null;
    return initialCamp ? campRecordToForm(initialCamp) : createEmptyCampForm();
  });
  const [saveFeedback, setSaveFeedback] = useState(null);
  const [validationErrors, setValidationErrors] = useState({});

  useEffect(() => {
    if (!selectedCampId) {
      return;
    }
    const target = (camps || []).find((c) => c.id === selectedCampId);
    if (target) {
      setForm(campRecordToForm(target));
      setSaveFeedback(null);
      setValidationErrors({});
    }
  }, [selectedCampId, camps]);

  const activeYouthBranches = useMemo(
    () => YOUTH_BRANCH_KEYS.filter((key) => (form.branch_counts?.[key] || 0) > 0),
    [form.branch_counts]
  );

  const branchScope = useMemo(() => {
    if (activeYouthBranches.length === 1) {
      return activeYouthBranches[0];
    }
    return 'grupal';
  }, [activeYouthBranches]);

  const documentationBooleanMap = useMemo(() => {
    const p = form.documentation_progress || {};
    return {
      carpeta_medica: p.carpeta_medica === 'completo',
      autorizaciones: p.autorizaciones === 'completo',
      seguro_cruz_del_sur: p.seguro_cruz_del_sur === 'completo',
      proyecto_educativo: p.proyecto_educativo === 'completo',
      a_salvo_del_peligro: p.a_salvo_del_peligro === 'completo',
      nota_pedido_acampe: p.nota_pedido_acampe === 'completo'
    };
  }, [form.documentation_progress]);

  const compliance = useMemo(
    () =>
      evaluateCampCompliance({
        branchCounts: form.branch_counts,
        branch: branchScope,
        adultCount: form.adult_count,
        safeFromHarmCount: form.safe_from_harm_count,
        campType: form.camp_type,
        startDate: form.start_date,
        documentationStatus: documentationBooleanMap
      }),
    [
      form.branch_counts,
      branchScope,
      form.adult_count,
      form.safe_from_harm_count,
      form.camp_type,
      form.start_date,
      documentationBooleanMap
    ]
  );

  const missingAdultsForRatio = Math.max(0, compliance.requiredAdults - form.adult_count);
  const missingSafeFromHarm = Math.max(0, form.adult_count - form.safe_from_harm_count);
  const isReadyToSubmit =
    compliance.ratioCompliant &&
    compliance.safeFromHarmCompliant &&
    compliance.deadlineStatus !== 'rojo';

  function handleSelectPreset(presetId) {
    if (presetId === 'custom') {
      setForm((prev) => ({
        ...prev,
        presetId: 'custom',
        location: prev.presetId === 'custom' ? prev.location : '',
        locality: '',
        province: '',
        operational_notes: ''
      }));
      return;
    }

    const preset = SCOUT_CENTER_PRESETS.find((p) => p.id === presetId);
    if (!preset) {
      return;
    }

    setForm((prev) => ({
      ...prev,
      presetId: preset.id,
      location: preset.name,
      locality: preset.locality,
      province: preset.province,
      operational_notes: preset.operationalNotes
    }));
  }

  function handleCycleDocStatus(key, nextStatus) {
    setForm((prev) => ({
      ...prev,
      documentation_progress: {
        ...prev.documentation_progress,
        [key]: nextStatus
      }
    }));
  }

  function buildCampPayload() {
    return {
      ...(form.id ? { id: form.id } : {}),
      title: cleanUserText(form.title || 'Salida sin titulo', { maxLength: 160 }),
      camp_type: form.camp_type,
      branch_scope: branchScope,
      location: cleanUserText(form.location, { maxLength: 200 }),
      locality: cleanUserText(form.locality, { maxLength: 100 }),
      province: cleanUserText(form.province, { maxLength: 100 }),
      operational_notes: cleanUserText(form.operational_notes, {
        maxLength: 500,
        allowNewlines: true
      }),
      start_date: form.start_date,
      end_date: form.end_date,
      district_submission_deadline: compliance.districtDeadline || form.start_date,
      branch_counts: form.branch_counts,
      youth_count: compliance.totalYouth,
      adult_count: form.adult_count,
      safe_from_harm_count: form.safe_from_harm_count,
      qualified_leaders_count: form.qualified_leaders_count,
      required_adults: compliance.requiredAdults,
      ratio_compliant: compliance.ratioCompliant && compliance.safeFromHarmCompliant,
      documentation_status: documentationBooleanMap,
      documentation_progress: form.documentation_progress,
      push_reminders: form.push_reminders,
      approval_status: form.approval_status || 'borrador'
    };
  }

  async function handleSave() {
    setSaveFeedback(null);
    const payload = buildCampPayload();
    const validation = validateCampInput(payload);
    if (!validation.valid) {
      setValidationErrors(validation.errors);
      setStep(1);
      setSaveFeedback({
        type: 'error',
        text: Object.values(validation.errors)[0] || 'Revisa los datos basicos de la salida.'
      });
      return;
    }

    setValidationErrors({});
    const saved = await onSaveCamp(payload);
    if (saved?.id) {
      setForm((prev) => ({ ...prev, id: saved.id }));
      onSelectCampId?.(saved.id);
    }

    writeLocalPref(LS_KEYS.CAMP_ALERTS, {
      campId: saved?.id || payload.id,
      title: payload.title,
      deadline: payload.district_submission_deadline,
      reminders: payload.push_reminders
    });

    setSaveFeedback({
      type: 'success',
      text: 'Planificacion guardada en este dispositivo y lista para sincronizar.'
    });
  }

  function handleOpenDocWithCurrentCamp() {
    const payload = buildCampPayload();
    onOpenDocGeneratorWithCamp?.(payload);
  }

  function handleCreateNew() {
    onSelectCampId?.(null);
    setForm(createEmptyCampForm());
    setStep(1);
    setSaveFeedback(null);
    setValidationErrors({});
  }

  const CompliancePanel = (
    <div className="bg-white border border-slate-300 rounded-xl p-4 md:p-5 shadow-sm space-y-4">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-lg font-semibold text-slate-900">
          Validacion Normativa SAAC
        </h2>
        <span
          className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border ${
            isReadyToSubmit
              ? 'bg-green-100 border-green-700 text-green-900'
              : 'bg-red-100 border-red-700 text-red-900'
          }`}
        >
          {isReadyToSubmit ? (
            <CheckCircle2 className="w-3.5 h-3.5" aria-hidden="true" />
          ) : (
            <XCircle className="w-3.5 h-3.5" aria-hidden="true" />
          )}
          <span>{isReadyToSubmit ? 'Apto para presentar' : 'Faltan requisitos'}</span>
        </span>
      </div>

      {/* Regla 1: Ratio por rama y minimo obligatorio */}
      <div
        role={compliance.ratioCompliant ? undefined : 'alert'}
        className={`p-3.5 rounded-xl border space-y-2 ${
          compliance.ratioCompliant
            ? 'bg-green-100 border-green-700 text-green-900'
            : 'bg-red-100 border-red-700 text-red-900'
        }`}
      >
        <div className="flex items-start gap-2.5">
          {compliance.ratioCompliant ? (
            <CheckCircle2 className="w-5 h-5 shrink-0 mt-0.5" aria-hidden="true" />
          ) : (
            <XCircle className="w-5 h-5 shrink-0 mt-0.5" aria-hidden="true" />
          )}
          <div className="space-y-1">
            <p className="text-sm font-semibold">
              Ratio de adultos: Requerido {compliance.requiredAdults} | Declarados {form.adult_count}
            </p>
            {!compliance.ratioCompliant ? (
              <p className="text-xs font-medium">
                {missingAdultsForRatio === 1
                  ? 'Falta 1 adulto responsable para cubrir el ratio obligatorio.'
                  : `Faltan ${missingAdultsForRatio} adultos responsables para cubrir el ratio obligatorio.`}
              </p>
            ) : (
              <p className="text-xs">
                Cumple con el minimo de {compliance.requiredAdults} adultos para {compliance.totalYouth} jovenes.
              </p>
            )}
          </div>
        </div>

        {compliance.breakdown.length > 0 && (
          <div className="pt-1.5 border-t border-current/20 text-xs space-y-0.5 font-mono">
            {compliance.breakdown.map((row) => (
              <p key={row.branch}>
                {BRANCHES[row.branch]?.label || row.branch}: {row.youthCount} jov. (1:{row.youthPerAdult}) -&gt; {row.proportionalAdults} ad.
              </p>
            ))}
          </div>
        )}
      </div>

      {/* Regla 2: 100% A Salvo del Peligro */}
      <div
        role={compliance.safeFromHarmCompliant ? undefined : 'alert'}
        className={`p-3.5 rounded-xl border flex items-start gap-2.5 ${
          compliance.safeFromHarmCompliant
            ? 'bg-green-100 border-green-700 text-green-900'
            : 'bg-red-100 border-red-700 text-red-900'
        }`}
      >
        {compliance.safeFromHarmCompliant ? (
          <CheckCircle2 className="w-5 h-5 shrink-0 mt-0.5" aria-hidden="true" />
        ) : (
          <ShieldAlert className="w-5 h-5 shrink-0 mt-0.5" aria-hidden="true" />
        )}
        <div className="space-y-1">
          <p className="text-sm font-semibold">
            A Salvo del Peligro: {form.safe_from_harm_count} de {form.adult_count} adultos ({compliance.safeFromHarmPercentage}%)
          </p>
          {!compliance.safeFromHarmCompliant ? (
            <p className="text-xs font-medium">
              {missingSafeFromHarm === 1
                ? 'Falta 1 adulto con A Salvo del Peligro vigente. Requisito obligatorio para autorizar la salida.'
                : `Faltan ${missingSafeFromHarm} adultos con A Salvo del Peligro vigente. Requisito obligatorio para autorizar la salida.`}
            </p>
          ) : (
            <p className="text-xs">
              El 100% de los adultos declarados posee certificacion vigente.
            </p>
          )}
        </div>
      </div>

      {/* Regla 3: Acompanamiento Mixto en salidas multirrama */}
      {activeYouthBranches.length > 1 && (
        <div className="p-3.5 rounded-xl border bg-blue-100 border-blue-700 text-blue-900 flex items-start gap-2.5">
          <Info className="w-5 h-5 shrink-0 mt-0.5" aria-hidden="true" />
          <p className="text-xs leading-relaxed">
            Salida multirrama detectada ({activeYouthBranches.length} ramas). Verifica que la conduccion cuente con adultos referentes acordes a la composicion mixta del contingente.
          </p>
        </div>
      )}

      {/* Plazo distrital y avance documental */}
      <div className="p-3.5 rounded-xl border border-slate-300 bg-slate-50 space-y-1.5">
        <div className="flex items-center justify-between text-xs font-semibold text-slate-700">
          <span>Fecha limite carpeta distrital</span>
          <span className="font-mono">
            {compliance.districtDeadline ? formatDateAr(compliance.districtDeadline) : '-'}
          </span>
        </div>
        <div className="flex items-center justify-between text-xs text-slate-700">
          <span>Antelacion requerida</span>
          <span className="font-mono">{compliance.daysBeforeStart} dias corridos</span>
        </div>
        <div className="flex items-center justify-between text-xs text-slate-700">
          <span>Documentacion completa</span>
          <span className="font-mono font-semibold">
            {compliance.completedDocs} / {compliance.totalDocs} requisitos
          </span>
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-4">
      {/* Cabecera + selector de salidas guardadas */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Gestor de Salidas y Campamentos
          </h1>
          <p className="text-sm text-slate-700">
            Validacion de ratios, A Salvo del Peligro y plazos distritales SAAC.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={handleCreateNew}
            className="h-11 px-4 rounded-lg border border-[#1B365D] text-[#1B365D] hover:bg-[#EBF2FA] text-sm font-semibold inline-flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" aria-hidden="true" />
            <span>Nueva salida</span>
          </button>

          {form.id && onDeleteCamp && (
            <button
              type="button"
              onClick={async () => {
                await onDeleteCamp(form.id);
                handleCreateNew();
              }}
              aria-label="Eliminar salida actual"
              className="min-w-[44px] h-11 px-3 rounded-lg border border-red-700 text-red-900 hover:bg-red-50 text-sm font-semibold inline-flex items-center gap-1.5"
            >
              <Trash2 className="w-4 h-4" aria-hidden="true" />
            </button>
          )}
        </div>
      </div>

      {/* Selector de salidas existentes */}
      {camps && camps.length > 0 && (
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
          {camps.map((camp) => {
            const active = form.id === camp.id;
            return (
              <button
                key={camp.id}
                type="button"
                onClick={() => {
                  onSelectCampId?.(camp.id);
                  setForm(campRecordToForm(camp));
                  setSaveFeedback(null);
                }}
                className={`min-h-[44px] px-3.5 rounded-xl border text-xs font-semibold whitespace-nowrap shrink-0 inline-flex items-center gap-2 transition-colors ${
                  active
                    ? 'bg-[#1B365D] border-[#1B365D] text-white'
                    : 'bg-white border-slate-300 text-slate-800 hover:border-[#1B365D]'
                }`}
              >
                <Tent className="w-3.5 h-3.5" aria-hidden="true" />
                <span>{cleanUserText(camp.title)}</span>
              </button>
            );
          })}
        </div>
      )}

      {/* Barra Resumen Mobile siempre visible */}
      <div className="lg:hidden sticky top-14 z-20 bg-white border border-slate-300 rounded-xl p-3 shadow-sm flex items-center justify-between gap-2">
        <div className="min-w-0">
          <p className="text-xs font-semibold text-slate-600">Estado normativo</p>
          <p className="text-sm font-bold text-slate-900 truncate">
            {form.adult_count}/{compliance.requiredAdults} adultos | {form.safe_from_harm_count}/{form.adult_count} A Salvo
          </p>
        </div>
        <span
          className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold border shrink-0 ${
            isReadyToSubmit
              ? 'bg-green-100 border-green-700 text-green-900'
              : 'bg-red-100 border-red-700 text-red-900'
          }`}
        >
          {isReadyToSubmit ? (
            <CheckCircle2 className="w-3.5 h-3.5" aria-hidden="true" />
          ) : (
            <AlertTriangle className="w-3.5 h-3.5" aria-hidden="true" />
          )}
          <span>{isReadyToSubmit ? 'Apto para presentar' : 'Faltan requisitos'}</span>
        </span>
      </div>

      {/* Stepper de 3 pasos */}
      <div
        role="tablist"
        aria-label="Pasos de planificacion"
        className="grid grid-cols-3 gap-2 bg-slate-100 p-1 rounded-xl border border-slate-300"
      >
        {[
          { id: 1, label: '1. Datos y Destino' },
          { id: 2, label: '2. Participantes' },
          { id: 3, label: '3. Carpeta y Push' }
        ].map((item) => (
          <button
            key={item.id}
            type="button"
            role="tab"
            aria-selected={step === item.id}
            onClick={() => setStep(item.id)}
            className={`min-h-[44px] px-2 rounded-lg text-xs sm:text-sm font-semibold transition-colors ${
              step === item.id
                ? 'bg-[#1B365D] text-white'
                : 'text-slate-700 hover:bg-slate-200'
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>

      {/* Layout principal: 7 cols formulario / 5 cols panel sticky */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        <div className="lg:col-span-7 space-y-4">
          {/* PASO 1 */}
          {step === 1 && (
            <section className="bg-white border border-slate-300 rounded-xl p-4 md:p-5 shadow-sm space-y-4">
              <h2 className="text-lg font-semibold text-slate-900">
                Datos Basicos y Destino
              </h2>

              <div className="space-y-1.5">
                <span className="block text-sm font-medium text-slate-700">
                  Tipo de actividad
                </span>
                <div className="grid grid-cols-2 gap-2 p-1 rounded-xl bg-slate-100 border border-slate-300">
                  <button
                    type="button"
                    onClick={() =>
                      setForm((prev) => ({
                        ...prev,
                        activityCategory: 'salida',
                        camp_type: 'salida_dia',
                        end_date: prev.start_date
                      }))
                    }
                    className={`h-12 rounded-lg text-sm font-semibold transition-colors ${
                      form.activityCategory === 'salida'
                        ? 'bg-[#1B365D] text-white'
                        : 'text-slate-800 hover:bg-slate-200'
                    }`}
                  >
                    Salida por el dia
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setForm((prev) => ({
                        ...prev,
                        activityCategory: 'acampe',
                        camp_type:
                          prev.camp_type === 'salida_dia'
                            ? 'campamento_corto'
                            : prev.camp_type
                      }))
                    }
                    className={`h-12 rounded-lg text-sm font-semibold transition-colors ${
                      form.activityCategory === 'acampe'
                        ? 'bg-[#1B365D] text-white'
                        : 'text-slate-800 hover:bg-slate-200'
                    }`}
                  >
                    Acampe / Campamento
                  </button>
                </div>
              </div>

              {form.activityCategory === 'acampe' && (
                <div>
                  <label
                    htmlFor="camp-subtype"
                    className="block text-sm font-medium text-slate-700 mb-1"
                  >
                    Modalidad y duracion (define plazo distrital)
                  </label>
                  <select
                    id="camp-subtype"
                    value={form.camp_type}
                    onChange={(e) =>
                      setForm((prev) => ({ ...prev, camp_type: e.target.value }))
                    }
                    className="w-full h-11 px-3 rounded-lg border border-slate-500 text-base text-slate-900 bg-white"
                  >
                    <option value="acantonamiento">Acantonamiento (15 dias previos)</option>
                    <option value="campamento_corto">
                      Campamento corto hasta 3 noches (15 dias previos)
                    </option>
                    <option value="campamento_largo">
                      Campamento largo mas de 3 noches (30 dias previos)
                    </option>
                    <option value="fuera_distrito">
                      Salida fuera de distrito / provincia (45 dias previos)
                    </option>
                  </select>
                </div>
              )}

              <div>
                <label
                  htmlFor="camp-title"
                  className="block text-sm font-medium text-slate-700 mb-1"
                >
                  Nombre de la salida
                </label>
                <input
                  id="camp-title"
                  type="text"
                  value={form.title}
                  onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))}
                  placeholder="Ej. Acampe de Primavera"
                  className="w-full h-11 px-3 rounded-lg border border-slate-500 text-base text-slate-900 bg-white"
                />
                {validationErrors.title && (
                  <p className="text-xs text-red-700 mt-1">{validationErrors.title}</p>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label
                    htmlFor="camp-start"
                    className="block text-sm font-medium text-slate-700 mb-1"
                  >
                    Fecha de inicio
                  </label>
                  <input
                    id="camp-start"
                    type="date"
                    value={form.start_date}
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        start_date: e.target.value,
                        end_date:
                          prev.end_date < e.target.value ? e.target.value : prev.end_date
                      }))
                    }
                    className="w-full h-11 px-3 rounded-lg border border-slate-500 text-base text-slate-900 bg-white"
                  />
                </div>
                <div>
                  <label
                    htmlFor="camp-end"
                    className="block text-sm font-medium text-slate-700 mb-1"
                  >
                    Fecha de regreso
                  </label>
                  <input
                    id="camp-end"
                    type="date"
                    value={form.end_date}
                    onChange={(e) =>
                      setForm((prev) => ({ ...prev, end_date: e.target.value }))
                    }
                    className="w-full h-11 px-3 rounded-lg border border-slate-500 text-base text-slate-900 bg-white"
                  />
                  {validationErrors.end_date && (
                    <p className="text-xs text-red-700 mt-1">{validationErrors.end_date}</p>
                  )}
                </div>
              </div>

              <div className="space-y-2.5">
                <p className="text-sm font-medium text-slate-700">
                  Destinos frecuentes y Centros Scouts
                </p>
                <div className="flex flex-wrap gap-2">
                  {SCOUT_CENTER_PRESETS.map((preset) => {
                    const active = form.presetId === preset.id;
                    return (
                      <button
                        key={preset.id}
                        type="button"
                        onClick={() => handleSelectPreset(preset.id)}
                        className={`min-h-[44px] px-3.5 rounded-xl border text-sm font-semibold inline-flex items-center gap-2 transition-colors ${
                          active
                            ? 'bg-[#EBF2FA] border-[#1B365D] text-[#1B365D]'
                            : 'bg-white border-slate-300 text-slate-800 hover:border-[#1B365D]'
                        }`}
                      >
                        <MapPin className="w-4 h-4 shrink-0" aria-hidden="true" />
                        <span>{preset.name}</span>
                      </button>
                    );
                  })}
                  <button
                    type="button"
                    onClick={() => handleSelectPreset('custom')}
                    className={`min-h-[44px] px-3.5 rounded-xl border text-sm font-semibold inline-flex items-center gap-2 transition-colors ${
                      form.presetId === 'custom'
                        ? 'bg-[#EBF2FA] border-[#1B365D] text-[#1B365D]'
                        : 'bg-white border-slate-300 text-slate-800 hover:border-[#1B365D]'
                    }`}
                  >
                    <MapPin className="w-4 h-4 shrink-0" aria-hidden="true" />
                    <span>Otro destino</span>
                  </button>
                </div>

                {form.presetId === 'custom' ? (
                  <div>
                    <label
                      htmlFor="camp-custom-location"
                      className="block text-sm font-medium text-slate-700 mb-1"
                    >
                      Nombre y localidad del predio
                    </label>
                    <input
                      id="camp-custom-location"
                      type="text"
                      value={form.location}
                      onChange={(e) =>
                        setForm((prev) => ({ ...prev, location: e.target.value }))
                      }
                      placeholder="Ej. Campo Municipal de Tandil, Buenos Aires"
                      className="w-full h-11 px-3 rounded-lg border border-slate-500 text-base text-slate-900 bg-white"
                    />
                  </div>
                ) : (
                  <div className="p-3.5 rounded-xl bg-slate-100 border border-slate-300 text-xs text-slate-800 space-y-1">
                    <p className="font-semibold text-slate-900">
                      {form.location} - {form.locality}, {form.province}
                    </p>
                    <p>{form.operational_notes}</p>
                  </div>
                )}
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  type="button"
                  onClick={() => setStep(2)}
                  className="h-12 px-6 rounded-lg bg-[#1B365D] hover:bg-[#122643] text-white font-semibold"
                >
                  Continuar a Participantes
                </button>
              </div>
            </section>
          )}

          {/* PASO 2 */}
          {step === 2 && (
            <section className="bg-white border border-slate-300 rounded-xl p-4 md:p-5 shadow-sm space-y-4">
              <div className="space-y-1">
                <h2 className="text-lg font-semibold text-slate-900">
                  Participantes por Rama y Adultos
                </h2>
                <p className="text-xs text-slate-600">
                  Ajusta las cantidades para calcular el ratio minimo obligatorio en tiempo real.
                </p>
              </div>

              <div className="space-y-2.5">
                {YOUTH_BRANCH_KEYS.map((key) => {
                  const branchInfo = BRANCHES[key];
                  const rule = BRANCH_RATIO_RULES[key];
                  return (
                    <StepperRow
                      key={key}
                      id={`stepper-${key}`}
                      label={`${branchInfo.label} (${branchInfo.ageRange})`}
                      helper={`${branchInfo.label}: minimo ${rule.ratioLabel}`}
                      badgeClass={BRANCH_PILL_CLASSES[key]}
                      value={form.branch_counts?.[key] ?? 0}
                      onChange={(val) =>
                        setForm((prev) => ({
                          ...prev,
                          branch_counts: {
                            ...prev.branch_counts,
                            [key]: val
                          }
                        }))
                      }
                    />
                  );
                })}
              </div>

              <div className="pt-2 border-t border-slate-200 space-y-2.5">
                <h3 className="text-base font-semibold text-slate-900">
                  Adultos Responsables y Capacitacion
                </h3>

                <StepperRow
                  id="stepper-adults-total"
                  label="Total de adultos acompanantes y educadores"
                  helper="Incluye jefes de rama, educadores y colaboradores mayores de 21 anos."
                  value={form.adult_count}
                  min={0}
                  onChange={(val) =>
                    setForm((prev) => ({
                      ...prev,
                      adult_count: val,
                      safe_from_harm_count: Math.min(prev.safe_from_harm_count, val),
                      qualified_leaders_count: Math.min(prev.qualified_leaders_count, val)
                    }))
                  }
                />

                <StepperRow
                  id="stepper-adults-sfh"
                  label="Adultos con curso A Salvo del Peligro vigente"
                  helper="Debe coincidir con el 100% del total de adultos declarados."
                  value={form.safe_from_harm_count}
                  min={0}
                  max={form.adult_count}
                  onChange={(val) =>
                    setForm((prev) => ({
                      ...prev,
                      safe_from_harm_count: val
                    }))
                  }
                />

                <StepperRow
                  id="stepper-adults-im"
                  label="Adultos con habilitacion / Insignia de Madera / Jefatura de Campo"
                  helper="Responsables de conduccion habilitados segun tipo de actividad."
                  value={form.qualified_leaders_count}
                  min={0}
                  max={form.adult_count}
                  onChange={(val) =>
                    setForm((prev) => ({
                      ...prev,
                      qualified_leaders_count: val
                    }))
                  }
                />
              </div>

              <div className="pt-2 flex items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="h-12 px-5 rounded-lg border border-slate-400 text-slate-900 font-semibold hover:bg-slate-100"
                >
                  Atras
                </button>
                <button
                  type="button"
                  onClick={() => setStep(3)}
                  className="h-12 px-6 rounded-lg bg-[#1B365D] hover:bg-[#122643] text-white font-semibold"
                >
                  Continuar a Carpeta
                </button>
              </div>
            </section>
          )}

          {/* PASO 3 */}
          {step === 3 && (
            <section className="bg-white border border-slate-300 rounded-xl p-4 md:p-5 shadow-sm space-y-5">
              <div className="space-y-1">
                <h2 className="text-lg font-semibold text-slate-900">
                  Carpeta Distrital y Alertas Push
                </h2>
                <p className="text-xs text-slate-600">
                  Marca el avance de cada requisito antes de presentar ante el Distrito.
                </p>
              </div>

              <div className="space-y-2.5">
                {DOC_CHECKLIST_ITEMS.map((docItem) => {
                  const currentStatus =
                    form.documentation_progress?.[docItem.key] || 'pendiente';
                  return (
                    <div
                      key={docItem.key}
                      className="min-h-[52px] p-3 rounded-xl border border-slate-300 bg-white space-y-2.5"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                        <p className="text-sm font-medium text-slate-900">
                          {docItem.label}
                        </p>

                        <div className="flex items-center gap-1.5 shrink-0">
                          {DOC_STATE_OPTIONS.map((opt) => {
                            const selected = currentStatus === opt.value;
                            return (
                              <button
                                key={opt.value}
                                type="button"
                                onClick={() =>
                                  handleCycleDocStatus(docItem.key, opt.value)
                                }
                                className={`min-h-[40px] px-2.5 rounded-lg text-xs font-semibold border transition-colors ${
                                  selected
                                    ? opt.style
                                    : 'bg-white border-slate-300 text-slate-600 hover:bg-slate-100'
                                }`}
                              >
                                {opt.label}
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {docItem.key === 'nota_pedido_acampe' && (
                        <div className="pt-1 flex justify-end">
                          <button
                            type="button"
                            onClick={handleOpenDocWithCurrentCamp}
                            className="h-11 px-4 rounded-lg border border-[#1B365D] bg-[#EBF2FA] text-[#1B365D] hover:bg-blue-100 text-sm font-semibold inline-flex items-center gap-2"
                          >
                            <FileText className="w-4 h-4" aria-hidden="true" />
                            <span>Generar Nota</span>
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Fecha Limite y Alertas Push */}
              <div className="p-4 rounded-xl border border-[#1B365D] bg-[#EBF2FA]/60 space-y-3">
                <div className="flex items-start gap-3">
                  <CalendarClock
                    className="w-5 h-5 text-[#1B365D] shrink-0 mt-0.5"
                    aria-hidden="true"
                  />
                  <div>
                    <p className="text-sm font-semibold text-slate-900">
                      Fecha Limite de Presentacion Distrital:{' '}
                      <span className="font-mono">
                        {compliance.districtDeadline
                          ? formatDateAr(compliance.districtDeadline)
                          : '-'}
                      </span>
                    </p>
                    <p className="text-xs text-slate-700 mt-0.5">
                      Calculada automaticamente ({compliance.daysBeforeStart} dias antes del inicio).
                    </p>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="min-h-[44px] flex items-center justify-between gap-3 px-3 py-2 rounded-lg border border-slate-300 bg-white cursor-pointer">
                    <span className="text-sm font-medium text-slate-900 inline-flex items-center gap-2">
                      <BellPlus className="w-4 h-4 text-[#1B365D]" aria-hidden="true" />
                      <span>Notificar 15 dias antes del vencimiento</span>
                    </span>
                    <input
                      type="checkbox"
                      checked={form.push_reminders.days15}
                      onChange={(e) =>
                        setForm((prev) => ({
                          ...prev,
                          push_reminders: {
                            ...prev.push_reminders,
                            days15: e.target.checked
                          }
                        }))
                      }
                      className="w-5 h-5 accent-[#1B365D]"
                    />
                  </label>

                  <label className="min-h-[44px] flex items-center justify-between gap-3 px-3 py-2 rounded-lg border border-slate-300 bg-white cursor-pointer">
                    <span className="text-sm font-medium text-slate-900 inline-flex items-center gap-2">
                      <BellPlus className="w-4 h-4 text-[#1B365D]" aria-hidden="true" />
                      <span>Notificar 7 dias antes del vencimiento</span>
                    </span>
                    <input
                      type="checkbox"
                      checked={form.push_reminders.days7}
                      onChange={(e) =>
                        setForm((prev) => ({
                          ...prev,
                          push_reminders: {
                            ...prev.push_reminders,
                            days7: e.target.checked
                          }
                        }))
                      }
                      className="w-5 h-5 accent-[#1B365D]"
                    />
                  </label>

                  <label className="min-h-[44px] flex items-center justify-between gap-3 px-3 py-2 rounded-lg border border-slate-300 bg-white cursor-pointer">
                    <span className="text-sm font-medium text-slate-900 inline-flex items-center gap-2">
                      <BellPlus className="w-4 h-4 text-[#1B365D]" aria-hidden="true" />
                      <span>Notificar 48 horas antes del vencimiento</span>
                    </span>
                    <input
                      type="checkbox"
                      checked={form.push_reminders.hours48}
                      onChange={(e) =>
                        setForm((prev) => ({
                          ...prev,
                          push_reminders: {
                            ...prev.push_reminders,
                            hours48: e.target.checked
                          }
                        }))
                      }
                      className="w-5 h-5 accent-[#1B365D]"
                    />
                  </label>
                </div>

                {pushState !== 'granted' && (
                  <div className="p-3 rounded-xl bg-amber-100 border border-amber-700 text-amber-900 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5">
                    <p className="text-xs font-medium">
                      Las alertas Push aun no estan activas en este dispositivo. Activalas para recibir estos recordatorios.
                    </p>
                    <button
                      type="button"
                      onClick={onOpenPushManager}
                      className="h-11 px-3.5 rounded-lg bg-[#1B365D] text-white text-xs font-semibold inline-flex items-center justify-center gap-1.5 shrink-0"
                    >
                      <BellRing className="w-4 h-4" aria-hidden="true" />
                      <span>Activar alertas Push</span>
                    </button>
                  </div>
                )}
              </div>

              {saveFeedback && (
                <div
                  aria-live="polite"
                  className={`p-3 rounded-xl border text-sm flex items-center gap-2 ${
                    saveFeedback.type === 'success'
                      ? 'bg-green-100 border-green-700 text-green-900'
                      : 'bg-red-100 border-red-700 text-red-900'
                  }`}
                >
                  {saveFeedback.type === 'success' ? (
                    <CheckCircle2 className="w-4 h-4 shrink-0" aria-hidden="true" />
                  ) : (
                    <AlertTriangle className="w-4 h-4 shrink-0" aria-hidden="true" />
                  )}
                  <span>{saveFeedback.text}</span>
                </div>
              )}

              <div className="pt-2 flex flex-col sm:flex-row gap-3">
                <button
                  type="button"
                  onClick={() => void handleSave()}
                  className="h-12 flex-1 px-4 rounded-lg bg-[#1B365D] hover:bg-[#122643] text-white font-semibold inline-flex items-center justify-center gap-2"
                >
                  <Save className="w-4 h-4" aria-hidden="true" />
                  <span>Guardar planificacion</span>
                </button>
                <button
                  type="button"
                  onClick={handleOpenDocWithCurrentCamp}
                  className="h-12 flex-1 px-4 rounded-lg border border-[#1B365D] text-[#1B365D] hover:bg-[#EBF2FA] font-semibold inline-flex items-center justify-center gap-2"
                >
                  <FileText className="w-4 h-4" aria-hidden="true" />
                  <span>Generar Pedido de Acampe</span>
                </button>
              </div>
            </section>
          )}
        </div>

        {/* Columna derecha sticky: Panel de Validacion Normativa */}
        <aside className="lg:col-span-5 lg:sticky lg:top-6 space-y-4">
          {CompliancePanel}
        </aside>
      </div>
    </div>
  );
}
