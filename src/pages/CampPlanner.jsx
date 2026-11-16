import { AlertTriangle, CheckCircle2, Plus, Tent, Trash2 } from 'lucide-react';
import { cleanUserText } from '../utils/textSanitizer.js';
import CampStepOne from './campPlanner/CampStepOne.jsx';
import CampStepThree from './campPlanner/CampStepThree.jsx';
import CampStepTwo from './campPlanner/CampStepTwo.jsx';
import CompliancePanel from './campPlanner/CompliancePanel.jsx';
import { useCampPlannerState } from './campPlanner/useCampPlannerState.js';

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
  const {
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
  } = useCampPlannerState({
    camps,
    selectedCampId,
    onSelectCampId,
    onSaveCamp,
    onOpenDocGeneratorWithCamp
  });

  return (
    <div className="space-y-4">
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

      {camps && camps.length > 0 && (
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
          {camps.map((camp) => {
            const active = form.id === camp.id;
            return (
              <button
                key={camp.id}
                type="button"
                onClick={() => selectCampRecord(camp)}
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

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        <div className="lg:col-span-7 space-y-4">
          {step === 1 && (
            <CampStepOne
              form={form}
              setForm={setForm}
              validationErrors={validationErrors}
              onSelectPreset={handleSelectPreset}
              onNext={() => setStep(2)}
            />
          )}
          {step === 2 && (
            <CampStepTwo
              form={form}
              setForm={setForm}
              onPrev={() => setStep(1)}
              onNext={() => setStep(3)}
            />
          )}
          {step === 3 && (
            <CampStepThree
              form={form}
              setForm={setForm}
              compliance={compliance}
              pushState={pushState}
              saveFeedback={saveFeedback}
              onCycleDocStatus={handleCycleDocStatus}
              onOpenDocGenerator={handleOpenDocWithCurrentCamp}
              onOpenPushManager={onOpenPushManager}
              onSave={handleSave}
            />
          )}
        </div>

        <aside className="lg:col-span-5 lg:sticky lg:top-6 space-y-4">
          <CompliancePanel
            form={form}
            compliance={compliance}
            activeYouthBranches={activeYouthBranches}
            missingAdultsForRatio={missingAdultsForRatio}
            missingSafeFromHarm={missingSafeFromHarm}
            isReadyToSubmit={isReadyToSubmit}
          />
        </aside>
      </div>
    </div>
  );
}
