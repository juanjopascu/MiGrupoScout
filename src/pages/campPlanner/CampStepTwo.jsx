import {
  BRANCHES,
  BRANCH_RATIO_RULES,
  YOUTH_BRANCH_KEYS
} from '../../domain/saacRules.js';
import { BRANCH_PILL_CLASSES } from './campFormUtils.js';
import StepperRow from './StepperRow.jsx';

export default function CampStepTwo({ form, setForm, onPrev, onNext }) {
  return (
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
          onClick={onPrev}
          className="h-12 px-5 rounded-lg border border-slate-400 text-slate-900 font-semibold hover:bg-slate-100"
        >
          Atras
        </button>
        <button
          type="button"
          onClick={onNext}
          className="h-12 px-6 rounded-lg bg-[#1B365D] hover:bg-[#122643] text-white font-semibold"
        >
          Continuar a Carpeta
        </button>
      </div>
    </section>
  );
}
