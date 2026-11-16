import {
  AlertTriangle,
  BadgeCheck,
  CheckCircle2,
  ChevronRight,
  HeartPulse,
  Tent,
  XCircle
} from 'lucide-react';
import { cleanUserText, formatDateAr } from '../../utils/textSanitizer.js';

export default function TrafficLightCards({
  affiliationStats,
  medicalStats,
  nextCamp,
  nextCampDaysToDeadline,
  onFilterCruzPending,
  onFilterMedicalAlert,
  onOpenCampPlanner
}) {
  return (
    <section aria-label="Semaforo operativo del Grupo">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-4">
        {/* Tarjeta 1: Afiliaciones Cruz del Sur */}
        <article className="bg-white border border-slate-300 rounded-xl p-4 md:p-5 shadow-sm flex flex-col justify-between gap-3">
          <div className="space-y-2.5">
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-base font-semibold text-slate-900">
                Afiliaciones Cruz del Sur
              </h2>
              {affiliationStats.status === 'verde' ? (
                <BadgeCheck className="w-5 h-5 text-green-700 shrink-0" aria-hidden="true" />
              ) : affiliationStats.status === 'amarillo' ? (
                <AlertTriangle className="w-5 h-5 text-amber-700 shrink-0" aria-hidden="true" />
              ) : (
                <XCircle className="w-5 h-5 text-red-700 shrink-0" aria-hidden="true" />
              )}
            </div>

            <div className="flex items-baseline gap-2">
              <span className="text-[28px] leading-8 font-bold tabular-nums text-slate-900">
                {affiliationStats.percent}%
              </span>
              <span className="text-sm text-slate-600">
                {affiliationStats.affiliated} vigentes / {affiliationStats.pending} pendientes
              </span>
            </div>

            <div
              className="w-full h-2 rounded-full bg-slate-200 overflow-hidden"
              role="progressbar"
              aria-valuenow={affiliationStats.percent}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label="Porcentaje de afiliaciones vigentes"
            >
              <div
                className={`h-full rounded-full ${
                  affiliationStats.status === 'verde'
                    ? 'bg-green-700'
                    : affiliationStats.status === 'amarillo'
                    ? 'bg-amber-600'
                    : 'bg-red-700'
                }`}
                style={{ width: `${affiliationStats.percent}%` }}
              />
            </div>
          </div>

          <button
            type="button"
            onClick={onFilterCruzPending}
            className="min-h-[44px] px-3 rounded-lg border border-slate-300 hover:border-[#1B365D] hover:bg-[#EBF2FA] text-sm font-semibold text-[#1B365D] inline-flex items-center justify-between transition-colors"
          >
            <span>Ver pendientes</span>
            <ChevronRight className="w-4 h-4" aria-hidden="true" />
          </button>
        </article>

        {/* Tarjeta 2: Fichas Medicas (ventana 30 dias) */}
        <article className="bg-white border border-slate-300 rounded-xl p-4 md:p-5 shadow-sm flex flex-col justify-between gap-3">
          <div className="space-y-2.5">
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-base font-semibold text-slate-900">
                Fichas Medicas
              </h2>
              <HeartPulse className="w-5 h-5 text-[#1B365D] shrink-0" aria-hidden="true" />
            </div>

            <div className="flex items-baseline gap-2 flex-wrap">
              <span className="text-[28px] leading-8 font-bold tabular-nums text-slate-900">
                {medicalStats.expiring30 + medicalStats.expiredOrMissing}
              </span>
              <span className="text-sm text-slate-600">
                {medicalStats.expiring30} por vencer (30 dias) / {medicalStats.expiredOrMissing} vencidas
              </span>
            </div>

            <div>
              {medicalStats.status === 'verde' ? (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-green-100 border border-green-700 text-green-900">
                  <CheckCircle2 className="w-3.5 h-3.5" aria-hidden="true" />
                  <span>Al dia</span>
                </span>
              ) : medicalStats.status === 'amarillo' ? (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-100 border border-amber-700 text-amber-900">
                  <AlertTriangle className="w-3.5 h-3.5" aria-hidden="true" />
                  <span>Requiere atencion</span>
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-red-100 border border-red-700 text-red-900">
                  <XCircle className="w-3.5 h-3.5" aria-hidden="true" />
                  <span>Vencimientos criticos</span>
                </span>
              )}
            </div>
          </div>

          <button
            type="button"
            onClick={onFilterMedicalAlert}
            className="min-h-[44px] px-3 rounded-lg border border-slate-300 hover:border-[#1B365D] hover:bg-[#EBF2FA] text-sm font-semibold text-[#1B365D] inline-flex items-center justify-between transition-colors"
          >
            <span>Revisar fichas</span>
            <ChevronRight className="w-4 h-4" aria-hidden="true" />
          </button>
        </article>

        {/* Tarjeta 3: Proximos Campamentos */}
        <article className="bg-white border border-slate-300 rounded-xl p-4 md:p-5 shadow-sm flex flex-col justify-between gap-3">
          <div className="space-y-1.5">
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-base font-semibold text-slate-900">
                Proximos Campamentos
              </h2>
              <Tent className="w-5 h-5 text-[#1B365D] shrink-0" aria-hidden="true" />
            </div>

            {nextCamp ? (
              <>
                <p className="text-base font-bold text-slate-900 truncate">
                  {cleanUserText(nextCamp.title)}
                </p>
                <p className="text-sm text-slate-700 truncate">
                  {formatDateAr(nextCamp.start_date)} - {cleanUserText(nextCamp.location || 'Destino a definir')}
                </p>
                <p className="text-xs font-semibold text-slate-700">
                  {nextCampDaysToDeadline !== null
                    ? nextCampDaysToDeadline < 0
                      ? `Carpeta distrital vencida hace ${Math.abs(nextCampDaysToDeadline)} dias`
                      : `Carpeta distrital: faltan ${nextCampDaysToDeadline} dias`
                    : 'Sin fecha limite calculada'}
                </p>
              </>
            ) : (
              <p className="text-sm text-slate-600">
                No hay salidas planificadas todavia. Crea la proxima actividad desde el planificador.
              </p>
            )}
          </div>

          <button
            type="button"
            onClick={() => onOpenCampPlanner(nextCamp?.id || null)}
            className="h-11 px-4 rounded-lg bg-[#1B365D] hover:bg-[#122643] text-white text-sm font-semibold inline-flex items-center justify-center gap-2 transition-colors"
          >
            <Tent className="w-4 h-4" aria-hidden="true" />
            <span>Abrir planificador</span>
          </button>
        </article>
      </div>
    </section>
  );
}
