import { useMemo, useState } from 'react';
import { AlertTriangle, CheckCircle2, FileSpreadsheet, Upload, X } from 'lucide-react';
import { parseMembersCsv } from '../domain/memberCsvParser.js';

const SAMPLE_CSV = `nombre,tipo,rama,estado_cruz,vencimiento_ficha,a_salvo
Tomas Ferreyra,beneficiario,manada,afiliado,2026-11-30,no_aplica
Lucia Benitez,educador,unidad,afiliado,2027-02-15,vigente`;

export default function MemberCsvImportModal({ isOpen, onClose, onImportBatch }) {
  const [rawCsv, setRawCsv] = useState('');
  const [importing, setImporting] = useState(false);
  const [resultFeedback, setResultFeedback] = useState(null);

  const parsed = useMemo(() => parseMembersCsv(rawCsv), [rawCsv]);

  if (!isOpen) {
    return null;
  }

  async function handleFileSelect(event) {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }
    const text = await file.text();
    setRawCsv(text);
    setResultFeedback(null);
  }

  async function handleImport() {
    if (parsed.validRecords.length === 0) {
      return;
    }
    setImporting(true);
    setResultFeedback(null);
    try {
      await onImportBatch(parsed.validRecords);
      setResultFeedback({
        type: 'success',
        text: `Se importaron ${parsed.validRecords.length} integrantes al Grupo.`
      });
      setRawCsv('');
    } catch (err) {
      setResultFeedback({
        type: 'error',
        text: err?.message || 'Error al importar nomina.'
      });
    } finally {
      setImporting(false);
    }
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
        aria-labelledby="csv-import-title"
        className="w-full sm:max-w-xl bg-white border border-slate-300 rounded-t-2xl sm:rounded-2xl shadow-lg max-h-[92dvh] overflow-y-auto p-5 space-y-4 pb-safe-bottom"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <FileSpreadsheet className="w-5 h-5 text-[var(--brand-primary)]" aria-hidden="true" />
            <h2 id="csv-import-title" className="text-lg font-semibold text-slate-900">
              Importacion masiva de nomina (CSV)
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar importador CSV"
            className="min-w-[44px] min-h-[44px] inline-flex items-center justify-center rounded-lg text-slate-600 hover:bg-slate-100"
          >
            <X className="w-5 h-5" aria-hidden="true" />
          </button>
        </div>

        <p className="text-xs text-slate-700 leading-relaxed">
          Ideal para cargar hasta 250 beneficiarios y 50 dirigentes en un paso. Columnas esperadas:{' '}
          <code className="bg-slate-100 px-1 py-0.5 rounded">
            nombre,tipo,rama,estado_cruz,vencimiento_ficha,a_salvo
          </code>
        </p>

        <div className="flex flex-wrap items-center gap-2">
          <label className="h-10 px-3.5 rounded-lg border border-[var(--brand-primary)] text-[var(--brand-primary)] hover:bg-[var(--brand-primary-soft)] text-xs font-semibold inline-flex items-center gap-2 cursor-pointer">
            <Upload className="w-4 h-4" aria-hidden="true" />
            <span>Elegir archivo .csv</span>
            <input
              type="file"
              accept=".csv,.txt,text/csv"
              onChange={handleFileSelect}
              className="sr-only"
            />
          </label>

          <button
            type="button"
            onClick={() => {
              setRawCsv(SAMPLE_CSV);
              setResultFeedback(null);
            }}
            className="h-10 px-3 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-100 text-xs font-semibold"
          >
            Cargar ejemplo
          </button>
        </div>

        <div>
          <label htmlFor="csv-textarea" className="block text-xs font-medium text-slate-700 mb-1">
            Pega filas desde Excel / Cruz del Sur
          </label>
          <textarea
            id="csv-textarea"
            rows={6}
            value={rawCsv}
            onChange={(e) => {
              setRawCsv(e.target.value);
              setResultFeedback(null);
            }}
            placeholder={SAMPLE_CSV}
            className="w-full p-3 rounded-lg border border-slate-500 text-xs font-mono text-slate-900 bg-white"
          />
        </div>

        {rawCsv.trim() && (
          <div className="p-3 rounded-xl border border-slate-300 bg-slate-50 text-xs space-y-1">
            <p className="font-semibold text-slate-900">
              Vista previa: {parsed.validRecords.length} filas validas | {parsed.invalidRows.length} con errores
            </p>
            {parsed.invalidRows.slice(0, 3).map((row) => (
              <p key={row.lineNumber} className="text-red-800">
                Linea {row.lineNumber}: {row.error}
              </p>
            ))}
          </div>
        )}

        {resultFeedback && (
          <div
            role="status"
            className={`p-3 rounded-xl border text-sm flex items-center gap-2 ${
              resultFeedback.type === 'success'
                ? 'bg-green-100 border-green-700 text-green-900'
                : 'bg-red-100 border-red-700 text-red-900'
            }`}
          >
            {resultFeedback.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 shrink-0" aria-hidden="true" />
            ) : (
              <AlertTriangle className="w-4 h-4 shrink-0" aria-hidden="true" />
            )}
            <span>{resultFeedback.text}</span>
          </div>
        )}

        <button
          type="button"
          disabled={importing || parsed.validRecords.length === 0}
          onClick={handleImport}
          className="w-full h-11 bg-[var(--brand-primary)] hover:bg-[var(--brand-primary-hover)] text-white text-sm font-semibold rounded-lg transition-colors disabled:opacity-50"
        >
          {importing
            ? 'Importando...'
            : `Importar ${parsed.validRecords.length} integrantes`}
        </button>
      </div>
    </div>
  );
}
