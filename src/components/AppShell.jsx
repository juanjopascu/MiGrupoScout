import {
  Bell,
  BellOff,
  BellRing,
  BookOpenCheck,
  FileText,
  LayoutDashboard,
  RefreshCw,
  Settings,
  Shield,
  Tent,
  Wifi,
  WifiOff,
  X
} from 'lucide-react';

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
  isOnline,
  pushState,
  onOpenPushManager,
  onOpenSettings,
  syncState,
  needRefresh,
  onAcceptSwUpdate,
  onDismissSwUpdate,
  children
}) {
  const activeNav = NAV_ITEMS.find((item) => item.id === activeTab) || NAV_ITEMS[0];
  const groupSubtitle = groupProfile
    ? `Nro. ${groupProfile.number || '-'} - ${groupProfile.district || 'Distrito'}`
    : 'ConsejoScout SAAC';

  return (
    <div className="min-h-dvh bg-slate-50 text-slate-900 flex flex-col md:flex-row">
      {/* Sidebar Desktop / Tablet */}
      <aside
        aria-label="Navegacion principal escritorio"
        className="hidden md:flex md:flex-col md:fixed md:inset-y-0 md:left-0 md:w-20 lg:w-64 bg-white border-r border-slate-300 z-30"
      >
        <div className="px-4 py-4 border-b border-slate-200 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#1B365D] text-white inline-flex items-center justify-center shrink-0">
            <Shield className="w-5 h-5" aria-hidden="true" />
          </div>
          <div className="hidden lg:block min-w-0">
            <p className="text-base font-bold text-slate-900 leading-tight truncate">
              ConsejoScout
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
                className={`w-full min-h-[48px] px-3 rounded-lg flex items-center justify-center lg:justify-start gap-3 text-sm transition-colors ${
                  isActive
                    ? 'bg-[#EBF2FA] text-[#1B365D] font-semibold'
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
          <div
            className={`min-h-[40px] px-3 py-2 rounded-lg border text-xs font-semibold flex items-center justify-center lg:justify-start gap-2 ${
              isOnline
                ? 'bg-green-100 border-green-700 text-green-900'
                : 'bg-amber-100 border-amber-700 text-amber-900'
            }`}
          >
            {isOnline ? (
              <Wifi className="w-4 h-4 shrink-0" aria-hidden="true" />
            ) : (
              <WifiOff className="w-4 h-4 shrink-0" aria-hidden="true" />
            )}
            <span className="hidden lg:inline truncate">
              {isOnline ? 'En linea' : 'Modo Offline'}
              {syncState.pendingCount > 0 ? ` (${syncState.pendingCount} pend.)` : ''}
            </span>
          </div>

          <button
            type="button"
            onClick={onOpenPushManager}
            aria-label="Abrir alertas push"
            className="w-full min-h-[44px] px-3 rounded-lg border border-slate-300 bg-white hover:bg-slate-100 flex items-center justify-center lg:justify-start gap-3 text-sm font-medium text-slate-800"
          >
            <PushBellIcon pushState={pushState} />
            <span className="hidden lg:inline truncate">Alertas Push</span>
          </button>

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
      <header className="md:hidden sticky top-0 z-30 bg-white border-b border-slate-300 pt-safe-top">
        <div className="h-14 px-4 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 rounded-lg bg-[#1B365D] text-white inline-flex items-center justify-center shrink-0">
              <Shield className="w-5 h-5" aria-hidden="true" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-bold text-slate-900 leading-tight truncate">
                {activeNav.title}
              </p>
              <p className="text-xs text-slate-600 truncate">{groupSubtitle}</p>
            </div>
          </div>

          <div className="flex items-center gap-1 shrink-0">
            <span
              role="status"
              aria-label={isOnline ? 'Conexion activa' : 'Sin conexion a internet'}
              title={isOnline ? 'En linea' : 'Sin conexion'}
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
            </span>

            <button
              type="button"
              onClick={onOpenPushManager}
              aria-label="Centro de alertas push"
              className="min-w-[44px] min-h-[44px] inline-flex items-center justify-center rounded-lg hover:bg-slate-100"
            >
              <PushBellIcon pushState={pushState} />
            </button>

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
          className="md:ml-20 lg:ml-64 bg-[#1B365D] text-white px-4 py-3 flex flex-wrap items-center justify-between gap-3 z-20"
        >
          <div className="flex items-center gap-2 text-sm font-medium">
            <RefreshCw className="w-4 h-4 shrink-0" aria-hidden="true" />
            <span>Nueva version de ConsejoScout disponible.</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onAcceptSwUpdate}
              className="h-10 px-4 rounded-lg bg-white text-[#1B365D] text-sm font-semibold hover:bg-slate-100"
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
                  className={`px-3.5 py-1 rounded-full transition-colors ${
                    isActive ? 'bg-[#EBF2FA] text-[#1B365D]' : 'text-slate-600'
                  }`}
                >
                  <Icon className="w-5 h-5" aria-hidden="true" />
                </span>
                <span
                  className={`text-[12px] leading-4 ${
                    isActive
                      ? 'text-[#1B365D] font-semibold'
                      : 'text-slate-600 font-medium'
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
