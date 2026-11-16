export default function DocActaFields({ fields, setFields }) {
  return (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div>
          <label htmlFor="doc-minutes-num" className="block text-sm font-medium text-slate-700 mb-1">
            Nro. de Acta
          </label>
          <input
            id="doc-minutes-num"
            type="text"
            value={fields.minutesNumber}
            onChange={(e) => setFields((p) => ({ ...p, minutesNumber: e.target.value }))}
            className="w-full h-11 px-3 rounded-lg border border-slate-500 text-base font-mono text-slate-900 bg-white"
          />
        </div>
        <div>
          <label htmlFor="doc-minutes-date" className="block text-sm font-medium text-slate-700 mb-1">
            Fecha
          </label>
          <input
            id="doc-minutes-date"
            type="date"
            value={fields.meetingDate}
            onChange={(e) => setFields((p) => ({ ...p, meetingDate: e.target.value }))}
            className="w-full h-11 px-3 rounded-lg border border-slate-500 text-base text-slate-900 bg-white"
          />
        </div>
        <div>
          <label htmlFor="doc-minutes-time" className="block text-sm font-medium text-slate-700 mb-1">
            Hora
          </label>
          <input
            id="doc-minutes-time"
            type="text"
            value={fields.meetingTime}
            onChange={(e) => setFields((p) => ({ ...p, meetingTime: e.target.value }))}
            className="w-full h-11 px-3 rounded-lg border border-slate-500 text-base text-slate-900 bg-white"
          />
        </div>
      </div>

      <div>
        <label htmlFor="doc-minutes-place" className="block text-sm font-medium text-slate-700 mb-1">
          Lugar de reunion
        </label>
        <input
          id="doc-minutes-place"
          type="text"
          value={fields.meetingPlace}
          onChange={(e) => setFields((p) => ({ ...p, meetingPlace: e.target.value }))}
          className="w-full h-11 px-3 rounded-lg border border-slate-500 text-base text-slate-900 bg-white"
        />
      </div>

      <div>
        <label htmlFor="doc-attendees" className="block text-sm font-medium text-slate-700 mb-1">
          Miembros presentes
        </label>
        <textarea
          id="doc-attendees"
          rows={2}
          value={fields.attendees}
          onChange={(e) => setFields((p) => ({ ...p, attendees: e.target.value }))}
          className="w-full p-3 rounded-lg border border-slate-500 text-base text-slate-900 bg-white"
        />
      </div>

      <div>
        <label htmlFor="doc-agenda" className="block text-sm font-medium text-slate-700 mb-1">
          Orden del dia
        </label>
        <textarea
          id="doc-agenda"
          rows={3}
          value={fields.agenda}
          onChange={(e) => setFields((p) => ({ ...p, agenda: e.target.value }))}
          className="w-full p-3 rounded-lg border border-slate-500 text-base text-slate-900 bg-white"
        />
      </div>

      <div>
        <label htmlFor="doc-resolutions" className="block text-sm font-medium text-slate-700 mb-1">
          Resoluciones / Acuerdos tomados
        </label>
        <textarea
          id="doc-resolutions"
          rows={3}
          value={fields.resolutions}
          onChange={(e) => setFields((p) => ({ ...p, resolutions: e.target.value }))}
          className="w-full p-3 rounded-lg border border-slate-500 text-base text-slate-900 bg-white"
        />
      </div>

      <div>
        <label htmlFor="doc-next-meeting" className="block text-sm font-medium text-slate-700 mb-1">
          Proxima fecha de reunion
        </label>
        <input
          id="doc-next-meeting"
          type="date"
          value={fields.nextMeetingDate}
          onChange={(e) => setFields((p) => ({ ...p, nextMeetingDate: e.target.value }))}
          className="w-full h-11 px-3 rounded-lg border border-slate-500 text-base text-slate-900 bg-white"
        />
      </div>
    </>
  );
}
