import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  isAllowedPushUrl,
  sanitizePushPayload
} from '../api/_lib/payloadSanitizer.js';

const mockGetSupabaseAdmin = vi.fn();
const mockDispatchPushNotifications = vi.fn();

vi.mock('../api/_lib/supabaseAdmin.js', () => ({
  getSupabaseAdmin: (...args) => mockGetSupabaseAdmin(...args)
}));

vi.mock('../api/_lib/pushDispatcher.js', () => ({
  dispatchPushNotifications: (...args) => mockDispatchPushNotifications(...args)
}));

import sendHandler from '../api/push/send.js';
import checkRemindersHandler from '../api/push/check-reminders.js';
import resetPasswordHandler from '../api/admin/reset-password.js';

function createMockRes() {
  const res = {
    statusCode: 200,
    body: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(payload) {
      this.body = payload;
      return this;
    }
  };
  return res;
}

function createQueryBuilder(resolvedValue) {
  const builder = {
    select() {
      return builder;
    },
    eq() {
      return builder;
    },
    in() {
      return builder;
    },
    not() {
      return builder;
    },
    lte() {
      return builder;
    },
    maybeSingle() {
      return Promise.resolve(resolvedValue);
    },
    then(onFulfilled, onRejected) {
      return Promise.resolve(resolvedValue).then(onFulfilled, onRejected);
    }
  };
  return builder;
}

describe('payloadSanitizer - reglas de seguridad Web Push', () => {
  it('valida solo rutas relativas permitidas y bloquea URLs externas o inseguras', () => {
    expect(isAllowedPushUrl('/dashboard')).toBe(true);
    expect(isAllowedPushUrl('/campamentos?id=42&tab=checklist')).toBe(true);

    expect(isAllowedPushUrl('https://evil.com')).toBe(false);
    expect(isAllowedPushUrl('http://evil.com/path')).toBe(false);
    expect(isAllowedPushUrl('javascript:alert(1)')).toBe(false);
    expect(isAllowedPushUrl('//evil.com/phishing')).toBe(false);
    expect(isAllowedPushUrl('/../secret')).toBe(false);
    expect(isAllowedPushUrl('')).toBe(false);
    expect(isAllowedPushUrl(null)).toBe(false);
  });

  it('recorta title a 64 caracteres y body a 160 caracteres', () => {
    const longTitle = 'A'.repeat(100);
    const longBody = 'B'.repeat(240);

    const res = sanitizePushPayload({
      eventType: 'GENERAL_NOTICE',
      title: longTitle,
      body: longBody,
      url: '/dashboard'
    });

    expect(res.valid).toBe(true);
    expect(res.payload.title.length).toBeLessThanOrEqual(64);
    expect(res.payload.body.length).toBeLessThanOrEqual(160);
  });

  it('rechaza payloads con URLs externas o sin titulo/cuerpo', () => {
    const externalUrl = sanitizePushPayload({
      title: 'Aviso',
      body: 'Revisar novedades',
      url: 'https://evil.com'
    });
    expect(externalUrl.valid).toBe(false);

    const protoRelative = sanitizePushPayload({
      title: 'Aviso',
      body: 'Revisar novedades',
      url: '//evil.com'
    });
    expect(protoRelative.valid).toBe(false);

    const missingFields = sanitizePushPayload({
      title: '   ',
      body: 'Contenido',
      url: '/dashboard'
    });
    expect(missingFields.valid).toBe(false);
  });

  it('enmascara DNI, telefonos y emails', () => {
    const res = sanitizePushPayload({
      eventType: 'GENERAL_NOTICE',
      title: 'Contacto 35.123.456',
      body: 'Escribir a jefe@gruposcout.org.ar o llamar al +54 11 4567-8901, DNI 40123456.',
      url: '/dashboard'
    });

    expect(res.valid).toBe(true);
    expect(res.payload.title).toContain('[dato-protegido]');
    expect(res.payload.title).not.toContain('35.123.456');
    expect(res.payload.body).not.toContain('jefe@gruposcout.org.ar');
    expect(res.payload.body).not.toContain('4567-8901');
    expect(res.payload.body).not.toContain('40123456');
    expect(res.payload.body).toContain('[dato-protegido]');
  });

  it('bloquea nombres de menores e integrantes de blockedNames', () => {
    const res = sanitizePushPayload(
      {
        eventType: 'MEDICAL_EXPIRY',
        title: 'Ficha vencida de Mateo Rodriguez',
        body: 'El integrante Mateo Rodriguez debe renovar su autorizacion.',
        url: '/nomina'
      },
      {
        blockedNames: ['Mateo Rodriguez', 'Ana'] // Ana (<4 chars) se ignora por umbral minimo
      }
    );

    expect(res.valid).toBe(true);
    expect(res.payload.title).not.toContain('Mateo Rodriguez');
    expect(res.payload.body).not.toContain('Mateo Rodriguez');
    expect(res.payload.title).toContain('[integrante]');
    expect(res.payload.body).toContain('[integrante]');
  });

  it('rechaza terminos medicos sensibles por defecto y los enmascara si rejectSensitiveTerms es false', () => {
    const sensitiveTerms = ['alergia', 'asma', 'diabetes', 'epilepsia', 'insulina', 'medicacion'];

    for (const term of sensitiveTerms) {
      const rejected = sanitizePushPayload({
        eventType: 'MEDICAL_EXPIRY',
        title: 'Alerta de ficha medica',
        body: `Recordatorio por ${term} declarada en carpeta.`,
        url: '/nomina'
      });
      expect(rejected.valid).toBe(false);
      expect(rejected.error).toContain('terminos medicos sensibles');
    }

    const masked = sanitizePushPayload(
      {
        eventType: 'MEDICAL_EXPIRY',
        title: 'Aviso sanitario',
        body: 'Control de asma y alergia antes del acampe.',
        url: '/nomina'
      },
      { rejectSensitiveTerms: false }
    );
    expect(masked.valid).toBe(true);
    expect(masked.payload.body).not.toContain('asma');
    expect(masked.payload.body).not.toContain('alergia');
    expect(masked.payload.body).toContain('[dato-clinico-reservado]');
  });

  it('elimina HTML y pictogramas Unicode en titulo y cuerpo', () => {
    const smiley = String.fromCodePoint(0x1f600);
    const res = sanitizePushPayload({
      title: `<b>Aviso</b> ${smiley}`,
      body: `<script>alert(1)</script>Reunion de Consejo ${smiley}`,
      url: '/dashboard'
    });

    expect(res.valid).toBe(true);
    expect(res.payload.title).toBe('Aviso');
    expect(res.payload.body).not.toContain('<script>');
    expect(res.payload.body).not.toContain(smiley);
  });
});

describe('API integration - /api/push/send', () => {
  const validGroupId = '550e8400-e29b-41d4-a716-446655440000';
  const validUserId = '11111111-1111-4111-8111-111111111111';

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('responde 405 cuando el metodo HTTP es GET', async () => {
    const req = { method: 'GET', headers: {} };
    const res = createMockRes();

    await sendHandler(req, res);

    expect(res.statusCode).toBe(405);
    expect(res.body.success).toBe(false);
  });

  it('responde 401 cuando falta el token Bearer o es invalido', async () => {
    const reqNoHeader = { method: 'POST', headers: {}, body: {} };
    const resNoHeader = createMockRes();
    await sendHandler(reqNoHeader, resNoHeader);
    expect(resNoHeader.statusCode).toBe(401);

    mockGetSupabaseAdmin.mockReturnValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: null },
          error: { message: 'Invalid token' }
        })
      }
    });

    const reqBadToken = {
      method: 'POST',
      headers: { authorization: 'Bearer token-invalido' },
      body: {}
    };
    const resBadToken = createMockRes();
    await sendHandler(reqBadToken, resBadToken);
    expect(resBadToken.statusCode).toBe(401);
  });

  it('responde 403 cuando el usuario no tiene rol de conduccion en el grupo', async () => {
    const fromMock = vi.fn((table) => {
      if (table === 'group_memberships') {
        return createQueryBuilder({ data: { role: 'educador' }, error: null });
      }
      return createQueryBuilder({ data: [], error: null });
    });

    mockGetSupabaseAdmin.mockReturnValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: validUserId } },
          error: null
        })
      },
      from: fromMock
    });

    const req = {
      method: 'POST',
      headers: { authorization: 'Bearer valid-jwt' },
      body: {
        groupId: validGroupId,
        title: 'Aviso Consejo',
        body: 'Recordatorio de reunion.',
        url: '/dashboard'
      }
    };
    const res = createMockRes();

    await sendHandler(req, res);

    expect(res.statusCode).toBe(403);
    expect(res.body.success).toBe(false);
    expect(mockDispatchPushNotifications).not.toHaveBeenCalled();
  });

  it('responde 400 si groupId no es un UUID valido o el payload contiene termino medico sensible', async () => {
    mockGetSupabaseAdmin.mockReturnValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: validUserId } },
          error: null
        })
      },
      from: vi.fn((table) => {
        if (table === 'group_memberships') {
          return createQueryBuilder({ data: { role: 'jefe_grupo' }, error: null });
        }
        return createQueryBuilder({ data: [], error: null });
      })
    });

    const reqInvalidGroup = {
      method: 'POST',
      headers: { authorization: 'Bearer valid-jwt' },
      body: { groupId: 'no-es-uuid', title: 'Hola', body: 'Mundo' }
    };
    const resInvalidGroup = createMockRes();
    await sendHandler(reqInvalidGroup, resInvalidGroup);
    expect(resInvalidGroup.statusCode).toBe(400);

    const reqSensitive = {
      method: 'POST',
      headers: { authorization: 'Bearer valid-jwt' },
      body: {
        groupId: validGroupId,
        title: 'Ficha medica',
        body: 'Tiene diabetes tipo 1',
        url: '/nomina'
      }
    };
    const resSensitive = createMockRes();
    await sendHandler(reqSensitive, resSensitive);
    expect(resSensitive.statusCode).toBe(400);
    expect(mockDispatchPushNotifications).not.toHaveBeenCalled();
  });

  it('enmascara nombres de nomina y despacha notificaciones con rol de conduccion valido', async () => {
    const fromMock = vi.fn((table) => {
      if (table === 'group_memberships') {
        return createQueryBuilder({ data: { role: 'jefe_grupo' }, error: null });
      }
      if (table === 'group_members') {
        return createQueryBuilder({
          data: [{ full_name: 'Tomas Villalba' }],
          error: null
        });
      }
      if (table === 'push_subscriptions') {
        return createQueryBuilder({
          data: [
            {
              id: 'sub-1',
              endpoint: 'https://push.example/1',
              p256dh: 'key',
              auth: 'auth',
              user_id: validUserId
            }
          ],
          error: null
        });
      }
      return createQueryBuilder({ data: [], error: null });
    });

    mockGetSupabaseAdmin.mockReturnValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: validUserId } },
          error: null
        })
      },
      from: fromMock
    });

    mockDispatchPushNotifications.mockResolvedValue({
      sent: 1,
      failed: 0,
      prunedExpired: 0
    });

    const req = {
      method: 'POST',
      headers: { authorization: 'Bearer valid-jwt' },
      body: {
        groupId: validGroupId,
        eventType: 'COUNCIL_TASK',
        title: 'Novedad sobre Tomas Villalba',
        body: 'Confirmar documentacion de Tomas Villalba antes del viernes.',
        url: '/dashboard'
      }
    };
    const res = createMockRes();

    await sendHandler(req, res);

    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({
      success: true,
      data: { sent: 1, failed: 0, prunedExpired: 0 }
    });
    expect(mockDispatchPushNotifications).toHaveBeenCalledTimes(1);
    const dispatchArg = mockDispatchPushNotifications.mock.calls[0][0];
    expect(dispatchArg.payload.title).not.toContain('Tomas Villalba');
    expect(dispatchArg.payload.body).not.toContain('Tomas Villalba');
    expect(dispatchArg.payload.body).toContain('[integrante]');
  });
});

describe('API integration - /api/push/check-reminders', () => {
  const originalCronSecret = process.env.CRON_SECRET;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env.CRON_SECRET = 'super-secret-cron-token-2026';
  });

  afterEach(() => {
    if (originalCronSecret === undefined) {
      delete process.env.CRON_SECRET;
    } else {
      process.env.CRON_SECRET = originalCronSecret;
    }
  });

  it('responde 405 cuando el metodo HTTP es POST', async () => {
    const req = { method: 'POST', headers: {} };
    const res = createMockRes();

    await checkRemindersHandler(req, res);

    expect(res.statusCode).toBe(405);
    expect(res.body.success).toBe(false);
  });

  it('responde 401 cuando CRON_SECRET esta ausente o el header no coincide', async () => {
    const reqMissingAuth = { method: 'GET', headers: {} };
    const resMissingAuth = createMockRes();
    await checkRemindersHandler(reqMissingAuth, resMissingAuth);
    expect(resMissingAuth.statusCode).toBe(401);

    const reqWrongSecret = {
      method: 'GET',
      headers: { authorization: 'Bearer super-secret-cron-token-9999' } // misma longitud
    };
    const resWrongSecret = createMockRes();
    await checkRemindersHandler(reqWrongSecret, resWrongSecret);
    expect(resWrongSecret.statusCode).toBe(401);

    delete process.env.CRON_SECRET;
    const reqNoEnv = {
      method: 'GET',
      headers: { authorization: 'Bearer super-secret-cron-token-2026' }
    };
    const resNoEnv = createMockRes();
    await checkRemindersHandler(reqNoEnv, resNoEnv);
    expect(resNoEnv.statusCode).toBe(401);
  });

  it('responde 200 sin despachos cuando no existen alertas pendientes', async () => {
    mockGetSupabaseAdmin.mockReturnValue({
      from: vi.fn(() => createQueryBuilder({ data: [], error: null }))
    });

    const req = {
      method: 'GET',
      headers: { authorization: 'Bearer super-secret-cron-token-2026' }
    };
    const res = createMockRes();

    await checkRemindersHandler(req, res);

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.groupsEvaluated).toBe(0);
    expect(res.body.data.notificationsSent).toBe(0);
    expect(mockDispatchPushNotifications).not.toHaveBeenCalled();
  });

  it('responde 200 y envia resumen agregado sin PII con datos mockeados', async () => {
    const groupId = '550e8400-e29b-41d4-a716-446655440000';
    const leaderUserId = '22222222-2222-4222-8222-222222222222';
    const nonLeaderUserId = '33333333-3333-4333-8333-333333333333';

    mockGetSupabaseAdmin.mockReturnValue({
      from: vi.fn((table) => {
        if (table === 'camp_checklists') {
          return createQueryBuilder({ data: [{ group_id: groupId }], error: null });
        }
        if (table === 'group_members') {
          return createQueryBuilder({
            data: [{ group_id: groupId }, { group_id: groupId }],
            error: null
          });
        }
        if (table === 'council_tasks') {
          return createQueryBuilder({ data: [{ group_id: groupId }], error: null });
        }
        if (table === 'scout_groups') {
          return createQueryBuilder({ data: [{ id: groupId, number: '412' }], error: null });
        }
        if (table === 'group_memberships') {
          return createQueryBuilder({
            data: [{ group_id: groupId, user_id: leaderUserId }],
            error: null
          });
        }
        if (table === 'push_subscriptions') {
          return createQueryBuilder({
            data: [
              {
                id: 'sub-leader',
                group_id: groupId,
                user_id: leaderUserId,
                endpoint: 'https://push.example/leader',
                p256dh: 'p1',
                auth: 'a1'
              },
              {
                id: 'sub-other',
                group_id: groupId,
                user_id: nonLeaderUserId,
                endpoint: 'https://push.example/other',
                p256dh: 'p2',
                auth: 'a2'
              }
            ],
            error: null
          });
        }
        return createQueryBuilder({ data: [], error: null });
      })
    });

    mockDispatchPushNotifications.mockResolvedValue({
      sent: 1,
      failed: 0,
      prunedExpired: 0
    });

    const req = {
      method: 'GET',
      headers: { authorization: 'Bearer super-secret-cron-token-2026' }
    };
    const res = createMockRes();

    await checkRemindersHandler(req, res);

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.groupsEvaluated).toBe(1);
    expect(res.body.data.notificationsSent).toBe(1);
    expect(res.body.data.subscriptionsPruned).toBe(0);

    expect(mockDispatchPushNotifications).toHaveBeenCalledTimes(1);
    const call = mockDispatchPushNotifications.mock.calls[0][0];
    expect(call.subscriptions).toHaveLength(1);
    expect(call.subscriptions[0].user_id).toBe(leaderUserId);
    expect(call.payload.title).toBe('Alertas del Grupo 412');
    expect(call.payload.body).toContain('2 fichas medicas por vencer');
    expect(call.payload.body).toContain('1 carpeta distrital proxima a fecha limite');
    expect(call.payload.body).toContain('1 tarea de Consejo por vencer');
  });

  it('usa RPC agregada y despacha en lotes para multiples grupos (escala 50 tenants)', async () => {
    const groupA = '550e8400-e29b-41d4-a716-446655440001';
    const groupB = '550e8400-e29b-41d4-a716-446655440002';
    const userA = '11111111-1111-4111-8111-111111111111';
    const userB = '22222222-2222-4222-8222-222222222222';

    const rpcMock = vi.fn().mockResolvedValue({
      data: [
        { group_id: groupA, camps_count: 1, medical_count: 0, tasks_count: 2 },
        { group_id: groupB, camps_count: 0, medical_count: 4, tasks_count: 0 }
      ],
      error: null
    });

    mockGetSupabaseAdmin.mockReturnValue({
      rpc: rpcMock,
      from: vi.fn((table) => {
        if (table === 'scout_groups') {
          return createQueryBuilder({
            data: [
              { id: groupA, number: 101 },
              { id: groupB, number: 202 }
            ],
            error: null
          });
        }
        if (table === 'group_memberships') {
          return createQueryBuilder({
            data: [
              { group_id: groupA, user_id: userA },
              { group_id: groupB, user_id: userB }
            ],
            error: null
          });
        }
        if (table === 'push_subscriptions') {
          return createQueryBuilder({
            data: [
              { id: 's1', group_id: groupA, user_id: userA, endpoint: 'https://push.example/a', p256dh: 'p1', auth: 'a1' },
              { id: 's2', group_id: groupB, user_id: userB, endpoint: 'https://push.example/b', p256dh: 'p2', auth: 'a2' }
            ],
            error: null
          });
        }
        return createQueryBuilder({ data: [], error: null });
      })
    });

    mockDispatchPushNotifications.mockResolvedValue({
      sent: 1,
      failed: 0,
      prunedExpired: 0
    });

    const req = {
      method: 'GET',
      headers: { authorization: 'Bearer super-secret-cron-token-2026' }
    };
    const res = createMockRes();

    await checkRemindersHandler(req, res);

    expect(rpcMock).toHaveBeenCalledWith(
      'get_daily_reminder_group_stats',
      expect.objectContaining({
        p_camp_cutoff: expect.any(String),
        p_medical_cutoff: expect.any(String),
        p_task_cutoff: expect.any(String)
      })
    );
    expect(res.statusCode).toBe(200);
    expect(res.body.data.groupsEvaluated).toBe(2);
    expect(res.body.data.notificationsSent).toBe(2);
    expect(mockDispatchPushNotifications).toHaveBeenCalledTimes(2);
  });
});

describe('api/admin/reset-password - control jerarquico multi-tenant', () => {
  const groupA = '11111111-1111-4111-8111-111111111111';
  const adminId = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
  const jefeId = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
  const educadorId = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('rechaza peticiones sin token Bearer con 401', async () => {
    const req = { method: 'POST', headers: {}, body: { groupId: groupA } };
    const res = createMockRes();
    await resetPasswordHandler(req, res);
    expect(res.statusCode).toBe(401);
  });

  it('impide que un Educador o un Jefe reseteen claves fuera de su jerarquia (403)', async () => {
    const updateUserById = vi.fn();
    mockGetSupabaseAdmin.mockReturnValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: { id: jefeId } }, error: null }),
        admin: { updateUserById }
      },
      from: vi.fn((table) => {
        if (table === 'platform_admins') {
          return createQueryBuilder({ data: null, error: null });
        }
        if (table === 'group_memberships') {
          // Primera llamada: caller es jefe_grupo; segunda: target tambien es jefe_grupo
          return createQueryBuilder({
            data: { id: 'm1', user_id: adminId, role: 'jefe_grupo', member_email: 'otro@scout.org' },
            error: null
          });
        }
        return createQueryBuilder({ data: null, error: null });
      })
    });

    const req = {
      method: 'POST',
      headers: { authorization: 'Bearer valid-token' },
      body: {
        groupId: groupA,
        targetUserId: adminId,
        newPassword: 'Temporal2026'
      }
    };
    const res = createMockRes();
    await resetPasswordHandler(req, res);
    expect(res.statusCode).toBe(403);
    expect(updateUserById).not.toHaveBeenCalled();
  });

  it('permite al Jefe de Grupo restablecer la clave de un invitado de su propio grupo', async () => {
    const updateUserById = vi.fn().mockResolvedValue({ data: {}, error: null });
    let gmCalls = 0;

    mockGetSupabaseAdmin.mockReturnValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: { id: jefeId } }, error: null }),
        admin: { updateUserById }
      },
      from: vi.fn((table) => {
        if (table === 'platform_admins') {
          return createQueryBuilder({ data: null, error: null });
        }
        if (table === 'group_memberships') {
          gmCalls += 1;
          if (gmCalls === 1) {
            return createQueryBuilder({ data: { id: 'mj', role: 'jefe_grupo' }, error: null });
          }
          return createQueryBuilder({
            data: {
              id: 'me',
              user_id: educadorId,
              role: 'educador',
              member_email: 'educador@scout.org',
              display_name: 'Educador Uno'
            },
            error: null
          });
        }
        return createQueryBuilder({ data: null, error: null });
      })
    });

    const req = {
      method: 'POST',
      headers: { authorization: 'Bearer valid-token' },
      body: {
        groupId: groupA,
        targetUserId: educadorId,
        newPassword: 'CS-Temporal99'
      }
    };
    const res = createMockRes();
    await resetPasswordHandler(req, res);
    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(updateUserById).toHaveBeenCalledWith(educadorId, { password: 'CS-Temporal99' });
  });

  it('permite al Administrador Global restablecer la clave del Jefe de Grupo', async () => {
    const updateUserById = vi.fn().mockResolvedValue({ data: {}, error: null });
    let paCalls = 0;

    mockGetSupabaseAdmin.mockReturnValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: { id: adminId } }, error: null }),
        admin: { updateUserById }
      },
      from: vi.fn((table) => {
        if (table === 'platform_admins') {
          paCalls += 1;
          // 1a llamada: caller IS platform_admin; 2a llamada: target is NOT platform_admin
          return createQueryBuilder({
            data: paCalls === 1 ? { user_id: adminId } : null,
            error: null
          });
        }
        if (table === 'group_memberships') {
          return createQueryBuilder({
            data: {
              id: 'mj',
              user_id: jefeId,
              role: 'jefe_grupo',
              member_email: 'jefe@scout.org'
            },
            error: null
          });
        }
        return createQueryBuilder({ data: null, error: null });
      })
    });

    const req = {
      method: 'POST',
      headers: { authorization: 'Bearer admin-token' },
      body: {
        groupId: groupA,
        targetEmail: 'jefe@scout.org',
        newPassword: 'CS-AdminReset1'
      }
    };
    const res = createMockRes();
    await resetPasswordHandler(req, res);
    expect(res.statusCode).toBe(200);
    expect(updateUserById).toHaveBeenCalledWith(jefeId, { password: 'CS-AdminReset1' });
  });
});
