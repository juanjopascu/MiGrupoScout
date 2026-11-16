import { MapPin } from 'lucide-react';
import { SCOUT_CENTER_PRESETS } from '../../domain/saacRules.js';

export default function CampStepOne({
  form,
  setForm,
  validationErrors,
  onSelectPreset,
  onNext
}) {
  return (
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
                ? 'bg-[var(--brand-primary)] text-white'
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
                ? 'bg-[var(--brand-primary)] text-white'
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
                onClick={() => onSelectPreset(preset.id)}
                className={`min-h-[44px] px-3.5 rounded-xl border text-sm font-semibold inline-flex items-center gap-2 transition-colors ${
                  active
                    ? 'bg-[var(--brand-primary-soft)] border-[var(--brand-primary)] text-[var(--brand-primary)]'
                    : 'bg-white border-slate-300 text-slate-800 hover:border-[var(--brand-primary)]'
                }`}
              >
                <MapPin className="w-4 h-4 shrink-0" aria-hidden="true" />
                <span>{preset.name}</span>
              </button>
            );
          })}
          <button
            type="button"
            onClick={() => onSelectPreset('custom')}
            className={`min-h-[44px] px-3.5 rounded-xl border text-sm font-semibold inline-flex items-center gap-2 transition-colors ${
              form.presetId === 'custom'
                ? 'bg-[var(--brand-primary-soft)] border-[var(--brand-primary)] text-[var(--brand-primary)]'
                : 'bg-white border-slate-300 text-slate-800 hover:border-[var(--brand-primary)]'
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
          onClick={onNext}
          className="h-12 px-6 rounded-lg bg-[var(--brand-primary)] hover:bg-[var(--brand-primary-hover)] text-white font-semibold"
        >
          Continuar a Participantes
        </button>
      </div>
    </section>
  );
}
