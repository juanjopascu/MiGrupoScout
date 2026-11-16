import { useEffect, useState } from 'react';
import { ImagePlus, Receipt, Trash2, X } from 'lucide-react';
import {
  LEDGER_CATEGORIES,
  LEDGER_CURRENCIES,
  LEDGER_ENTRY_TYPES,
  LEDGER_STATUSES,
  PAYMENT_METHODS,
  validateLedgerEntryInput
} from '../../domain/accounting.js';
import { ASSIGNABLE_TEAM_BRANCHES } from '../../domain/roles.js';
import { BRANCHES } from '../../domain/saacRulesConstants.js';
import { processReceiptImageFile } from '../../utils/imageProcessor.js';

function initialFormState(entry) {
  const today = new Date().toISOString().slice(0, 10);
  if (!entry) {
    return {
      entry_type: 'gasto',
      category: 'alimentos_insumos',
      branch: 'jefatura',
      title: '',
      description: '',
      amount: '',
      currency: 'ARS',
      entry_date: today,
      payment_method: 'efectivo',
      receipt_number: '',
      counterparty: '',
      status: 'confirmado',
      receipt_url: null
    };
  }

  return {
    entry_type: entry.entry_type || 'gasto',
    category: entry.category || 'general',
    branch: entry.branch || 'jefatura',
    title: entry.title || '',
    description: entry.description || '',
    amount: entry.amount !== undefined && entry.amount !== null ? String(entry.amount) : '',
    currency: entry.currency || 'ARS',
    entry_date: entry.entry_date || today,
    payment_method: entry.payment_method || 'efectivo',
    receipt_number: entry.receipt_number || '',
    counterparty: entry.counterparty || '',
    status: entry.status || 'confirmado',
    receipt_url: entry.receipt_url || null
  };
}

export default function LedgerEntryModal({ isOpen, entry, onClose, onSave }) {
  const [form, setForm] = useState(() => initialFormState(entry));
  const [errorMsg, setErrorMsg] = useState('');
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setForm(initialFormState(entry));
    setErrorMsg('');
  }, [isOpen, entry]);

  if (!isOpen) {
    return null;
  }

  async function handleReceiptFileChange(event) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    setUploading(true);
    setErrorMsg('');
    const result = await processReceiptImageFile(file);
    setUploading(false);

    if (!result.ok) {
      setErrorMsg(result.error);
      return;
    }
    setForm((prev) => ({ ...prev, receipt_url: result.dataUrl }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setErrorMsg('');
    const validation = validateLedgerEntryInput(form);
    if (!validation.valid) {
      const firstErr = Object.values(validation.errors)[0] || 'Revisa los campos ingresados.';
      setErrorMsg(firstErr);
      return;
    }

    setSaving(true);
    try {
      await onSave({
        ...(entry?.id ? { id: entry.id } : {}),
        ...validation.sanitized
      });
      onClose();
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="ledger-modal-title"
      className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4"
    >
      <div className="bg-white w-full sm:max-w-xl rounded-t-2xl sm:rounded-2xl border border-slate-300 shadow-xl max-h-[92vh] overflow-y-auto">
        <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between gap-2 sticky top-0 bg-white z-10">
          <div className="flex items-center gap-2.5">
            <Receipt className="w-5 h-5 text-[var(--brand-primary)]" aria-hidden="true" />
            <h2 id="ledger-modal-title" className="text-base sm:text-lg font-bold text-slate-900">
              {entry?.id ? 'Editar movimiento o comprobante' : 'Registrar pago, gasto o ticket'}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar formulario contable"
            className="min-w-[40px] min-h-[40px] inline-flex items-center justify-center rounded-lg text-slate-600 hover:bg-slate-100"
          >
            <X className="w-5 h-5" aria-hidden="true" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div className="grid grid-cols-2 gap-2 p-1 rounded-xl bg-slate-100 border border-slate-200">
            {LEDGER_ENTRY_TYPES.map((t) => {
              const active = form.entry_type === t.id;
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() =>
                    setForm((prev) => ({
                      ...prev,
                      entry_type: t.id,
                      category: t.id === 'ingreso' ? 'cuota_grupo' : 'alimentos_insumos'
                    }))
                  }
                  className={`h-10 rounded-lg text-xs sm:text-sm font-semibold transition-colors ${
                    active
                      ? t.id === 'ingreso'
                        ? 'bg-emerald-700 text-white'
                        : 'bg-[var(--brand-primary)] text-white'
                      : 'text-slate-700 hover:bg-white/80'
                  }`}
                >
                  {t.label}
                </button>
              );
            })}
          </div>

          <div>
            <label htmlFor="ledger-title" className="block text-xs font-semibold text-slate-700 mb-1">
              Concepto o detalle del movimiento
            </label>
            <input
              id="ledger-title"
              type="text"
              required
              value={form.title}
              onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
              placeholder="Ej. Pago cuota Manada / Ticket supermercado acampe"
              className="w-full h-11 px-3 rounded-lg border border-slate-400 text-sm text-slate-900 bg-white"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label htmlFor="ledger-amount" className="block text-xs font-semibold text-slate-700 mb-1">
                Monto
              </label>
              <input
                id="ledger-amount"
                type="number"
                step="0.01"
                min="0.01"
                required
                value={form.amount}
                onChange={(e) => setForm((p) => ({ ...p, amount: e.target.value }))}
                placeholder="0.00"
                className="w-full h-11 px-3 rounded-lg border border-slate-400 text-sm font-mono text-slate-900 bg-white"
              />
            </div>
            <div>
              <label htmlFor="ledger-currency" className="block text-xs font-semibold text-slate-700 mb-1">
                Moneda
              </label>
              <select
                id="ledger-currency"
                value={form.currency}
                onChange={(e) => setForm((p) => ({ ...p, currency: e.target.value }))}
                className="w-full h-11 px-3 rounded-lg border border-slate-400 text-sm text-slate-900 bg-white"
              >
                {LEDGER_CURRENCIES.map((cur) => (
                  <option key={cur} value={cur}>
                    {cur}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="ledger-date" className="block text-xs font-semibold text-slate-700 mb-1">
                Fecha
              </label>
              <input
                id="ledger-date"
                type="date"
                required
                value={form.entry_date}
                onChange={(e) => setForm((p) => ({ ...p, entry_date: e.target.value }))}
                className="w-full h-11 px-3 rounded-lg border border-slate-400 text-sm text-slate-900 bg-white"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label htmlFor="ledger-category" className="block text-xs font-semibold text-slate-700 mb-1">
                Rubro / Categoria
              </label>
              <select
                id="ledger-category"
                value={form.category}
                onChange={(e) => setForm((p) => ({ ...p, category: e.target.value }))}
                className="w-full h-11 px-3 rounded-lg border border-slate-400 text-sm text-slate-900 bg-white"
              >
                {LEDGER_CATEGORIES.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="ledger-branch" className="block text-xs font-semibold text-slate-700 mb-1">
                Rama / Area
              </label>
              <select
                id="ledger-branch"
                value={form.branch}
                onChange={(e) => setForm((p) => ({ ...p, branch: e.target.value }))}
                className="w-full h-11 px-3 rounded-lg border border-slate-400 text-sm text-slate-900 bg-white"
              >
                {ASSIGNABLE_TEAM_BRANCHES.map((b) => (
                  <option key={b} value={b}>
                    {BRANCHES[b]?.label || 'Jefatura de Grupo'}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label htmlFor="ledger-method" className="block text-xs font-semibold text-slate-700 mb-1">
                Medio de pago
              </label>
              <select
                id="ledger-method"
                value={form.payment_method}
                onChange={(e) => setForm((p) => ({ ...p, payment_method: e.target.value }))}
                className="w-full h-11 px-3 rounded-lg border border-slate-400 text-sm text-slate-900 bg-white"
              >
                {PAYMENT_METHODS.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="ledger-status" className="block text-xs font-semibold text-slate-700 mb-1">
                Estado
              </label>
              <select
                id="ledger-status"
                value={form.status}
                onChange={(e) => setForm((p) => ({ ...p, status: e.target.value }))}
                className="w-full h-11 px-3 rounded-lg border border-slate-400 text-sm text-slate-900 bg-white"
              >
                {LEDGER_STATUSES.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label htmlFor="ledger-receipt-num" className="block text-xs font-semibold text-slate-700 mb-1">
                Nro. de ticket o comprobante
              </label>
              <input
                id="ledger-receipt-num"
                type="text"
                value={form.receipt_number}
                onChange={(e) => setForm((p) => ({ ...p, receipt_number: e.target.value }))}
                placeholder="Ej. FC-B-0004-1234 / TRF-8841"
                className="w-full h-11 px-3 rounded-lg border border-slate-400 text-sm text-slate-900 bg-white"
              />
            </div>

            <div>
              <label htmlFor="ledger-counterparty" className="block text-xs font-semibold text-slate-700 mb-1">
                {form.entry_type === 'ingreso' ? 'Pagador / Familia' : 'Proveedor / Comercio'}
              </label>
              <input
                id="ledger-counterparty"
                type="text"
                value={form.counterparty}
                onChange={(e) => setForm((p) => ({ ...p, counterparty: e.target.value }))}
                placeholder={form.entry_type === 'ingreso' ? 'Ej. Familia Gonzalez' : 'Ej. Mayorista Norte'}
                className="w-full h-11 px-3 rounded-lg border border-slate-400 text-sm text-slate-900 bg-white"
              />
            </div>
          </div>

          <div>
            <label htmlFor="ledger-notes" className="block text-xs font-semibold text-slate-700 mb-1">
              Notas o detalle adicional (opcional)
            </label>
            <textarea
              id="ledger-notes"
              rows={2}
              value={form.description}
              onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
              placeholder="Observaciones de tesoreria o detalle de compra..."
              className="w-full p-3 rounded-lg border border-slate-400 text-sm text-slate-900 bg-white"
            />
          </div>

          <div className="p-3.5 rounded-xl border border-dashed border-slate-400 bg-slate-50 space-y-2.5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-xs font-semibold text-slate-800">
                Foto o captura de comprobante / ticket de compra
              </span>
              <label className="cursor-pointer inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-400 bg-white hover:bg-slate-100 text-xs font-semibold text-slate-800">
                <ImagePlus className="w-3.5 h-3.5 text-[var(--brand-primary)]" aria-hidden="true" />
                <span>{uploading ? 'Procesando...' : form.receipt_url ? 'Cambiar imagen' : 'Adjuntar imagen'}</span>
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  onChange={handleReceiptFileChange}
                  className="sr-only"
                />
              </label>
            </div>

            {form.receipt_url ? (
              <div className="flex items-center gap-3">
                <img
                  src={form.receipt_url}
                  alt="Vista previa del comprobante o ticket"
                  className="w-20 h-20 object-cover rounded-lg border border-slate-300 bg-white"
                />
                <button
                  type="button"
                  onClick={() => setForm((p) => ({ ...p, receipt_url: null }))}
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-red-300 bg-white text-xs font-semibold text-red-700 hover:bg-red-50"
                >
                  <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
                  <span>Quitar adjunto</span>
                </button>
              </div>
            ) : (
              <p className="text-[11px] text-slate-500">
                Formatos PNG, JPG o WebP. Se optimiza automaticamente para guardarse tambien sin conexion.
              </p>
            )}
          </div>

          {errorMsg && (
            <div className="p-3 rounded-lg bg-red-50 border border-red-300 text-xs font-semibold text-red-800">
              {errorMsg}
            </div>
          )}

          <div className="flex flex-wrap justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="h-11 px-4 rounded-lg border border-slate-400 text-sm font-semibold text-slate-700 hover:bg-slate-100"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving || uploading}
              className="h-11 px-5 rounded-lg bg-[var(--brand-primary)] hover:bg-[var(--brand-primary-hover)] text-white text-sm font-semibold disabled:opacity-50"
            >
              {saving ? 'Guardando...' : entry?.id ? 'Guardar cambios' : 'Registrar movimiento'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
