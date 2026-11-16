import { useMemo } from 'react';
import { Bell, BellOff, BellRing, ChevronRight, Smartphone } from 'lucide-react';

export default function PushStatusWidget({ pushState, onOpen }) {
  const config = useMemo(() => {
    if (pushState === 'granted') {
      return {
        icon: BellRing,
        badgeClass: 'bg-green-100 border-green-700 text-green-900',
        title: 'Alertas Push activas en este dispositivo',
        subtitle: 'Toca para configurar categorias o enviar una prueba'
      };
    }
    if (pushState === 'denied') {
      return {
        icon: BellOff,
        badgeClass: 'bg-red-100 border-red-700 text-red-900',
        title: 'Alertas Push bloqueadas en el navegador',
        subtitle: 'Toca para ver como habilitar permisos'
      };
    }
    if (pushState === 'ios-browser-unsupported') {
      return {
        icon: Smartphone,
        badgeClass: 'bg-blue-100 border-blue-700 text-blue-900',
        title: 'Instala la app en iPhone/iPad para recibir alertas',
        subtitle: 'Toca para ver la guia paso a paso'
      };
    }
    return {
      icon: Bell,
      badgeClass: 'bg-amber-100 border-amber-700 text-amber-900',
      title: 'Activa las alertas del Grupo Scout',
      subtitle: 'Recibe avisos de carpetas distritales y fichas medicas'
    };
  }, [pushState]);

  const Icon = config.icon;

  return (
    <button
      type="button"
      onClick={onOpen}
      className="w-full min-h-[56px] p-3.5 rounded-xl bg-white border border-slate-300 hover:border-[#1B365D] shadow-sm flex items-center justify-between gap-3 text-left transition-colors"
    >
      <div className="flex items-center gap-3 min-w-0">
        <span
          className={`w-10 h-10 rounded-lg border inline-flex items-center justify-center shrink-0 ${config.badgeClass}`}
        >
          <Icon className="w-5 h-5" aria-hidden="true" />
        </span>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-slate-900 truncate">{config.title}</p>
          <p className="text-xs text-slate-600 truncate">{config.subtitle}</p>
        </div>
      </div>
      <ChevronRight className="w-5 h-5 text-slate-600 shrink-0" aria-hidden="true" />
    </button>
  );
}
