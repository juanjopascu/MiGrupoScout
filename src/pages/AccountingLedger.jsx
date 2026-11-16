import { useMemo, useState } from 'react';
import {
  ArrowDownLeft,
  ArrowUpRight,
  Download,
  Edit3,
  Eye,
  Plus,
  Printer,
  Receipt,
  Search,
  Trash2,
  Wallet,
  X
} from 'lucide-react';
import {
  LEDGER_CURRENCIES,
  LEDGER_STATUSES,
  computeLedgerSummary,
  formatCurrencyAmount,
  getLedgerCategoryLabel,
  getLedgerStatusLabel,
  getPaymentMethodLabel
} from '../domain/accounting.js';
import { BRANCHES } from '../domain/saacRulesConstants.js';
import { buildExportFilename, buildLedgerCsvContent, triggerBrowserDownload } from '../utils/groupExport.js';
import { cleanUserText, formatDateAr } from '../utils/textSanitizer.js';
import LedgerEntryModal from './accounting/LedgerEntryModal.jsx';

const STATUS_BADGE_CLASS = Object.freeze({
  pendiente: 'bg-amber-100 text-amber-900 border-amber-300',
  confirmado: 'bg-emerald-100 text-emerald-900 border-emerald-300',
  rendido: 'bg-sky-100 text-sky-900 border-sky-300',
  anulado: 'bg-slate-200 text-slate-700 border-slate-300 line-through'
});

export default function AccountingLedger({
  groupProfile,
  entries = [],
  canEdit = true,
  canDelete = true,
  onSaveEntry,
  onDeleteEntry
}) {
  const [currency, setCurrency] = useState('ARS');
  const [typeFilter, setTypeFilter] = useState('todos');
  const [statusFilter, setStatusFilter] = useState('todos');
  const [search, setSearch] = useState('');

  const [modalOpen, setModalOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState(null);
  const [receiptPreview, setReceiptPreview] = useState(null);
  const [printableVoucher, setPrintableVoucher] = useState(null);

  const summary = useMemo(
    () => computeLedgerSummary(entries, { currency }),
    [entries, currency]
  );

  const filteredEntries = useMemo(() => {
    const q = search.trim().toLowerCase();
    return [...entries]
      .filter((item) => item && item.currency === currency)
      .filter((item) => (typeFilter === 'todos' ? true : item.entry_type === typeFilter))
      .filter((item) => (statusFilter === 'todos' ? true : item.status === statusFilter))
      .filter((item) => {
        if (!q) return true;
        return [
          item.title,
          item.description,
          item.receipt_number,
          item.counterparty,
          getLedgerCategoryLabel(item.category),
          getPaymentMethodLabel(item.payment_method)
        ]
          .filter(Boolean)
          .some((val) => String(val).toLowerCase().includes(q));
      })
      .sort((a, b) => String(b.entry_date || '').localeCompare(String(a.entry_date || '')));
  }, [entries, currency, typeFilter, statusFilter, search]);

  function handleExportCsv() {
    const csv = buildLedgerCsvContent(filteredEntries, groupProfile);
    const filename = buildExportFilename(
      {
        number: groupProfile?.number || 'caja',
        name: `${groupProfile?.name || 'grupo'}-contabilidad`
      },
      'csv'
    );
    triggerBrowserDownload(csv, filename, 'text/csv;charset=utf-8');
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 flex items-center gap-2">
            <Wallet className="w-6 h-6 text-[var(--brand-primary)]" aria-hidden="true" />
            <span>Contabilidad, Comprobantes y Tickets</span>
          </h2>
          <p className="text-xs sm:text-sm text-slate-600 mt-0.5">
            Control de caja del Grupo, cobros de cuotas, pagos, recibos y tickets de compra con respaldo offline.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex rounded-lg border border-slate-300 bg-white p-0.5">
            {LEDGER_CURRENCIES.map((cur) => (
              <button
                key={cur}
                type="button"
                onClick={() => setCurrency(cur)}
                className={`px-3 py-1.5 text-xs font-bold rounded-md transition-colors ${
                  currency === cur
                    ? 'bg-[var(--brand-primary)] text-white'
                    : 'text-slate-700 hover:bg-slate-100'
                }`}
              >
                {cur}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={handleExportCsv}
            className="h-10 px-3.5 inline-flex items-center gap-1.5 rounded-lg border border-slate-400 bg-white hover:bg-slate-100 text-xs sm:text-sm font-semibold text-slate-800"
          >
            <Download className="w-4 h-4" aria-hidden="true" />
            <span>Exportar Caja CSV</span>
          </button>

          {canEdit && (
            <button
              type="button"
              onClick={() => {
                setEditingEntry(null);
                setModalOpen(true);
              }}
              className="h-10 px-4 inline-flex items-center gap-1.5 rounded-lg bg-[var(--brand-primary)] hover:bg-[var(--brand-primary-hover)] text-white text-xs sm:text-sm font-semibold transition-colors"
            >
              <Plus className="w-4 h-4" aria-hidden="true" />
              <span>Nuevo movimiento</span>
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-white rounded-xl border border-slate-300 p-4 shadow-sm">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
            Saldo en Caja ({currency})
          </p>
          <p
            className={`text-xl font-extrabold mt-1 font-mono ${
              summary.balance >= 0 ? 'text-slate-900' : 'text-red-700'
            }`}
          >
            {formatCurrencyAmount(summary.balance, currency)}
          </p>
          <p className="text-xs text-slate-500 mt-1">Ingresos confirmados menos gastos</p>
        </div>

        <div className="bg-white rounded-xl border border-slate-300 p-4 shadow-sm">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
            Ingresos / Pagos cobrados
          </p>
          <p className="text-xl font-extrabold mt-1 font-mono text-emerald-700">
            {formatCurrencyAmount(summary.confirmedIncome, currency)}
          </p>
          <p className="text-xs text-slate-500 mt-1">
            Pendientes: {formatCurrencyAmount(summary.pendingIncome, currency)}
          </p>
        </div>

        <div className="bg-white rounded-xl border border-slate-300 p-4 shadow-sm">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
            Gastos y Compras
          </p>
          <p className="text-xl font-extrabold mt-1 font-mono text-rose-700">
            {formatCurrencyAmount(summary.confirmedExpenses, currency)}
          </p>
          <p className="text-xs text-slate-500 mt-1">
            Por pagar: {formatCurrencyAmount(summary.pendingExpenses, currency)}
          </p>
        </div>

        <div className="bg-white rounded-xl border border-slate-300 p-4 shadow-sm">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
            Comprobantes y Tickets
          </p>
          <p className="text-xl font-extrabold mt-1 font-mono text-[var(--brand-primary)]">
            {summary.receiptsCount}
          </p>
          <p className="text-xs text-slate-500 mt-1">Movimientos con nro. o foto adjunta</p>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-300 p-3.5 flex flex-wrap items-center gap-3 shadow-sm">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por concepto, ticket, comprobante, proveedor o familia..."
            className="w-full h-10 pl-9 pr-3 rounded-lg border border-slate-300 text-xs sm:text-sm text-slate-900"
          />
        </div>

        <select
          aria-label="Filtrar por tipo de movimiento"
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className="h-10 px-3 rounded-lg border border-slate-300 bg-white text-xs sm:text-sm font-medium text-slate-800"
        >
          <option value="todos">Todos los tipos</option>
          <option value="ingreso">Solo Ingresos / Pagos</option>
          <option value="gasto">Solo Gastos / Tickets</option>
        </select>

        <select
          aria-label="Filtrar por estado"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="h-10 px-3 rounded-lg border border-slate-300 bg-white text-xs sm:text-sm font-medium text-slate-800"
        >
          <option value="todos">Todos los estados</option>
          {LEDGER_STATUSES.map((s) => (
            <option key={s.id} value={s.id}>
              {s.label}
            </option>
          ))}
        </select>
      </div>

      {filteredEntries.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-300 p-10 text-center space-y-2">
          <Receipt className="w-9 h-9 text-slate-400 mx-auto" aria-hidden="true" />
          <p className="text-sm font-semibold text-slate-800">
            No hay movimientos contables registrados en {currency} con esos filtros.
          </p>
          <p className="text-xs text-slate-500">
            Registra cobros de cuotas, pagos a proveedores o adjunta fotos de tickets de compra.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredEntries.map((item) => {
            const isIncome = item.entry_type === 'ingreso';
            return (
              <div
                key={item.id}
                className="bg-white rounded-xl border border-slate-300 p-4 shadow-sm flex flex-col lg:flex-row lg:items-center justify-between gap-3"
              >
                <div className="flex items-start gap-3 min-w-0">
                  <div
                    className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                      isIncome
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-rose-100 text-rose-800'
                    }`}
                  >
                    {isIncome ? (
                      <ArrowDownLeft className="w-5 h-5" aria-hidden="true" />
                    ) : (
                      <ArrowUpRight className="w-5 h-5" aria-hidden="true" />
                    )}
                  </div>

                  <div className="min-w-0 space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm sm:text-base font-bold text-slate-900">
                        {cleanUserText(item.title)}
                      </span>
                      <span
                        className={`text-[11px] font-semibold px-2 py-0.5 rounded-full border ${
                          STATUS_BADGE_CLASS[item.status] || STATUS_BADGE_CLASS.confirmado
                        }`}
                      >
                        {getLedgerStatusLabel(item.status)}
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-600">
                      <span>{formatDateAr(item.entry_date)}</span>
                      <span>{getLedgerCategoryLabel(item.category)}</span>
                      <span>{BRANCHES[item.branch]?.label || 'Jefatura de Grupo'}</span>
                      <span>{getPaymentMethodLabel(item.payment_method)}</span>
                      {item.counterparty && (
                        <span>
                          {isIncome ? 'De: ' : 'A: '}
                          <strong>{cleanUserText(item.counterparty)}</strong>
                        </span>
                      )}
                      {item.receipt_number && (
                        <span className="font-mono bg-slate-100 px-1.5 py-0.5 rounded text-slate-700">
                          Comp: {cleanUserText(item.receipt_number)}
                        </span>
                      )}
                    </div>

                    {item.description && (
                      <p className="text-xs text-slate-500">{cleanUserText(item.description)}</p>
                    )}
                  </div>
                </div>

                <div className="flex flex-wrap items-center justify-between lg:justify-end gap-2.5 shrink-0 pt-2 lg:pt-0 border-t lg:border-t-0 border-slate-100">
                  <span
                    className={`text-base sm:text-lg font-extrabold font-mono ${
                      item.status === 'anulado'
                        ? 'text-slate-400 line-through'
                        : isIncome
                          ? 'text-emerald-700'
                          : 'text-rose-700'
                    }`}
                  >
                    {isIncome ? '+' : '-'} {formatCurrencyAmount(item.amount, item.currency)}
                  </span>

                  <div className="flex flex-wrap items-center gap-1.5">
                    {item.receipt_url && (
                      <button
                        type="button"
                        onClick={() => setReceiptPreview(item)}
                        className="h-9 px-2.5 inline-flex items-center gap-1 rounded-lg border border-slate-300 bg-slate-50 hover:bg-slate-100 text-xs font-semibold text-slate-800"
                      >
                        <Eye className="w-3.5 h-3.5 text-[var(--brand-primary)]" aria-hidden="true" />
                        <span>Ver ticket</span>
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => setPrintableVoucher(item)}
                      className="h-9 px-2.5 inline-flex items-center gap-1 rounded-lg border border-slate-300 bg-white hover:bg-slate-100 text-xs font-semibold text-slate-700"
                    >
                      <Printer className="w-3.5 h-3.5" aria-hidden="true" />
                      <span>Recibo</span>
                    </button>

                    {canEdit && (
                      <button
                        type="button"
                        onClick={() => {
                          setEditingEntry(item);
                          setModalOpen(true);
                        }}
                        aria-label={`Editar ${cleanUserText(item.title)}`}
                        className="h-9 px-2.5 inline-flex items-center gap-1 rounded-lg border border-slate-300 bg-white hover:bg-slate-100 text-xs font-semibold text-slate-700"
                      >
                        <Edit3 className="w-3.5 h-3.5" aria-hidden="true" />
                        <span>Editar</span>
                      </button>
                    )}

                    {canDelete && (
                      <button
                        type="button"
                        onClick={() => onDeleteEntry(item.id)}
                        aria-label={`Eliminar ${cleanUserText(item.title)}`}
                        className="h-9 w-9 inline-flex items-center justify-center rounded-lg border border-red-200 text-red-700 hover:bg-red-50"
                      >
                        <Trash2 className="w-4 h-4" aria-hidden="true" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <LedgerEntryModal
        isOpen={modalOpen}
        entry={editingEntry}
        onClose={() => {
          setModalOpen(false);
          setEditingEntry(null);
        }}
        onSave={onSaveEntry}
      />

      {receiptPreview && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-sm flex items-center justify-center p-4"
        >
          <div className="bg-white rounded-2xl max-w-2xl w-full p-4 space-y-3 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-200 pb-2.5">
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  {cleanUserText(receiptPreview.title)}
                </h3>
                <p className="text-xs text-slate-500">
                  {formatDateAr(receiptPreview.entry_date)}
                  {receiptPreview.receipt_number
                    ? ` - Comprobante: ${cleanUserText(receiptPreview.receipt_number)}`
                    : ''}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setReceiptPreview(null)}
                aria-label="Cerrar imagen de ticket"
                className="p-1.5 rounded-lg text-slate-600 hover:bg-slate-100"
              >
                <X className="w-5 h-5" aria-hidden="true" />
              </button>
            </div>
            <div className="max-h-[75vh] overflow-auto flex justify-center bg-slate-100 rounded-xl p-2">
              <img
                src={receiptPreview.receipt_url}
                alt={`Comprobante de ${cleanUserText(receiptPreview.title)}`}
                className="max-w-full h-auto rounded-lg"
              />
            </div>
          </div>
        </div>
      )}

      {printableVoucher && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4"
        >
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-2xl border border-slate-300">
            <div className="flex items-start justify-between border-b border-slate-200 pb-3">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-[var(--brand-primary)]">
                  Comprobante Interno de Tesoreria
                </p>
                <h3 className="text-base font-extrabold text-slate-900 mt-0.5">
                  {groupProfile?.number
                    ? `Grupo Scout Nro. ${groupProfile.number} - ${cleanUserText(groupProfile.name || '')}`
                    : 'ConsejoScout - Administracion'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setPrintableVoucher(null)}
                aria-label="Cerrar comprobante"
                className="p-1 rounded-lg text-slate-500 hover:bg-slate-100 print:hidden"
              >
                <X className="w-5 h-5" aria-hidden="true" />
              </button>
            </div>

            <div className="space-y-2 text-sm text-slate-800">
              <div className="flex justify-between">
                <span className="text-slate-500">Tipo:</span>
                <strong>
                  {printableVoucher.entry_type === 'ingreso' ? 'Recibo de Ingreso / Pago' : 'Comprobante de Gasto / Compra'}
                </strong>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Fecha:</span>
                <span>{formatDateAr(printableVoucher.entry_date)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Concepto:</span>
                <span className="text-right font-semibold">{cleanUserText(printableVoucher.title)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Rubro / Rama:</span>
                <span>
                  {getLedgerCategoryLabel(printableVoucher.category)} -{' '}
                  {BRANCHES[printableVoucher.branch]?.label || 'Jefatura'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Medio de Pago:</span>
                <span>{getPaymentMethodLabel(printableVoucher.payment_method)}</span>
              </div>
              {printableVoucher.counterparty && (
                <div className="flex justify-between">
                  <span className="text-slate-500">Pagador / Proveedor:</span>
                  <span>{cleanUserText(printableVoucher.counterparty)}</span>
                </div>
              )}
              {printableVoucher.receipt_number && (
                <div className="flex justify-between">
                  <span className="text-slate-500">Nro. Ticket / Operacion:</span>
                  <span className="font-mono">{cleanUserText(printableVoucher.receipt_number)}</span>
                </div>
              )}
              <div className="flex justify-between pt-2 border-t border-slate-200 text-base font-extrabold">
                <span>Importe Total:</span>
                <span className="font-mono">
                  {formatCurrencyAmount(printableVoucher.amount, printableVoucher.currency)}
                </span>
              </div>
              {printableVoucher.description && (
                <p className="text-xs text-slate-600 pt-2 border-t border-slate-100">
                  {cleanUserText(printableVoucher.description)}
                </p>
              )}
            </div>

            <div className="flex justify-end gap-2 pt-2 print:hidden">
              <button
                type="button"
                onClick={() => setPrintableVoucher(null)}
                className="h-10 px-4 rounded-lg border border-slate-300 text-xs font-semibold text-slate-700"
              >
                Cerrar
              </button>
              <button
                type="button"
                onClick={() => window.print()}
                className="h-10 px-4 inline-flex items-center gap-1.5 rounded-lg bg-[var(--brand-primary)] text-white text-xs font-semibold"
              >
                <Printer className="w-4 h-4" aria-hidden="true" />
                <span>Imprimir / Guardar PDF</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
