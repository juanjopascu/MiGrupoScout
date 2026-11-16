import { describe, expect, it } from 'vitest';
import {
  computeLedgerSummary,
  formatCurrencyAmount,
  isSafeReceiptUrl,
  validateLedgerEntryInput
} from '../src/domain/accounting.js';
import { canManageAccounting } from '../src/domain/roles.js';
import { buildLedgerCsvContent } from '../src/utils/groupExport.js';

describe('accounting - dominio contable, comprobantes y tickets multi-tenant', () => {
  it('restringe la gestion contable a Jefe de Grupo y Subjefe de Grupo', () => {
    expect(canManageAccounting('jefe_grupo')).toBe(true);
    expect(canManageAccounting('subjefe_grupo')).toBe(true);
    expect(canManageAccounting('jefe_rama')).toBe(false);
    expect(canManageAccounting('educador')).toBe(false);
  });

  it('valida montos positivos, formatos de comprobante seguros y rechaza SVG/XSS', () => {
    const valid = validateLedgerEntryInput({
      entry_type: 'gasto',
      category: 'alimentos_insumos',
      branch: 'manada',
      title: '  <b>Ticket compra viveres</b> ',
      amount: '15400.5',
      currency: 'ARS',
      entry_date: '2026-11-16',
      payment_method: 'transferencia',
      receipt_number: 'FC-B-001',
      counterparty: 'Supermercado Norte',
      status: 'confirmado',
      receipt_url: 'data:image/webp;base64,UklGRh4AAABXRUJQVlA4'
    });
    expect(valid.valid).toBe(true);
    expect(valid.sanitized.title).toBe('Ticket compra viveres');
    expect(valid.sanitized.amount).toBe(15400.5);

    const badAmount = validateLedgerEntryInput({
      title: 'Pago invalido',
      amount: -50
    });
    expect(badAmount.valid).toBe(false);
    expect(badAmount.errors.amount).toBeDefined();

    expect(isSafeReceiptUrl('data:image/svg+xml;base64,PHN2Zz4=')).toBe(false);
    expect(isSafeReceiptUrl('javascript:alert(1)')).toBe(false);
    expect(isSafeReceiptUrl('https://cdn.example.com/ticket.jpg')).toBe(true);
  });

  it('calcula saldo neto, pendientes y excluye movimientos anulados por moneda', () => {
    const entries = [
      {
        entry_type: 'ingreso',
        category: 'cuota_grupo',
        branch: 'manada',
        amount: 100000,
        currency: 'ARS',
        status: 'confirmado',
        receipt_number: 'REC-1'
      },
      {
        entry_type: 'gasto',
        category: 'alimentos_insumos',
        branch: 'manada',
        amount: 32500.25,
        currency: 'ARS',
        status: 'rendido',
        receipt_url: 'https://cdn.example.com/ticket1.webp'
      },
      {
        entry_type: 'ingreso',
        category: 'cuota_grupo',
        branch: 'unidad',
        amount: 20000,
        currency: 'ARS',
        status: 'pendiente'
      },
      {
        entry_type: 'gasto',
        category: 'equipamiento_grupo',
        branch: 'jefatura',
        amount: 50000,
        currency: 'ARS',
        status: 'anulado'
      },
      {
        entry_type: 'ingreso',
        category: 'donacion_subsidio',
        branch: 'jefatura',
        amount: 500,
        currency: 'USD',
        status: 'confirmado'
      }
    ];

    const summaryArs = computeLedgerSummary(entries, { currency: 'ARS' });
    expect(summaryArs.confirmedIncome).toBe(100000);
    expect(summaryArs.confirmedExpenses).toBe(32500.25);
    expect(summaryArs.balance).toBe(67499.75);
    expect(summaryArs.pendingIncome).toBe(20000);
    expect(summaryArs.receiptsCount).toBe(2);

    const summaryUsd = computeLedgerSummary(entries, { currency: 'USD' });
    expect(summaryUsd.confirmedIncome).toBe(500);
    expect(summaryUsd.balance).toBe(500);
    expect(formatCurrencyAmount(500, 'USD')).toContain('USD');
  });

  it('genera CSV de rendicion contable neutralizando formulas maliciosas', () => {
    const csv = buildLedgerCsvContent(
      [
        {
          entry_date: '2026-11-16',
          entry_type: 'gasto',
          category: 'materiales_rama',
          branch: 'unidad',
          title: '=HYPERLINK("http://evil")',
          counterparty: 'Libreria Centro',
          payment_method: 'efectivo',
          receipt_number: 'T-009',
          currency: 'ARS',
          amount: 8500,
          status: 'confirmado',
          receipt_url: 'data:image/png;base64,AAAA'
        }
      ],
      { number: 412, name: 'San Martin' }
    );

    expect(csv.startsWith('\uFEFFGrupo,Fecha,')).toBe(true);
    expect(csv).toContain("'=HYPERLINK(");
    expect(csv).toContain('T-009');
    expect(csv).toContain('8500.00');
  });
});
