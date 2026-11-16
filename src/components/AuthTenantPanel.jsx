import { useEffect, useState } from 'react';
import {
  AlertTriangle,
  Building2,
  CheckCircle2,
  KeyRound,
  LogIn,
  ShieldCheck,
  UserPlus
} from 'lucide-react';
import { BRANCHES } from '../domain/saacRulesConstants.js';
import { getRoleLabel, normalizeInviteCode } from '../domain/roles.js';
import {
  signInWithEmailPassword,
  signUpWithEmailPassword
} from '../services/supabaseClient.js';
import {
  acceptGroupInvitation,
  createScoutGroupTenant,
  previewGroupInvitation,
  savePendingInviteCode
} from '../services/tenantService.js';

export default function AuthTenantPanel({
  session,
  pendingInviteCode,
  hasActiveGroup,
  onAuthChanged,
  onTenantReady,
  initialMode = 'login'
}) {
  const [authTab, setAuthTab] = useState(initialMode);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [authLoading, setAuthLoading] = useState(false);
  const [authMessage, setAuthMessage] = useState(null);

  const [onboardingMode, setOnboardingMode] = useState(
    pendingInviteCode ? 'join_invite' : 'create_tenant'
  );
  const [inviteCode, setInviteCode] = useState(pendingInviteCode || '');
  const [invitePreview, setInvitePreview] = useState(null);
  const [inviteLoading, setInviteLoading] = useState(false);
  const [inviteError, setInviteError] = useState('');

  const [tenantForm, setTenantForm] = useState({
    number: '',
    name: '',
    district: '',
    zone: '',
    org_model: 'tradicional',
    display_name: ''
  });
  const [tenantSubmitting, setTenantSubmitting] = useState(false);
  const [tenantError, setTenantError] = useState('');

  useEffect(() => {
    if (pendingInviteCode) {
      setInviteCode(pendingInviteCode);
      setOnboardingMode('join_invite');
      void handlePreviewInvite(pendingInviteCode);
    }
  }, [pendingInviteCode]);

  async function handlePreviewInvite(codeOverride) {
    const normalized = normalizeInviteCode(codeOverride ?? inviteCode);
    setInviteError('');
    setInvitePreview(null);
    if (!normalized) {
      return;
    }
    setInviteLoading(true);
    try {
      const result = await previewGroupInvitation(normalized);
      if (!result.valid) {
        setInviteError(result.error || 'Invitacion invalida o vencida.');
      } else {
        setInvitePreview(result);
      }
    } finally {
      setInviteLoading(false);
    }
  }

  async function handleAuthSubmit(event) {
    event.preventDefault();
    setAuthMessage(null);
    setAuthLoading(true);

    try {
      const normalizedInvite = normalizeInviteCode(inviteCode);
      if (normalizedInvite) {
        savePendingInviteCode(normalizedInvite);
      }

      if (authTab === 'signup') {
        const { session: nextSession, error } = await signUpWithEmailPassword(
          email.trim(),
          password,
          displayName.trim()
        );
        if (error) {
          setAuthMessage({ type: 'error', text: error.message || 'No se pudo crear la cuenta.' });
          return;
        }
        if (!nextSession) {
          setAuthMessage({
            type: 'success',
            text: 'Cuenta creada. Revisa tu correo para confirmar la direccion e inicia sesion para continuar.'
          });
          setAuthTab('login');
          return;
        }
        setPassword('');
        await onAuthChanged(nextSession);
      } else {
        const { session: nextSession, error } = await signInWithEmailPassword(
          email.trim(),
          password
        );
        if (error) {
          setAuthMessage({ type: 'error', text: error.message || 'No se pudo iniciar sesion.' });
          return;
        }
        if (nextSession) {
          setPassword('');
          await onAuthChanged(nextSession);
        }
      }
    } finally {
      setAuthLoading(false);
    }
  }

  async function handleCreateTenant(event) {
    event.preventDefault();
    setTenantError('');
    setTenantSubmitting(true);
    try {
      const result = await createScoutGroupTenant({
        ...tenantForm,
        display_name: tenantForm.display_name || session?.user?.user_metadata?.full_name || ''
      });
      if (!result.ok) {
        setTenantError(result.error || 'No se pudo registrar el Grupo Scout.');
        return;
      }
      await onTenantReady(result.group?.id || null);
    } finally {
      setTenantSubmitting(false);
    }
  }

  async function handleAcceptInvite(event) {
    event.preventDefault();
    setInviteError('');
    setInviteLoading(true);
    try {
      const result = await acceptGroupInvitation(
        inviteCode,
        displayName || session?.user?.user_metadata?.full_name || ''
      );
      if (!result.ok) {
        setInviteError(result.error || 'No se pudo validar la invitacion.');
        return;
      }
      await onTenantReady(result.groupId);
    } finally {
      setInviteLoading(false);
    }
  }

  if (!session) {
    return (
      <section className="pt-4 border-t border-slate-200 space-y-4">
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-base font-semibold text-slate-900">
            Acceso a tu Grupo Scout (Supabase)
          </h3>
          <div className="inline-flex rounded-lg border border-slate-300 bg-slate-100 p-0.5">
            <button
              type="button"
              onClick={() => {
                setAuthTab('login');
                setAuthMessage(null);
              }}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold ${
                authTab === 'login' ? 'bg-[#1B365D] text-white' : 'text-slate-700'
              }`}
            >
              Ingresar
            </button>
            <button
              type="button"
              onClick={() => {
                setAuthTab('signup');
                setAuthMessage(null);
              }}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold ${
                authTab === 'signup' ? 'bg-[#1B365D] text-white' : 'text-slate-700'
              }`}
            >
              Crear cuenta
            </button>
          </div>
        </div>

        {inviteCode && (
          <div className="p-3 rounded-xl border border-blue-700 bg-blue-50 text-blue-900 text-xs space-y-1">
            <p className="font-semibold">
              Codigo de invitacion detectado: <span className="font-mono">{inviteCode}</span>
            </p>
            {invitePreview?.valid ? (
              <p>
                Grupo Nro. {invitePreview.group_number} ({invitePreview.group_name}) - Rol:{' '}
                <strong>{getRoleLabel(invitePreview.role)}</strong>
              </p>
            ) : (
              <p>Inicia sesion o crea tu cuenta para sumarte automaticamente a ese Grupo.</p>
            )}
          </div>
        )}

        <form onSubmit={handleAuthSubmit} className="space-y-3">
          {authTab === 'signup' && (
            <div>
              <label htmlFor="auth-fullname" className="block text-sm font-medium text-slate-700 mb-1">
                Nombre y apellido
              </label>
              <input
                id="auth-fullname"
                type="text"
                required
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Ej. Laura Gomez"
                className="w-full h-11 px-3 rounded-lg border border-slate-500 text-base text-slate-900 bg-white"
              />
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label htmlFor="auth-email" className="block text-sm font-medium text-slate-700 mb-1">
                Correo institucional
              </label>
              <input
                id="auth-email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="jefatura@gruposcout.org.ar"
                className="w-full h-11 px-3 rounded-lg border border-slate-500 text-base text-slate-900 bg-white"
              />
            </div>
            <div>
              <label htmlFor="auth-password" className="block text-sm font-medium text-slate-700 mb-1">
                Contrasena
              </label>
              <input
                id="auth-password"
                type="password"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full h-11 px-3 rounded-lg border border-slate-500 text-base text-slate-900 bg-white"
              />
            </div>
          </div>

          {authMessage && (
            <div
              role="alert"
              className={`p-3 rounded-lg border text-sm flex items-start gap-2 ${
                authMessage.type === 'success'
                  ? 'bg-green-100 border-green-700 text-green-900'
                  : 'bg-red-100 border-red-700 text-red-900'
              }`}
            >
              {authMessage.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" aria-hidden="true" />
              ) : (
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" aria-hidden="true" />
              )}
              <span>{authMessage.text}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={authLoading}
            className="w-full h-11 inline-flex items-center justify-center gap-2 bg-[#1B365D] hover:bg-[#122643] text-white font-semibold rounded-lg transition-colors disabled:opacity-50"
          >
            {authTab === 'signup' ? (
              <UserPlus className="w-4 h-4" aria-hidden="true" />
            ) : (
              <LogIn className="w-4 h-4" aria-hidden="true" />
            )}
            <span>
              {authLoading
                ? 'Procesando...'
                : authTab === 'signup'
                  ? 'Registrarme y continuar'
                  : 'Conectar cuenta del Grupo'}
            </span>
          </button>
        </form>
      </section>
    );
  }

  return (
    <section className="pt-4 border-t border-slate-200 space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div>
          <h3 className="text-base font-semibold text-slate-900">
            {hasActiveGroup
              ? 'Crear nuevo Grupo Scout o aceptar otra invitacion'
              : 'Vincula tu cuenta a un Grupo Scout'}
          </h3>
          <p className="text-xs text-slate-600">
            Cada Grupo Scout funciona como un tenant aislado para hasta ~50 dirigentes y 250 integrantes.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 p-1 rounded-xl bg-slate-100 border border-slate-300">
        <button
          type="button"
          onClick={() => setOnboardingMode('create_tenant')}
          className={`min-h-[42px] px-3 rounded-lg text-xs sm:text-sm font-semibold inline-flex items-center justify-center gap-1.5 ${
            onboardingMode === 'create_tenant'
              ? 'bg-[#1B365D] text-white'
              : 'text-slate-700 hover:bg-slate-200'
          }`}
        >
          <Building2 className="w-4 h-4 shrink-0" aria-hidden="true" />
          <span>Crear Grupo (Jefe de Grupo)</span>
        </button>
        <button
          type="button"
          onClick={() => setOnboardingMode('join_invite')}
          className={`min-h-[42px] px-3 rounded-lg text-xs sm:text-sm font-semibold inline-flex items-center justify-center gap-1.5 ${
            onboardingMode === 'join_invite'
              ? 'bg-[#1B365D] text-white'
              : 'text-slate-700 hover:bg-slate-200'
          }`}
        >
          <KeyRound className="w-4 h-4 shrink-0" aria-hidden="true" />
          <span>Tengo invitacion</span>
        </button>
      </div>

      {onboardingMode === 'create_tenant' ? (
        <form onSubmit={handleCreateTenant} className="space-y-3 bg-slate-50 border border-slate-300 rounded-xl p-4">
          <p className="text-xs text-slate-700 flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-[#1B365D] shrink-0" aria-hidden="true" />
            <span>Quedaras asignado como <strong>Jefe de Grupo</strong> para configurar datos e invitar a tu equipo.</span>
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label htmlFor="tenant-number" className="block text-xs font-medium text-slate-700 mb-1">
                Nro. de Grupo
              </label>
              <input
                id="tenant-number"
                type="number"
                min={1}
                required
                value={tenantForm.number}
                onChange={(e) => setTenantForm((p) => ({ ...p, number: e.target.value }))}
                placeholder="412"
                className="w-full h-11 px-3 rounded-lg border border-slate-500 text-base text-slate-900 bg-white font-mono"
              />
            </div>
            <div className="sm:col-span-2">
              <label htmlFor="tenant-name" className="block text-xs font-medium text-slate-700 mb-1">
                Nombre oficial del Grupo
              </label>
              <input
                id="tenant-name"
                type="text"
                required
                value={tenantForm.name}
                onChange={(e) => setTenantForm((p) => ({ ...p, name: e.target.value }))}
                placeholder="Grupo Scout Nro. 412 - San Martin"
                className="w-full h-11 px-3 rounded-lg border border-slate-500 text-base text-slate-900 bg-white"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label htmlFor="tenant-district" className="block text-xs font-medium text-slate-700 mb-1">
                Distrito
              </label>
              <input
                id="tenant-district"
                type="text"
                required
                value={tenantForm.district}
                onChange={(e) => setTenantForm((p) => ({ ...p, district: e.target.value }))}
                placeholder="Distrito 2"
                className="w-full h-11 px-3 rounded-lg border border-slate-500 text-base text-slate-900 bg-white"
              />
            </div>
            <div>
              <label htmlFor="tenant-zone" className="block text-xs font-medium text-slate-700 mb-1">
                Zona
              </label>
              <input
                id="tenant-zone"
                type="text"
                required
                value={tenantForm.zone}
                onChange={(e) => setTenantForm((p) => ({ ...p, zone: e.target.value }))}
                placeholder="Zona 14"
                className="w-full h-11 px-3 rounded-lg border border-slate-500 text-base text-slate-900 bg-white"
              />
            </div>
            <div>
              <label htmlFor="tenant-model" className="block text-xs font-medium text-slate-700 mb-1">
                Modalidad
              </label>
              <select
                id="tenant-model"
                value={tenantForm.org_model}
                onChange={(e) => setTenantForm((p) => ({ ...p, org_model: e.target.value }))}
                className="w-full h-11 px-3 rounded-lg border border-slate-500 text-base text-slate-900 bg-white"
              >
                <option value="tradicional">Tradicional</option>
                <option value="nucleo">Nucleo</option>
                <option value="comunitario">Comunitario</option>
                <option value="escolar">Escolar</option>
              </select>
            </div>
          </div>

          <div>
            <label htmlFor="tenant-leader-name" className="block text-xs font-medium text-slate-700 mb-1">
              Tu nombre visible como Jefe de Grupo
            </label>
            <input
              id="tenant-leader-name"
              type="text"
              value={tenantForm.display_name}
              onChange={(e) => setTenantForm((p) => ({ ...p, display_name: e.target.value }))}
              placeholder="Ej. Juan Perez"
              className="w-full h-11 px-3 rounded-lg border border-slate-500 text-base text-slate-900 bg-white"
            />
          </div>

          {tenantError && (
            <p role="alert" className="text-sm text-red-900 bg-red-100 border border-red-700 rounded-lg p-2.5">
              {tenantError}
            </p>
          )}

          <button
            type="submit"
            disabled={tenantSubmitting}
            className="w-full h-11 bg-[#1B365D] hover:bg-[#122643] text-white font-semibold rounded-lg transition-colors disabled:opacity-50"
          >
            {tenantSubmitting ? 'Creando Grupo...' : 'Crear Grupo y comenzar como Jefe de Grupo'}
          </button>
        </form>
      ) : (
        <form onSubmit={handleAcceptInvite} className="space-y-3 bg-slate-50 border border-slate-300 rounded-xl p-4">
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="flex-1">
              <label htmlFor="invite-code-input" className="block text-xs font-medium text-slate-700 mb-1">
                Codigo de invitacion
              </label>
              <input
                id="invite-code-input"
                type="text"
                required
                value={inviteCode}
                onChange={(e) => setInviteCode(normalizeInviteCode(e.target.value))}
                placeholder="CS-A1B2C3D4E5"
                className="w-full h-11 px-3 rounded-lg border border-slate-500 text-base text-slate-900 bg-white font-mono uppercase"
              />
            </div>
            <div className="sm:self-end">
              <button
                type="button"
                onClick={() => handlePreviewInvite()}
                disabled={inviteLoading || !inviteCode}
                className="w-full sm:w-auto h-11 px-4 rounded-lg border border-[#1B365D] text-[#1B365D] hover:bg-[#EBF2FA] text-sm font-semibold disabled:opacity-50"
              >
                Verificar
              </button>
            </div>
          </div>

          {invitePreview?.valid && (
            <div className="p-3 rounded-lg border border-green-700 bg-green-100 text-green-900 text-xs space-y-1">
              <p className="font-semibold">
                Grupo Nro. {invitePreview.group_number} - {invitePreview.group_name}
              </p>
              <p>
                Cargo: <strong>{getRoleLabel(invitePreview.role)}</strong> | Rama:{' '}
                <strong>{BRANCHES[invitePreview.branch]?.label || 'Jefatura de Grupo'}</strong>
              </p>
            </div>
          )}

          {inviteError && (
            <p role="alert" className="text-sm text-red-900 bg-red-100 border border-red-700 rounded-lg p-2.5">
              {inviteError}
            </p>
          )}

          <button
            type="submit"
            disabled={inviteLoading || !inviteCode}
            className="w-full h-11 bg-[#1B365D] hover:bg-[#122643] text-white font-semibold rounded-lg transition-colors disabled:opacity-50"
          >
            {inviteLoading ? 'Vinculando...' : 'Aceptar invitacion y entrar al Grupo'}
          </button>
        </form>
      )}
    </section>
  );
}
