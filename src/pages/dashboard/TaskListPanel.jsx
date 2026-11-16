import { Calendar, CheckSquare, Edit3, Square, Trash2 } from 'lucide-react';
import { cleanUserText, formatDateAr, getDaysFromToday } from '../../utils/textSanitizer.js';
import {
  BRANCH_BADGE_STYLES,
  BRANCH_SHORT_LABELS,
  ROLE_LABELS
} from './dashboardConstants.js';

export default function TaskListPanel({
  tasks,
  onToggleStatus,
  onEditTask,
  onDeleteTask
}) {
  return (
    <div className="space-y-2.5">
      {tasks.length === 0 ? (
        <div className="p-6 text-center rounded-xl border border-dashed border-slate-300 bg-slate-50">
          <p className="text-sm font-medium text-slate-700">
            No hay tareas del Consejo registradas para este filtro.
          </p>
        </div>
      ) : (
        tasks.map((task) => {
          const isDone = task.status === 'completada';
          const daysToDue = getDaysFromToday(task.due_date);
          const isOverdue = !isDone && daysToDue !== null && daysToDue < 0;
          const branchKey = task.branch || 'jefatura';

          return (
            <div
              key={task.id}
              className={`min-h-[60px] p-3 rounded-xl border flex items-start justify-between gap-3 ${
                isDone ? 'bg-slate-50 border-slate-200' : 'bg-white border-slate-300'
              }`}
            >
              <div className="flex items-start gap-2.5 min-w-0 flex-1">
                <button
                  type="button"
                  onClick={() => onToggleStatus(task)}
                  aria-label={
                    isDone
                      ? `Marcar como pendiente: ${cleanUserText(task.title)}`
                      : `Marcar como completada: ${cleanUserText(task.title)}`
                  }
                  className="min-w-[44px] min-h-[44px] -ml-1 inline-flex items-center justify-center rounded-lg text-[var(--brand-primary)] hover:bg-slate-100 shrink-0"
                >
                  {isDone ? (
                    <CheckSquare className="w-5 h-5 text-green-700" aria-hidden="true" />
                  ) : (
                    <Square className="w-5 h-5" aria-hidden="true" />
                  )}
                </button>

                <div className="min-w-0 flex-1 pt-1">
                  <p
                    className={`text-sm font-semibold break-words ${
                      isDone ? 'line-through text-slate-500' : 'text-slate-900'
                    }`}
                  >
                    {cleanUserText(task.title)}
                  </p>
                  {task.description ? (
                    <p className="text-xs text-slate-600 mt-0.5 break-words">
                      {cleanUserText(task.description)}
                    </p>
                  ) : null}
                  <div className="flex flex-wrap items-center gap-2 mt-2">
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-xs font-semibold border ${
                        BRANCH_BADGE_STYLES[branchKey] || BRANCH_BADGE_STYLES.jefatura
                      }`}
                    >
                      {BRANCH_SHORT_LABELS[branchKey] || 'Adultos'}
                    </span>
                    <span className="text-xs font-medium text-slate-700">
                      {ROLE_LABELS[task.assigned_role] || task.assigned_role}
                    </span>
                    {task.due_date && (
                      <span
                        className={`inline-flex items-center gap-1 text-xs font-mono px-2 py-0.5 rounded-md ${
                          isOverdue
                            ? 'bg-red-100 text-red-900 font-semibold'
                            : 'bg-slate-100 text-slate-700'
                        }`}
                      >
                        <Calendar className="w-3.5 h-3.5" aria-hidden="true" />
                        <span>{formatDateAr(task.due_date)}</span>
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-1 shrink-0">
                <button
                  type="button"
                  onClick={() => onEditTask(task)}
                  aria-label={`Editar tarea ${cleanUserText(task.title)}`}
                  className="min-w-[44px] min-h-[44px] inline-flex items-center justify-center rounded-lg text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                >
                  <Edit3 className="w-4 h-4" aria-hidden="true" />
                </button>
                <button
                  type="button"
                  onClick={() => onDeleteTask(task.id)}
                  aria-label={`Eliminar tarea ${cleanUserText(task.title)}`}
                  className="min-w-[44px] min-h-[44px] inline-flex items-center justify-center rounded-lg text-red-700 hover:bg-red-50"
                >
                  <Trash2 className="w-4 h-4" aria-hidden="true" />
                </button>
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}
