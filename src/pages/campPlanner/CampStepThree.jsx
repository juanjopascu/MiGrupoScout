import {
  AlertTriangle,
  BellPlus,
  BellRing,
  CalendarClock,
  CheckCircle2,
  FileText,
  Save
} from 'lucide-react';
import { formatDateAr } from '../../utils/textSanitizer.js';
import { DOC_CHECKLIST_ITEMS, DOC_STATE_OPTIONS } from './campFormUtils.js';

const REMINDER_OPTIONS = Object.freeze([
  { key: 'days15', label: 'Notificar 15 dias antes del vencimiento' },
  { key: 'days7', label: 'Notificar 7 dias antes del vencimiento' },
  { key: 'hours48', label: 'Notificar 48 horas antes del vencimiento' }
]);

export default function CampStepThree({
  form,
  setForm,
  compliance,
  pushState,
  saveFeedback,
  onCycleDocStatus,
  onOpenDocGenerator,
  onOpenPushManager,
  onSave
}) {
  return (
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
                        onClick={() => onCycleDocStatus(docItem.key, opt.value)}
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
                    onClick={onOpenDocGenerator}
                    className="h-11 px-4 rounded-lg border border-[var(--brand-primary)] bg-[var(--brand-primary-soft)] text-[var(--brand-primary)] hover:bg-blue-100 text-sm font-semibold inline-flex items-center gap-2"
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
      <div className="p-4 rounded-xl border border-[var(--brand-primary)] bg-[var(--brand-primary-soft)] space-y-3">
        <div className="flex items-start gap-3">
          <CalendarClock
            className="w-5 h-5 text-[var(--brand-primary)] shrink-0 mt-0.5"
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
          {REMINDER_OPTIONS.map((rem) => (
            <label
              key={rem.key}
              className="min-h-[44px] flex items-center justify-between gap-3 px-3 py-2 rounded-lg border border-slate-300 bg-white cursor-pointer"
            >
              <span className="text-sm font-medium text-slate-900 inline-flex items-center gap-2">
                <BellPlus className="w-4 h-4 text-[var(--brand-primary)]" aria-hidden="true" />
                <span>{rem.label}</span>
              </span>
              <input
                type="checkbox"
                checked={form.push_reminders[rem.key]}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    push_reminders: {
                      ...prev.push_reminders,
                      [rem.key]: e.target.checked
                    }
                  }))
                }
                className="w-5 h-5 accent-[var(--brand-primary)]"
              />
            </label>
          ))}
        </div>

        {pushState !== 'granted' && (
          <div className="p-3 rounded-xl bg-amber-100 border border-amber-700 text-amber-900 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5">
            <p className="text-xs font-medium">
              Las alertas Push aun no estan activas en este dispositivo. Activalas para recibir estos recordatorios.
            </p>
            <button
              type="button"
              onClick={onOpenPushManager}
              className="h-11 px-3.5 rounded-lg bg-[var(--brand-primary)] text-white text-xs font-semibold inline-flex items-center justify-center gap-1.5 shrink-0"
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
          onClick={() => void onSave()}
          className="h-12 flex-1 px-4 rounded-lg bg-[var(--brand-primary)] hover:bg-[var(--brand-primary-hover)] text-white font-semibold inline-flex items-center justify-center gap-2"
        >
          <Save className="w-4 h-4" aria-hidden="true" />
          <span>Guardar planificacion</span>
        </button>
        <button
          type="button"
          onClick={onOpenDocGenerator}
          className="h-12 flex-1 px-4 rounded-lg border border-[var(--brand-primary)] text-[var(--brand-primary)] hover:bg-[var(--brand-primary-soft)] font-semibold inline-flex items-center justify-center gap-2"
        >
          <FileText className="w-4 h-4" aria-hidden="true" />
          <span>Generar Pedido de Acampe</span>
        </button>
      </div>
    </section>
  );
}
