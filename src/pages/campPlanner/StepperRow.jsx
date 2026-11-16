import { Minus, Plus } from 'lucide-react';

export default function StepperRow({
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
