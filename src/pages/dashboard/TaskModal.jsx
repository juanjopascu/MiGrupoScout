import { X } from 'lucide-react';
import { ALLOWED_ASSIGNED_ROLES } from '../../domain/validators.js';
import { ROLE_LABELS } from './dashboardConstants.js';

export default function TaskModal({
  isOpen,
  editingTask,
  taskForm,
  setTaskForm,
  taskErrors,
  onClose,
  onSubmit
}) {
  if (!isOpen) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-900/50 p-0 sm:p-4"
      role="presentation"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="task-modal-title"
        className="w-full sm:max-w-lg bg-white border border-slate-300 rounded-t-2xl sm:rounded-2xl shadow-lg p-5 space-y-4 max-h-[90dvh] overflow-y-auto pb-safe-bottom"
      >
        <div className="flex items-center justify-between">
          <h2 id="task-modal-title" className="text-lg font-semibold text-slate-900">
            {editingTask ? 'Editar tarea del Consejo' : 'Nueva tarea del Consejo'}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar formulario de tarea"
            className="min-w-[44px] min-h-[44px] inline-flex items-center justify-center rounded-lg text-slate-600 hover:bg-slate-100"
          >
            <X className="w-5 h-5" aria-hidden="true" />
          </button>
        </div>

        <form onSubmit={onSubmit} className="space-y-3.5">
          <div>
            <label htmlFor="task-title" className="block text-sm font-medium text-slate-700 mb-1">
              Titulo de la tarea
            </label>
            <input
              id="task-title"
              type="text"
              required
              value={taskForm.title}
              onChange={(e) => setTaskForm((p) => ({ ...p, title: e.target.value }))}
              placeholder="Ej. Presentar carpeta distrital"
              className="w-full h-11 px-3 rounded-lg border border-slate-500 text-base text-slate-900 bg-white"
            />
            {taskErrors.title && (
              <p className="text-xs text-red-700 mt-1">{taskErrors.title}</p>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label htmlFor="task-branch" className="block text-sm font-medium text-slate-700 mb-1">
                Rama / Area
              </label>
              <select
                id="task-branch"
                value={taskForm.branch}
                onChange={(e) => setTaskForm((p) => ({ ...p, branch: e.target.value }))}
                className="w-full h-11 px-3 rounded-lg border border-slate-500 text-base text-slate-900 bg-white"
              >
                <option value="jefatura">Adultos / Jefatura</option>
                <option value="manada">Manada</option>
                <option value="unidad">Unidad Scout</option>
                <option value="caminantes">Caminantes</option>
                <option value="rovers">Rovers</option>
              </select>
            </div>

            <div>
              <label htmlFor="task-role" className="block text-sm font-medium text-slate-700 mb-1">
                Responsable
              </label>
              <select
                id="task-role"
                value={taskForm.assigned_role}
                onChange={(e) => setTaskForm((p) => ({ ...p, assigned_role: e.target.value }))}
                className="w-full h-11 px-3 rounded-lg border border-slate-500 text-base text-slate-900 bg-white"
              >
                {ALLOWED_ASSIGNED_ROLES.map((role) => (
                  <option key={role} value={role}>
                    {ROLE_LABELS[role] || role}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label htmlFor="task-due" className="block text-sm font-medium text-slate-700 mb-1">
                Fecha limite
              </label>
              <input
                id="task-due"
                type="date"
                value={taskForm.due_date}
                onChange={(e) => setTaskForm((p) => ({ ...p, due_date: e.target.value }))}
                className="w-full h-11 px-3 rounded-lg border border-slate-500 text-base text-slate-900 bg-white"
              />
            </div>

            <div>
              <label htmlFor="task-ref" className="block text-sm font-medium text-slate-700 mb-1">
                Referencia de Acta
              </label>
              <input
                id="task-ref"
                type="text"
                value={taskForm.minutes_reference}
                onChange={(e) =>
                  setTaskForm((p) => ({ ...p, minutes_reference: e.target.value }))
                }
                placeholder="Acta 15/2026"
                className="w-full h-11 px-3 rounded-lg border border-slate-500 text-base text-slate-900 bg-white"
              />
            </div>
          </div>

          <div>
            <label htmlFor="task-desc" className="block text-sm font-medium text-slate-700 mb-1">
              Detalle operativo (opcional)
            </label>
            <textarea
              id="task-desc"
              rows={2}
              value={taskForm.description}
              onChange={(e) => setTaskForm((p) => ({ ...p, description: e.target.value }))}
              className="w-full p-3 rounded-lg border border-slate-500 text-base text-slate-900 bg-white"
            />
          </div>

          <button
            type="submit"
            className="w-full h-12 bg-[var(--brand-primary)] hover:bg-[var(--brand-primary-hover)] text-white font-semibold rounded-lg transition-colors"
          >
            {editingTask ? 'Guardar cambios' : 'Crear tarea'}
          </button>
        </form>
      </div>
    </div>
  );
}
