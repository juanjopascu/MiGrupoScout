import { useEffect, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Cloud,
  HardDrive,
  LogIn,
  LogOut,
  RefreshCw,
  Shield,
  X
} from 'lucide-react';
import { cleanUserText, formatDateAr } from '../utils/textSanitizer.js';
import { isSupabaseConfigured, signInWithEmailPassword } from '../services/supabaseClient.js';

export default function GroupSettingsModal({
  isOpen,
  onClose,
  groupProfile,
  onSaveGroupProfile,
  session,
  onAuthChanged,
  onLogout,
  syncState,
  onManualSync,
  isOnline
}) {
  const [number, setNumber] = useState(String(groupProfile?.number || 412));
  const [name, setName] = useState(groupProfile?.name || '');
  const [district, setDistrict] = useState(groupProfile?.district || '');
  const [zone, setZone] = useState(groupProfile?.zone || '');
  const [orgModel, setOrgModel] = useState(groupProfile?.org_model || 'tradicional');
  const [saveMessage, setSaveMessage] = useState(null);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState('');

  useEffect(() => {
    if (!isOpen) {
      return;
    }
    setNumber(String(groupProfile?.number || 412));
    setName(groupProfile?.name || '');
    setDistrict(groupProfile?.district || '');
    setZone(groupProfile?.zone || '');
    setOrgModel(groupProfile?.org_model || 'tradicional');
    setSaveMessage(null);
    setAuthError('');

    const onKeyDown = (event) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isOpen, groupProfile, onClose]);

  if (!isOpen) {
    return null;
  }

  async function handleSaveGroup(event) {
    event.preventDefault();
    const cleanedName = cleanUserText(name, { maxLength: 120 });
    const cleanedDistrict = cleanUserText(district, { maxLength: 80 });
    const cleanedZone = cleanUserText(zone, { maxLength: 80 });
    const parsedNum = Math.max(1, Number.parseInt(number, 10) || 1);

    if (cleanedName.length < 3 || !cleanedDistrict || !cleanedZone) {
      setSaveMessage({
        type: 'error',
        text: 'Completa el nombre, distrito y zona del Grupo Scout.'
      });
      return;
    }

    await onSaveGroupProfile({
      ...groupProfile,
      number: parsedNum,
      name: cleanedName,
      district: cleanedDistrict,
      zone: cleanedZone,
      org_model: orgModel
    });

    setSaveMessage({
      type: 'success',
      text: 'Datos del Grupo guardados localmente y listos para sincronizar.'
    });
  }

  async function handleLogin(event) {
    event.preventDefault();
    setAuthError('');
    setAuthLoading(true);
    try {
      const { session: nextSession, error } = await signInWithEmailPassword(
        email.trim(),
        password
      );
      if (error) {
        setAuthError(error.message || 'No se pudo iniciar sesion.');
        return;
      }
      if (nextSession) {
        setPassword('');
        await onAuthChanged(nextSession);
      }
    } finally {
      setAuthLoading(false);
    }
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
        aria-labelledby="group-settings-title"
        className="w-full sm:max-w-xl bg-white border border-slate-300 rounded-t-2xl sm:rounded-2xl shadow-lg max-h-[92dvh] overflow-y-auto pb-safe-bottom"
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200">
          <div className="flex items-center gap-2.5">
            <Shield className="w-5 h-5 text-[#1B365D]" aria-hidden="true" />
            <h2 id="group-settings-title" className="text-lg font-semibold text-slate-900">
              Ajustes del Grupo y Sincronizacion
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar ajustes"
            className="min-w-[44px] min-h-[44px] inline-flex items-center justify-center rounded-lg text-slate-600 hover:bg-slate-100"
          >
            <X className="w-5 h-5" aria-hidden="true" />
          </button>
        </div>

        <div className="p-5 space-y-6">
          {/* Estado de almacenamiento y sincronizacion */}
          <section className="rounded-xl border border-slate-300 bg-slate-50 p-4 space-y-3">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                {session && isSupabaseConfigured ? (
                  <Cloud className="w-4 h-4 text-[#1B365D]" aria-hidden="true" />
                ) : (
                  <HardDrive className="w-4 h-4 text-slate-700" aria-hidden="true" />
                )}
                <h3 className="text-sm font-semibold text-slate-900">
                  {session && isSupabaseConfigured
                    ? 'Cuenta vinculada a Supabase'
                    : 'Modo Local Offline-First (Demo Editable)'}
                </h3>
              </div>
              <span
                className={`px-2.5 py-0.5 rounded-full text-xs font-semibold border ${
                  isOnline
                    ? 'bg-green-100 border-green-700 text-green-900'
                    : 'bg-amber-100 border-amber-700 text-amber-900'
                }`}
              >
                {isOnline ? 'En linea' : 'Sin conexion'}
              </span>
            </div>

            <div className="text-xs text-slate-700 space-y-1">
              <p>
                Cambios pendientes en cola local:{' '}
                <span className="font-mono font-semibold">{syncState.pendingCount}</span>
                {syncState.conflictCount > 0
                  ? ` | Conflictos: ${syncState.conflictCount}`
                  : ''}
              </p>
              {syncState.lastSyncAt ? (
                <p>
                  Ultima sincronizacion:{' '}
                  <span className="font-mono">
                    {formatDateAr(syncState.lastSyncAt.slice(0, 10))}
                  </span>
                </p>
              ) : (
                <p>Datos persistidos localmente en IndexedDB (consejoscout_db_v1).</p>
              )}
            </div>

            {session && isSupabaseConfigured ? (
              <div className="flex flex-wrap gap-2 pt-1">
                <button
                  type="button"
                  onClick={onManualSync}
                  disabled={!isOnline || syncState.isSyncing}
                  className="h-11 px-4 inline-flex items-center gap-2 rounded-lg border border-[#1B365D] text-[#1B365D] hover:bg-[#EBF2FA] text-sm font-semibold disabled:opacity-50"
                >
                  <RefreshCw
                    className={`w-4 h-4 ${syncState.isSyncing ? 'animate-spin' : ''}`}
                    aria-hidden="true"
                  />
                  <span>Sincronizar ahora</span>
                </button>

                <button
                  type="button"
                  onClick={onLogout}
                  className="h-11 px-4 inline-flex items-center gap-2 rounded-lg border border-red-700 text-red-900 bg-red-50 hover:bg-red-100 text-sm font-semibold"
                >
                  <LogOut className="w-4 h-4" aria-hidden="true" />
                  <span>Cerrar sesion y purgar cache</span>
                </button>
              </div>
            ) : null}
          </section>

          {/* Formulario del Grupo Scout */}
          <form onSubmit={handleSaveGroup} className="space-y-4">
            <h3 className="text-base font-semibold text-slate-900">
              Identidad del Grupo Scout
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label
                  htmlFor="group-number-input"
                  className="block text-sm font-medium text-slate-700 mb-1"
                >
                  Nro. de Grupo
                </label>
                <input
                  id="group-number-input"
                  type="number"
                  min={1}
                  value={number}
                  onChange={(e) => setNumber(e.target.value)}
                  className="w-full h-11 px-3 rounded-lg border border-slate-500 text-base text-slate-900 bg-white font-mono"
                />
              </div>

              <div className="sm:col-span-2">
                <label
                  htmlFor="group-name-input"
                  className="block text-sm font-medium text-slate-700 mb-1"
                >
                  Nombre oficial del Grupo
                </label>
                <input
                  id="group-name-input"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full h-11 px-3 rounded-lg border border-slate-500 text-base text-slate-900 bg-white"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label
                  htmlFor="group-district-input"
                  className="block text-sm font-medium text-slate-700 mb-1"
                >
                  Distrito
                </label>
                <input
                  id="group-district-input"
                  type="text"
                  value={district}
                  onChange={(e) => setDistrict(e.target.value)}
                  className="w-full h-11 px-3 rounded-lg border border-slate-500 text-base text-slate-900 bg-white"
                />
              </div>

              <div>
                <label
                  htmlFor="group-zone-input"
                  className="block text-sm font-medium text-slate-700 mb-1"
                >
                  Zona
                </label>
                <input
                  id="group-zone-input"
                  type="text"
                  value={zone}
                  onChange={(e) => setZone(e.target.value)}
                  className="w-full h-11 px-3 rounded-lg border border-slate-500 text-base text-slate-900 bg-white"
                />
              </div>

              <div>
                <label
                  htmlFor="group-org-model"
                  className="block text-sm font-medium text-slate-700 mb-1"
                >
                  Modalidad
                </label>
                <select
                  id="group-org-model"
                  value={orgModel}
                  onChange={(e) => setOrgModel(e.target.value)}
                  className="w-full h-11 px-3 rounded-lg border border-slate-500 text-base text-slate-900 bg-white"
                >
                  <option value="tradicional">Tradicional</option>
                  <option value="nucleo">Nucleo</option>
                  <option value="comunitario">Comunitario</option>
                  <option value="escolar">Escolar</option>
                </select>
              </div>
            </div>

            {saveMessage && (
              <div
                aria-live="polite"
                className={`p-3 rounded-xl border text-sm flex items-center gap-2 ${
                  saveMessage.type === 'success'
                    ? 'bg-green-100 border-green-700 text-green-900'
                    : 'bg-red-100 border-red-700 text-red-900'
                }`}
              >
                {saveMessage.type === 'success' ? (
                  <CheckCircle2 className="w-4 h-4 shrink-0" aria-hidden="true" />
                ) : (
                  <AlertTriangle className="w-4 h-4 shrink-0" aria-hidden="true" />
                )}
                <span>{saveMessage.text}</span>
              </div>
            )}

            <button
              type="submit"
              className="w-full h-12 bg-[#1B365D] hover:bg-[#122643] text-white font-semibold rounded-lg transition-colors"
            >
              Guardar datos del Grupo
            </button>
          </form>

          {/* Acceso Supabase (solo si esta configurado y sin sesion) */}
          {!session && isSupabaseConfigured && (
            <form
              onSubmit={handleLogin}
              className="pt-4 border-t border-slate-200 space-y-3"
            >
              <h3 className="text-base font-semibold text-slate-900">
                Iniciar sesion con cuenta del Grupo (Supabase)
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label
                    htmlFor="auth-email"
                    className="block text-sm font-medium text-slate-700 mb-1"
                  >
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
                  <label
                    htmlFor="auth-password"
                    className="block text-sm font-medium text-slate-700 mb-1"
                  >
                    Contrasena
                  </label>
                  <input
                    id="auth-password"
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full h-11 px-3 rounded-lg border border-slate-500 text-base text-slate-900 bg-white"
                  />
                </div>
              </div>

              {authError && (
                <p role="alert" className="text-sm text-red-900 bg-red-100 border border-red-700 rounded-lg p-2.5">
                  {authError}
                </p>
              )}

              <button
                type="submit"
                disabled={authLoading}
                className="w-full h-11 inline-flex items-center justify-center gap-2 border border-[#1B365D] text-[#1B365D] hover:bg-[#EBF2FA] font-semibold rounded-lg transition-colors disabled:opacity-50"
              >
                <LogIn className="w-4 h-4" aria-hidden="true" />
                <span>{authLoading ? 'Ingresando...' : 'Conectar cuenta del Grupo'}</span>
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
