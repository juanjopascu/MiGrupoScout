import { CheckCircle2, Info, ShieldAlert, XCircle } from 'lucide-react';
import { BRANCHES } from '../../domain/saacRules.js';
import { formatDateAr } from '../../utils/textSanitizer.js';

export default function CompliancePanel({
  form,
  compliance,
  activeYouthBranches,
  missingAdultsForRatio,
  missingSafeFromHarm,
  isReadyToSubmit
}) {
  return (
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
}
