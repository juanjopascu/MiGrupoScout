import { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, Trash2 } from 'lucide-react';
import { canDeleteTenant } from '../domain/roles.js';
import { deleteScoutGroupTenant } from '../services/tenantService.js';
import { cleanUserText } from '../utils/textSanitizer.js';

export default function DeleteTenantCard({
  memberships = [],
  activeGroupId,
  onTenantDeleted
}) {
  const ownedTenants = useMemo(
    () =>
      (memberships || []).filter(
        (m) => canDeleteTenant(m.role) && m.scout_groups && m.group_id
      ),
    [memberships]
  );

  const [selectedGroupId, setSelectedGroupId] = useState('');
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmNumber, setConfirmNumber] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const activeOwned = ownedTenants.find((m) => m.group_id === activeGroupId);
    setSelectedGroupId(activeOwned?.group_id || ownedTenants[0]?.group_id || '');
    setConfirmOpen(false);
    setConfirmNumber('');
    setError('');
  }, [activeGroupId, ownedTenants]);

  if (ownedTenants.length === 0) {
    return null;
  }

  const selectedMembership =
    ownedTenants.find((m) => m.group_id === selectedGroupId) || ownedTenants[0];
  const targetGroup = selectedMembership?.scout_groups;

  async function handleConfirmDelete(event) {
    event.preventDefault();
    if (!selectedMembership || deleting) {
      return;
    }
    setError('');
    setDeleting(true);
    try {
      const result = await deleteScoutGroupTenant({
        groupId: selectedMembership.group_id,
        confirmNumber
      });
      if (!result.ok) {
        setError(result.error || 'No se pudo eliminar el tenant.');
        return;
      }
      setConfirmOpen(false);
      setConfirmNumber('');
      await onTenantDeleted?.(selectedMembership.group_id);
    } finally {
      setDeleting(false);
    }
  }

  return (
    <section className="pt-4 border-t border-slate-200 space-y-3">
      <div className="rounded-xl border border-red-300 bg-red-50/70 p-4 space-y-3">
        <div className="flex items-start gap-2.5 text-red-900">
          <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" aria-hidden="true" />
          <div className="space-y-1">
            <h3 className="text-sm font-bold">
              Eliminar Grupo Scout (Tenant)
            </h3>
            <p className="text-xs text-red-900/90 leading-relaxed">
              Esta accion borra de forma permanente el Grupo seleccionado junto con su nomina, salidas, actas, equipo e invitaciones. Solo disponible para el Jefe de Grupo titular.
            </p>
          </div>
        </div>

        {ownedTenants.length > 1 && (
          <div>
            <label
              htmlFor="delete-tenant-select"
              className="block text-xs font-semibold text-red-900 mb-1"
            >
              Seleccionar tenant a eliminar
            </label>
            <select
              id="delete-tenant-select"
              value={selectedGroupId}
              onChange={(e) => {
                setSelectedGroupId(e.target.value);
                setConfirmOpen(false);
                setConfirmNumber('');
                setError('');
              }}
              className="w-full h-10 px-3 rounded-lg border border-red-300 text-sm text-slate-900 bg-white"
            >
              {ownedTenants.map((m) => (
                <option key={m.group_id} value={m.group_id}>
                  Grupo Nro. {m.scout_groups.number} - {cleanUserText(m.scout_groups.name)}
                </option>
              ))}
            </select>
          </div>
        )}

        {!confirmOpen ? (
          <button
            type="button"
            onClick={() => {
              setConfirmOpen(true);
              setError('');
            }}
            className="w-full h-11 rounded-lg border border-red-700 bg-white hover:bg-red-100 text-red-900 text-sm font-semibold inline-flex items-center justify-center gap-2 transition-colors"
          >
            <Trash2 className="w-4 h-4" aria-hidden="true" />
            <span>
              Eliminar Grupo Nro. {targetGroup?.number} ({cleanUserText(targetGroup?.name || '')})
            </span>
          </button>
        ) : (
          <form onSubmit={handleConfirmDelete} className="space-y-3 bg-white border border-red-300 rounded-xl p-3.5">
            <div>
              <label
                htmlFor="confirm-delete-tenant-number"
                className="block text-xs font-semibold text-slate-900 mb-1"
              >
                Escribi el numero <span className="font-mono">{targetGroup?.number}</span> para confirmar
              </label>
              <input
                id="confirm-delete-tenant-number"
                type="number"
                min={1}
                required
                value={confirmNumber}
                onChange={(e) => setConfirmNumber(e.target.value)}
                placeholder={String(targetGroup?.number || '')}
                className="w-full h-11 px-3 rounded-lg border border-red-400 text-base font-mono text-slate-900 bg-white"
              />
            </div>

            {error && (
              <p role="alert" className="text-xs font-semibold text-red-900 bg-red-100 border border-red-300 rounded-lg p-2">
                {error}
              </p>
            )}

            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                disabled={deleting}
                onClick={() => {
                  setConfirmOpen(false);
                  setConfirmNumber('');
                  setError('');
                }}
                className="h-10 rounded-lg border border-slate-300 bg-slate-50 hover:bg-slate-100 text-slate-800 text-xs sm:text-sm font-semibold"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={deleting || String(confirmNumber).trim() !== String(targetGroup?.number || '')}
                className="h-10 rounded-lg bg-red-700 hover:bg-red-800 text-white text-xs sm:text-sm font-semibold inline-flex items-center justify-center gap-1.5 disabled:opacity-50"
              >
                <Trash2 className="w-4 h-4" aria-hidden="true" />
                <span>{deleting ? 'Eliminando...' : 'Confirmar borrado'}</span>
              </button>
            </div>
          </form>
        )}
      </div>
    </section>
  );
}
