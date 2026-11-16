import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  Building2,
  Edit3,
  LogIn,
  Plus,
  RefreshCw,
  Search,
  ShieldCheck,
  Trash2,
  UserPlus,
  Users,
  X
} from 'lucide-react';
import {
  ASSIGNABLE_TEAM_BRANCHES,
  GROUP_ROLES,
  getRoleLabel
} from '../domain/roles.js';
import { BRANCHES } from '../domain/saacRulesConstants.js';
import {
  adminAssignTenantLeader,
  adminListAllTenants,
  adminUpdateTenant,
  createScoutGroupTenant,
  deleteScoutGroupTenant
} from '../services/tenantService.js';
import GroupLogoBadge from './GroupLogoBadge.jsx';

const ORG_MODELS = [
  { id: 'tradicional', label: 'Tradicional' },
  { id: 'nucleo', label: 'Nucleo' },
  { id: 'comunitario', label: 'Comunitario' },
  { id: 'escolar', label: 'Escolar' }
];

export function PlatformAdminModal({
  isOpen,
  onClose,
  activeGroupId,
  session,
  onEnterTenant,
  onTenantChanged,
  onTenantDeleted
}) {
  const [tenants, setTenants] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [feedback, setFeedback] = useState(null);

  const [showCreateForm, setShowCreateForm] = useState(false);
  const [createForm, setCreateForm] = useState({
    number: '',
    name: '',
    district: '',
    zone: '',
    org_model: 'tradicional'
  });

  const [editingGroupId, setEditingGroupId] = useState(null);
  const [editForm, setEditForm] = useState({
    number: '',
    name: '',
    district: '',
    zone: '',
    org_model: 'tradicional'
  });

  const [assignGroupId, setAssignGroupId] = useState(null);
  const [assignForm, setAssignForm] = useState({
    targetEmail: '',
    role: 'jefe_grupo',
    branch: 'jefatura'
  });

  const [deleteTargetId, setDeleteTargetId] = useState(null);
  const [deleteConfirmNumber, setDeleteConfirmNumber] = useState('');
  const [busyKey, setBusyKey] = useState(null);

  const loadTenants = useCallback(async () => {
    setLoading(true);
    const res = await adminListAllTenants();
    if (!res.ok) {
      setFeedback({ type: 'error', text: res.error });
    } else {
      setTenants(res.tenants);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    setFeedback(null);
    setEditingGroupId(null);
    setAssignGroupId(null);
    setDeleteTargetId(null);
    setDeleteConfirmNumber('');
    void loadTenants();
  }, [isOpen, loadTenants]);

  const nextSuggestedNumber = useMemo(() => {
    if (tenants.length === 0) return 1;
    const maxNum = tenants.reduce((acc, t) => Math.max(acc, Number(t.number) || 0), 0);
    return maxNum + 1;
  }, [tenants]);

  const filteredTenants = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return tenants;
    return tenants.filter((t) =>
      [t.number, t.name, t.district, t.zone, t.jefe_name, t.jefe_email]
        .filter(Boolean)
        .some((val) => String(val).toLowerCase().includes(q))
    );
  }, [search, tenants]);

  const createNumberConflict = useMemo(() => {
    const num = Number.parseInt(createForm.number, 10);
    if (!Number.isInteger(num) || num <= 0) return null;
    return tenants.find((t) => Number(t.number) === num) || null;
  }, [createForm.number, tenants]);

  if (!isOpen) return null;

  const handleCreateTenant = async (e) => {
    e.preventDefault();
    setBusyKey('create');
    setFeedback(null);

    const res = await createScoutGroupTenant({
      ...createForm,
      display_name: session?.user?.user_metadata?.full_name || 'Administrador Global'
    });

    setBusyKey(null);
    if (!res.ok) {
      setFeedback({ type: 'error', text: res.error });
      return;
    }

    setCreateForm({ number: '', name: '', district: '', zone: '', org_model: 'tradicional' });
    setShowCreateForm(false);
    setFeedback({
      type: 'success',
      text: `Grupo #${res.group.number} - ${res.group.name} creado correctamente.`
    });
    await loadTenants();
    if (onTenantChanged) {
      await onTenantChanged(res.group.id);
    }
  };

  const handleSaveEdit = async (e, groupId) => {
    e.preventDefault();
    setBusyKey(`edit:${groupId}`);
    setFeedback(null);

    const res = await adminUpdateTenant(groupId, editForm);
    setBusyKey(null);
    if (!res.ok) {
      setFeedback({ type: 'error', text: res.error });
      return;
    }

    setEditingGroupId(null);
    setFeedback({
      type: 'success',
      text: `Grupo #${res.group.number} - ${res.group.name} actualizado.`
    });
    await loadTenants();
    if (groupId === activeGroupId && onTenantChanged) {
      await onTenantChanged(groupId);
    }
  };

  const handleAssignLeader = async (e, groupId) => {
    e.preventDefault();
    setBusyKey(`assign:${groupId}`);
    setFeedback(null);

    const res = await adminAssignTenantLeader({
      groupId,
      targetEmail: assignForm.targetEmail,
      role: assignForm.role,
      branch: assignForm.branch
    });

    setBusyKey(null);
    if (!res.ok) {
      setFeedback({ type: 'error', text: res.error });
      return;
    }

    setAssignGroupId(null);
    setAssignForm({ targetEmail: '', role: 'jefe_grupo', branch: 'jefatura' });
    setFeedback({
      type: 'success',
      text: `Se asigno el rol ${getRoleLabel(res.assignment.role)} a ${res.assignment.email}.`
    });
    await loadTenants();
  };

  const handleDeleteTenant = async (e, tenant) => {
    e.preventDefault();
    setBusyKey(`delete:${tenant.id}`);
    setFeedback(null);

    const res = await deleteScoutGroupTenant({
      groupId: tenant.id,
      confirmNumber: deleteConfirmNumber
    });

    setBusyKey(null);
    if (!res.ok) {
      setFeedback({ type: 'error', text: res.error });
      return;
    }

    setDeleteTargetId(null);
    setDeleteConfirmNumber('');
    setFeedback({
      type: 'success',
      text: `Grupo #${tenant.number} - ${tenant.name} eliminado definitivamente.`
    });
    await loadTenants();
    if (onTenantDeleted) {
      await onTenantDeleted(tenant.id);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-sm p-3 sm:p-4">
      <div className="bg-white w-full max-w-4xl max-h-[92vh] rounded-2xl shadow-2xl border border-slate-200 flex flex-col overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-200 flex items-start justify-between gap-3 bg-slate-50">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-[var(--brand-primary)] text-white flex items-center justify-center shrink-0">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-extrabold text-slate-900">
                Administracion Global de Grupos Scout
              </h2>
              <p className="text-xs text-slate-600 mt-0.5">
                Supervisa numeros de Grupo para evitar superposiciones, interviene si un Jefe no puede operar o reasigna responsables.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-200 hover:text-slate-800 transition-colors"
            aria-label="Cerrar panel de administracion global"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="px-5 py-3 border-b border-slate-100 bg-white flex flex-wrap items-center justify-between gap-2.5">
          <div className="relative flex-1 min-w-[220px]">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por numero, nombre, distrito, zona o Jefatura..."
              className="w-full pl-9 pr-3 py-2 text-xs sm:text-sm rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary)]"
            />
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => void loadTenants()}
              disabled={loading}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-slate-300 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              Actualizar
            </button>
            <button
              type="button"
              onClick={() => {
                setShowCreateForm((prev) => !prev);
                setCreateForm((prev) => ({
                  ...prev,
                  number: prev.number || String(nextSuggestedNumber)
                }));
              }}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-[var(--brand-primary)] hover:bg-[var(--brand-primary-hover)] text-white text-xs font-semibold transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              Nuevo Grupo
            </button>
          </div>
        </div>

        <div className="p-5 overflow-y-auto space-y-4 flex-1 bg-slate-50/50">
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-600 bg-white border border-slate-200 rounded-xl px-3.5 py-2.5">
            <span>
              Total registrados: <strong className="text-slate-900">{tenants.length}</strong> Grupo(s)
            </span>
            <span>
              Siguiente numero libre sugerido: <strong className="text-[var(--brand-primary)]">#{nextSuggestedNumber}</strong>
            </span>
          </div>

          {feedback && (
            <div
              className={`rounded-xl px-3.5 py-2.5 text-xs font-medium border ${
                feedback.type === 'error'
                  ? 'bg-red-50 text-red-700 border-red-200'
                  : 'bg-emerald-50 text-emerald-700 border-emerald-200'
              }`}
            >
              {feedback.text}
            </div>
          )}

          {showCreateForm && (
            <form
              onSubmit={handleCreateTenant}
              className="bg-white border border-slate-200 rounded-xl p-4 space-y-3 shadow-sm"
            >
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-900">Registrar nuevo Grupo Scout</h3>
                <button
                  type="button"
                  onClick={() => setShowCreateForm(false)}
                  className="text-xs text-slate-500 hover:text-slate-800"
                >
                  Cancelar
                </button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                    Numero de Grupo
                  </label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={createForm.number}
                    onChange={(e) => setCreateForm((p) => ({ ...p, number: e.target.value }))}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300"
                  />
                  {createNumberConflict && (
                    <p className="text-[11px] text-red-600 mt-1 font-medium">
                      Superposicion detectada: #{createNumberConflict.number} ya pertenece a {createNumberConflict.name}.
                    </p>
                  )}
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                    Nombre oficial
                  </label>
                  <input
                    type="text"
                    required
                    value={createForm.name}
                    onChange={(e) => setCreateForm((p) => ({ ...p, name: e.target.value }))}
                    placeholder="Ej. Grupo Scout San Ignacio"
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                    Distrito
                  </label>
                  <input
                    type="text"
                    required
                    value={createForm.district}
                    onChange={(e) => setCreateForm((p) => ({ ...p, district: e.target.value }))}
                    placeholder="Ej. Distrito 1"
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                    Zona
                  </label>
                  <input
                    type="text"
                    required
                    value={createForm.zone}
                    onChange={(e) => setCreateForm((p) => ({ ...p, zone: e.target.value }))}
                    placeholder="Ej. Zona 12"
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                    Modalidad
                  </label>
                  <select
                    value={createForm.org_model}
                    onChange={(e) => setCreateForm((p) => ({ ...p, org_model: e.target.value }))}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 bg-white"
                  >
                    {ORG_MODELS.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={busyKey === 'create' || Boolean(createNumberConflict)}
                  className="px-4 py-2 rounded-lg bg-[var(--brand-primary)] hover:bg-[var(--brand-primary-hover)] text-white text-xs font-semibold disabled:opacity-50"
                >
                  {busyKey === 'create' ? 'Creando...' : 'Crear Grupo'}
                </button>
              </div>
            </form>
          )}

          {loading && tenants.length === 0 ? (
            <div className="bg-white border border-slate-200 rounded-xl p-8 text-center text-xs text-slate-500">
              Cargando directorio de Grupos Scout...
            </div>
          ) : filteredTenants.length === 0 ? (
            <div className="bg-white border border-slate-200 rounded-xl p-8 text-center text-xs text-slate-500">
              <Building2 className="w-7 h-7 mx-auto mb-2 text-slate-400" />
              No se encontraron Grupos Scout con ese criterio.
            </div>
          ) : (
            <div className="space-y-3">
              {filteredTenants.map((tenant) => {
                const isCurrent = tenant.id === activeGroupId;
                const isEditing = editingGroupId === tenant.id;
                const isAssigning = assignGroupId === tenant.id;
                const isDeleting = deleteTargetId === tenant.id;

                return (
                  <div
                    key={tenant.id}
                    className={`bg-white rounded-xl border p-4 space-y-3 shadow-sm ${
                      isCurrent ? 'border-[var(--brand-primary)] ring-1 ring-[var(--brand-primary)]/20' : 'border-slate-200'
                    }`}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="flex items-start gap-3 min-w-0">
                        <GroupLogoBadge
                          logoUrl={tenant.logo_url}
                          primaryColor={tenant.primary_color}
                          sizeClass="w-10 h-10"
                          iconClass="w-5 h-5"
                        />
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="text-sm font-extrabold text-slate-900">
                              #{tenant.number} - {tenant.name}
                            </span>
                            {isCurrent && (
                              <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-[var(--brand-primary-soft)] text-[var(--brand-primary)]">
                                Activo ahora
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-slate-600 mt-0.5">
                            {tenant.district} / {tenant.zone} - Modalidad: {tenant.org_model}
                          </p>
                          <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-500 mt-1">
                            <span>
                              Jefe de Grupo:{' '}
                              <strong className="text-slate-700">
                                {tenant.jefe_name || tenant.jefe_email || 'Sin asignar'}
                              </strong>
                              {tenant.jefe_email && tenant.jefe_name ? ` (${tenant.jefe_email})` : ''}
                            </span>
                            <span className="inline-flex items-center gap-1">
                              <Users className="w-3 h-3" />
                              {tenant.team_count ?? 0} dirigente(s)
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-1.5 shrink-0">
                        <button
                          type="button"
                          onClick={() => onEnterTenant(tenant.id)}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-[var(--brand-primary)] hover:bg-[var(--brand-primary-hover)] text-white text-xs font-semibold transition-colors"
                        >
                          <LogIn className="w-3.5 h-3.5" />
                          Entrar
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setEditingGroupId(isEditing ? null : tenant.id);
                            setAssignGroupId(null);
                            setDeleteTargetId(null);
                            setEditForm({
                              number: String(tenant.number),
                              name: tenant.name,
                              district: tenant.district,
                              zone: tenant.zone,
                              org_model: tenant.org_model || 'tradicional'
                            });
                          }}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-300 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                          Editar
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setAssignGroupId(isAssigning ? null : tenant.id);
                            setEditingGroupId(null);
                            setDeleteTargetId(null);
                            setAssignForm({
                              targetEmail: '',
                              role: 'jefe_grupo',
                              branch: 'jefatura'
                            });
                          }}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-300 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                        >
                          <UserPlus className="w-3.5 h-3.5" />
                          Asignar Jefe
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setDeleteTargetId(isDeleting ? null : tenant.id);
                            setEditingGroupId(null);
                            setAssignGroupId(null);
                            setDeleteConfirmNumber('');
                          }}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-red-200 text-xs font-semibold text-red-700 hover:bg-red-50"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          Eliminar
                        </button>
                      </div>
                    </div>

                    {isEditing && (
                      <form
                        onSubmit={(e) => handleSaveEdit(e, tenant.id)}
                        className="pt-3 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-2 gap-2.5"
                      >
                        <input
                          type="number"
                          min="1"
                          required
                          value={editForm.number}
                          onChange={(e) => setEditForm((p) => ({ ...p, number: e.target.value }))}
                          placeholder="Numero de Grupo"
                          className="px-3 py-1.5 text-xs rounded-lg border border-slate-300"
                        />
                        <input
                          type="text"
                          required
                          value={editForm.name}
                          onChange={(e) => setEditForm((p) => ({ ...p, name: e.target.value }))}
                          placeholder="Nombre oficial"
                          className="px-3 py-1.5 text-xs rounded-lg border border-slate-300"
                        />
                        <input
                          type="text"
                          required
                          value={editForm.district}
                          onChange={(e) => setEditForm((p) => ({ ...p, district: e.target.value }))}
                          placeholder="Distrito"
                          className="px-3 py-1.5 text-xs rounded-lg border border-slate-300"
                        />
                        <input
                          type="text"
                          required
                          value={editForm.zone}
                          onChange={(e) => setEditForm((p) => ({ ...p, zone: e.target.value }))}
                          placeholder="Zona"
                          className="px-3 py-1.5 text-xs rounded-lg border border-slate-300"
                        />
                        <select
                          value={editForm.org_model}
                          onChange={(e) => setEditForm((p) => ({ ...p, org_model: e.target.value }))}
                          className="px-3 py-1.5 text-xs rounded-lg border border-slate-300 bg-white"
                        >
                          {ORG_MODELS.map((m) => (
                            <option key={m.id} value={m.id}>
                              {m.label}
                            </option>
                          ))}
                        </select>
                        <div className="flex justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => setEditingGroupId(null)}
                            className="px-3 py-1.5 text-xs rounded-lg border border-slate-300 text-slate-600"
                          >
                            Cancelar
                          </button>
                          <button
                            type="submit"
                            disabled={busyKey === `edit:${tenant.id}`}
                            className="px-3 py-1.5 text-xs rounded-lg bg-[var(--brand-primary)] text-white font-semibold disabled:opacity-50"
                          >
                            {busyKey === `edit:${tenant.id}` ? 'Guardando...' : 'Guardar cambios'}
                          </button>
                        </div>
                      </form>
                    )}

                    {isAssigning && (
                      <form
                        onSubmit={(e) => handleAssignLeader(e, tenant.id)}
                        className="pt-3 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-3 gap-2.5"
                      >
                        <input
                          type="email"
                          required
                          value={assignForm.targetEmail}
                          onChange={(e) =>
                            setAssignForm((p) => ({ ...p, targetEmail: e.target.value }))
                          }
                          placeholder="Correo de usuario registrado"
                          className="px-3 py-1.5 text-xs rounded-lg border border-slate-300"
                        />
                        <select
                          value={assignForm.role}
                          onChange={(e) => setAssignForm((p) => ({ ...p, role: e.target.value }))}
                          className="px-3 py-1.5 text-xs rounded-lg border border-slate-300 bg-white"
                        >
                          {GROUP_ROLES.map((r) => (
                            <option key={r} value={r}>
                              {getRoleLabel(r)}
                            </option>
                          ))}
                        </select>
                        <select
                          value={assignForm.branch}
                          onChange={(e) => setAssignForm((p) => ({ ...p, branch: e.target.value }))}
                          className="px-3 py-1.5 text-xs rounded-lg border border-slate-300 bg-white"
                        >
                          {ASSIGNABLE_TEAM_BRANCHES.map((b) => (
                            <option key={b} value={b}>
                              {BRANCHES[b]?.label || 'Jefatura de Grupo'}
                            </option>
                          ))}
                        </select>
                        <div className="sm:col-span-3 flex items-center justify-between gap-2">
                          <span className="text-[11px] text-slate-500">
                            El dirigente debe tener una cuenta creada en la app.
                          </span>
                          <div className="flex gap-2">
                            <button
                              type="button"
                              onClick={() => setAssignGroupId(null)}
                              className="px-3 py-1.5 text-xs rounded-lg border border-slate-300 text-slate-600"
                            >
                              Cancelar
                            </button>
                            <button
                              type="submit"
                              disabled={busyKey === `assign:${tenant.id}`}
                              className="px-3 py-1.5 text-xs rounded-lg bg-[var(--brand-primary)] text-white font-semibold disabled:opacity-50"
                            >
                              {busyKey === `assign:${tenant.id}` ? 'Asignando...' : 'Confirmar asignacion'}
                            </button>
                          </div>
                        </div>
                      </form>
                    )}

                    {isDeleting && (
                      <form
                        onSubmit={(e) => handleDeleteTenant(e, tenant)}
                        className="pt-3 border-t border-red-200 bg-red-50/70 rounded-lg p-3 space-y-2"
                      >
                        <div className="flex items-start gap-2 text-xs text-red-800">
                          <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-red-600" />
                          <span>
                            Accion irreversible. Escribe <strong>{tenant.number}</strong> para eliminar #{tenant.number} - {tenant.name} y todos sus registros.
                          </span>
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                          <input
                            type="text"
                            inputMode="numeric"
                            required
                            value={deleteConfirmNumber}
                            onChange={(e) => setDeleteConfirmNumber(e.target.value)}
                            placeholder={`Numero ${tenant.number}`}
                            className="px-3 py-1.5 text-xs rounded-lg border border-red-300 bg-white w-36"
                          />
                          <button
                            type="submit"
                            disabled={
                              busyKey === `delete:${tenant.id}` ||
                              Number.parseInt(deleteConfirmNumber, 10) !== Number(tenant.number)
                            }
                            className="px-3 py-1.5 text-xs rounded-lg bg-red-600 hover:bg-red-700 text-white font-semibold disabled:opacity-50"
                          >
                            {busyKey === `delete:${tenant.id}` ? 'Eliminando...' : 'Eliminar definitivamente'}
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setDeleteTargetId(null);
                              setDeleteConfirmNumber('');
                            }}
                            className="px-3 py-1.5 text-xs rounded-lg border border-slate-300 bg-white text-slate-600"
                          >
                            Cancelar
                          </button>
                        </div>
                      </form>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
