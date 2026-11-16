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
import {
  acceptLocalInvitation,
  adminAssignLocalTenantLeader,
  adminListAllLocalTenants,
  adminUpdateLocalTenant,
  createLocalGroupTenant,
  createLocalInvitation,
  deleteLocalGroupTenant,
  getLocalSession,
  isLocalPlatformAdmin,
  listLocalGroupTeam,
  listLocalUserMemberships,
  previewLocalInvitation,
  signInLocalUser,
  signOutLocalUser,
  signUpLocalUser
} from '../src/services/localAuthStore.js';

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
    expect(isValidHexColor('#4D207A')).toBe(true);
    expect(isValidHexColor('#fff')).toBe(false);
    expect(isValidHexColor('red')).toBe(false);

    const darkTheme = computeBrandTheme('#4D207A', '#7C3AED');
    expect(darkTheme.primary).toBe('#4D207A');
    expect(darkTheme.primaryContrast).toBe('#FFFFFF');

    const lightTheme = computeBrandTheme('#FACC15', '#4D207A');
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

describe('localAuthStore - persistencia dual estilo Patitas sin Supabase', () => {
  it('permite crear cuenta, generar tenant como Jefe de Grupo, emitir invitacion y unir a un Educador', async () => {
    const signupJefe = await signUpLocalUser(
      'jefe412@gruposcout.org.ar',
      'claveSegura123',
      'Martin Chief'
    );
    expect(signupJefe.error).toBeNull();
    expect(signupJefe.session?.user?.id).toBeDefined();
    expect(getLocalSession()?.user?.email).toBe('jefe412@gruposcout.org.ar');

    const tenantRes = createLocalGroupTenant({
      number: 412,
      name: 'Grupo Scout 412 San Martin',
      district: 'Distrito 2',
      zone: 'Zona 14',
      org_model: 'tradicional'
    });
    expect(tenantRes.ok).toBe(true);
    expect(tenantRes.role).toBe('jefe_grupo');

    const inviteRes = createLocalInvitation(
      {
        groupId: tenantRes.group.id,
        role: 'educador',
        branch: 'manada',
        maxUses: 5,
        expiresDays: 14
      },
      'jefe_grupo'
    );
    expect(inviteRes.ok).toBe(true);
    expect(inviteRes.invitation.invite_code).toMatch(/^CS-/);

    signOutLocalUser();
    expect(getLocalSession()).toBeNull();

    const signupEducador = await signUpLocalUser(
      'educador1@gruposcout.org.ar',
      'claveSegura456',
      'Laura Educadora'
    );
    expect(signupEducador.error).toBeNull();

    const preview = previewLocalInvitation(inviteRes.invitation.invite_code);
    expect(preview.valid).toBe(true);
    expect(preview.role).toBe('educador');
    expect(preview.branch).toBe('manada');

    const accepted = acceptLocalInvitation(inviteRes.invitation.invite_code, 'Laura Educadora');
    expect(accepted.ok).toBe(true);
    expect(accepted.groupId).toBe(tenantRes.group.id);
    expect(accepted.role).toBe('educador');

    const memberships = listLocalUserMemberships(signupEducador.session.user.id);
    expect(memberships).toHaveLength(1);
    expect(memberships[0].role).toBe('educador');

    const team = listLocalGroupTeam(tenantRes.group.id);
    expect(team).toHaveLength(2);

    const wrongLogin = await signInLocalUser('educador1@gruposcout.org.ar', 'claveIncorrecta');
    expect(wrongLogin.error).not.toBeNull();

    const validLogin = await signInLocalUser('educador1@gruposcout.org.ar', 'claveSegura456');
    expect(validLogin.error).toBeNull();
    expect(validLogin.session?.user?.email).toBe('educador1@gruposcout.org.ar');

    // Educador no puede eliminar el tenant completo
    const forbiddenDelete = deleteLocalGroupTenant(tenantRes.group.id, 412);
    expect(forbiddenDelete.ok).toBe(false);

    // El Jefe de Grupo si puede eliminarlo confirmando el numero exacto
    await signInLocalUser('jefe412@gruposcout.org.ar', 'claveSegura123');
    const wrongConfirm = deleteLocalGroupTenant(tenantRes.group.id, 999);
    expect(wrongConfirm.ok).toBe(false);

    const okDelete = deleteLocalGroupTenant(tenantRes.group.id, 412);
    expect(okDelete.ok).toBe(true);
    expect(listLocalGroupTeam(tenantRes.group.id)).toHaveLength(0);
    expect(listLocalUserMemberships(signupJefe.session.user.id)).toHaveLength(0);
  });

  it('permite al Administrador Global supervisar todos los grupos, evitar superposiciones, reasignar Jefe y eliminar tenants', async () => {
    // Primer usuario creado previamente es Administrador Global; educador1 NO es admin
    await signInLocalUser('educador1@gruposcout.org.ar', 'claveSegura456');
    const educadorSession = getLocalSession();
    expect(isLocalPlatformAdmin(educadorSession.user.id)).toBe(false);
    expect(adminListAllLocalTenants().ok).toBe(false);

    // Segundo dirigente funda el Grupo 555 y Grupo 777
    const signupOwner555 = await signUpLocalUser(
      'jefe555@gruposcout.org.ar',
      'claveSegura789',
      'Pedro Jefe 555'
    );
    expect(signupOwner555.error).toBeNull();
    expect(isLocalPlatformAdmin(signupOwner555.session.user.id)).toBe(false);

    const g555 = createLocalGroupTenant({
      number: 555,
      name: 'Grupo Scout 555 Norte',
      district: 'Distrito 3',
      zone: 'Zona 8',
      org_model: 'tradicional'
    });
    expect(g555.ok).toBe(true);

    const g777 = createLocalGroupTenant({
      number: 777,
      name: 'Grupo Scout 777 Sur',
      district: 'Distrito 4',
      zone: 'Zona 8',
      org_model: 'nucleo'
    });
    expect(g777.ok).toBe(true);

    // El Administrador Global ingresa y consulta ambos grupos sin ser miembro directo
    const adminLogin = await signInLocalUser('jefe412@gruposcout.org.ar', 'claveSegura123');
    expect(adminLogin.error).toBeNull();
    expect(isLocalPlatformAdmin(adminLogin.session.user.id)).toBe(true);

    const listed = adminListAllLocalTenants();
    expect(listed.ok).toBe(true);
    expect(listed.tenants.map((t) => t.number)).toEqual([555, 777]);

    // Previene superposicion si intenta cambiar el 555 al 777
    const collision = adminUpdateLocalTenant(g555.group.id, {
      number: 777,
      name: 'Grupo Colision',
      district: 'Distrito 3',
      zone: 'Zona 8',
      org_model: 'tradicional'
    });
    expect(collision.ok).toBe(false);

    // Edita el Grupo 555 a un numero libre (556)
    const updated = adminUpdateLocalTenant(g555.group.id, {
      number: 556,
      name: 'Grupo Scout 556 Renovado',
      district: 'Distrito 3',
      zone: 'Zona 8',
      org_model: 'escolar'
    });
    expect(updated.ok).toBe(true);
    expect(updated.group.number).toBe(556);

    // Reasigna a educador1 como Jefe de Grupo titular de 556
    const assigned = adminAssignLocalTenantLeader({
      groupId: g555.group.id,
      targetEmail: 'educador1@gruposcout.org.ar',
      role: 'jefe_grupo',
      branch: 'jefatura'
    });
    expect(assigned.ok).toBe(true);
    expect(assigned.assignment.role).toBe('jefe_grupo');

    // Rechaza correo inexistente
    const missingUser = adminAssignLocalTenantLeader({
      groupId: g555.group.id,
      targetEmail: 'nadie@gruposcout.org.ar',
      role: 'jefe_grupo',
      branch: 'jefatura'
    });
    expect(missingUser.ok).toBe(false);

    // Admin Global puede eliminar el Grupo 777 directamente sin pertenecer a su equipo
    const adminDelete = deleteLocalGroupTenant(g777.group.id, 777);
    expect(adminDelete.ok).toBe(true);
    expect(adminListAllLocalTenants().tenants.map((t) => t.number)).toEqual([556]);
  });
});
