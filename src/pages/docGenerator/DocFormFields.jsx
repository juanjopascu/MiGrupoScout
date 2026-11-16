import DocActaFields from './DocActaFields.jsx';
import DocExitFields from './DocExitFields.jsx';

export default function DocFormFields({ docType, fields, setFields, isVisible }) {
  return (
    <section
      aria-label="Campos del documento"
      className={`lg:col-span-5 bg-white border border-slate-300 rounded-xl p-4 md:p-5 shadow-sm space-y-3.5 ${
        isVisible ? 'block' : 'hidden lg:block'
      }`}
    >
      <h2 className="text-lg font-semibold text-slate-900">Datos del documento</h2>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="sm:col-span-2">
          <label htmlFor="doc-group-name" className="block text-sm font-medium text-slate-700 mb-1">
            Grupo Scout
          </label>
          <input
            id="doc-group-name"
            type="text"
            value={fields.groupName}
            onChange={(e) => setFields((p) => ({ ...p, groupName: e.target.value }))}
            className="w-full h-11 px-3 rounded-lg border border-slate-500 text-base text-slate-900 bg-white"
          />
        </div>

        {docType === 'pedido_acampe' && (
          <>
            <div>
              <label htmlFor="doc-district" className="block text-sm font-medium text-slate-700 mb-1">
                Distrito
              </label>
              <input
                id="doc-district"
                type="text"
                value={fields.district}
                onChange={(e) => setFields((p) => ({ ...p, district: e.target.value }))}
                className="w-full h-11 px-3 rounded-lg border border-slate-500 text-base text-slate-900 bg-white"
              />
            </div>
            <div>
              <label htmlFor="doc-recipient" className="block text-sm font-medium text-slate-700 mb-1">
                Destinatario
              </label>
              <input
                id="doc-recipient"
                type="text"
                value={fields.districtChief}
                onChange={(e) => setFields((p) => ({ ...p, districtChief: e.target.value }))}
                className="w-full h-11 px-3 rounded-lg border border-slate-500 text-base text-slate-900 bg-white"
              />
            </div>
          </>
        )}
      </div>

      {docType !== 'acta_consejo' && (
        <>
          <div>
            <label htmlFor="doc-activity" className="block text-sm font-medium text-slate-700 mb-1">
              Nombre de la actividad / Asunto
            </label>
            <input
              id="doc-activity"
              type="text"
              value={fields.activityTitle}
              onChange={(e) => setFields((p) => ({ ...p, activityTitle: e.target.value }))}
              className="w-full h-11 px-3 rounded-lg border border-slate-500 text-base text-slate-900 bg-white"
            />
          </div>

          <div>
            <label htmlFor="doc-branches" className="block text-sm font-medium text-slate-700 mb-1">
              Rama(s) participante(s)
            </label>
            <input
              id="doc-branches"
              type="text"
              value={fields.branches}
              onChange={(e) => setFields((p) => ({ ...p, branches: e.target.value }))}
              className="w-full h-11 px-3 rounded-lg border border-slate-500 text-base text-slate-900 bg-white"
            />
          </div>

          <div>
            <label htmlFor="doc-location" className="block text-sm font-medium text-slate-700 mb-1">
              Lugar / Campo Scout
            </label>
            <input
              id="doc-location"
              type="text"
              value={fields.location}
              onChange={(e) => setFields((p) => ({ ...p, location: e.target.value }))}
              className="w-full h-11 px-3 rounded-lg border border-slate-500 text-base text-slate-900 bg-white"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label htmlFor="doc-start-date" className="block text-sm font-medium text-slate-700 mb-1">
                Fecha de inicio
              </label>
              <input
                id="doc-start-date"
                type="date"
                value={fields.startDate}
                onChange={(e) => setFields((p) => ({ ...p, startDate: e.target.value }))}
                className="w-full h-11 px-3 rounded-lg border border-slate-500 text-base text-slate-900 bg-white"
              />
            </div>
            <div>
              <label htmlFor="doc-end-date" className="block text-sm font-medium text-slate-700 mb-1">
                Fecha de regreso
              </label>
              <input
                id="doc-end-date"
                type="date"
                value={fields.endDate}
                onChange={(e) => setFields((p) => ({ ...p, endDate: e.target.value }))}
                className="w-full h-11 px-3 rounded-lg border border-slate-500 text-base text-slate-900 bg-white"
              />
            </div>
          </div>
        </>
      )}

      {docType === 'pedido_acampe' && (
        <>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="doc-youth-count" className="block text-sm font-medium text-slate-700 mb-1">
                Jovenes
              </label>
              <input
                id="doc-youth-count"
                type="number"
                min={0}
                value={fields.youthCount}
                onChange={(e) => setFields((p) => ({ ...p, youthCount: e.target.value }))}
                className="w-full h-11 px-3 rounded-lg border border-slate-500 text-base font-mono text-slate-900 bg-white"
              />
            </div>
            <div>
              <label htmlFor="doc-adult-count" className="block text-sm font-medium text-slate-700 mb-1">
                Adultos
              </label>
              <input
                id="doc-adult-count"
                type="number"
                min={0}
                value={fields.adultCount}
                onChange={(e) => setFields((p) => ({ ...p, adultCount: e.target.value }))}
                className="w-full h-11 px-3 rounded-lg border border-slate-500 text-base font-mono text-slate-900 bg-white"
              />
            </div>
          </div>

          <div>
            <label htmlFor="doc-camp-leader" className="block text-sm font-medium text-slate-700 mb-1">
              Responsable a cargo del campamento
            </label>
            <input
              id="doc-camp-leader"
              type="text"
              value={fields.campLeader}
              onChange={(e) => setFields((p) => ({ ...p, campLeader: e.target.value }))}
              className="w-full h-11 px-3 rounded-lg border border-slate-500 text-base text-slate-900 bg-white"
            />
          </div>
        </>
      )}

      {(docType === 'autorizacion_salida' || docType === 'comunicado_familias') && (
        <DocExitFields docType={docType} fields={fields} setFields={setFields} />
      )}

      {docType === 'acta_consejo' && <DocActaFields fields={fields} setFields={setFields} />}
    </section>
  );
}
