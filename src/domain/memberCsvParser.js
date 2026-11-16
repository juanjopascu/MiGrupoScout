import { sanitizeString, validateMemberInput } from './validators.js';

const BRANCH_ALIASES = Object.freeze({
  manada: 'manada',
  lobatos: 'manada',
  lobeznas: 'manada',
  unidad: 'unidad',
  'unidad scout': 'unidad',
  scouts: 'unidad',
  caminantes: 'caminantes',
  'comunidad caminante': 'caminantes',
  rovers: 'rovers',
  'comunidad rover': 'rovers',
  jefatura: 'jefatura',
  adultos: 'jefatura',
  dirigentes: 'jefatura'
});

const TYPE_ALIASES = Object.freeze({
  beneficiario: 'beneficiario',
  joven: 'beneficiario',
  protagonista: 'beneficiario',
  educador: 'educador',
  dirigente: 'educador',
  adulto: 'educador',
  colaborador: 'colaborador'
});

const CRUZ_ALIASES = Object.freeze({
  afiliado: 'afiliado',
  activo: 'afiliado',
  vigente: 'afiliado',
  pendiente: 'pendiente',
  vencido: 'vencido',
  baja: 'baja'
});

const SFH_ALIASES = Object.freeze({
  vigente: 'vigente',
  aprobado: 'vigente',
  ok: 'vigente',
  pendiente: 'pendiente',
  vencido: 'vencido',
  no_aplica: 'no_aplica',
  'no aplica': 'no_aplica',
  na: 'no_aplica'
});

function normalizeKey(value) {
  return sanitizeString(String(value ?? ''), { maxLength: 60 })
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

function normalizeDateToken(rawValue) {
  const trimmed = String(rawValue ?? '').trim();
  if (!trimmed) {
    return '';
  }
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    return trimmed;
  }
  const dmy = /^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/.exec(trimmed);
  if (dmy) {
    const day = dmy[1].padStart(2, '0');
    const month = dmy[2].padStart(2, '0');
    const year = dmy[3];
    return `${year}-${month}-${day}`;
  }
  return trimmed;
}

function splitCsvLine(line, delimiter) {
  const cells = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i += 1) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }
    if (ch === delimiter && !inQuotes) {
      cells.push(current.trim());
      current = '';
      continue;
    }
    current += ch;
  }
  cells.push(current.trim());
  return cells;
}

function looksLikeHeaderRow(cells) {
  const first = normalizeKey(cells[0] || '');
  return (
    first === 'nombre' ||
    first === 'full_name' ||
    first === 'apellido y nombre' ||
    first === 'nombre completo' ||
    first === 'integrante'
  );
}

/**
 * Parsea texto CSV (delimitado por coma o punto y coma) para carga masiva
 * de hasta 300 integrantes por Grupo Scout.
 */
export function parseMembersCsv(rawText) {
  if (typeof rawText !== 'string' || !rawText.trim()) {
    return { validRecords: [], invalidRows: [] };
  }

  const lines = rawText
    .replace(/\r\n?/g, '\n')
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);

  if (lines.length === 0) {
    return { validRecords: [], invalidRows: [] };
  }

  const sampleLine = lines[0];
  const delimiter = sampleLine.includes(';') && !sampleLine.includes(',') ? ';' : ',';

  const validRecords = [];
  const invalidRows = [];

  lines.forEach((line, idx) => {
    const cells = splitCsvLine(line, delimiter);
    if (idx === 0 && looksLikeHeaderRow(cells)) {
      return;
    }

    const fullName = cells[0] || '';
    const rawType = normalizeKey(cells[1] || 'beneficiario');
    const rawBranch = normalizeKey(cells[2] || 'manada');
    const rawCruz = normalizeKey(cells[3] || 'afiliado');
    const medicalExpiry = normalizeDateToken(cells[4] || '');
    const rawSfh = normalizeKey(cells[5] || '');

    const memberType = TYPE_ALIASES[rawType] || rawType || 'beneficiario';
    const branch = BRANCH_ALIASES[rawBranch] || rawBranch || 'manada';
    const cruzStatus = CRUZ_ALIASES[rawCruz] || rawCruz || 'afiliado';
    const sfhStatus =
      SFH_ALIASES[rawSfh] || (memberType === 'educador' ? 'pendiente' : 'no_aplica');

    const validation = validateMemberInput({
      full_name: fullName,
      member_type: memberType,
      branch,
      cruz_del_sur_status: cruzStatus,
      medical_form_expires_at: medicalExpiry,
      safe_from_harm_status: sfhStatus
    });

    if (validation.valid) {
      validRecords.push(validation.sanitized);
    } else {
      invalidRows.push({
        lineNumber: idx + 1,
        rawLine: line,
        error: Object.values(validation.errors)[0] || 'Fila invalida'
      });
    }
  });

  return { validRecords, invalidRows };
}
