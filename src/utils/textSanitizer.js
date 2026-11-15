import DOMPurify from 'dompurify';
import { sanitizeString } from '../domain/validators.js';

function stripHtmlFallback(raw) {
  return raw
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/<(script|style|noscript|iframe|object|embed)\b[^>]*>[\s\S]*?<\/\1>/gi, '')
    .replace(/<[^>]*>/g, '')
    .replace(/<[a-z!/][^>]*$/i, '');
}

/**
 * Sanitiza texto ingresado por el usuario eliminando cualquier HTML/XSS
 * antes de persistir o renderizar.
 */
export function cleanUserText(value, options = {}) {
  const raw = typeof value === 'string' ? value : '';
  const purified =
    typeof DOMPurify?.sanitize === 'function'
      ? DOMPurify.sanitize(raw, {
          ALLOWED_TAGS: [],
          ALLOWED_ATTR: []
        })
      : stripHtmlFallback(raw);
  return sanitizeString(purified, options);
}

/**
 * Formatea YYYY-MM-DD a DD/MM/YYYY para lectura rapida en pantalla y notas.
 */
export function formatDateAr(isoDate) {
  if (typeof isoDate !== 'string') {
    return '-';
  }
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(isoDate.trim());
  if (!match) {
    return isoDate;
  }
  return `${match[3]}/${match[2]}/${match[1]}`;
}

/**
 * Retorna la fecha de hoy en YYYY-MM-DD usando zona local.
 */
export function getTodayIsoLocal() {
  const now = new Date();
  const year = String(now.getFullYear()).padStart(4, '0');
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Calcula dias calendario entre hoy y una fecha YYYY-MM-DD.
 */
export function getDaysFromToday(isoDate) {
  if (typeof isoDate !== 'string') {
    return null;
  }
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(isoDate.trim());
  if (!match) {
    return null;
  }
  const targetUtc = Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  const now = new Date();
  const todayUtc = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
  return Math.round((targetUtc - todayUtc) / 86_400_000);
}
