import { ShieldCheck, WifiOff } from 'lucide-react';
import AuthTenantPanel from './AuthTenantPanel.jsx';
import FleurDeLisIcon from './FleurDeLisIcon.jsx';

export default function AuthScreen({
  session,
  isOnline = true,
  isPlatformAdmin = false,
  pendingInviteCode,
  hasActiveGroup,
  onAuthChanged,
  onTenantReady,
  onOpenPlatformAdmin,
  onContinueDemo,
  onLogout
}) {
  return (
    <div className="min-h-dvh bg-slate-100 flex flex-col justify-center py-8 px-4">
      <div className="w-full max-w-md mx-auto space-y-5">
        <div className="text-center space-y-2">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-[var(--brand-primary)] text-white inline-flex items-center justify-center shadow-sm">
            <FleurDeLisIcon className="w-8 h-8" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            ConsejoScout
          </h1>
          <p className="text-sm text-slate-700">
            Gestion multi-grupo para Jefes de Grupo, Subjefes, Jefes de Rama y Educadores SAAC.
          </p>
          {!isOnline && (
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border border-amber-700 bg-amber-100 text-amber-900 text-xs font-semibold">
              <WifiOff className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Sin conexion a internet: modo local disponible</span>
            </div>
          )}
        </div>

        <div className="bg-white border border-slate-300 rounded-2xl shadow-sm p-5 sm:p-6 space-y-5">
          <AuthTenantPanel
            session={session}
            pendingInviteCode={pendingInviteCode}
            hasActiveGroup={hasActiveGroup}
            onAuthChanged={onAuthChanged}
            onTenantReady={onTenantReady}
          />

          <div className="pt-4 border-t border-slate-200 space-y-2.5">
            {session && isPlatformAdmin && onOpenPlatformAdmin && (
              <button
                type="button"
                onClick={onOpenPlatformAdmin}
                className="w-full h-11 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-sm font-semibold inline-flex items-center justify-center gap-2 transition-colors"
              >
                <ShieldCheck className="w-4 h-4" aria-hidden="true" />
                <span>Admin Global (ver y gestionar todos los Grupos)</span>
              </button>
            )}

            {!session ? (
              <button
                type="button"
                onClick={onContinueDemo}
                className="w-full h-11 rounded-lg border border-slate-300 bg-slate-50 hover:bg-slate-100 text-slate-800 text-sm font-semibold inline-flex items-center justify-center gap-2 transition-colors"
              >
                <WifiOff className="w-4 h-4 text-[var(--brand-primary)]" aria-hidden="true" />
                <span>Entrar en Modo Sin Conexion / Demo Local</span>
              </button>
            ) : (
              <div className="flex flex-col sm:flex-row gap-2">
                <button
                  type="button"
                  onClick={onContinueDemo}
                  className="flex-1 h-10 rounded-lg border border-slate-300 bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-semibold"
                >
                  Entrar en Modo Sin Conexion
                </button>
                <button
                  type="button"
                  onClick={onLogout}
                  className="flex-1 h-10 rounded-lg border border-red-700 text-red-900 bg-red-50 hover:bg-red-100 text-xs font-semibold"
                >
                  Cerrar sesion
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
