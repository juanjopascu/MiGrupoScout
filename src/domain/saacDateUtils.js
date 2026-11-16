/**
 * Utilidades puras de fechas UTC y enteros no negativos para reglas SAAC.
 */

export const MS_PER_DAY = 86_400_000;

/**
 * Parsea una fecha YYYY-MM-DD o Date a un timestamp UTC al inicio del dia (00:00:00Z).
 * Retorna null si la entrada es invalida.
 */
export function parseUtcDateMs(input) {
  if (input === null || input === undefined || input === '') {
    return null;
  }

  if (input instanceof Date) {
    if (Number.isNaN(input.getTime())) {
      return null;
    }
    return Date.UTC(input.getUTCFullYear(), input.getUTCMonth(), input.getUTCDate());
  }

  if (typeof input === 'number' && Number.isFinite(input)) {
    const parsedFromNum = new Date(input);
    if (Number.isNaN(parsedFromNum.getTime())) {
      return null;
    }
    return Date.UTC(
      parsedFromNum.getUTCFullYear(),
      parsedFromNum.getUTCMonth(),
      parsedFromNum.getUTCDate()
    );
  }

  if (typeof input !== 'string') {
    return null;
  }

  const trimmed = input.trim();
  const isoDateMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(trimmed);
  if (isoDateMatch) {
    const year = Number(isoDateMatch[1]);
    const month = Number(isoDateMatch[2]);
    const day = Number(isoDateMatch[3]);
    const utcMs = Date.UTC(year, month - 1, day);
    const check = new Date(utcMs);
    if (
      check.getUTCFullYear() !== year ||
      check.getUTCMonth() !== month - 1 ||
      check.getUTCDate() !== day
    ) {
      return null;
    }
    return utcMs;
  }

  const parsed = new Date(trimmed);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }
  return Date.UTC(parsed.getUTCFullYear(), parsed.getUTCMonth(), parsed.getUTCDate());
}

/**
 * Formatea milisegundos UTC a cadena YYYY-MM-DD.
 */
export function formatUtcDateIso(utcMs) {
  const date = new Date(utcMs);
  const year = String(date.getUTCFullYear()).padStart(4, '0');
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function normalizeNonNegativeInt(value) {
  const num = Number(value);
  if (!Number.isFinite(num) || num <= 0) {
    return 0;
  }
  return Math.floor(num);
}
