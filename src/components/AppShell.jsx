import {
  AlertTriangle,
  Bell,
  BellOff,
  BellRing,
  BookOpenCheck,
  CheckCircle2,
  FileText,
  LayoutDashboard,
  LogIn,
  LogOut,
  RefreshCw,
  Settings,
  ShieldCheck,
  Tent,
  Users,
  Wifi,
  WifiOff,
  X
} from 'lucide-react';
import { getRoleLabel } from '../domain/roles.js';
import GroupLogoBadge from './GroupLogoBadge.jsx';

export const NAV_ITEMS = Object.freeze([
  Object.freeze({
    id: 'dashboard',
    label: 'Tablero',
    title: 'Tablero del Grupo',
    icon: LayoutDashboard
  }),
  Object.freeze({
    id: 'normativa',
    label: 'Normativa',
    title: 'Asistente Normativo',
    icon: BookOpenCheck
  }),
  Object.freeze({
    id: 'campamentos',
    label: 'Salidas',
    title: 'Gestor de Salidas',
    icon: Tent
  }),
  Object.freeze({
    id: 'documentos',
    label: 'Actas y Notas',
    title: 'Generador de Notas',
    icon: FileText
  })
]);

function PushBellIcon({ pushState }) {
  if (pushState === 'granted') {
    return <BellRing className="w-5 h-5 text-green-700" aria-hidden="true" />;
  }
  if (pushState === 'denied') {
    return <BellOff className="w-5 h-5 text-red-700" aria-hidden="true" />;
  }
  return (
    <span className="relative inline-flex">
      <Bell className="w-5 h-5 text-slate-700" aria-hidden="true" />
      <span
        className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-amber-600 border border-white"
        aria-hidden="true"
      />
    </span>
  );
}

export default function AppShell({
  activeTab,
  onSelectTab,
  groupProfile,
  userRole,
  isDemoMode,
  isAuthenticated,
  isPlatformAdmin = false,
  viaPlatformAdmin = false,
  isOnline,
  networkOnline = true,
  manualOffline = false,
  onToggleManualOffline,
  onManualSync,
  syncFeedback,
  onDismissSyncFeedback,
  pushState,
  onOpenPushManager,
  onOpenTeamManager,
  onOpenPlatformAdmin,
  onOpenAuthScreen,
  onOpenSettings,
  syncState,
  needRefresh,
  onAcceptSwUpdate,
  onDismissSwUpdate,
  children
}) {
  const activeNav = NAV_ITEMS.find((item) => item.id === activeTab) || NAV_ITEMS[0];
  const roleTag = isDemoMode
    ? 'Demo'
    : viaPlatformAdmin
      ? 'Admin Global'
      : getRoleLabel(userRole);
  const groupSubtitle = groupProfile
    ? `Nro. ${groupProfile.number || '-'} - ${roleTag}`
    : isPlatformAdmin
      ? 'Panel Admin Global'
      : 'ConsejoScout SAAC';

  return (
    <div className="min-h-dvh bg-slate-50 text-slate-900 flex flex-col md:flex-row">
      {/* Sidebar Desktop / Tablet */}
      <aside
        aria-label="Navegacion principal escritorio"
        className="hidden md:flex md:flex-col md:fixed md:inset-y-0 md:left-0 md:w-20 lg:w-64 bg-white border-r border-slate-300 z-30"
      >
        <div
          className="px-4 py-4 border-b border-slate-200 flex items-center gap-3"
          style={{ borderTop: '3px solid var(--brand-accent, #2E7D32)' }}
        >
          <GroupLogoBadge
            logoUrl={groupProfile?.logo_url}
            primaryColor={groupProfile?.primary_color}
            sizeClass="w-10 h-10"
            iconClass="w-5 h-5"
          />
          <div className="hidden lg:block min-w-0">
            <p className="text-base font-bold text-slate-900 leading-tight truncate">
              {groupProfile?.name ? `Grupo ${groupProfile.number || ''}`.trim() : 'ConsejoScout'}
            </p>
            <p className="text-xs text-slate-600 truncate">{groupSubtitle}</p>
          </div>
        </div>

        <nav className="flex-1 p-3 space-y-1.5" aria-label="Vistas principales">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive = item.id === activeTab;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onSelectTab(item.id)}
                aria-current={isActive ? 'page' : undefined}
                title={item.label}
                style={
                  isActive
                    ? {
                        backgroundColor: 'var(--brand-primary-soft, #F3ECF9)',
                        color: 'var(--brand-primary-soft-text, #4D207A)'
                      }
                    : undefined
                }
                className={`w-full min-h-[48px] px-3 rounded-lg flex items-center justify-center lg:justify-start gap-3 text-sm transition-colors ${
                  isActive
                    ? 'font-semibold'
                    : 'text-slate-700 font-medium hover:bg-slate-100'
                }`}
              >
                <Icon className="w-5 h-5 shrink-0" aria-hidden="true" />
                <span className="hidden lg:inline truncate">{item.label}</span>
              </button>
            );
          })}
        </nav>

        <div className="p-3 border-t border-slate-200 space-y-2">
          <button
            type="button"
            onClick={onToggleManualOffline}
            aria-pressed={manualOffline}
            title={
              !networkOnline
                ? 'Sin conexion a internet en el dispositivo'
                : manualOffline
                  ? 'Modo sin conexion activado manualmente (tocar para reconectar)'
                  : 'En linea (tocar para trabajar en Modo sin conexion)'
            }
            className={`w-full min-h-[42px] px-3 py-2 rounded-lg border text-xs font-semibold flex items-center justify-center lg:justify-between gap-2 transition-colors ${
              isOnline
                ? 'bg-green-100 border-green-700 text-green-900 hover:bg-green-200/70'
                : 'bg-amber-100 border-amber-700 text-amber-900 hover:bg-amber-200/70'
            }`}
          >
            <span className="inline-flex items-center gap-2 min-w-0">
              {isOnline ? (
                <Wifi className="w-4 h-4 shrink-0" aria-hidden="true" />
              ) : (
                <WifiOff className="w-4 h-4 shrink-0" aria-hidden="true" />
              )}
              <span className="hidden lg:inline truncate">
                {!networkOnline
                  ? 'Sin internet (Offline)'
                  : manualOffline
                    ? 'Modo sin conexion'
                    : 'En linea'}
              </span>
            </span>
            {syncState.pendingCount > 0 && (
              <span className="hidden lg:inline-flex px-1.5 py-0.5 rounded-full bg-white/80 text-[11px] font-mono">
                {syncState.pendingCount}
              </span>
            )}
          </button>

          {onManualSync && (
            <button
              type="button"
              onClick={onManualSync}
              disabled={syncState.isSyncing}
              aria-label="Sincronizar y aplicar cambios"
              className={`w-full min-h-[44px] px-3 rounded-lg border flex items-center justify-center lg:justify-between gap-2 text-sm font-semibold transition-colors disabled:opacity-60 ${
                syncState.pendingCount > 0 && networkOnline
                  ? 'bg-[var(--brand-primary)] border-[var(--brand-primary)] text-white hover:bg-[var(--brand-primary-hover)]'
                  : 'border-[var(--brand-primary)] text-[var(--brand-primary)] bg-white hover:bg-[var(--brand-primary-soft)]'
              }`}
            >
              <span className="inline-flex items-center gap-2.5 min-w-0">
                <RefreshCw
                  className={`w-4 h-4 shrink-0 ${syncState.isSyncing ? 'animate-spin' : ''}`}
                  aria-hidden="true"
                />
                <span className="hidden lg:inline truncate">
                  {syncState.isSyncing ? 'Sincronizando...' : 'Sincronizar'}
                </span>
              </span>
              {syncState.pendingCount > 0 && (
                <span className="hidden lg:inline-flex px-2 py-0.5 rounded-full text-xs font-mono bg-amber-100 text-amber-900">
                  {syncState.pendingCount}
                </span>
              )}
            </button>
          )}

          {(isDemoMode || !isAuthenticated) && onOpenAuthScreen && (
            <button
              type="button"
              onClick={onOpenAuthScreen}
              aria-label={isDemoMode ? 'Salir de la demo local' : 'Iniciar sesion con correo y contrasena'}
              className="w-full min-h-[44px] px-3 rounded-lg bg-[var(--brand-primary)] hover:bg-[var(--brand-primary-hover)] flex items-center justify-center lg:justify-start gap-3 text-sm font-semibold text-white"
            >
              {isDemoMode ? (
                <LogOut className="w-5 h-5 shrink-0" aria-hidden="true" />
              ) : (
                <LogIn className="w-5 h-5 shrink-0" aria-hidden="true" />
              )}
              <span className="hidden lg:inline truncate">
                {isDemoMode ? 'Salir de la demo' : 'Iniciar sesion'}
              </span>
            </button>
          )}

          <button
            type="button"
            onClick={onOpenPushManager}
            aria-label="Abrir alertas push"
            className="w-full min-h-[44px] px-3 rounded-lg border border-slate-300 bg-white hover:bg-slate-100 flex items-center justify-center lg:justify-start gap-3 text-sm font-medium text-slate-800"
          >
            <PushBellIcon pushState={pushState} />
            <span className="hidden lg:inline truncate">Alertas Push</span>
          </button>

          {isPlatformAdmin && onOpenPlatformAdmin && (
            <button
              type="button"
              onClick={onOpenPlatformAdmin}
              aria-label="Administracion Global de Grupos"
              className="w-full min-h-[44px] px-3 rounded-lg bg-slate-900 hover:bg-slate-800 text-white flex items-center justify-center lg:justify-start gap-3 text-sm font-semibold transition-colors"
            >
              <ShieldCheck className="w-5 h-5 shrink-0" aria-hidden="true" />
              <span className="hidden lg:inline truncate">Admin Global</span>
            </button>
          )}

          {onOpenTeamManager && (
            <button
              type="button"
              onClick={onOpenTeamManager}
              aria-label="Equipo e invitaciones"
              className="w-full min-h-[44px] px-3 rounded-lg border border-slate-300 bg-white hover:bg-slate-100 flex items-center justify-center lg:justify-start gap-3 text-sm font-medium text-slate-800"
            >
              <Users className="w-5 h-5 text-slate-700 shrink-0" aria-hidden="true" />
              <span className="hidden lg:inline truncate">Equipo</span>
            </button>
          )}

          <button
            type="button"
            onClick={onOpenSettings}
            aria-label="Abrir ajustes del grupo"
            className="w-full min-h-[44px] px-3 rounded-lg border border-slate-300 bg-white hover:bg-slate-100 flex items-center justify-center lg:justify-start gap-3 text-sm font-medium text-slate-800"
          >
            <Settings className="w-5 h-5 text-slate-700 shrink-0" aria-hidden="true" />
            <span className="hidden lg:inline truncate">Ajustes del Grupo</span>
          </button>
        </div>
      </aside>

      {/* TopAppBar Mobile */}
      <header
        className="md:hidden sticky top-0 z-30 bg-white border-b border-slate-300 pt-safe-top"
        style={{ borderTop: '3px solid var(--brand-accent, #2E7D32)' }}
      >
        <div className="h-14 px-4 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2.5 min-w-0">
            <GroupLogoBadge
              logoUrl={groupProfile?.logo_url}
              primaryColor={groupProfile?.primary_color}
              sizeClass="w-9 h-9"
              iconClass="w-5 h-5"
            />
            <div className="min-w-0">
              <p className="text-sm font-bold text-slate-900 leading-tight truncate">
                {activeNav.title}
              </p>
              <p className="text-xs text-slate-600 truncate">{groupSubtitle}</p>
            </div>
          </div>

          <div className="flex items-center gap-1 shrink-0">
            <button
              type="button"
              onClick={onToggleManualOffline}
              aria-pressed={manualOffline}
              aria-label={isOnline ? 'Activar modo sin conexion' : 'Modo sin conexion activo'}
              title={isOnline ? 'Tocar para activar Modo sin conexion' : 'Modo sin conexion activo'}
              className={`min-w-[36px] h-9 px-2 rounded-lg border inline-flex items-center justify-center gap-1 text-xs font-semibold ${
                isOnline
                  ? 'bg-green-100 border-green-700 text-green-900'
                  : 'bg-amber-100 border-amber-700 text-amber-900'
              }`}
            >
              {isOnline ? (
                <Wifi className="w-4 h-4" aria-hidden="true" />
              ) : (
                <WifiOff className="w-4 h-4" aria-hidden="true" />
              )}
              <span className="hidden sm:inline">{isOnline ? 'En linea' : 'Offline'}</span>
            </button>

            {onManualSync && (
              <button
                type="button"
                onClick={onManualSync}
                disabled={syncState.isSyncing}
                aria-label="Sincronizar cambios"
                title="Sincronizar cambios"
                className={`relative min-w-[40px] h-9 px-2.5 rounded-lg border inline-flex items-center justify-center gap-1 text-xs font-semibold disabled:opacity-60 ${
                  syncState.pendingCount > 0 && networkOnline
                    ? 'bg-[var(--brand-primary)] border-[var(--brand-primary)] text-white'
                    : 'border-slate-300 bg-white text-slate-800 hover:bg-slate-100'
                }`}
              >
                <RefreshCw
                  className={`w-4 h-4 ${syncState.isSyncing ? 'animate-spin' : ''}`}
                  aria-hidden="true"
                />
                {syncState.pendingCount > 0 && (
                  <span className="font-mono text-[11px]">{syncState.pendingCount}</span>
                )}
              </button>
            )}

            {(isDemoMode || !isAuthenticated) && onOpenAuthScreen && (
              <button
                type="button"
                onClick={onOpenAuthScreen}
                aria-label={isDemoMode ? 'Salir de la demo' : 'Iniciar sesion'}
                className="h-9 px-2.5 inline-flex items-center justify-center gap-1 rounded-lg bg-[var(--brand-primary)] text-white text-xs font-semibold"
              >
                {isDemoMode ? (
                  <LogOut className="w-3.5 h-3.5" aria-hidden="true" />
                ) : (
                  <LogIn className="w-3.5 h-3.5" aria-hidden="true" />
                )}
                <span>{isDemoMode ? 'Salir demo' : 'Ingresar'}</span>
              </button>
            )}

            <button
              type="button"
              onClick={onOpenPushManager}
              aria-label="Centro de alertas push"
              className="min-w-[44px] min-h-[44px] inline-flex items-center justify-center rounded-lg hover:bg-slate-100"
            >
              <PushBellIcon pushState={pushState} />
            </button>

            {isPlatformAdmin && onOpenPlatformAdmin && (
              <button
                type="button"
                onClick={onOpenPlatformAdmin}
                aria-label="Administracion Global de Grupos"
                className="min-w-[44px] min-h-[44px] inline-flex items-center justify-center rounded-lg bg-slate-900 text-white hover:bg-slate-800"
              >
                <ShieldCheck className="w-5 h-5" aria-hidden="true" />
              </button>
            )}

            {onOpenTeamManager && (
              <button
                type="button"
                onClick={onOpenTeamManager}
                aria-label="Equipo e invitaciones"
                className="min-w-[44px] min-h-[44px] inline-flex items-center justify-center rounded-lg text-slate-700 hover:bg-slate-100"
              >
                <Users className="w-5 h-5" aria-hidden="true" />
              </button>
            )}

            <button
              type="button"
              onClick={onOpenSettings}
              aria-label="Ajustes del Grupo"
              className="min-w-[44px] min-h-[44px] inline-flex items-center justify-center rounded-lg text-slate-700 hover:bg-slate-100"
            >
              <Settings className="w-5 h-5" aria-hidden="true" />
            </button>
          </div>
        </div>
      </header>

      {/* Banner controlado de actualizacion de Service Worker */}
      {needRefresh && (
        <div
          role="status"
          aria-live="polite"
          className="md:ml-20 lg:ml-64 bg-[var(--brand-primary)] text-white px-4 py-3 flex flex-wrap items-center justify-between gap-3 z-20"
        >
          <div className="flex items-center gap-2 text-sm font-medium">
            <RefreshCw className="w-4 h-4 shrink-0" aria-hidden="true" />
            <span>Nueva version de ConsejoScout disponible.</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onAcceptSwUpdate}
              className="h-10 px-4 rounded-lg bg-white text-[var(--brand-primary)] text-sm font-semibold hover:bg-slate-100"
            >
              Actualizar ahora
            </button>
            <button
              type="button"
              onClick={onDismissSwUpdate}
              aria-label="Posponer actualizacion"
              className="min-w-[40px] min-h-[40px] inline-flex items-center justify-center rounded-lg hover:bg-white/10"
            >
              <X className="w-4 h-4" aria-hidden="true" />
            </button>
          </div>
        </div>
      )}

      {/* Banner de Modo sin conexion / Cambios pendientes / Sincronizacion */}
      {(!isOnline || syncState.pendingCount > 0 || syncFeedback) && (
        <div className="md:ml-20 lg:ml-64 px-4 pt-3">
          <div className="max-w-7xl mx-auto space-y-2">
            {(!isOnline || syncState.pendingCount > 0) && (
              <div
                role="status"
                aria-live="polite"
                className={`p-3 rounded-xl border flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5 text-xs sm:text-sm ${
                  !isOnline
                    ? 'bg-amber-50 border-amber-700 text-amber-950'
                    : 'bg-[var(--brand-primary-soft)] border-[var(--brand-primary)] text-slate-900'
                }`}
              >
                <div className="flex items-start sm:items-center gap-2">
                  {!isOnline ? (
                    <WifiOff className="w-4 h-4 text-amber-800 shrink-0 mt-0.5 sm:mt-0" aria-hidden="true" />
                  ) : (
                    <RefreshCw className="w-4 h-4 text-[var(--brand-primary)] shrink-0 mt-0.5 sm:mt-0" aria-hidden="true" />
                  )}
                  <span>
                    {!isOnline
                      ? `Modo sin conexion activo: podes consultar toda la informacion del Grupo.${
                          syncState.pendingCount > 0
                            ? ` Tenes ${syncState.pendingCount} cambio(s) guardados localmente para aplicar al reconectarte.`
                            : ' Cualquier cambio se guardara localmente para sincronizar luego.'
                        }`
                      : `Conexion activa con ${syncState.pendingCount} cambio(s) pendiente(s) por aplicar en la nube.`}
                  </span>
                </div>

                {onManualSync && networkOnline && (syncState.pendingCount > 0 || manualOffline) && (
                  <button
                    type="button"
                    onClick={onManualSync}
                    disabled={syncState.isSyncing}
                    className="h-9 px-3.5 rounded-lg bg-[var(--brand-primary)] hover:bg-[var(--brand-primary-hover)] text-white text-xs font-semibold inline-flex items-center justify-center gap-1.5 shrink-0 disabled:opacity-60"
                  >
                    <RefreshCw
                      className={`w-3.5 h-3.5 ${syncState.isSyncing ? 'animate-spin' : ''}`}
                      aria-hidden="true"
                    />
                    <span>
                      {syncState.isSyncing
                        ? 'Sincronizando...'
                        : syncState.pendingCount > 0
                          ? 'Aplicar cambios ahora'
                          : 'Salir de offline y sincronizar'}
                    </span>
                  </button>
                )}
              </div>
            )}

            {syncFeedback && (
              <div
                role="status"
                className={`p-3 rounded-xl border text-xs sm:text-sm flex items-center justify-between gap-2 ${
                  syncFeedback.type === 'success'
                    ? 'bg-green-100 border-green-700 text-green-900'
                    : syncFeedback.type === 'warning'
                      ? 'bg-amber-100 border-amber-700 text-amber-900'
                      : 'bg-red-100 border-red-700 text-red-900'
                }`}
              >
                <div className="flex items-center gap-2">
                  {syncFeedback.type === 'success' ? (
                    <CheckCircle2 className="w-4 h-4 shrink-0" aria-hidden="true" />
                  ) : (
                    <AlertTriangle className="w-4 h-4 shrink-0" aria-hidden="true" />
                  )}
                  <span>{syncFeedback.text}</span>
                </div>
                {onDismissSyncFeedback && (
                  <button
                    type="button"
                    onClick={onDismissSyncFeedback}
                    aria-label="Cerrar aviso de sincronizacion"
                    className="min-w-[32px] min-h-[32px] inline-flex items-center justify-center rounded-lg hover:bg-black/5"
                  >
                    <X className="w-4 h-4" aria-hidden="true" />
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Contenedor Principal */}
      <main
        className={`flex-1 md:ml-20 lg:ml-64 ${
          activeTab === 'normativa' ? '' : 'pb-safe-nav md:pb-8'
        }`}
      >
        <div
          className={
            activeTab === 'normativa'
              ? 'h-full'
              : 'max-w-7xl mx-auto px-4 py-4 md:px-6 md:py-6'
          }
        >
          {children}
        </div>
      </main>

      {/* BottomNavBar Mobile (Thumb-Zone) */}
      <nav
        aria-label="Navegacion inferior"
        className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-white border-t border-slate-300 pb-safe-bottom"
      >
        <div className="h-16 grid grid-cols-4">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive = item.id === activeTab;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onSelectTab(item.id)}
                aria-current={isActive ? 'page' : undefined}
                className="min-h-[48px] flex flex-col items-center justify-center gap-0.5 px-1"
              >
                <span
                  style={
                    isActive
                      ? {
                          backgroundColor: 'var(--brand-primary-soft, #F3ECF9)',
                          color: 'var(--brand-primary-soft-text, #4D207A)'
                        }
                      : undefined
                  }
                  className={`px-3.5 py-1 rounded-full transition-colors ${
                    isActive ? '' : 'text-slate-600'
                  }`}
                >
                  <Icon className="w-5 h-5" aria-hidden="true" />
                </span>
                <span
                  style={
                    isActive
                      ? { color: 'var(--brand-primary-soft-text, #4D207A)' }
                      : undefined
                  }
                  className={`text-[12px] leading-4 ${
                    isActive ? 'font-semibold' : 'text-slate-600 font-medium'
                  }`}
                >
                  {item.label}
                </span>
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
