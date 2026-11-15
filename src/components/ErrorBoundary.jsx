import React from 'react';
import { RotateCcw, ShieldAlert } from 'lucide-react';

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, errorMessage: '' };
  }

  static getDerivedStateFromError(error) {
    return {
      hasError: true,
      errorMessage: error?.message || 'Error inesperado de renderizado.'
    };
  }

  handleReload = () => {
    this.setState({ hasError: false, errorMessage: '' });
    if (typeof window !== 'undefined') {
      window.location.reload();
    }
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-dvh bg-slate-50 flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white border border-slate-300 rounded-2xl p-6 shadow-sm">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-red-100 border border-red-700 text-red-900 text-xs font-semibold mb-4">
              <ShieldAlert className="w-4 h-4 shrink-0" aria-hidden="true" />
              <span>Fallo de interfaz controlado</span>
            </div>
            <h1 className="text-xl font-bold text-slate-900 mb-2">
              Algo interrumpio la vista actual
            </h1>
            <p className="text-sm text-slate-700 mb-4 leading-relaxed">
              Tus datos locales guardados en IndexedDB permanecen seguros. Podes recargar la aplicacion para retomar el trabajo.
            </p>
            {this.state.errorMessage ? (
              <p className="text-xs font-mono text-slate-600 bg-slate-100 border border-slate-300 rounded-lg p-3 mb-4 break-words">
                {this.state.errorMessage}
              </p>
            ) : null}
            <button
              type="button"
              onClick={this.handleReload}
              className="w-full h-12 inline-flex items-center justify-center gap-2 bg-[#1B365D] hover:bg-[#122643] text-white font-semibold rounded-lg transition-colors"
            >
              <RotateCcw className="w-4 h-4" aria-hidden="true" />
              <span>Recargar ConsejoScout</span>
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
