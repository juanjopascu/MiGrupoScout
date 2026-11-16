import { useEffect, useMemo, useState } from 'react';
import {
  SCOUT_CENTER_PRESETS,
  YOUTH_BRANCH_KEYS,
  evaluateCampCompliance
} from '../../domain/saacRules.js';
import { validateCampInput } from '../../domain/validators.js';
import { LS_KEYS, writeLocalPref } from '../../services/offlineDb.js';
import { cleanUserText } from '../../utils/textSanitizer.js';
import { campRecordToForm, createEmptyCampForm } from './campFormUtils.js';

export function useCampPlannerState({
  camps,
  selectedCampId,
  onSelectCampId,
  onSaveCamp,
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

  const branchScope = useMemo(
    () => (activeYouthBranches.length === 1 ? activeYouthBranches[0] : 'grupal'),
    [activeYouthBranches]
  );

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
    onOpenDocGeneratorWithCamp?.(buildCampPayload());
  }

  function handleCreateNew() {
    onSelectCampId?.(null);
    setForm(createEmptyCampForm());
    setStep(1);
    setSaveFeedback(null);
    setValidationErrors({});
  }

  function selectCampRecord(camp) {
    onSelectCampId?.(camp.id);
    setForm(campRecordToForm(camp));
    setSaveFeedback(null);
  }

  return {
    step,
    setStep,
    form,
    setForm,
    saveFeedback,
    validationErrors,
    activeYouthBranches,
    compliance,
    missingAdultsForRatio,
    missingSafeFromHarm,
    isReadyToSubmit,
    handleSelectPreset,
    handleCycleDocStatus,
    handleSave,
    handleOpenDocWithCurrentCamp,
    handleCreateNew,
    selectCampRecord
  };
}
