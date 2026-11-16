import { getSupabaseAdmin } from '../_lib/supabaseAdmin.js';

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
    const caller = authData?.user;

    if (authError || !caller) {
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

    const groupId = typeof body.groupId === 'string' ? body.groupId.trim() : '';
    const targetUserIdRaw =
      typeof body.targetUserId === 'string' ? body.targetUserId.trim() : '';
    const targetEmailRaw =
      typeof body.targetEmail === 'string' ? body.targetEmail.trim().toLowerCase() : '';
    const newPassword = typeof body.newPassword === 'string' ? body.newPassword : '';

    if (!isValidUuid(groupId)) {
      return res.status(400).json({
        success: false,
        error: 'Identificador de Grupo invalido.'
      });
    }

    if (targetUserIdRaw && !isValidUuid(targetUserIdRaw)) {
      return res.status(400).json({
        success: false,
        error: 'Identificador de usuario invalido.'
      });
    }

    if (!targetUserIdRaw && !targetEmailRaw) {
      return res.status(400).json({
        success: false,
        error: 'Debes indicar el usuario o correo cuya clave se va a restablecer.'
      });
    }

    if (newPassword.length < 6 || newPassword.length > 128) {
      return res.status(400).json({
        success: false,
        error: 'La nueva clave debe tener entre 6 y 128 caracteres.'
      });
    }

    const { data: adminRow, error: adminErr } = await supabaseAdmin
      .from('platform_admins')
      .select('user_id')
      .eq('user_id', caller.id)
      .maybeSingle();

    if (adminErr) {
      throw adminErr;
    }

    const isPlatformAdmin = Boolean(adminRow?.user_id);

    if (!isPlatformAdmin) {
      const { data: callerMembership, error: callerErr } = await supabaseAdmin
        .from('group_memberships')
        .select('id, role')
        .eq('group_id', groupId)
        .eq('user_id', caller.id)
        .eq('is_active', true)
        .maybeSingle();

      if (callerErr) {
        throw callerErr;
      }

      if (!callerMembership || callerMembership.role !== 'jefe_grupo') {
        return res.status(403).json({
          success: false,
          error: 'Solo el Jefe de Grupo o el Administrador Global pueden restablecer claves.'
        });
      }
    }

    let targetQuery = supabaseAdmin
      .from('group_memberships')
      .select('id, user_id, role, member_email, display_name')
      .eq('group_id', groupId)
      .eq('is_active', true);

    if (targetUserIdRaw) {
      targetQuery = targetQuery.eq('user_id', targetUserIdRaw);
    } else {
      targetQuery = targetQuery.eq('member_email', targetEmailRaw);
    }

    const { data: targetMembership, error: targetErr } = await targetQuery.maybeSingle();
    if (targetErr) {
      throw targetErr;
    }

    if (!targetMembership?.user_id) {
      return res.status(404).json({
        success: false,
        error: 'No se encontro a ese dirigente activo dentro del Grupo Scout indicado.'
      });
    }

    const { data: targetAdminRow, error: targetAdminErr } = await supabaseAdmin
      .from('platform_admins')
      .select('user_id')
      .eq('user_id', targetMembership.user_id)
      .maybeSingle();

    if (targetAdminErr) {
      throw targetAdminErr;
    }

    if (targetAdminRow?.user_id && targetMembership.user_id !== caller.id) {
      return res.status(403).json({
        success: false,
        error: 'No esta permitido restablecer la clave de un Administrador de plataforma.'
      });
    }

    if (!isPlatformAdmin) {
      if (targetMembership.user_id === caller.id || targetMembership.role === 'jefe_grupo') {
        return res.status(403).json({
          success: false,
          error: 'El Jefe de Grupo solo puede restablecer claves de sus invitados (Subjefe, Jefe de Rama o Educador).'
        });
      }
    }

    const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
      targetMembership.user_id,
      { password: newPassword }
    );

    if (updateError) {
      return res.status(500).json({
        success: false,
        error: updateError.message || 'No se pudo actualizar la clave en Supabase Auth.'
      });
    }

    return res.status(200).json({
      success: true,
      userId: targetMembership.user_id,
      email: targetMembership.member_email || targetEmailRaw || '',
      role: targetMembership.role
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      error: err?.message || 'Error interno al restablecer la clave.'
    });
  }
}
