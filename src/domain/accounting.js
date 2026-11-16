/**
 * Dominio puro de Contabilidad, Pagos, Comprobantes y Tickets de Gastos por Grupo Scout.
 * Sin dependencias de navegador ni almacenamiento para validacion y calculos matematicos exactos.
 */

import { BRANCHES } from './saacRulesConstants.js';
import { sanitizeString } from './validators.js';

export const LEDGER_ENTRY_TYPES = Object.freeze([
  { id: 'ingreso', label: 'Ingreso / Pago recibido' },
  { id: 'gasto', label: 'Gasto / Ticket de compra' }
]);

export const LEDGER_CATEGORIES = Object.freeze([
  { id: 'cuota_grupo', label: 'Cuota / Aporte de Grupo', defaultType: 'ingreso' },
  { id: 'campamento_salida', label: 'Campamentos y Salidas', defaultType: 'ambos' },
  { id: 'evento_recaudacion', label: 'Eventos y Recaudacion', defaultType: 'ingreso' },
  { id: 'donacion_subsidio', label: 'Donacion o Subsidio', defaultType: 'ingreso' },
  { id: 'alimentos_insumos', label: 'Alimentos e Insumos', defaultType: 'gasto' },
  { id: 'materiales_rama', label: 'Materiales de Rama', defaultType: 'gasto' },
  { id: 'equipamiento_grupo', label: 'Equipamiento e Intendencia', defaultType: 'gasto' },
  { id: 'transporte_logistica', label: 'Transporte y Logistica', defaultType: 'gasto' },
  { id: 'servicios_sede', label: 'Servicios / Sede', defaultType: 'gasto' },
  { id: 'cruz_del_sur_seguros', label: 'Cruz del Sur y Seguros', defaultType: 'gasto' },
  { id: 'general', label: 'Varios / General', defaultType: 'ambos' }
]);

export const PAYMENT_METHODS = Object.freeze([
  { id: 'efectivo', label: 'Efectivo' },
  { id: 'transferencia', label: 'Transferencia Bancaria' },
  { id: 'mercado_pago', label: 'Mercado Pago / Billetera' },
  { id: 'tarjeta', label: 'Tarjeta Debito / Credito' },
  { id: 'cheque', label: 'Cheque' },
  { id: 'otro', label: 'Otro medio' }
]);

export const LEDGER_STATUSES = Object.freeze([
  { id: 'pendiente', label: 'Pendiente' },
  { id: 'confirmado', label: 'Confirmado' },
  { id: 'rendido', label: 'Rendido' },
  { id: 'anulado', label: 'Anulado' }
]);

export const LEDGER_CURRENCIES = Object.freeze(['ARS', 'USD']);

const VALID_TYPES = new Set(LEDGER_ENTRY_TYPES.map((t) => t.id));
const VALID_CATEGORIES = new Set(LEDGER_CATEGORIES.map((c) => c.id));
const VALID_PAYMENT_METHODS = new Set(PAYMENT_METHODS.map((m) => m.id));
const VALID_STATUSES = new Set(LEDGER_STATUSES.map((s) => s.id));
const VALID_BRANCHES = new Set(['jefatura', ...Object.keys(BRANCHES)]);
const ISO_DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;
const SAFE_DATA_IMAGE_REGEX = /^data:image\/(png|jpeg|jpg|webp);base64,[A-Za-z0-9+/=]+$/i;

export function getLedgerCategoryLabel(categoryId) {
  return LEDGER_CATEGORIES.find((c) => c.id === categoryId)?.label || 'Varios / General';
}

export function getPaymentMethodLabel(methodId) {
  return PAYMENT_METHODS.find((m) => m.id === methodId)?.label || 'Efectivo';
}

export function getLedgerStatusLabel(statusId) {
  return LEDGER_STATUSES.find((s) => s.id === statusId)?.label || 'Confirmado';
}

export function isSafeReceiptUrl(value) {
  if (value === null || value === undefined || value === '') {
    return true;
  }
  if (typeof value !== 'string' || value.length > 280000) {
    return false;
  }
  if (/(svg\+xml|<script|javascript:)/i.test(value)) {
    return false;
  }
  return SAFE_DATA_IMAGE_REGEX.test(value) || value.startsWith('https://');
}

export function formatCurrencyAmount(amount, currency = 'ARS') {
  const num = Number(amount);
  const safeNum = Number.isFinite(num) ? num : 0;
  const formatted = safeNum.toLocaleString('es-AR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
  return currency === 'USD' ? `USD ${formatted}` : `$ ${formatted}`;
}

export function validateLedgerEntryInput(raw = {}) {
  const errors = {};
  const entryType = VALID_TYPES.has(raw.entry_type) ? raw.entry_type : 'gasto';
  const category = VALID_CATEGORIES.has(raw.category) ? raw.category : 'general';
  const branch = VALID_BRANCHES.has(raw.branch) ? raw.branch : 'jefatura';
  const paymentMethod = VALID_PAYMENT_METHODS.has(raw.payment_method)
    ? raw.payment_method
    : 'efectivo';
  const status = VALID_STATUSES.has(raw.status) ? raw.status : 'confirmado';
  const currency = LEDGER_CURRENCIES.includes(raw.currency) ? raw.currency : 'ARS';

  const title = sanitizeString(raw.title || '', { maxLength: 160 });
  if (title.length < 2) {
    errors.title = 'Indica un concepto o detalle para el movimiento (min. 2 caracteres).';
  }

  const parsedAmount = Number.parseFloat(String(raw.amount ?? '').replace(',', '.'));
  const roundedAmount = Number.isFinite(parsedAmount)
    ? Math.round(parsedAmount * 100) / 100
    : NaN;
  if (!Number.isFinite(roundedAmount) || roundedAmount <= 0 || roundedAmount > 999999999) {
    errors.amount = 'Ingresa un monto valido mayor a 0.';
  }

  const entryDate =
    typeof raw.entry_date === 'string' && ISO_DATE_REGEX.test(raw.entry_date.trim())
      ? raw.entry_date.trim()
      : new Date().toISOString().slice(0, 10);

  const receiptUrl =
    typeof raw.receipt_url === 'string' && raw.receipt_url.trim() !== ''
      ? raw.receipt_url.trim()
      : null;

  if (!isSafeReceiptUrl(receiptUrl)) {
    errors.receipt_url =
      'El comprobante adjunto debe ser una imagen PNG/JPG/WebP segura (max 250 KB) o enlace HTTPS.';
  }

  const description = sanitizeString(raw.description || '', { maxLength: 600 }) || null;
  const counterparty = sanitizeString(raw.counterparty || '', { maxLength: 140 }) || null;
  const receiptNumber = sanitizeString(raw.receipt_number || '', { maxLength: 80 }) || null;

  return {
    valid: Object.keys(errors).length === 0,
    errors,
    sanitized: {
      entry_type: entryType,
      category,
      branch,
      title,
      description,
      amount: Number.isFinite(roundedAmount) ? roundedAmount : 0,
      currency,
      entry_date: entryDate,
      payment_method: paymentMethod,
      receipt_number: receiptNumber,
      counterparty,
      status,
      receipt_url: receiptUrl
    }
  };
}

export function computeLedgerSummary(entries = [], { currency = 'ARS' } = {}) {
  const list = Array.isArray(entries) ? entries : [];
  let confirmedIncome = 0;
  let confirmedExpenses = 0;
  let pendingIncome = 0;
  let pendingExpenses = 0;
  let receiptsCount = 0;
  const byCategory = {};
  const byBranch = {};

  for (const item of list) {
    if (!item || item.currency !== currency || item.status === 'anulado') {
      continue;
    }

    const amount = Number(item.amount) || 0;
    if (amount <= 0) {
      continue;
    }

    if (item.receipt_url || item.receipt_number) {
      receiptsCount += 1;
    }

    const isPending = item.status === 'pendiente';
    if (item.entry_type === 'ingreso') {
      if (isPending) {
        pendingIncome += amount;
      } else {
        confirmedIncome += amount;
      }
    } else if (item.entry_type === 'gasto') {
      if (isPending) {
        pendingExpenses += amount;
      } else {
        confirmedExpenses += amount;
      }
    }

    if (!isPending) {
      const cat = item.category || 'general';
      if (!byCategory[cat]) {
        byCategory[cat] = { ingreso: 0, gasto: 0 };
      }
      byCategory[cat][item.entry_type === 'ingreso' ? 'ingreso' : 'gasto'] += amount;

      const br = item.branch || 'jefatura';
      if (!byBranch[br]) {
        byBranch[br] = { ingreso: 0, gasto: 0 };
      }
      byBranch[br][item.entry_type === 'ingreso' ? 'ingreso' : 'gasto'] += amount;
    }
  }

  confirmedIncome = Math.round(confirmedIncome * 100) / 100;
  confirmedExpenses = Math.round(confirmedExpenses * 100) / 100;
  pendingIncome = Math.round(pendingIncome * 100) / 100;
  pendingExpenses = Math.round(pendingExpenses * 100) / 100;

  return {
    currency,
    confirmedIncome,
    confirmedExpenses,
    balance: Math.round((confirmedIncome - confirmedExpenses) * 100) / 100,
    pendingIncome,
    pendingExpenses,
    receiptsCount,
    byCategory,
    byBranch
  };
}
