import { useEffect, useMemo, useState } from 'react';
import { Check, Copy, Download, Share2 } from 'lucide-react';
import { getTodayIsoLocal } from '../utils/textSanitizer.js';
import DocFormFields from './docGenerator/DocFormFields.jsx';
import {
  DOC_TYPES,
  buildDocumentText,
  createInitialDocFields,
  describeBranches
} from './docGenerator/docTemplates.js';

export default function DocGenerator({
  groupProfile,
  camps,
  preloadedCamp,
  onClearPreloadedCamp
}) {
  const [docType, setDocType] = useState('pedido_acampe');
  const [mobileTab, setMobileTab] = useState('form');
  const [copied, setCopied] = useState(false);

  const [fields, setFields] = useState(() => createInitialDocFields(groupProfile));

  useEffect(() => {
    setFields((prev) => ({
      ...prev,
      groupName: groupProfile?.name || prev.groupName,
      district: groupProfile?.district || prev.district,
      zone: groupProfile?.zone || prev.zone
    }));
  }, [groupProfile]);

  function applyCampData(camp) {
    if (!camp) {
      return;
    }
    setFields((prev) => ({
      ...prev,
      activityTitle: camp.title || prev.activityTitle,
      location: camp.location || prev.location,
      startDate: camp.start_date || prev.startDate,
      endDate: camp.end_date || camp.start_date || prev.endDate,
      branches: describeBranches(camp),
      youthCount: camp.youth_count ?? prev.youthCount,
      adultCount: camp.adult_count ?? prev.adultCount,
      confirmDeadline: camp.district_submission_deadline || camp.start_date || prev.confirmDeadline
    }));
  }

  useEffect(() => {
    if (preloadedCamp) {
      setDocType('pedido_acampe');
      applyCampData(preloadedCamp);
      onClearPreloadedCamp?.();
    }
  }, [preloadedCamp, onClearPreloadedCamp]);

  const nextCamp = useMemo(() => (camps && camps.length > 0 ? camps[0] : null), [camps]);
  const generatedText = useMemo(() => buildDocumentText(docType, fields), [docType, fields]);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(generatedText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // Fallback silencioso
    }
  }

  function handleDownloadTxt() {
    const blob = new Blob([generatedText], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${docType}-${getTodayIsoLocal()}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  async function handleWebShare() {
    if (typeof navigator === 'undefined' || typeof navigator.share !== 'function') {
      return;
    }
    try {
      await navigator.share({
        title: fields.activityTitle || 'Documento ConsejoScout',
        text: generatedText
      });
    } catch {
      // Usuario cancelo compartir
    }
  }

  const canShare = typeof navigator !== 'undefined' && typeof navigator.share === 'function';

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Generador de Notas y Actas
          </h1>
          <p className="text-sm text-slate-700">
            Documentos institucionales formales y comunicados listos para copiar y compartir.
          </p>
        </div>

        {nextCamp && (
          <button
            type="button"
            onClick={() => applyCampData(nextCamp)}
            className="h-11 px-4 rounded-lg border border-[var(--brand-primary)] bg-[var(--brand-primary-soft)] text-[var(--brand-primary)] hover:bg-blue-100 text-sm font-semibold inline-flex items-center justify-center gap-2 shrink-0"
          >
            <Download className="w-4 h-4" aria-hidden="true" />
            <span>Cargar datos de proxima salida</span>
          </button>
        )}
      </div>

      {/* Selector de Tipo de Documento */}
      <div
        role="radiogroup"
        aria-label="Tipo de documento"
        className="grid grid-cols-2 lg:grid-cols-4 gap-2.5"
      >
        {DOC_TYPES.map((item) => {
          const Icon = item.icon;
          const selected = docType === item.id;
          return (
            <button
              key={item.id}
              type="button"
              role="radio"
              aria-checked={selected}
              onClick={() => setDocType(item.id)}
              className={`min-h-[68px] p-3 rounded-xl text-left flex items-center gap-2.5 transition-colors ${
                selected
                  ? 'border-2 border-[var(--brand-primary)] bg-[var(--brand-primary-soft)] text-[var(--brand-primary)]'
                  : 'border border-slate-300 bg-white text-slate-800 hover:border-[var(--brand-primary)]'
              }`}
            >
              <Icon className="w-5 h-5 shrink-0" aria-hidden="true" />
              <span className="text-sm font-semibold leading-tight">{item.label}</span>
            </button>
          );
        })}
      </div>

      {/* Pestanas Mobile */}
      <div className="lg:hidden grid grid-cols-2 gap-1 p-1 rounded-xl bg-slate-100 border border-slate-300">
        <button
          type="button"
          onClick={() => setMobileTab('form')}
          className={`h-11 rounded-lg text-sm font-semibold transition-colors ${
            mobileTab === 'form' ? 'bg-[var(--brand-primary)] text-white' : 'text-slate-700'
          }`}
        >
          1. Completar datos
        </button>
        <button
          type="button"
          onClick={() => setMobileTab('preview')}
          className={`h-11 rounded-lg text-sm font-semibold transition-colors ${
            mobileTab === 'preview' ? 'bg-[var(--brand-primary)] text-white' : 'text-slate-700'
          }`}
        >
          2. Vista previa y Copiar
        </button>
      </div>

      {/* Split View Desktop / Tabs Mobile */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        <DocFormFields
          docType={docType}
          fields={fields}
          setFields={setFields}
          isVisible={mobileTab === 'form'}
        />

        {/* Vista Previa y Barra de Accion */}
        <section
          aria-label="Vista previa del documento"
          className={`lg:col-span-7 space-y-3 ${
            mobileTab === 'preview' ? 'block' : 'hidden lg:block'
          }`}
        >
          <div className="bg-white border border-slate-300 rounded-xl p-5 shadow-sm">
            <pre className="font-sans text-[15px] leading-relaxed text-slate-900 whitespace-pre-wrap break-words m-0">
              {generatedText}
            </pre>
          </div>

          <div className="sticky bottom-above-nav lg:bottom-4 bg-white border border-slate-300 rounded-xl p-3 shadow-lg flex items-center gap-2">
            <button
              type="button"
              onClick={() => void handleCopy()}
              aria-live="polite"
              className={`h-12 flex-1 px-4 rounded-lg font-semibold inline-flex items-center justify-center gap-2 transition-colors ${
                copied
                  ? 'bg-green-700 text-white'
                  : 'bg-[var(--brand-primary)] hover:bg-[var(--brand-primary-hover)] text-white'
              }`}
            >
              {copied ? (
                <>
                  <Check className="w-5 h-5" aria-hidden="true" />
                  <span>Texto copiado al portapapeles</span>
                </>
              ) : (
                <>
                  <Copy className="w-5 h-5" aria-hidden="true" />
                  <span>Copiar texto</span>
                </>
              )}
            </button>

            {canShare && (
              <button
                type="button"
                onClick={() => void handleWebShare()}
                aria-label="Compartir documento"
                className="w-12 h-12 shrink-0 rounded-lg border border-slate-400 text-slate-900 hover:bg-slate-100 inline-flex items-center justify-center"
              >
                <Share2 className="w-5 h-5" aria-hidden="true" />
              </button>
            )}

            <button
              type="button"
              onClick={handleDownloadTxt}
              aria-label="Descargar texto"
              className="w-12 h-12 shrink-0 rounded-lg border border-slate-400 text-slate-900 hover:bg-slate-100 inline-flex items-center justify-center"
            >
              <Download className="w-5 h-5" aria-hidden="true" />
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}
