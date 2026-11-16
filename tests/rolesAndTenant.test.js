import { describe, expect, it } from 'vitest';
import {
  GROUP_ROLES,
  INVITABLE_ROLES,
  buildInvitationShareText,
  buildInvitationUrl,
  canDeleteRecords,
  canEditGroupBranding,
  canEditGroupSettings,
  canEditMembers,
  canInviteTargetRole,
  canManageInvitations,
  canManageTeamRoles,
  canSendGroupPush,
  getRoleLabel,
  normalizeInviteCode,
  validateGroupTenantInput,
  validateInvitationInput
} from '../src/domain/roles.js';
import {
  DEFAULT_BRANDING,
  computeBrandTheme,
  isSafeLogoValue,
  isValidHexColor
} from '../src/domain/branding.js';
import { parseMembersCsv } from '../src/domain/memberCsvParser.js';

describe('roles - matriz de permisos multi-tenant', () => {
  it('define los 4 roles canonicos y etiquetas institucionales sin emojis', () => {
    expect(GROUP_ROLES).toEqual(['jefe_grupo', 'subjefe_grupo', 'jefe_rama', 'educador']);
    expect(INVITABLE_ROLES).toEqual(['subjefe_grupo', 'jefe_rama', 'educador']);
    expect(getRoleLabel('jefe_grupo')).toBe('Jefe de Grupo');
    expect(getRoleLabel('subjefe_grupo')).toBe('Subjefe de Grupo');
    expect(getRoleLabel('jefe_rama')).toBe('Jefe de Rama');
    expect(getRoleLabel('educador')).toBe('Educador');
  });

  it('asigna permisos diferenciados para jefe_grupo, subjefe_grupo, jefe_rama y educador', () => {
    expect(canEditGroupSettings('jefe_grupo')).toBe(true);
    expect(canEditGroupSettings('subjefe_grupo')).toBe(true);
    expect(canEditGroupSettings('jefe_rama')).toBe(false);
    expect(canEditGroupSettings('educador')).toBe(false);

    expect(canEditGroupBranding('jefe_grupo')).toBe(true);
    expect(canEditGroupBranding('subjefe_grupo')).toBe(false);
    expect(canEditGroupBranding('jefe_rama')).toBe(false);
    expect(canEditGroupBranding('educador')).toBe(false);

    expect(canManageTeamRoles('jefe_grupo')).toBe(true);
    expect(canManageTeamRoles('subjefe_grupo')).toBe(false);

    expect(canManageInvitations('jefe_grupo')).toBe(true);
    expect(canManageInvitations('subjefe_grupo')).toBe(true);
    expect(canManageInvitations('jefe_rama')).toBe(false);
    expect(canManageInvitations('educador')).toBe(false);

    expect(canInviteTargetRole('jefe_grupo', 'subjefe_grupo')).toBe(true);
    expect(canInviteTargetRole('subjefe_grupo', 'subjefe_grupo')).toBe(false);
    expect(canInviteTargetRole('subjefe_grupo', 'jefe_rama')).toBe(true);
    expect(canInviteTargetRole('subjefe_grupo', 'educador')).toBe(true);
    expect(canInviteTargetRole('jefe_grupo', 'jefe_grupo')).toBe(false);

    expect(canEditMembers('jefe_rama')).toBe(true);
    expect(canEditMembers('educador')).toBe(false);

    expect(canDeleteRecords('jefe_grupo')).toBe(true);
    expect(canDeleteRecords('subjefe_grupo')).toBe(true);
    expect(canDeleteRecords('jefe_rama')).toBe(false);
    expect(canDeleteRecords('educador')).toBe(false);

    expect(canSendGroupPush('jefe_rama')).toBe(true);
    expect(canSendGroupPush('educador')).toBe(false);
  });

  it('valida datos de alta de tenant (Grupo Scout) y rechaza entradas invalidas', () => {
    const ok = validateGroupTenantInput({
      number: '412',
      name: '  <b>Grupo Scout 412 - San Martin</b>  ',
      district: 'Distrito 2',
      zone: 'Zona 14',
      org_model: 'tradicional',
      display_name: 'Carlos Lopez'
    });
    expect(ok.valid).toBe(true);
    expect(ok.sanitized.number).toBe(412);
    expect(ok.sanitized.name).toBe('Grupo Scout 412 - San Martin');

    const bad = validateGroupTenantInput({
      number: 0,
      name: 'AB',
      district: '',
      zone: 'Z',
      org_model: 'inexistente'
    });
    expect(bad.valid).toBe(false);
    expect(bad.errors.number).toBeDefined();
    expect(bad.errors.name).toBeDefined();
    expect(bad.errors.district).toBeDefined();
    expect(bad.errors.zone).toBeDefined();
    expect(bad.errors.org_model).toBeDefined();
  });

  it('valida invitaciones y genera enlace y texto compartible sin emojis', () => {
    const groupId = '550e8400-e29b-41d4-a716-446655440000';
    const validInvite = validateInvitationInput(
      {
        groupId,
        role: 'educador',
        branch: 'manada',
        invitedEmail: '  Educador@Grupo.org.ar ',
        maxUses: 5,
        expiresDays: 14
      },
      'jefe_grupo'
    );
    expect(validInvite.valid).toBe(true);
    expect(validInvite.sanitized.invitedEmail).toBe('educador@grupo.org.ar');

    const forbiddenInvite = validateInvitationInput(
      {
        groupId,
        role: 'subjefe_grupo',
        branch: 'jefatura'
      },
      'subjefe_grupo'
    );
    expect(forbiddenInvite.valid).toBe(false);
    expect(forbiddenInvite.errors.role).toBeDefined();

    const code = normalizeInviteCode(' cs-abc123def0 ');
    expect(code).toBe('CS-ABC123DEF0');
    expect(buildInvitationUrl(code, 'https://consejoscout.vercel.app')).toBe(
      'https://consejoscout.vercel.app/?invite=CS-ABC123DEF0'
    );

    const shareText = buildInvitationShareText({
      inviteCode: code,
      groupName: 'Grupo 412',
      groupNumber: 412,
      role: 'jefe_rama',
      branch: 'unidad',
      origin: 'https://consejoscout.vercel.app'
    });
    expect(shareText).toContain('Jefe de Rama');
    expect(shareText).toContain('CS-ABC123DEF0');
    expect(/[\u{1F300}-\u{1FAFF}]/u.test(shareText)).toBe(false);
  });
});

describe('memberCsvParser - carga masiva hasta 300 integrantes por grupo', () => {
  it('parsea filas validas con encabezado, punto y coma y fechas DD/MM/YYYY', () => {
    const csv = [
      'nombre;tipo;rama;estado_cruz;vencimiento_ficha;a_salvo',
      'Tomas Ferreyra;beneficiario;Manada;afiliado;30/11/2026;no_aplica',
      'Lucia Benitez;educador;Unidad Scout;pendiente;2027-02-15;vigente',
      'X;beneficiario;manada;afiliado;;'
    ].join('\n');

    const parsed = parseMembersCsv(csv);
    expect(parsed.validRecords).toHaveLength(2);
    expect(parsed.invalidRows).toHaveLength(1);
    expect(parsed.validRecords[0]).toMatchObject({
      full_name: 'Tomas Ferreyra',
      member_type: 'beneficiario',
      branch: 'manada',
      cruz_del_sur_status: 'afiliado',
      medical_form_expires_at: '2026-11-30',
      safe_from_harm_status: 'no_aplica'
    });
    expect(parsed.validRecords[1]).toMatchObject({
      full_name: 'Lucia Benitez',
      member_type: 'educador',
      branch: 'unidad',
      cruz_del_sur_status: 'pendiente',
      safe_from_harm_status: 'vigente'
    });
  });

  it('procesa un grupo completo de 300 integrantes (250 beneficiarios + 50 educadores) sin errores', () => {
    const rows = ['nombre,tipo,rama,estado_cruz,vencimiento_ficha,a_salvo'];
    for (let i = 1; i <= 250; i += 1) {
      rows.push(`Beneficiario ${i},beneficiario,manada,afiliado,2026-12-31,no_aplica`);
    }
    for (let i = 1; i <= 50; i += 1) {
      rows.push(`Educador ${i},educador,unidad,afiliado,2026-12-31,vigente`);
    }

    const parsed = parseMembersCsv(rows.join('\n'));
    expect(parsed.invalidRows).toHaveLength(0);
    expect(parsed.validRecords).toHaveLength(300);
  });
});

describe('branding - logo y colores institucionales del Grupo', () => {
  it('valida colores hexadecimales y calcula contraste WCAG seguro', () => {
    expect(isValidHexColor('#1B365D')).toBe(true);
    expect(isValidHexColor('#fff')).toBe(false);
    expect(isValidHexColor('red')).toBe(false);

    const darkTheme = computeBrandTheme('#1B365D', '#2E7D32');
    expect(darkTheme.primary).toBe('#1B365D');
    expect(darkTheme.primaryContrast).toBe('#FFFFFF');

    const lightTheme = computeBrandTheme('#FACC15', '#1B365D');
    expect(lightTheme.primaryContrast).toBe('#0F172A');

    const fallbackTheme = computeBrandTheme('invalido', null);
    expect(fallbackTheme.primary).toBe(DEFAULT_BRANDING.primaryColor);
    expect(fallbackTheme.accent).toBe(DEFAULT_BRANDING.accentColor);
  });

  it('acepta data URLs PNG/JPG/WebP o HTTPS y rechaza SVG/XSS en logo_url', () => {
    expect(isSafeLogoValue(null)).toBe(true);
    expect(isSafeLogoValue('data:image/webp;base64,UklGRh4AAABXRUJQ')).toBe(true);
    expect(isSafeLogoValue('data:image/png;base64,iVBORw0KGgo=')).toBe(true);
    expect(isSafeLogoValue('https://abc.supabase.co/storage/v1/object/public/logos/g412.webp')).toBe(
      true
    );

    expect(isSafeLogoValue('data:image/svg+xml;base64,PHN2Zz4=')).toBe(false);
    expect(isSafeLogoValue('javascript:alert(1)')).toBe(false);
    expect(isSafeLogoValue('http://insecure.example/logo.png')).toBe(false);
    expect(isSafeLogoValue('data:image/png;base64,' + 'A'.repeat(200005))).toBe(false);
  });
});
