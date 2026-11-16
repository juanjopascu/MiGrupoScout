import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  Check,
  CheckCircle2,
  Copy,
  KeyRound,
  Link2,
  Loader2,
  Search,
  Shield,
  Trash2,
  UserPlus,
  Users,
  X
} from 'lucide-react';
import {
  ASSIGNABLE_TEAM_BRANCHES,
  GROUP_ROLES,
  INVITABLE_ROLES,
  buildInvitationShareText,
  buildInvitationUrl,
  canInviteTargetRole,
  canManageInvitations,
  canManageTeamRoles,
  getRoleLabel
} from '../domain/roles.js';
import { BRANCHES } from '../domain/saacRulesConstants.js';
import {
  createGroupInvitation,
  listGroupInvitations,
  listGroupTeamMembers,
  removeTeamMember,
  revokeGroupInvitation,
  updateTeamMemberRole
} from '../services/tenantService.js';
import { cleanUserText, formatDateAr } from '../utils/textSanitizer.js';

export default function TeamManagementModal({
  isOpen,
  onClose,
  groupId,
  groupProfile,
  userRole,
  currentUserId,
  isDemoMode
}) {
  const [activeTab, setActiveTab] = useState('team');
  const [teamMembers, setTeamMembers] = useState([]);
  const [invitations, setInvitations] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState(null);
  const [copiedId, setCopiedId] = useState('');

  const [inviteForm, setInviteForm] = useState({
    role: 'educador',
    branch: 'manada',
    invitedEmail: '',
    invitedName: '',
    maxUses: 1,
    expiresDays: 14
  });
  const [creatingInvite, setCreatingInvite] = useState(false);

  const canInvite = canManageInvitations(userRole) && !isDemoMode;
  const canEditRoles = canManageTeamRoles(userRole) && !isDemoMode;

  const allowedInviteRoles = useMemo(
    () => INVITABLE_ROLES.filter((role) => canInviteTargetRole(userRole, role)),
    [userRole]
  );

  const loadData = useCallback(async () => {
    if (!groupId || isDemoMode) {
      setTeamMembers([]);
      setInvitations([]);
      return;
    }
    setLoading(true);
    try {
      const [membersRes, invitesRes] = await Promise.all([
        listGroupTeamMembers(groupId),
        canInvite ? listGroupInvitations(groupId) : Promise.resolve([])
      ]);
      setTeamMembers(membersRes);
      setInvitations(invitesRes);
    } finally {
      setLoading(false);
    }
  }, [groupId, isDemoMode, canInvite]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }
    setFeedback(null);
    setCopiedId('');
    void loadData();

    const onKeyDown = (event) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isOpen, loadData, onClose]);

  const filteredTeam = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) {
      return teamMembers;
    }
    return teamMembers.filter((m) => {
      const name = (m.display_name || '').toLowerCase();
      const email = (m.member_email || '').toLowerCase();
      const role = getRoleLabel(m.role).toLowerCase();
      return name.includes(q) || email.includes(q) || role.includes(q);
    });
  }, [teamMembers, searchQuery]);

  if (!isOpen) {
    return null;
  }

  async function handleRoleChange(membership, nextRole) {
    setFeedback(null);
    const res = await updateTeamMemberRole({
      membershipId: membership.id,
      role: nextRole
    });
    if (!res.ok) {
      setFeedback({ type: 'error', text: res.error });
      return;
    }
    setTeamMembers((prev) =>
      prev.map((m) => (m.id === membership.id ? { ...m, role: nextRole } : m))
    );
    setFeedback({ type: 'success', text: 'Rol actualizado correctamente.' });
  }

  async function handleBranchChange(membership, nextBranch) {
    setFeedback(null);
    const res = await updateTeamMemberRole({
      membershipId: membership.id,
      branch: nextBranch
    });
    if (!res.ok) {
      setFeedback({ type: 'error', text: res.error });
      return;
    }
    setTeamMembers((prev) =>
      prev.map((m) => (m.id === membership.id ? { ...m, branch: nextBranch } : m))
    );
  }

  async function handleRemoveMember(membership) {
    setFeedback(null);
    const res = await removeTeamMember(membership.id);
    if (!res.ok) {
      setFeedback({ type: 'error', text: res.error });
      return;
    }
    setTeamMembers((prev) => prev.filter((m) => m.id !== membership.id));
    setFeedback({ type: 'info', text: 'Dirigente desvinculado del Grupo.' });
  }

  async function handleCreateInvite(event) {
    event.preventDefault();
    setFeedback(null);
    setCreatingInvite(true);
    try {
      const res = await createGroupInvitation(
        {
          groupId,
          ...inviteForm
        },
        userRole
      );
      if (!res.ok) {
        setFeedback({ type: 'error', text: res.error });
        return;
      }
      setInvitations((prev) => [res.invitation, ...prev]);
      setInviteForm((prev) => ({
        ...prev,
        invitedEmail: '',
        invitedName: ''
      }));
      setFeedback({
        type: 'success',
        text: `Invitacion creada (${res.invitation.invite_code}). Copia el enlace o el mensaje para enviarla.`
      });
    } finally {
      setCreatingInvite(false);
    }
  }

  async function handleRevokeInvite(inviteId) {
    setFeedback(null);
    const res = await revokeGroupInvitation(inviteId);
    if (!res.ok) {
      setFeedback({ type: 'error', text: res.error });
      return;
    }
    setInvitations((prev) =>
      prev.map((inv) => (inv.id === inviteId ? { ...inv, status: 'revocada' } : inv))
    );
  }

  async function copyText(id, value) {
    try {
      await navigator.clipboard.writeText(value);
      setCopiedId(id);
      setTimeout(() => setCopiedId(''), 2200);
    } catch {
      setFeedback({
        type: 'error',
        text: 'No se pudo copiar al portapapeles. Selecciona el codigo manualmente.'
      });
    }
  }

  const origin = typeof window !== 'undefined' ? window.location.origin : '';

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
        aria-labelledby="team-modal-title"
        className="w-full sm:max-w-2xl bg-white border border-slate-300 rounded-t-2xl sm:rounded-2xl shadow-lg max-h-[92dvh] flex flex-col pb-safe-bottom"
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <Users className="w-5 h-5 text-[#1B365D] shrink-0" aria-hidden="true" />
            <div className="min-w-0">
              <h2 id="team-modal-title" className="text-lg font-semibold text-slate-900 truncate">
                Equipo de Dirigentes e Invitaciones
              </h2>
              <p className="text-xs text-slate-600 truncate">
                {cleanUserText(groupProfile?.name || 'Grupo Scout')} - Tu rol:{' '}
                <strong>{getRoleLabel(userRole)}</strong>
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar gestion de equipo"
            className="min-w-[44px] min-h-[44px] inline-flex items-center justify-center rounded-lg text-slate-600 hover:bg-slate-100"
          >
            <X className="w-5 h-5" aria-hidden="true" />
          </button>
        </div>

        <div className="p-5 overflow-y-auto space-y-4">
          {isDemoMode ? (
            <div className="p-4 rounded-xl border border-amber-700 bg-amber-100 text-amber-900 text-sm space-y-1">
              <p className="font-semibold">Modo Demo Local</p>
              <p>
                Para crear un tenant real por Grupo Scout, asignar roles e invitar a tus ~50 dirigentes, conecta tu cuenta de Supabase desde Ajustes del Grupo.
              </p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-1 p-1 rounded-xl bg-slate-100 border border-slate-300">
                <button
                  type="button"
                  onClick={() => setActiveTab('team')}
                  className={`min-h-[42px] px-3 rounded-lg text-sm font-semibold inline-flex items-center justify-center gap-2 ${
                    activeTab === 'team' ? 'bg-[#1B365D] text-white' : 'text-slate-700'
                  }`}
                >
                  <Shield className="w-4 h-4" aria-hidden="true" />
                  <span>Dirigentes ({teamMembers.length})</span>
                </button>
                <button
                  type="button"
                  disabled={!canInvite}
                  onClick={() => setActiveTab('invites')}
                  className={`min-h-[42px] px-3 rounded-lg text-sm font-semibold inline-flex items-center justify-center gap-2 disabled:opacity-40 ${
                    activeTab === 'invites' ? 'bg-[#1B365D] text-white' : 'text-slate-700'
                  }`}
                >
                  <KeyRound className="w-4 h-4" aria-hidden="true" />
                  <span>Invitaciones ({invitations.filter((i) => i.status === 'pendiente').length})</span>
                </button>
              </div>

              {feedback && (
                <div
                  aria-live="polite"
                  className={`p-3 rounded-xl border text-sm flex items-start gap-2 ${
                    feedback.type === 'error'
                      ? 'bg-red-100 border-red-700 text-red-900'
                      : feedback.type === 'success'
                        ? 'bg-green-100 border-green-700 text-green-900'
                        : 'bg-blue-100 border-blue-700 text-blue-900'
                  }`}
                >
                  {feedback.type === 'error' ? (
                    <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" aria-hidden="true" />
                  ) : (
                    <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" aria-hidden="true" />
                  )}
                  <span>{feedback.text}</span>
                </div>
              )}

              {loading ? (
                <div className="py-8 flex items-center justify-center gap-2 text-slate-600 text-sm">
                  <Loader2 className="w-5 h-5 animate-spin text-[#1B365D]" aria-hidden="true" />
                  <span>Cargando equipo del Grupo...</span>
                </div>
              ) : activeTab === 'team' ? (
                <div className="space-y-3">
                  <div className="relative">
                    <Search
                      className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none"
                      aria-hidden="true"
                    />
                    <input
                      type="search"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Buscar dirigente por nombre, correo o rol..."
                      aria-label="Buscar dirigente del Grupo"
                      className="w-full h-11 pl-10 pr-3 rounded-lg border border-slate-500 text-sm text-slate-900 bg-white"
                    />
                  </div>

                  {filteredTeam.length === 0 ? (
                    <p className="text-sm text-slate-600 text-center py-6">
                      No hay dirigentes que coincidan con la busqueda.
                    </p>
                  ) : (
                    <div className="space-y-2.5">
                      {filteredTeam.map((member) => {
                        const isSelf = member.user_id === currentUserId;
                        return (
                          <div
                            key={member.id}
                            className="p-3 rounded-xl border border-slate-300 bg-slate-50 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3"
                          >
                            <div className="min-w-0">
                              <p className="text-sm font-semibold text-slate-900 truncate">
                                {cleanUserText(member.display_name || member.member_email || 'Dirigente')}
                                {isSelf ? ' (Vos)' : ''}
                              </p>
                              {member.member_email && (
                                <p className="text-xs text-slate-600 truncate">
                                  {cleanUserText(member.member_email)}
                                </p>
                              )}
                            </div>

                            {canEditRoles ? (
                              <div className="flex flex-wrap items-center gap-2">
                                <select
                                  aria-label={`Rol de ${member.display_name || 'dirigente'}`}
                                  value={member.role}
                                  disabled={isSelf && member.role === 'jefe_grupo'}
                                  onChange={(e) => handleRoleChange(member, e.target.value)}
                                  className="h-10 px-2.5 rounded-lg border border-slate-400 text-xs font-semibold text-slate-900 bg-white disabled:opacity-60"
                                >
                                  {GROUP_ROLES.map((r) => (
                                    <option key={r} value={r}>
                                      {getRoleLabel(r)}
                                    </option>
                                  ))}
                                </select>

                                <select
                                  aria-label={`Rama de ${member.display_name || 'dirigente'}`}
                                  value={member.branch || 'jefatura'}
                                  onChange={(e) => handleBranchChange(member, e.target.value)}
                                  className="h-10 px-2.5 rounded-lg border border-slate-400 text-xs font-medium text-slate-900 bg-white"
                                >
                                  {ASSIGNABLE_TEAM_BRANCHES.map((b) => (
                                    <option key={b} value={b}>
                                      {BRANCHES[b]?.label || 'Jefatura'}
                                    </option>
                                  ))}
                                </select>

                                {!isSelf && member.role !== 'jefe_grupo' && (
                                  <button
                                    type="button"
                                    onClick={() => handleRemoveMember(member)}
                                    aria-label={`Quitar a ${member.display_name || 'dirigente'}`}
                                    className="min-w-[40px] min-h-[40px] inline-flex items-center justify-center rounded-lg text-red-700 hover:bg-red-100"
                                  >
                                    <Trash2 className="w-4 h-4" aria-hidden="true" />
                                  </button>
                                )}
                              </div>
                            ) : (
                              <div className="flex items-center gap-2 text-xs">
                                <span className="px-2.5 py-1 rounded-full border border-slate-400 bg-white font-semibold text-slate-800">
                                  {getRoleLabel(member.role)}
                                </span>
                                <span className="px-2.5 py-1 rounded-full border border-slate-300 bg-white text-slate-700">
                                  {BRANCHES[member.branch]?.label || 'Jefatura'}
                                </span>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-4">
                  <form
                    onSubmit={handleCreateInvite}
                    className="p-4 rounded-xl border border-slate-300 bg-slate-50 space-y-3"
                  >
                    <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                      <UserPlus className="w-4 h-4 text-[#1B365D]" aria-hidden="true" />
                      <span>Generar invitacion para el equipo</span>
                    </h3>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label htmlFor="inv-role" className="block text-xs font-medium text-slate-700 mb-1">
                          Rol a asignar
                        </label>
                        <select
                          id="inv-role"
                          value={inviteForm.role}
                          onChange={(e) => setInviteForm((p) => ({ ...p, role: e.target.value }))}
                          className="w-full h-11 px-3 rounded-lg border border-slate-500 text-sm text-slate-900 bg-white"
                        >
                          {allowedInviteRoles.map((r) => (
                            <option key={r} value={r}>
                              {getRoleLabel(r)}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label htmlFor="inv-branch" className="block text-xs font-medium text-slate-700 mb-1">
                          Rama / Area
                        </label>
                        <select
                          id="inv-branch"
                          value={inviteForm.branch}
                          onChange={(e) => setInviteForm((p) => ({ ...p, branch: e.target.value }))}
                          className="w-full h-11 px-3 rounded-lg border border-slate-500 text-sm text-slate-900 bg-white"
                        >
                          {ASSIGNABLE_TEAM_BRANCHES.map((b) => (
                            <option key={b} value={b}>
                              {BRANCHES[b]?.label || 'Jefatura de Grupo'}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label htmlFor="inv-email" className="block text-xs font-medium text-slate-700 mb-1">
                          Correo del invitado (opcional)
                        </label>
                        <input
                          id="inv-email"
                          type="email"
                          value={inviteForm.invitedEmail}
                          onChange={(e) =>
                            setInviteForm((p) => ({ ...p, invitedEmail: e.target.value }))
                          }
                          placeholder="Dejar vacio para enlace de rama"
                          className="w-full h-11 px-3 rounded-lg border border-slate-500 text-sm text-slate-900 bg-white"
                        />
                      </div>

                      <div>
                        <label htmlFor="inv-label" className="block text-xs font-medium text-slate-700 mb-1">
                          Etiqueta referencial (opcional)
                        </label>
                        <input
                          id="inv-label"
                          type="text"
                          value={inviteForm.invitedName}
                          onChange={(e) =>
                            setInviteForm((p) => ({ ...p, invitedName: e.target.value }))
                          }
                          placeholder="Ej. Educadores Manada"
                          className="w-full h-11 px-3 rounded-lg border border-slate-500 text-sm text-slate-900 bg-white"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label htmlFor="inv-uses" className="block text-xs font-medium text-slate-700 mb-1">
                          Cupo de usos
                        </label>
                        <input
                          id="inv-uses"
                          type="number"
                          min={1}
                          max={50}
                          value={inviteForm.maxUses}
                          onChange={(e) =>
                            setInviteForm((p) => ({
                              ...p,
                              maxUses: Number.parseInt(e.target.value, 10) || 1
                            }))
                          }
                          className="w-full h-11 px-3 rounded-lg border border-slate-500 text-sm text-slate-900 bg-white font-mono"
                        />
                      </div>
                      <div>
                        <label htmlFor="inv-days" className="block text-xs font-medium text-slate-700 mb-1">
                          Vigencia (dias)
                        </label>
                        <select
                          id="inv-days"
                          value={inviteForm.expiresDays}
                          onChange={(e) =>
                            setInviteForm((p) => ({
                              ...p,
                              expiresDays: Number.parseInt(e.target.value, 10) || 14
                            }))
                          }
                          className="w-full h-11 px-3 rounded-lg border border-slate-500 text-sm text-slate-900 bg-white"
                        >
                          <option value={7}>7 dias</option>
                          <option value={14}>14 dias</option>
                          <option value={30}>30 dias</option>
                        </select>
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={creatingInvite}
                      className="w-full h-11 bg-[#1B365D] hover:bg-[#122643] text-white text-sm font-semibold rounded-lg transition-colors disabled:opacity-50"
                    >
                      {creatingInvite ? 'Generando codigo...' : 'Crear invitacion'}
                    </button>
                  </form>

                  <div className="space-y-2.5">
                    {invitations.length === 0 ? (
                      <p className="text-sm text-slate-600 text-center py-4">
                        Todavia no generaste invitaciones para este Grupo.
                      </p>
                    ) : (
                      invitations.map((inv) => {
                        const isActive = inv.status === 'pendiente';
                        const linkUrl = buildInvitationUrl(inv.invite_code, origin);
                        const shareMsg = buildInvitationShareText({
                          inviteCode: inv.invite_code,
                          groupName: groupProfile?.name,
                          groupNumber: groupProfile?.number,
                          role: inv.role,
                          branch: inv.branch,
                          origin
                        });

                        return (
                          <div
                            key={inv.id}
                            className="p-3 rounded-xl border border-slate-300 bg-white space-y-2.5"
                          >
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <div>
                                <p className="text-sm font-bold font-mono text-slate-900">
                                  {inv.invite_code}
                                </p>
                                <p className="text-xs text-slate-600">
                                  {getRoleLabel(inv.role)} ({BRANCHES[inv.branch]?.label || 'Jefatura'})
                                  {inv.invited_name ? ` - ${cleanUserText(inv.invited_name)}` : ''}
                                  {inv.invited_email ? ` (${cleanUserText(inv.invited_email)})` : ''}
                                </p>
                              </div>

                              <span
                                className={`px-2.5 py-0.5 rounded-full text-xs font-semibold border ${
                                  isActive
                                    ? 'bg-green-100 border-green-700 text-green-900'
                                    : 'bg-slate-100 border-slate-400 text-slate-700'
                                }`}
                              >
                                {inv.status} ({inv.uses_count}/{inv.max_uses})
                              </span>
                            </div>

                            <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-600">
                              <span>Vence: {formatDateAr((inv.expires_at || '').slice(0, 10))}</span>

                              {isActive && (
                                <div className="flex flex-wrap items-center gap-1.5">
                                  <button
                                    type="button"
                                    onClick={() => copyText(`link-${inv.id}`, linkUrl)}
                                    className="h-9 px-3 rounded-lg border border-slate-300 text-slate-800 hover:bg-slate-100 font-semibold inline-flex items-center gap-1.5"
                                  >
                                    {copiedId === `link-${inv.id}` ? (
                                      <Check className="w-3.5 h-3.5 text-green-700" aria-hidden="true" />
                                    ) : (
                                      <Link2 className="w-3.5 h-3.5" aria-hidden="true" />
                                    )}
                                    <span>Copiar enlace</span>
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() => copyText(`msg-${inv.id}`, shareMsg)}
                                    className="h-9 px-3 rounded-lg border border-[#1B365D] text-[#1B365D] hover:bg-[#EBF2FA] font-semibold inline-flex items-center gap-1.5"
                                  >
                                    {copiedId === `msg-${inv.id}` ? (
                                      <Check className="w-3.5 h-3.5 text-green-700" aria-hidden="true" />
                                    ) : (
                                      <Copy className="w-3.5 h-3.5" aria-hidden="true" />
                                    )}
                                    <span>Copiar WhatsApp</span>
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() => handleRevokeInvite(inv.id)}
                                    className="h-9 px-3 rounded-lg border border-red-700 text-red-900 hover:bg-red-50 font-semibold"
                                  >
                                    Revocar
                                  </button>
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
