export default function DocExitFields({ docType, fields, setFields }) {
  return (
    <>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label htmlFor="doc-dep-time" className="block text-sm font-medium text-slate-700 mb-1">
            Horario salida
          </label>
          <input
            id="doc-dep-time"
            type="text"
            value={fields.departureTime}
            onChange={(e) => setFields((p) => ({ ...p, departureTime: e.target.value }))}
            className="w-full h-11 px-3 rounded-lg border border-slate-500 text-base text-slate-900 bg-white"
          />
        </div>
        <div>
          <label htmlFor="doc-ret-time" className="block text-sm font-medium text-slate-700 mb-1">
            Horario regreso
          </label>
          <input
            id="doc-ret-time"
            type="text"
            value={fields.returnTime}
            onChange={(e) => setFields((p) => ({ ...p, returnTime: e.target.value }))}
            className="w-full h-11 px-3 rounded-lg border border-slate-500 text-base text-slate-900 bg-white"
          />
        </div>
      </div>

      <div>
        <label htmlFor="doc-meeting-point" className="block text-sm font-medium text-slate-700 mb-1">
          Punto de encuentro
        </label>
        <input
          id="doc-meeting-point"
          type="text"
          value={fields.meetingPoint}
          onChange={(e) => setFields((p) => ({ ...p, meetingPoint: e.target.value }))}
          className="w-full h-11 px-3 rounded-lg border border-slate-500 text-base text-slate-900 bg-white"
        />
      </div>

      {docType === 'autorizacion_salida' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label htmlFor="doc-fee" className="block text-sm font-medium text-slate-700 mb-1">
              Valor / Arancel (opcional)
            </label>
            <input
              id="doc-fee"
              type="text"
              value={fields.fee}
              onChange={(e) => setFields((p) => ({ ...p, fee: e.target.value }))}
              placeholder="Ej. $ 15.000"
              className="w-full h-11 px-3 rounded-lg border border-slate-500 text-base text-slate-900 bg-white"
            />
          </div>
          <div>
            <label htmlFor="doc-phone" className="block text-sm font-medium text-slate-700 mb-1">
              Telefono de guardia
            </label>
            <input
              id="doc-phone"
              type="tel"
              value={fields.emergencyPhone}
              onChange={(e) => setFields((p) => ({ ...p, emergencyPhone: e.target.value }))}
              placeholder="11-XXXX-XXXX"
              className="w-full h-11 px-3 rounded-lg border border-slate-500 text-base text-slate-900 bg-white"
            />
          </div>
        </div>
      )}

      {docType === 'comunicado_familias' && (
        <>
          <div>
            <label htmlFor="doc-packing" className="block text-sm font-medium text-slate-700 mb-1">
              Que llevar (elementos basicos)
            </label>
            <textarea
              id="doc-packing"
              rows={3}
              value={fields.packingList}
              onChange={(e) => setFields((p) => ({ ...p, packingList: e.target.value }))}
              className="w-full p-3 rounded-lg border border-slate-500 text-base text-slate-900 bg-white"
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label htmlFor="doc-confirm-date" className="block text-sm font-medium text-slate-700 mb-1">
                Fecha limite confirmacion
              </label>
              <input
                id="doc-confirm-date"
                type="date"
                value={fields.confirmDeadline}
                onChange={(e) => setFields((p) => ({ ...p, confirmDeadline: e.target.value }))}
                className="w-full h-11 px-3 rounded-lg border border-slate-500 text-base text-slate-900 bg-white"
              />
            </div>
            <div>
              <label htmlFor="doc-signature" className="block text-sm font-medium text-slate-700 mb-1">
                Firma institucional
              </label>
              <input
                id="doc-signature"
                type="text"
                value={fields.signature}
                onChange={(e) => setFields((p) => ({ ...p, signature: e.target.value }))}
                className="w-full h-11 px-3 rounded-lg border border-slate-500 text-base text-slate-900 bg-white"
              />
            </div>
          </div>
        </>
      )}
    </>
  );
}
