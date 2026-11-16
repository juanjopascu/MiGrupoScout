import { Compass, Shield } from 'lucide-react';
import AuthTenantPanel from './AuthTenantPanel.jsx';

export default function AuthScreen({
  session,
  pendingInviteCode,
  hasActiveGroup,
  onAuthChanged,
  onTenantReady,
  onContinueDemo,
  onLogout
}) {
  return (
    <div className="min-h-dvh bg-slate-100 flex flex-col justify-center py-8 px-4">
      <div className="w-full max-w-md mx-auto space-y-5">
        <div className="text-center space-y-2">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-[#1B365D] text-white inline-flex items-center justify-center shadow-sm">
            <Shield className="w-7 h-7" aria-hidden="true" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            ConsejoScout
          </h1>
          <p className="text-sm text-slate-700">
            Gestion multi-grupo para Jefes de Grupo, Subjefes, Jefes de Rama y Educadores SAAC.
          </p>
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
            {!session ? (
              <button
                type="button"
                onClick={onContinueDemo}
                className="w-full h-11 rounded-lg border border-slate-300 bg-slate-50 hover:bg-slate-100 text-slate-800 text-sm font-semibold inline-flex items-center justify-center gap-2 transition-colors"
              >
                <Compass className="w-4 h-4 text-[#1B365D]" aria-hidden="true" />
                <span>Explorar en Modo Demo Local (sin cuenta)</span>
              </button>
            ) : (
              <div className="flex flex-col sm:flex-row gap-2">
                <button
                  type="button"
                  onClick={onContinueDemo}
                  className="flex-1 h-10 rounded-lg border border-slate-300 bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-semibold"
                >
                  Ver Modo Demo
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
