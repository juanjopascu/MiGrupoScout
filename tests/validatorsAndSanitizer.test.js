import { describe, expect, it } from 'vitest';
import {
  isValidIsoDate,
  isValidSafeRelativeUrl,
  isValidUuid,
  sanitizeString,
  validateCampInput,
  validateCouncilTaskInput,
  validateMemberInput
} from '../src/domain/validators.js';
import {
  cleanUserText,
  formatDateAr,
  getDaysFromToday,
  getTodayIsoLocal
} from '../src/utils/textSanitizer.js';

describe('validators - URLs, UUID y fechas ISO', () => {
  it('acepta rutas relativas internas seguras y rechaza URLs externas o peligrosas', () => {
    expect(isValidSafeRelativeUrl('/')).toBe(true);
    expect(isValidSafeRelativeUrl('/dashboard')).toBe(true);
    expect(isValidSafeRelativeUrl('/campamentos/detalle?id=123&tab=checklist')).toBe(true);

    expect(isValidSafeRelativeUrl('https://evil.com')).toBe(false);
    expect(isValidSafeRelativeUrl('http://evil.com/dashboard')).toBe(false);
    expect(isValidSafeRelativeUrl('javascript:alert(1)')).toBe(false);
    expect(isValidSafeRelativeUrl('data:text/html,<script>alert(1)</script>')).toBe(false);
    expect(isValidSafeRelativeUrl('//evil.com')).toBe(false);
    expect(isValidSafeRelativeUrl('/../admin')).toBe(false);
    expect(isValidSafeRelativeUrl('dashboard')).toBe(false);
    expect(isValidSafeRelativeUrl('')).toBe(false);
    expect(isValidSafeRelativeUrl(null)).toBe(false);
    expect(isValidSafeRelativeUrl(123)).toBe(false);
  });

  it('valida UUIDs v1-v5 estandar y rechaza cadenas invalidas', () => {
    expect(isValidUuid('550e8400-e29b-41d4-a716-446655440000')).toBe(true);
    expect(isValidUuid('550E8400-E29B-41D4-A716-446655440000')).toBe(true);
    expect(isValidUuid('  550e8400-e29b-41d4-a716-446655440000  ')).toBe(true);

    expect(isValidUuid('550e8400-e29b-01d4-a716-446655440000')).toBe(false); // version 0
    expect(isValidUuid('550e8400-e29b-41d4-0716-446655440000')).toBe(false); // variante invalida
    expect(isValidUuid('not-a-uuid')).toBe(false);
    expect(isValidUuid('')).toBe(false);
    expect(isValidUuid(null)).toBe(false);
  });

  it('valida fechas reales YYYY-MM-DD incluyendo anos bisiestos', () => {
    expect(isValidIsoDate('2026-06-15')).toBe(true);
    expect(isValidIsoDate('2024-02-29')).toBe(true);

    expect(isValidIsoDate('2025-02-29')).toBe(false);
    expect(isValidIsoDate('2026-04-31')).toBe(false);
    expect(isValidIsoDate('2026-13-01')).toBe(false);
    expect(isValidIsoDate('15-06-2026')).toBe(false);
    expect(isValidIsoDate('2026/06/15')).toBe(false);
    expect(isValidIsoDate('')).toBe(false);
    expect(isValidIsoDate(null)).toBe(false);
  });

  it('sanitiza cadenas eliminando etiquetas, caracteres de control y respetando maxLength', () => {
    expect(sanitizeString('  <b>Hola</b>\u0007   mundo  ')).toBe('Hola mundo');
    expect(sanitizeString('abcdef', { maxLength: 3 })).toBe('abc');
    expect(sanitizeString('linea1\r\n\r\n\r\nlinea2', { allowNewlines: true })).toBe(
      'linea1\n\nlinea2'
    );
    expect(sanitizeString(null)).toBe('');
  });
});

describe('validators - validateMemberInput', () => {
  it('valida y sanitiza un miembro valido', () => {
    const res = validateMemberInput({
      full_name: '  <b>Lucia</b>   Fernandez  ',
      member_type: 'educador',
      branch: 'manada',
      document_number: '32.123.456',
      cruz_del_sur_status: 'afiliado',
      medical_form_expires_at: '2026-12-31',
      safe_from_harm_status: 'vigente',
      safe_from_harm_expires_at: '2027-01-15'
    });

    expect(res.valid).toBe(true);
    expect(res.errors).toEqual({});
    expect(res.sanitized.full_name).toBe('Lucia Fernandez');
    expect(res.sanitized.is_active).toBe(true);
  });

  it('rechaza entradas invalidas y campos fuera de catalogo', () => {
    const res = validateMemberInput({
      full_name: 'Ab',
      member_type: 'invitado',
      branch: 'otra_rama',
      document_number: '12', // muy corto
      cruz_del_sur_status: 'activo',
      medical_form_expires_at: '2025-02-29',
      safe_from_harm_status: 'desconocido',
      safe_from_harm_expires_at: '31-12-2026'
    });

    expect(res.valid).toBe(false);
    expect(res.errors.full_name).toBeDefined();
    expect(res.errors.member_type).toBeDefined();
    expect(res.errors.branch).toBeDefined();
    expect(res.errors.document_number).toBeDefined();
    expect(res.errors.cruz_del_sur_status).toBeDefined();
    expect(res.errors.medical_form_expires_at).toBeDefined();
    expect(res.errors.safe_from_harm_status).toBeDefined();
    expect(res.errors.safe_from_harm_expires_at).toBeDefined();
  });
});

describe('validators - validateCampInput', () => {
  it('valida un campamento completo con fechas coherentes', () => {
    const res = validateCampInput({
      title: 'Campamento de Invierno',
      camp_type: 'campamento_corto',
      branch_scope: 'unidad',
      location: 'Campo Scout El Jaguel',
      start_date: '2026-07-10',
      end_date: '2026-07-12',
      youth_count: 16,
      adult_count: 3,
      approval_status: 'en_revision_consejo'
    });

    expect(res.valid).toBe(true);
    expect(res.errors).toEqual({});
    expect(res.sanitized.youth_count).toBe(16);
    expect(res.sanitized.adult_count).toBe(3);
  });

  it('rechaza fechas invertidas, conteos negativos y enumeraciones invalidas', () => {
    const res = validateCampInput({
      title: 'Ok',
      camp_type: 'expedicion',
      branch_scope: 'distrital',
      start_date: '2026-07-15',
      end_date: '2026-07-10',
      youth_count: -1,
      adult_count: 1.5,
      approval_status: 'cancelada'
    });

    expect(res.valid).toBe(false);
    expect(res.errors.title).toBeDefined();
    expect(res.errors.camp_type).toBeDefined();
    expect(res.errors.branch_scope).toBeDefined();
    expect(res.errors.end_date).toBeDefined();
    expect(res.errors.youth_count).toBeDefined();
    expect(res.errors.adult_count).toBeDefined();
    expect(res.errors.approval_status).toBeDefined();
  });
});

describe('validators - validateCouncilTaskInput', () => {
  it('valida tarea de Consejo y preserva saltos de linea en descripcion', () => {
    const res = validateCouncilTaskInput({
      title: 'Revisar fichas medicas',
      description: 'Punto 1\nPunto 2',
      assigned_role: 'secretario',
      due_date: '2026-06-20',
      status: 'en_progreso',
      meeting_date: '2026-06-01',
      minutes_reference: 'Acta 12/2026'
    });

    expect(res.valid).toBe(true);
    expect(res.errors).toEqual({});
    expect(res.sanitized.description).toBe('Punto 1\nPunto 2');
  });

  it('rechaza rol, estado o fechas invalidas', () => {
    const res = validateCouncilTaskInput({
      title: 'X',
      assigned_role: 'superadmin',
      status: 'archivada',
      due_date: '2026-99-99',
      meeting_date: 'invalida'
    });

    expect(res.valid).toBe(false);
    expect(res.errors.title).toBeDefined();
    expect(res.errors.assigned_role).toBeDefined();
    expect(res.errors.status).toBeDefined();
    expect(res.errors.due_date).toBeDefined();
    expect(res.errors.meeting_date).toBeDefined();
  });
});

describe('textSanitizer - cleanUserText y utilidades de fecha', () => {
  it('elimina scripts, manejadores onerror y HTML embebido', () => {
    expect(cleanUserText('<script>alert(1)</script>Campamento Seguro')).toBe(
      'Campamento Seguro'
    );
    expect(cleanUserText('<img src="x" onerror="alert(1)">Grupo 123')).toBe('Grupo 123');
    expect(cleanUserText('<svg onload=alert(1)>Texto</svg>')).toBe('Texto');
    expect(cleanUserText('<div>Hola <strong>Consejo</strong></div>')).toBe('Hola Consejo');
    expect(cleanUserText('<iframe src="https://evil.com"></iframe>Ok')).toBe('Ok');
    expect(cleanUserText('<img src=x onerror=alert(1)')).toBe('');
    expect(cleanUserText(null)).toBe('');
    expect(cleanUserText(undefined)).toBe('');
  });

  it('formatea fechas ISO a formato argentino DD/MM/YYYY y calcula dias desde hoy', () => {
    expect(formatDateAr('2026-07-09')).toBe('09/07/2026');
    expect(formatDateAr(null)).toBe('-');
    expect(formatDateAr('sin-fecha')).toBe('sin-fecha');

    const today = getTodayIsoLocal();
    expect(getDaysFromToday(today)).toBe(0);
    expect(getDaysFromToday('invalida')).toBeNull();
    expect(getDaysFromToday(null)).toBeNull();
  });
});
