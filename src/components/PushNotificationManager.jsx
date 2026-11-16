import { useEffect, useState } from 'react';
import {
  AlertCircle,
  AlertTriangle,
  Bell,
  BellOff,
  BellRing,
  Check,
  CheckCircle2,
  Loader2,
  Lock,
  PlusSquare,
  RefreshCw,
  Send,
  Settings,
  Share,
  ShieldAlert,
  Smartphone,
  X
} from 'lucide-react';
import {
  detectPushState,
  getPushPreferences,
  savePushPreferences,
  sendTestPush,
  subscribeToPush,
  unsubscribeFromPush
} from '../services/pushClient.js';

export default function PushNotificationManager({
  isOpen,
  onClose,
  groupId,
  session,
  pushState,
  onPushStateChange
}) {
  const [localState, setLocalState] = useState(pushState || 'checking');
  const [prefs, setPrefs] = useState(() => getPushPreferences());
  const [feedback, setFeedback] = useState(null);
  const [isSendingTest, setIsSendingTest] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      return;
    }
    setFeedback(null);
    let cancelled = false;

    async function refreshState() {
      setLocalState('checking');
      const result = await detectPushState();
      if (!cancelled) {
        setLocalState(result.status);
        onPushStateChange?.(result.status);
      }
    }

    void refreshState();

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      cancelled = true;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose, onPushStateChange]);

  if (!isOpen) {
    return null;
  }

  async function handleCheckAgain() {
    setFeedback(null);
    setLocalState('checking');
    const result = await detectPushState();
    setLocalState(result.status);
    onPushStateChange?.(result.status);
  }

  async function handleSubscribe() {
    setFeedback(null);
    setLocalState('subscribing');
    const result = await subscribeToPush({ groupId, session });
    setLocalState(result.status);
    onPushStateChange?.(result.status);
    if (!result.ok && result.error) {
      setFeedback({ type: 'error', text: result.error });
    } else if (result.ok && result.message) {
      setFeedback({ type: 'info', text: result.message });
    }
  }

  async function handleSendTest() {
    setIsSendingTest(true);
    setFeedback(null);
    try {
      const result = await sendTestPush({ groupId, session });
      if (result.ok) {
        setFeedback({
          type: 'success',
          text: result.message || 'Notificacion de prueba enviada'
        });
      } else {
        setFeedback({
          type: 'error',
          text: result.error || 'No se pudo enviar la notificacion de prueba.'
        });
      }
    } catch {
      setFeedback({
        type: 'error',
        text: 'Error de red al intentar enviar la notificacion de prueba.'
      });
    } finally {
      setIsSendingTest(false);
    }
  }

  async function handleUnsubscribe() {
    setFeedback(null);
    const result = await unsubscribeFromPush({ session });
    setLocalState(result.status);
    onPushStateChange?.(result.status);
    setFeedback({
      type: 'info',
      text: 'Alertas desactivadas en este dispositivo.'
    });
  }

  function handleTogglePref(key) {
    const next = savePushPreferences({ [key]: !prefs[key] });
    setPrefs(next);
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
        aria-labelledby="push-manager-title"
        className="w-full sm:max-w-lg bg-white border border-slate-300 rounded-t-2xl sm:rounded-2xl shadow-lg max-h-[90dvh] overflow-y-auto pb-safe-bottom"
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200">
          <div className="flex items-center gap-2.5">
            <BellRing className="w-5 h-5 text-[var(--brand-primary)]" aria-hidden="true" />
            <h2 id="push-manager-title" className="text-lg font-semibold text-slate-900">
              Centro de Alertas Push
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar gestor de notificaciones"
            className="min-w-[44px] min-h-[44px] inline-flex items-center justify-center rounded-lg text-slate-600 hover:bg-slate-100 hover:text-slate-900"
          >
            <X className="w-5 h-5" aria-hidden="true" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {localState === 'checking' && (
            <div className="flex items-center justify-center gap-3 py-8 text-slate-700">
              <Loader2 className="w-5 h-5 animate-spin text-[var(--brand-primary)]" aria-hidden="true" />
              <span className="text-sm font-medium">
                Verificando compatibilidad de alertas...
              </span>
            </div>
          )}

          {localState === 'ios-browser-unsupported' && (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-blue-100 border border-blue-700 text-blue-900 flex items-start gap-3">
                <Smartphone className="w-5 h-5 shrink-0 mt-0.5" aria-hidden="true" />
                <div>
                  <h3 className="text-base font-semibold">
                    Instala ConsejoScout para recibir alertas en iPhone o iPad
                  </h3>
                  <p className="text-sm mt-1">
                    Apple requiere agregar la aplicacion a la Pantalla de Inicio para habilitar notificaciones push.
                  </p>
                </div>
              </div>

              <ol className="space-y-3">
                <li className="flex items-center gap-3 p-3 rounded-xl border border-slate-300 bg-white">
                  <span className="w-10 h-10 rounded-lg bg-[var(--brand-primary-soft)] text-[var(--brand-primary)] inline-flex items-center justify-center shrink-0">
                    <Share className="w-5 h-5" aria-hidden="true" />
                  </span>
                  <span className="text-sm text-slate-800">
                    1. Toca el boton Compartir en la barra de Safari.
                  </span>
                </li>
                <li className="flex items-center gap-3 p-3 rounded-xl border border-slate-300 bg-white">
                  <span className="w-10 h-10 rounded-lg bg-[var(--brand-primary-soft)] text-[var(--brand-primary)] inline-flex items-center justify-center shrink-0">
                    <PlusSquare className="w-5 h-5" aria-hidden="true" />
                  </span>
                  <span className="text-sm text-slate-800">
                    2. Desliza y selecciona Agregar a inicio.
                  </span>
                </li>
                <li className="flex items-center gap-3 p-3 rounded-xl border border-slate-300 bg-white">
                  <span className="w-10 h-10 rounded-lg bg-[var(--brand-primary-soft)] text-[var(--brand-primary)] inline-flex items-center justify-center shrink-0">
                    <BellRing className="w-5 h-5" aria-hidden="true" />
                  </span>
                  <span className="text-sm text-slate-800">
                    3. Abre ConsejoScout desde el icono nuevo y activa las alertas aqui.
                  </span>
                </li>
              </ol>
            </div>
          )}

          {localState === 'unsupported' && (
            <div className="p-4 rounded-xl bg-amber-100 border border-amber-700 text-amber-900 flex items-start gap-3">
              <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" aria-hidden="true" />
              <p className="text-sm">
                Este navegador no admite notificaciones push web. Puedes consultar todos los vencimientos directamente desde el Tablero.
              </p>
            </div>
          )}

          {localState === 'default' && (
            <div className="space-y-4">
              <div className="flex flex-col items-center text-center space-y-3 pt-1">
                <div className="w-14 h-14 rounded-2xl bg-[var(--brand-primary-soft)] text-[var(--brand-primary)] inline-flex items-center justify-center">
                  <BellRing className="w-7 h-7" aria-hidden="true" />
                </div>
                <h3 className="text-lg font-semibold text-slate-900">
                  Alertas operativas del Grupo Scout
                </h3>
              </div>

              <ul className="space-y-2.5 text-sm text-slate-700 bg-slate-50 border border-slate-200 rounded-xl p-4">
                <li className="flex items-start gap-2.5">
                  <Check className="w-4 h-4 text-green-700 shrink-0 mt-0.5" aria-hidden="true" />
                  <span>Avisos de vencimiento de carpeta distrital antes de campamentos.</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <Check className="w-4 h-4 text-green-700 shrink-0 mt-0.5" aria-hidden="true" />
                  <span>Alertas por fichas medicas proximas a vencer.</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <Check className="w-4 h-4 text-green-700 shrink-0 mt-0.5" aria-hidden="true" />
                  <span>Recordatorios de reuniones y tareas del Consejo.</span>
                </li>
              </ul>

              <button
                type="button"
                onClick={handleSubscribe}
                className="w-full h-12 inline-flex items-center justify-center gap-2 bg-[var(--brand-primary)] hover:bg-[var(--brand-primary-hover)] text-white font-semibold rounded-lg transition-colors"
              >
                <Bell className="w-5 h-5" aria-hidden="true" />
                <span>Activar alertas del Grupo</span>
              </button>
            </div>
          )}

          {localState === 'subscribing' && (
            <div className="py-4">
              <button
                type="button"
                disabled
                className="w-full h-12 inline-flex items-center justify-center gap-2 bg-[var(--brand-primary)] opacity-80 text-white font-semibold rounded-lg cursor-not-allowed"
              >
                <Loader2 className="w-5 h-5 animate-spin" aria-hidden="true" />
                <span>Configurando suscripcion segura...</span>
              </button>
            </div>
          )}

          {localState === 'granted' && (
            <div className="space-y-4">
              <div className="p-3.5 rounded-xl bg-green-100 border border-green-700 text-green-900 flex items-center gap-2.5">
                <CheckCircle2 className="w-5 h-5 shrink-0" aria-hidden="true" />
                <span className="text-sm font-semibold">
                  Alertas activas en este dispositivo
                </span>
              </div>

              <div className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-600">
                  Categorias habilitadas
                </p>

                <label className="min-h-[44px] flex items-center justify-between gap-3 px-3 py-2 rounded-xl border border-slate-300 bg-white cursor-pointer">
                  <span className="text-sm font-medium text-slate-900">
                    Vencimientos de carpeta distrital
                  </span>
                  <input
                    type="checkbox"
                    checked={prefs.campDeadlines}
                    onChange={() => handleTogglePref('campDeadlines')}
                    className="w-5 h-5 accent-[var(--brand-primary)]"
                  />
                </label>

                <label className="min-h-[44px] flex items-center justify-between gap-3 px-3 py-2 rounded-xl border border-slate-300 bg-white cursor-pointer">
                  <span className="text-sm font-medium text-slate-900">
                    Fichas medicas y afiliaciones
                  </span>
                  <input
                    type="checkbox"
                    checked={prefs.medicalAndMembers}
                    onChange={() => handleTogglePref('medicalAndMembers')}
                    className="w-5 h-5 accent-[var(--brand-primary)]"
                  />
                </label>

                <label className="min-h-[44px] flex items-center justify-between gap-3 px-3 py-2 rounded-xl border border-slate-300 bg-white cursor-pointer">
                  <span className="text-sm font-medium text-slate-900">
                    Tareas del Consejo de Grupo
                  </span>
                  <input
                    type="checkbox"
                    checked={prefs.councilTasks}
                    onChange={() => handleTogglePref('councilTasks')}
                    className="w-5 h-5 accent-[var(--brand-primary)]"
                  />
                </label>
              </div>

              <button
                type="button"
                onClick={handleSendTest}
                disabled={isSendingTest}
                className="w-full min-h-[44px] h-11 inline-flex items-center justify-center gap-2 border border-[var(--brand-primary)] text-[var(--brand-primary)] hover:bg-[var(--brand-primary-soft)] font-semibold rounded-lg transition-colors disabled:opacity-60"
              >
                {isSendingTest ? (
                  <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
                ) : (
                  <Send className="w-4 h-4" aria-hidden="true" />
                )}
                <span>Enviar notificacion de prueba</span>
              </button>

              <div className="pt-1 border-t border-slate-200 flex justify-center">
                <button
                  type="button"
                  onClick={handleUnsubscribe}
                  className="min-h-[44px] px-4 inline-flex items-center gap-2 text-sm font-semibold text-red-700 hover:bg-red-50 rounded-lg transition-colors"
                >
                  <BellOff className="w-4 h-4" aria-hidden="true" />
                  <span>Desactivar alertas en este dispositivo</span>
                </button>
              </div>
            </div>
          )}

          {localState === 'denied' && (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-red-100 border border-red-700 text-red-900 space-y-2">
                <div className="flex items-start gap-2.5">
                  <ShieldAlert className="w-5 h-5 shrink-0 mt-0.5" aria-hidden="true" />
                  <h3 className="text-base font-semibold">
                    Las notificaciones estan bloqueadas en este navegador
                  </h3>
                </div>
                <p className="text-sm leading-relaxed">
                  Toca el icono de configuracion o candado junto a la barra de direcciones, habilita el permiso de Notificaciones y presiona Comprobar nuevamente.
                </p>
                <div className="flex items-center gap-3 pt-1 text-xs font-medium">
                  <span className="inline-flex items-center gap-1 bg-white/80 px-2.5 py-1 rounded-md border border-red-300">
                    <Lock className="w-3.5 h-3.5" aria-hidden="true" />
                    Candado de barra
                  </span>
                  <span className="inline-flex items-center gap-1 bg-white/80 px-2.5 py-1 rounded-md border border-red-300">
                    <Settings className="w-3.5 h-3.5" aria-hidden="true" />
                    Permisos del sitio
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={handleCheckAgain}
                className="w-full h-11 inline-flex items-center justify-center gap-2 border border-slate-400 text-slate-900 hover:bg-slate-100 font-semibold rounded-lg transition-colors"
              >
                <RefreshCw className="w-4 h-4" aria-hidden="true" />
                <span>Comprobar estado</span>
              </button>
            </div>
          )}

          {feedback && (
            <div
              aria-live="polite"
              className={`p-3 rounded-xl border text-sm flex items-start gap-2.5 ${
                feedback.type === 'success'
                  ? 'bg-green-100 border-green-700 text-green-900'
                  : feedback.type === 'error'
                  ? 'bg-red-100 border-red-700 text-red-900'
                  : 'bg-blue-100 border-blue-700 text-blue-900'
              }`}
            >
              {feedback.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" aria-hidden="true" />
              ) : (
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" aria-hidden="true" />
              )}
              <span>{feedback.text}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
