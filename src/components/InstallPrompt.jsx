import { useEffect, useState } from 'react';
import { BellRing, Download, Info, PlusSquare, Share, Smartphone, X } from 'lucide-react';
import { LS_KEYS, readLocalPref, writeLocalPref } from '../services/offlineDb.js';
import { isIosDevice, isStandaloneMode } from '../services/pushClient.js';

const DISMISS_COOLDOWN_MS = 7 * 24 * 60 * 60 * 1000;

function isDismissedRecently() {
  const dismissedAt = readLocalPref(LS_KEYS.INSTALL_DISMISSED_AT, 0);
  if (!dismissedAt || typeof dismissedAt !== 'number') {
    return false;
  }
  return Date.now() - dismissedAt < DISMISS_COOLDOWN_MS;
}

export default function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [showIosBanner, setShowIosBanner] = useState(false);
  const [showIosModal, setShowIosModal] = useState(false);
  const [dismissed, setDismissed] = useState(() => isStandaloneMode() || isDismissedRecently());

  useEffect(() => {
    if (isStandaloneMode() || isDismissedRecently()) {
      return;
    }

    if (isIosDevice()) {
      setShowIosBanner(true);
    }

    const handleBeforeInstallPrompt = (event) => {
      event.preventDefault();
      setDeferredPrompt(event);
      setShowIosBanner(false);
    };

    const handleAppInstalled = () => {
      setDeferredPrompt(null);
      setShowIosBanner(false);
      setDismissed(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  function handleDismiss() {
    writeLocalPref(LS_KEYS.INSTALL_DISMISSED_AT, Date.now());
    setDismissed(true);
    setDeferredPrompt(null);
    setShowIosBanner(false);
    setShowIosModal(false);
  }

  async function handleInstallAndroid() {
    if (!deferredPrompt) {
      return;
    }
    try {
      await deferredPrompt.prompt();
      const choice = await deferredPrompt.userChoice;
      if (choice?.outcome === 'accepted') {
        setDismissed(true);
      }
    } finally {
      setDeferredPrompt(null);
    }
  }

  if (dismissed || isStandaloneMode()) {
    return null;
  }

  if (!deferredPrompt && !showIosBanner) {
    return null;
  }

  return (
    <>
      <aside
        aria-label="Instalacion de aplicacion"
        className="fixed z-30 bottom-above-nav left-4 right-4 md:left-auto md:right-6 md:bottom-6 md:w-full md:max-w-md bg-white border border-[#1B365D] shadow-lg rounded-xl p-4"
      >
        {deferredPrompt ? (
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-[#EBF2FA] text-[#1B365D] inline-flex items-center justify-center shrink-0">
              <Download className="w-5 h-5" aria-hidden="true" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-slate-900 truncate">
                Instala ConsejoScout
              </p>
              <p className="text-xs text-slate-600">
                Acceso inmediato y consulta offline en campamento
              </p>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              <button
                type="button"
                onClick={handleInstallAndroid}
                className="h-11 px-4 bg-[#1B365D] hover:bg-[#122643] text-white text-sm font-semibold rounded-lg transition-colors"
              >
                Instalar
              </button>
              <button
                type="button"
                onClick={handleDismiss}
                aria-label="Cerrar aviso de instalacion"
                className="min-w-[44px] min-h-[44px] inline-flex items-center justify-center rounded-lg text-slate-600 hover:bg-slate-100 hover:text-slate-900"
              >
                <X className="w-5 h-5" aria-hidden="true" />
              </button>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-[#EBF2FA] text-[#1B365D] inline-flex items-center justify-center shrink-0">
              <Smartphone className="w-5 h-5" aria-hidden="true" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-slate-900">
                Agrega ConsejoScout a tu inicio
              </p>
              <p className="text-xs text-slate-600">
                Uso offline en campo y alertas push en iOS
              </p>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              <button
                type="button"
                onClick={() => setShowIosModal(true)}
                className="h-11 px-3 inline-flex items-center gap-1.5 border border-[#1B365D] text-[#1B365D] hover:bg-[#EBF2FA] text-sm font-semibold rounded-lg transition-colors"
              >
                <Info className="w-4 h-4" aria-hidden="true" />
                <span>Ver pasos</span>
              </button>
              <button
                type="button"
                onClick={handleDismiss}
                aria-label="Cerrar aviso de instalacion"
                className="min-w-[44px] min-h-[44px] inline-flex items-center justify-center rounded-lg text-slate-600 hover:bg-slate-100 hover:text-slate-900"
              >
                <X className="w-5 h-5" aria-hidden="true" />
              </button>
            </div>
          </div>
        )}
      </aside>

      {showIosModal && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-900/50 p-0 sm:p-4"
          role="presentation"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowIosModal(false);
            }
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="ios-install-title"
            className="w-full sm:max-w-md bg-white border border-slate-300 rounded-t-2xl sm:rounded-2xl shadow-lg p-5 space-y-4 pb-safe-bottom"
          >
            <div className="flex items-center justify-between">
              <h2 id="ios-install-title" className="text-lg font-semibold text-slate-900">
                Instalar en iPhone o iPad
              </h2>
              <button
                type="button"
                onClick={() => setShowIosModal(false)}
                aria-label="Cerrar instrucciones de instalacion"
                className="min-w-[44px] min-h-[44px] inline-flex items-center justify-center rounded-lg text-slate-600 hover:bg-slate-100"
              >
                <X className="w-5 h-5" aria-hidden="true" />
              </button>
            </div>

            <ol className="space-y-3">
              <li className="flex items-center gap-3 p-3 rounded-xl border border-slate-300 bg-slate-50">
                <span className="w-10 h-10 rounded-lg bg-[#EBF2FA] text-[#1B365D] inline-flex items-center justify-center shrink-0">
                  <Share className="w-5 h-5" aria-hidden="true" />
                </span>
                <span className="text-sm text-slate-800">
                  1. Toca el boton Compartir en la barra inferior o superior de Safari.
                </span>
              </li>
              <li className="flex items-center gap-3 p-3 rounded-xl border border-slate-300 bg-slate-50">
                <span className="w-10 h-10 rounded-lg bg-[#EBF2FA] text-[#1B365D] inline-flex items-center justify-center shrink-0">
                  <PlusSquare className="w-5 h-5" aria-hidden="true" />
                </span>
                <span className="text-sm text-slate-800">
                  2. Selecciona Agregar a inicio en el menu de acciones.
                </span>
              </li>
              <li className="flex items-center gap-3 p-3 rounded-xl border border-slate-300 bg-slate-50">
                <span className="w-10 h-10 rounded-lg bg-[#EBF2FA] text-[#1B365D] inline-flex items-center justify-center shrink-0">
                  <BellRing className="w-5 h-5" aria-hidden="true" />
                </span>
                <span className="text-sm text-slate-800">
                  3. Abre ConsejoScout desde tu pantalla de inicio para usarla offline y activar alertas.
                </span>
              </li>
            </ol>

            <button
              type="button"
              onClick={() => setShowIosModal(false)}
              className="w-full h-12 bg-[#1B365D] hover:bg-[#122643] text-white font-semibold rounded-lg transition-colors"
            >
              Entendido
            </button>
          </div>
        </div>
      )}
    </>
  );
}
