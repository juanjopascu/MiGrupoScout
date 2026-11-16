import { X } from 'lucide-react';
import {
  ALLOWED_CRUZ_DEL_SUR_STATUS,
  ALLOWED_MEMBER_TYPES,
  ALLOWED_SAFE_FROM_HARM_STATUS
} from '../../domain/validators.js';

export default function MemberModal({
  isOpen,
  editingMember,
  memberForm,
  setMemberForm,
  memberErrors,
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
        aria-labelledby="member-modal-title"
        className="w-full sm:max-w-lg bg-white border border-slate-300 rounded-t-2xl sm:rounded-2xl shadow-lg p-5 space-y-4 max-h-[90dvh] overflow-y-auto pb-safe-bottom"
      >
        <div className="flex items-center justify-between">
          <h2 id="member-modal-title" className="text-lg font-semibold text-slate-900">
            {editingMember ? 'Editar integrante' : 'Agregar integrante'}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar formulario de miembro"
            className="min-w-[44px] min-h-[44px] inline-flex items-center justify-center rounded-lg text-slate-600 hover:bg-slate-100"
          >
            <X className="w-5 h-5" aria-hidden="true" />
          </button>
        </div>

        <form onSubmit={onSubmit} className="space-y-3.5">
          <div>
            <label htmlFor="member-name" className="block text-sm font-medium text-slate-700 mb-1">
              Nombre y apellido
            </label>
            <input
              id="member-name"
              type="text"
              required
              value={memberForm.full_name}
              onChange={(e) => setMemberForm((p) => ({ ...p, full_name: e.target.value }))}
              className="w-full h-11 px-3 rounded-lg border border-slate-500 text-base text-slate-900 bg-white"
            />
            {memberErrors.full_name && (
              <p className="text-xs text-red-700 mt-1">{memberErrors.full_name}</p>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label htmlFor="member-type" className="block text-sm font-medium text-slate-700 mb-1">
                Estamento
              </label>
              <select
                id="member-type"
                value={memberForm.member_type}
                onChange={(e) =>
                  setMemberForm((p) => ({
                    ...p,
                    member_type: e.target.value,
                    safe_from_harm_status:
                      e.target.value === 'beneficiario' ? 'no_aplica' : 'pendiente'
                  }))
                }
                className="w-full h-11 px-3 rounded-lg border border-slate-500 text-base text-slate-900 bg-white"
              >
                {ALLOWED_MEMBER_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {type === 'beneficiario'
                      ? 'Beneficiario'
                      : type === 'educador'
                      ? 'Educador'
                      : 'Colaborador'}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="member-branch" className="block text-sm font-medium text-slate-700 mb-1">
                Rama
              </label>
              <select
                id="member-branch"
                value={memberForm.branch}
                onChange={(e) => setMemberForm((p) => ({ ...p, branch: e.target.value }))}
                className="w-full h-11 px-3 rounded-lg border border-slate-500 text-base text-slate-900 bg-white"
              >
                <option value="manada">Manada</option>
                <option value="unidad">Unidad Scout</option>
                <option value="caminantes">Caminantes</option>
                <option value="rovers">Rovers</option>
                <option value="jefatura">Jefatura / Adultos</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label htmlFor="member-cruz" className="block text-sm font-medium text-slate-700 mb-1">
                Afiliacion Cruz del Sur
              </label>
              <select
                id="member-cruz"
                value={memberForm.cruz_del_sur_status}
                onChange={(e) =>
                  setMemberForm((p) => ({ ...p, cruz_del_sur_status: e.target.value }))
                }
                className="w-full h-11 px-3 rounded-lg border border-slate-500 text-base text-slate-900 bg-white"
              >
                {ALLOWED_CRUZ_DEL_SUR_STATUS.map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="member-med" className="block text-sm font-medium text-slate-700 mb-1">
                Vencimiento Ficha Medica
              </label>
              <input
                id="member-med"
                type="date"
                value={memberForm.medical_form_expires_at}
                onChange={(e) =>
                  setMemberForm((p) => ({ ...p, medical_form_expires_at: e.target.value }))
                }
                className="w-full h-11 px-3 rounded-lg border border-slate-500 text-base text-slate-900 bg-white"
              />
              {memberErrors.medical_form_expires_at && (
                <p className="text-xs text-red-700 mt-1">
                  {memberErrors.medical_form_expires_at}
                </p>
              )}
            </div>
          </div>

          {memberForm.member_type !== 'beneficiario' && (
            <div>
              <label htmlFor="member-sfh" className="block text-sm font-medium text-slate-700 mb-1">
                Curso A Salvo del Peligro
              </label>
              <select
                id="member-sfh"
                value={memberForm.safe_from_harm_status}
                onChange={(e) =>
                  setMemberForm((p) => ({ ...p, safe_from_harm_status: e.target.value }))
                }
                className="w-full h-11 px-3 rounded-lg border border-slate-500 text-base text-slate-900 bg-white"
              >
                {ALLOWED_SAFE_FROM_HARM_STATUS.map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </select>
            </div>
          )}

          <button
            type="submit"
            className="w-full h-12 bg-[var(--brand-primary)] hover:bg-[var(--brand-primary-hover)] text-white font-semibold rounded-lg transition-colors"
          >
            {editingMember ? 'Guardar cambios' : 'Guardar integrante'}
          </button>
        </form>
      </div>
    </div>
  );
}
