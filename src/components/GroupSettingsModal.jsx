import { useEffect, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Cloud,
  HardDrive,
  LogOut,
  RefreshCw,
  Shield,
  Users,
  X
} from 'lucide-react';
import {
  DEFAULT_BRANDING,
  isSafeLogoValue,
  isValidHexColor,
  normalizeHexColor
} from '../domain/branding.js';
import {
  canEditGroupBranding,
  canEditGroupSettings,
  getRoleLabel
} from '../domain/roles.js';
import { isSupabaseConfigured } from '../services/supabaseClient.js';
import { cleanUserText, formatDateAr } from '../utils/textSanitizer.js';
import AuthTenantPanel from './AuthTenantPanel.jsx';
import GroupBrandingFields from './GroupBrandingFields.jsx';

export default function GroupSettingsModal({
  isOpen,
  onClose,
  groupProfile,
  onSaveGroupProfile,
  session,
  userRole,
  memberships = [],
  activeGroupId,
  hasActiveGroup,
  pendingInviteCode,
  onSwitchGroup,
  onOpenTeamManager,
  onAuthChanged,
  onTenantReady,
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
  const [primaryColor, setPrimaryColor] = useState(
    groupProfile?.primary_color || DEFAULT_BRANDING.primaryColor
  );
  const [accentColor, setAccentColor] = useState(
    groupProfile?.accent_color || DEFAULT_BRANDING.accentColor
  );
  const [logoUrl, setLogoUrl] = useState(groupProfile?.logo_url || null);
  const [saveMessage, setSaveMessage] = useState(null);

  const isDemoMode = !session || !isSupabaseConfigured || !hasActiveGroup;
  const canEditGroup = isDemoMode || canEditGroupSettings(userRole);
  const canEditBranding = isDemoMode || canEditGroupBranding(userRole);

  useEffect(() => {
    if (!isOpen) {
      return;
    }
    setNumber(String(groupProfile?.number || 412));
    setName(groupProfile?.name || '');
    setDistrict(groupProfile?.district || '');
    setZone(groupProfile?.zone || '');
    setOrgModel(groupProfile?.org_model || 'tradicional');
    setPrimaryColor(groupProfile?.primary_color || DEFAULT_BRANDING.primaryColor);
    setAccentColor(groupProfile?.accent_color || DEFAULT_BRANDING.accentColor);
    setLogoUrl(groupProfile?.logo_url || null);
    setSaveMessage(null);

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
    if (!canEditGroup) {
      return;
    }
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

    if (!isValidHexColor(primaryColor) || !isValidHexColor(accentColor)) {
      setSaveMessage({
        type: 'error',
        text: 'Los colores institucionales deben tener formato hexadecimal valido (#RRGGBB).'
      });
      return;
    }

    if (!isSafeLogoValue(logoUrl)) {
      setSaveMessage({
        type: 'error',
        text: 'El formato del logo no es valido.'
      });
      return;
    }

    await onSaveGroupProfile({
      ...groupProfile,
      number: parsedNum,
      name: cleanedName,
      district: cleanedDistrict,
      zone: cleanedZone,
      org_model: orgModel,
      primary_color: canEditBranding
        ? normalizeHexColor(primaryColor, DEFAULT_BRANDING.primaryColor)
        : groupProfile?.primary_color || DEFAULT_BRANDING.primaryColor,
      accent_color: canEditBranding
        ? normalizeHexColor(accentColor, DEFAULT_BRANDING.accentColor)
        : groupProfile?.accent_color || DEFAULT_BRANDING.accentColor,
      logo_url: canEditBranding ? logoUrl || null : groupProfile?.logo_url || null
    });

    setSaveMessage({
      type: 'success',
      text: 'Datos e identidad del Grupo guardados localmente y listos para sincronizar.'
    });
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
              Ajustes del Grupo y Tenant
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
          <section className="rounded-xl border border-slate-300 bg-slate-50 p-4 space-y-3">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                {session && isSupabaseConfigured ? (
                  <Cloud className="w-4 h-4 text-[#1B365D] shrink-0" aria-hidden="true" />
                ) : (
                  <HardDrive className="w-4 h-4 text-slate-700 shrink-0" aria-hidden="true" />
                )}
                <h3 className="text-sm font-semibold text-slate-900 truncate">
                  {session && isSupabaseConfigured
                    ? hasActiveGroup
                      ? `Tenant activo - Rol: ${getRoleLabel(userRole)}`
                      : 'Cuenta conectada (sin Grupo asignado)'
                    : 'Modo Local Offline-First (Demo Editable)'}
                </h3>
              </div>
              <span
                className={`px-2.5 py-0.5 rounded-full text-xs font-semibold border shrink-0 ${
                  isOnline
                    ? 'bg-green-100 border-green-700 text-green-900'
                    : 'bg-amber-100 border-amber-700 text-amber-900'
                }`}
              >
                {isOnline ? 'En linea' : 'Sin conexion'}
              </span>
            </div>

            {session && memberships.length > 1 && (
              <div>
                <label htmlFor="tenant-switcher" className="block text-xs font-medium text-slate-700 mb-1">
                  Cambiar de Grupo Scout (Tenant)
                </label>
                <select
                  id="tenant-switcher"
                  value={activeGroupId || ''}
                  onChange={(e) => onSwitchGroup(e.target.value)}
                  className="w-full h-10 px-3 rounded-lg border border-slate-400 text-sm text-slate-900 bg-white"
                >
                  {memberships.map((m) => (
                    <option key={m.group_id} value={m.group_id}>
                      Nro. {m.scout_groups?.number || '-'} - {m.scout_groups?.name || 'Grupo'} ({getRoleLabel(m.role)})
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className="text-xs text-slate-700 space-y-1">
              <p>
                Cambios pendientes en cola local:{' '}
                <span className="font-mono font-semibold">{syncState.pendingCount}</span>
                {syncState.conflictCount > 0 ? ` | Conflictos: ${syncState.conflictCount}` : ''}
              </p>
              {syncState.lastSyncAt ? (
                <p>
                  Ultima sincronizacion:{' '}
                  <span className="font-mono">{formatDateAr(syncState.lastSyncAt.slice(0, 10))}</span>
                </p>
              ) : (
                <p>Datos persistidos localmente en IndexedDB (consejoscout_db_v1).</p>
              )}
            </div>

            {session && isSupabaseConfigured && (
              <div className="flex flex-wrap gap-2 pt-1">
                {hasActiveGroup && (
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onOpenTeamManager();
                    }}
                    className="h-11 px-4 inline-flex items-center gap-2 rounded-lg bg-[#1B365D] text-white hover:bg-[#122643] text-sm font-semibold"
                  >
                    <Users className="w-4 h-4" aria-hidden="true" />
                    <span>Equipo e Invitaciones</span>
                  </button>
                )}

                {hasActiveGroup && (
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
                    <span>Sincronizar</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={onLogout}
                  className="h-11 px-4 inline-flex items-center gap-2 rounded-lg border border-red-700 text-red-900 bg-red-50 hover:bg-red-100 text-sm font-semibold"
                >
                  <LogOut className="w-4 h-4" aria-hidden="true" />
                  <span>Cerrar sesion</span>
                </button>
              </div>
            )}
          </section>

          {(!session || !hasActiveGroup || isSupabaseConfigured) && (
            <AuthTenantPanel
              session={session}
              pendingInviteCode={pendingInviteCode}
              hasActiveGroup={hasActiveGroup}
              onAuthChanged={onAuthChanged}
              onTenantReady={onTenantReady}
            />
          )}

          {(isDemoMode || hasActiveGroup) && (
            <form onSubmit={handleSaveGroup} className="pt-4 border-t border-slate-200 space-y-4">
              <div className="flex items-center justify-between gap-2">
                <h3 className="text-base font-semibold text-slate-900">
                  Identidad del Grupo Scout
                </h3>
                {!canEditGroup && (
                  <span className="text-xs font-medium text-slate-600">
                    Solo lectura (Jefe/Subjefe)
                  </span>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label htmlFor="group-number-input" className="block text-sm font-medium text-slate-700 mb-1">
                    Nro. de Grupo
                  </label>
                  <input
                    id="group-number-input"
                    type="number"
                    min={1}
                    disabled={!canEditGroup}
                    value={number}
                    onChange={(e) => setNumber(e.target.value)}
                    className="w-full h-11 px-3 rounded-lg border border-slate-500 text-base text-slate-900 bg-white font-mono disabled:bg-slate-100"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label htmlFor="group-name-input" className="block text-sm font-medium text-slate-700 mb-1">
                    Nombre oficial del Grupo
                  </label>
                  <input
                    id="group-name-input"
                    type="text"
                    disabled={!canEditGroup}
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full h-11 px-3 rounded-lg border border-slate-500 text-base text-slate-900 bg-white disabled:bg-slate-100"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label htmlFor="group-district-input" className="block text-sm font-medium text-slate-700 mb-1">
                    Distrito
                  </label>
                  <input
                    id="group-district-input"
                    type="text"
                    disabled={!canEditGroup}
                    value={district}
                    onChange={(e) => setDistrict(e.target.value)}
                    className="w-full h-11 px-3 rounded-lg border border-slate-500 text-base text-slate-900 bg-white disabled:bg-slate-100"
                  />
                </div>

                <div>
                  <label htmlFor="group-zone-input" className="block text-sm font-medium text-slate-700 mb-1">
                    Zona
                  </label>
                  <input
                    id="group-zone-input"
                    type="text"
                    disabled={!canEditGroup}
                    value={zone}
                    onChange={(e) => setZone(e.target.value)}
                    className="w-full h-11 px-3 rounded-lg border border-slate-500 text-base text-slate-900 bg-white disabled:bg-slate-100"
                  />
                </div>

                <div>
                  <label htmlFor="group-org-model" className="block text-sm font-medium text-slate-700 mb-1">
                    Modalidad
                  </label>
                  <select
                    id="group-org-model"
                    disabled={!canEditGroup}
                    value={orgModel}
                    onChange={(e) => setOrgModel(e.target.value)}
                    className="w-full h-11 px-3 rounded-lg border border-slate-500 text-base text-slate-900 bg-white disabled:bg-slate-100"
                  >
                    <option value="tradicional">Tradicional</option>
                    <option value="nucleo">Nucleo</option>
                    <option value="comunitario">Comunitario</option>
                    <option value="escolar">Escolar</option>
                  </select>
                </div>
              </div>

              <GroupBrandingFields
                groupName={name}
                groupNumber={number}
                primaryColor={primaryColor}
                accentColor={accentColor}
                logoUrl={logoUrl}
                disabled={!canEditBranding}
                onChangePrimaryColor={setPrimaryColor}
                onChangeAccentColor={setAccentColor}
                onChangeLogoUrl={setLogoUrl}
              />

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

              {canEditGroup && (
                <button
                  type="submit"
                  className="w-full h-12 bg-[#1B365D] hover:bg-[#122643] text-white font-semibold rounded-lg transition-colors"
                >
                  Guardar datos del Grupo
                </button>
              )}
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
