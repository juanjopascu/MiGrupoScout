import { getSupabaseAdmin } from '../_lib/supabaseAdmin.js';
import { sanitizePushPayload } from '../_lib/payloadSanitizer.js';
import { dispatchPushNotifications } from '../_lib/pushDispatcher.js';

const LEADERSHIP_ROLES = ['jefe_grupo', 'subjefe_grupo', 'secretario', 'jefe_rama'];
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function isValidUuid(value) {
  return typeof value === 'string' && UUID_REGEX.test(value.trim());
}

function extractBearerToken(authHeader) {
  if (typeof authHeader !== 'string') {
    return null;
  }
  const match = /^Bearer\s+(.+)$/i.exec(authHeader.trim());
  return match ? match[1].trim() : null;
}

function parseJsonBody(body) {
  if (!body) {
    return {};
  }
  if (typeof body === 'string') {
    try {
      return JSON.parse(body);
    } catch {
      return null;
    }
  }
  if (typeof body === 'object') {
    return body;
  }
  return null;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({
      success: false,
      error: 'Metodo no permitido.'
    });
  }

  try {
    const token = extractBearerToken(req.headers?.authorization);
    if (!token) {
      return res.status(401).json({
        success: false,
        error: 'Token de sesion ausente o invalido.'
      });
    }

    const supabaseAdmin = getSupabaseAdmin();
    const { data: authData, error: authError } = await supabaseAdmin.auth.getUser(token);
    const user = authData?.user;

    if (authError || !user) {
      return res.status(401).json({
        success: false,
        error: 'Token de sesion ausente o invalido.'
      });
    }

    const body = parseJsonBody(req.body);
    if (!body) {
      return res.status(400).json({
        success: false,
        error: 'Cuerpo JSON invalido.'
      });
    }

    const isTest = body.isTest === true;
    const groupId = typeof body.groupId === 'string' ? body.groupId.trim() : null;

    let blockedNames = [];
    let subscriptions = [];

    if (isTest) {
      if (groupId && !isValidUuid(groupId)) {
        return res.status(400).json({
          success: false,
          error: 'Identificador de grupo invalido.'
        });
      }

      if (groupId) {
        const { data: membership, error: membershipError } = await supabaseAdmin
          .from('group_memberships')
          .select('id')
          .eq('group_id', groupId)
          .eq('user_id', user.id)
          .eq('is_active', true)
          .maybeSingle();

        if (membershipError) {
          throw membershipError;
        }
        if (!membership) {
          return res.status(403).json({
            success: false,
            error: 'El usuario no pertenece al grupo indicado.'
          });
        }

        const { data: testMembersData, error: testMembersError } = await supabaseAdmin
          .from('group_members')
          .select('full_name')
          .eq('group_id', groupId);

        if (testMembersError) {
          throw testMembersError;
        }
        blockedNames = (testMembersData || []).map((m) => m.full_name).filter(Boolean);
      }

      const testPayloadCheck = sanitizePushPayload(
        {
          eventType: body.eventType || 'GENERAL_NOTICE',
          title: body.title || 'Prueba de notificacion ConsejoScout',
          body:
            body.body ||
            'Notificacion de verificacion enviada correctamente a tu dispositivo.',
          url: body.url || '/dashboard',
          tag: 'consejoscout-self-test'
        },
        { blockedNames }
      );

      if (!testPayloadCheck.valid) {
        return res.status(400).json({
          success: false,
          error: testPayloadCheck.error
        });
      }

      let subQuery = supabaseAdmin
        .from('push_subscriptions')
        .select('id, endpoint, p256dh, auth')
        .eq('user_id', user.id);

      if (groupId) {
        subQuery = subQuery.eq('group_id', groupId);
      }

      const { data: ownSubs, error: ownSubsError } = await subQuery;
      if (ownSubsError) {
        throw ownSubsError;
      }

      subscriptions = ownSubs || [];
      const dispatchResult = await dispatchPushNotifications({
        subscriptions,
        payload: testPayloadCheck.payload,
        supabaseAdmin
      });

      return res.status(200).json({
        success: true,
        data: dispatchResult
      });
    }

    // Flujo de envio grupal / de conduccion
    if (!groupId || !isValidUuid(groupId)) {
      return res.status(400).json({
        success: false,
        error: 'Se requiere un groupId UUID valido.'
      });
    }

    const { data: membership, error: membershipError } = await supabaseAdmin
      .from('group_memberships')
      .select('role')
      .eq('group_id', groupId)
      .eq('user_id', user.id)
      .eq('is_active', true)
      .maybeSingle();

    if (membershipError) {
      throw membershipError;
    }

    if (!membership || !LEADERSHIP_ROLES.includes(membership.role)) {
      return res.status(403).json({
        success: false,
        error: 'El usuario no posee permisos de conduccion en el grupo indicado.'
      });
    }

    const { data: membersData, error: membersError } = await supabaseAdmin
      .from('group_members')
      .select('full_name')
      .eq('group_id', groupId);

    if (membersError) {
      throw membersError;
    }

    blockedNames = (membersData || []).map((m) => m.full_name).filter(Boolean);

    const sanitized = sanitizePushPayload(
      {
        eventType: body.eventType,
        title: body.title,
        body: body.body,
        url: body.url || '/dashboard',
        tag: body.tag
      },
      { blockedNames }
    );

    if (!sanitized.valid) {
      return res.status(400).json({
        success: false,
        error: sanitized.error
      });
    }

    let targetUserIds = [];
    if (Array.isArray(body.targetUserIds) && body.targetUserIds.length > 0) {
      const invalidIds = body.targetUserIds.filter((id) => !isValidUuid(id));
      if (invalidIds.length > 0) {
        return res.status(400).json({
          success: false,
          error: 'La lista targetUserIds contiene identificadores invalidos.'
        });
      }
      targetUserIds = body.targetUserIds.map((id) => id.trim());
    }

    let subsQuery = supabaseAdmin
      .from('push_subscriptions')
      .select('id, endpoint, p256dh, auth, user_id')
      .eq('group_id', groupId);

    if (targetUserIds.length > 0) {
      subsQuery = subsQuery.in('user_id', targetUserIds);
    }

    const { data: targetSubs, error: subsError } = await subsQuery;
    if (subsError) {
      throw subsError;
    }

    subscriptions = targetSubs || [];
    const dispatchResult = await dispatchPushNotifications({
      subscriptions,
      payload: sanitized.payload,
      supabaseAdmin
    });

    return res.status(200).json({
      success: true,
      data: dispatchResult
    });
  } catch (error) {
    console.error('[push/send] Error al despachar notificaciones:', error?.message || error);
    return res.status(500).json({
      success: false,
      error: 'Error interno al despachar notificaciones.'
    });
  }
}
