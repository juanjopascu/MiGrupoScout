-- ============================================================================
-- ConsejoScout PWA - Esquema de Base de Datos (PostgreSQL 16 + Supabase)
-- Arquitectura multi-tenant por group_id con RLS estricto y pgvector
-- ============================================================================

-- 1. Extensiones requeridas
CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS vector;

-- 2. Tablas principales

CREATE TABLE IF NOT EXISTS scout_groups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  number integer NOT NULL UNIQUE CHECK (number > 0),
  name text NOT NULL,
  district text NOT NULL,
  zone text NOT NULL,
  org_model text NOT NULL DEFAULT 'tradicional'
    CHECK (org_model IN ('tradicional', 'nucleo', 'comunitario', 'escolar')),
  primary_color text NOT NULL DEFAULT '#1B365D'
    CHECK (primary_color ~ '^#[0-9A-Fa-f]{6}$'),
  accent_color text NOT NULL DEFAULT '#2E7D32'
    CHECK (accent_color ~ '^#[0-9A-Fa-f]{6}$'),
  logo_url text
    CHECK (
      logo_url IS NULL
      OR (
        char_length(logo_url) <= 200000
        AND logo_url !~* '(svg\+xml|<script|javascript:)'
        AND (
          logo_url ~* '^data:image/(png|jpeg|jpg|webp);base64,[A-Za-z0-9+/=]+$'
          OR logo_url ~* '^https://'
        )
      )
    ),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS group_memberships (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id uuid NOT NULL REFERENCES scout_groups(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role text NOT NULL
    CHECK (role IN (
      'jefe_grupo',
      'subjefe_grupo',
      'jefe_rama',
      'educador'
    )),
  branch text NOT NULL DEFAULT 'jefatura'
    CHECK (branch IN ('manada', 'unidad', 'caminantes', 'rovers', 'jefatura')),
  display_name text,
  member_email text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (group_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_group_memberships_group_active
  ON group_memberships (group_id, is_active, role);

CREATE INDEX IF NOT EXISTS idx_group_memberships_user_active
  ON group_memberships (user_id, is_active);

CREATE TABLE IF NOT EXISTS group_invitations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id uuid NOT NULL REFERENCES scout_groups(id) ON DELETE CASCADE,
  invite_code text NOT NULL UNIQUE,
  invited_email text,
  invited_name text,
  role text NOT NULL
    CHECK (role IN ('subjefe_grupo', 'jefe_rama', 'educador')),
  branch text NOT NULL DEFAULT 'jefatura'
    CHECK (branch IN ('manada', 'unidad', 'caminantes', 'rovers', 'jefatura')),
  max_uses integer NOT NULL DEFAULT 1 CHECK (max_uses >= 1 AND max_uses <= 100),
  uses_count integer NOT NULL DEFAULT 0 CHECK (uses_count >= 0),
  status text NOT NULL DEFAULT 'pendiente'
    CHECK (status IN ('pendiente', 'aceptada', 'revocada', 'expirada')),
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '14 days'),
  created_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  accepted_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_group_invitations_group_status
  ON group_invitations (group_id, status, expires_at);

CREATE TABLE IF NOT EXISTS group_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id uuid NOT NULL REFERENCES scout_groups(id) ON DELETE CASCADE,
  member_type text NOT NULL
    CHECK (member_type IN ('beneficiario', 'educador', 'colaborador')),
  branch text NOT NULL
    CHECK (branch IN ('manada', 'unidad', 'caminantes', 'rovers', 'jefatura')),
  full_name text NOT NULL,
  document_number text,
  cruz_del_sur_status text NOT NULL DEFAULT 'pendiente'
    CHECK (cruz_del_sur_status IN ('afiliado', 'pendiente', 'vencido', 'baja')),
  medical_form_expires_at date,
  safe_from_harm_status text NOT NULL DEFAULT 'no_aplica'
    CHECK (safe_from_harm_status IN ('vigente', 'pendiente', 'vencido', 'no_aplica')),
  safe_from_harm_expires_at date,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_group_members_group_branch_active
  ON group_members (group_id, branch, is_active);

CREATE INDEX IF NOT EXISTS idx_group_members_medical_expiry
  ON group_members (group_id, medical_form_expires_at);

CREATE TABLE IF NOT EXISTS camp_checklists (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id uuid NOT NULL REFERENCES scout_groups(id) ON DELETE CASCADE,
  title text NOT NULL,
  camp_type text NOT NULL
    CHECK (camp_type IN (
      'salida_dia',
      'acantonamiento',
      'campamento_corto',
      'campamento_largo',
      'fuera_distrito'
    )),
  branch_scope text NOT NULL
    CHECK (branch_scope IN ('manada', 'unidad', 'caminantes', 'rovers', 'grupal')),
  location text,
  start_date date NOT NULL,
  end_date date NOT NULL,
  district_submission_deadline date NOT NULL,
  youth_count integer NOT NULL DEFAULT 0 CHECK (youth_count >= 0),
  adult_count integer NOT NULL DEFAULT 0 CHECK (adult_count >= 0),
  required_adults integer NOT NULL DEFAULT 2 CHECK (required_adults >= 2),
  ratio_compliant boolean NOT NULL DEFAULT false,
  documentation_status jsonb NOT NULL DEFAULT '{
    "carpeta_medica": false,
    "autorizaciones": false,
    "seguro_cruz_del_sur": false,
    "proyecto_educativo": false,
    "a_salvo_del_peligro": false
  }'::jsonb,
  approval_status text NOT NULL DEFAULT 'borrador'
    CHECK (approval_status IN (
      'borrador',
      'en_revision_consejo',
      'presentada_distrito',
      'aprobada',
      'observada'
    )),
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT chk_camp_dates_valid CHECK (end_date >= start_date)
);

CREATE INDEX IF NOT EXISTS idx_camp_checklists_group_start
  ON camp_checklists (group_id, start_date);

CREATE INDEX IF NOT EXISTS idx_camp_checklists_group_deadline
  ON camp_checklists (group_id, district_submission_deadline);

CREATE TABLE IF NOT EXISTS council_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id uuid NOT NULL REFERENCES scout_groups(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  assigned_role text NOT NULL
    CHECK (assigned_role IN (
      'jefe_grupo',
      'subjefe_grupo',
      'jefe_rama',
      'educador',
      'consejo_pleno'
    )),
  due_date date,
  status text NOT NULL DEFAULT 'pendiente'
    CHECK (status IN ('pendiente', 'en_progreso', 'completada', 'vencida')),
  meeting_date date,
  minutes_reference text,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_council_tasks_group_status_due
  ON council_tasks (group_id, status, due_date);

CREATE TABLE IF NOT EXISTS push_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  group_id uuid NOT NULL REFERENCES scout_groups(id) ON DELETE CASCADE,
  endpoint text NOT NULL UNIQUE,
  p256dh text NOT NULL,
  auth text NOT NULL,
  user_agent text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_push_subscriptions_user
  ON push_subscriptions (user_id);

CREATE INDEX IF NOT EXISTS idx_push_subscriptions_group
  ON push_subscriptions (group_id);

CREATE TABLE IF NOT EXISTS saac_knowledge_base (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  doc_title text NOT NULL,
  doc_category text NOT NULL
    CHECK (doc_category IN (
      'norma_operativa',
      'reglamento',
      'proteccion_infantil',
      'acampe_seguridad',
      'educativo',
      'otro'
    )),
  source_url text NOT NULL,
  article_ref text,
  chunk_index integer NOT NULL CHECK (chunk_index >= 0),
  content text NOT NULL,
  content_hash text NOT NULL UNIQUE,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  embedding vector(768) NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_saac_kb_category
  ON saac_knowledge_base (doc_category);

CREATE INDEX IF NOT EXISTS idx_saac_kb_embedding_hnsw
  ON saac_knowledge_base USING hnsw (embedding vector_cosine_ops);

-- 3. Triggers de actualizacion de timestamps y validacion SAAC

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION validate_camp_checklist_rules()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_ratio integer;
  v_calculated_adults integer;
  v_deadline_days integer;
BEGIN
  IF NEW.end_date < NEW.start_date THEN
    RAISE EXCEPTION 'La fecha de finalizacion (end_date) no puede ser anterior a start_date';
  END IF;

  IF NEW.district_submission_deadline IS NULL THEN
    v_deadline_days := CASE NEW.camp_type
      WHEN 'salida_dia' THEN 7
      WHEN 'acantonamiento' THEN 15
      WHEN 'campamento_corto' THEN 15
      WHEN 'campamento_largo' THEN 30
      WHEN 'fuera_distrito' THEN 45
      ELSE 15
    END;
    NEW.district_submission_deadline := NEW.start_date - v_deadline_days;
  END IF;

  v_ratio := CASE NEW.branch_scope
    WHEN 'manada' THEN 6
    WHEN 'unidad' THEN 8
    WHEN 'caminantes' THEN 10
    WHEN 'rovers' THEN 12
    ELSE 6
  END;

  IF NEW.branch_scope = 'grupal' THEN
    -- En salidas grupales la capa de dominio puede calcular el desglose por sub-rama;
    -- si no se especifica un minimo mayor, se exige el piso obligatorio de 2 adultos.
    v_calculated_adults := GREATEST(2, COALESCE(NEW.required_adults, 2));
  ELSE
    v_calculated_adults := GREATEST(
      2,
      CEIL(COALESCE(NEW.youth_count, 0)::numeric / v_ratio::numeric)::integer
    );
  END IF;

  NEW.required_adults := v_calculated_adults;
  NEW.ratio_compliant := (COALESCE(NEW.adult_count, 0) >= NEW.required_adults);

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_scout_groups_updated_at ON scout_groups;
CREATE TRIGGER trg_scout_groups_updated_at
  BEFORE UPDATE ON scout_groups
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE OR REPLACE FUNCTION guard_scout_groups_branding()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF current_user IN ('postgres', 'supabase_admin', 'service_role') THEN
    RETURN NEW;
  END IF;

  IF (
    NEW.primary_color IS DISTINCT FROM OLD.primary_color
    OR NEW.accent_color IS DISTINCT FROM OLD.accent_color
    OR NEW.logo_url IS DISTINCT FROM OLD.logo_url
  ) THEN
    IF NOT EXISTS (
      SELECT 1
      FROM group_memberships
      WHERE group_id = NEW.id
        AND user_id = auth.uid()
        AND role = 'jefe_grupo'
        AND is_active = true
    ) THEN
      RAISE EXCEPTION 'Solo el Jefe de Grupo puede modificar el logo y los colores institucionales';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_scout_groups_branding_guard ON scout_groups;
CREATE TRIGGER trg_scout_groups_branding_guard
  BEFORE UPDATE ON scout_groups
  FOR EACH ROW EXECUTE FUNCTION guard_scout_groups_branding();

DROP TRIGGER IF EXISTS trg_group_memberships_updated_at ON group_memberships;
CREATE TRIGGER trg_group_memberships_updated_at
  BEFORE UPDATE ON group_memberships
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_group_invitations_updated_at ON group_invitations;
CREATE TRIGGER trg_group_invitations_updated_at
  BEFORE UPDATE ON group_invitations
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE OR REPLACE FUNCTION prevent_membership_privilege_escalation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_is_provisioning text := current_setting('app.tenant_provisioning', true);
  v_actor_is_jefe boolean;
BEGIN
  IF current_user IN ('postgres', 'supabase_admin', 'service_role') OR v_is_provisioning = 'true' THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  IF TG_OP = 'DELETE' THEN
    IF OLD.role = 'jefe_grupo' THEN
      RAISE EXCEPTION 'No se puede eliminar al Jefe de Grupo titular por esta via';
    END IF;
    RETURN OLD;
  END IF;

  SELECT EXISTS (
    SELECT 1
    FROM group_memberships
    WHERE group_id = NEW.group_id
      AND user_id = auth.uid()
      AND role = 'jefe_grupo'
      AND is_active = true
  ) INTO v_actor_is_jefe;

  IF TG_OP = 'INSERT' THEN
    IF NEW.role = 'jefe_grupo' AND NOT v_actor_is_jefe THEN
      RAISE EXCEPTION 'Solo el Jefe de Grupo puede asignar otro Jefe de Grupo';
    END IF;
    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE' THEN
    IF (OLD.role = 'jefe_grupo' OR NEW.role = 'jefe_grupo') AND NOT v_actor_is_jefe THEN
      RAISE EXCEPTION 'Solo el Jefe de Grupo puede modificar cargos de Jefatura de Grupo';
    END IF;
    IF OLD.role = 'jefe_grupo' AND NEW.user_id = auth.uid() AND (NEW.role <> 'jefe_grupo' OR NEW.is_active = false) THEN
      IF NOT EXISTS (
        SELECT 1 FROM group_memberships
        WHERE group_id = NEW.group_id
          AND user_id <> auth.uid()
          AND role = 'jefe_grupo'
          AND is_active = true
      ) THEN
        RAISE EXCEPTION 'El Grupo debe mantener al menos un Jefe de Grupo activo';
      END IF;
    END IF;
    RETURN NEW;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_group_memberships_guard ON group_memberships;
CREATE TRIGGER trg_group_memberships_guard
  BEFORE INSERT OR UPDATE OR DELETE ON group_memberships
  FOR EACH ROW EXECUTE FUNCTION prevent_membership_privilege_escalation();

DROP TRIGGER IF EXISTS trg_group_members_updated_at ON group_members;
CREATE TRIGGER trg_group_members_updated_at
  BEFORE UPDATE ON group_members
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_camp_checklists_updated_at ON camp_checklists;
CREATE TRIGGER trg_camp_checklists_updated_at
  BEFORE UPDATE ON camp_checklists
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_camp_checklists_validate_rules ON camp_checklists;
CREATE TRIGGER trg_camp_checklists_validate_rules
  BEFORE INSERT OR UPDATE ON camp_checklists
  FOR EACH ROW EXECUTE FUNCTION validate_camp_checklist_rules();

DROP TRIGGER IF EXISTS trg_council_tasks_updated_at ON council_tasks;
CREATE TRIGGER trg_council_tasks_updated_at
  BEFORE UPDATE ON council_tasks
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_push_subscriptions_updated_at ON push_subscriptions;
CREATE TRIGGER trg_push_subscriptions_updated_at
  BEFORE UPDATE ON push_subscriptions
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- 4. Funciones helper SECURITY DEFINER para RLS multi-tenant

CREATE OR REPLACE FUNCTION is_group_member(target_group_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM group_memberships
    WHERE group_id = target_group_id
      AND user_id = auth.uid()
      AND is_active = true
  );
$$;

CREATE OR REPLACE FUNCTION has_group_role(target_group_id uuid, allowed_roles text[])
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM group_memberships
    WHERE group_id = target_group_id
      AND user_id = auth.uid()
      AND is_active = true
      AND role = ANY(allowed_roles)
  );
$$;

REVOKE ALL ON FUNCTION is_group_member(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION is_group_member(uuid) TO authenticated, service_role;

REVOKE ALL ON FUNCTION has_group_role(uuid, text[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION has_group_role(uuid, text[]) TO authenticated, service_role;

-- 4.1 RPCs multi-tenant para provisionamiento de Grupo e invitaciones

CREATE OR REPLACE FUNCTION create_scout_group_tenant(
  p_number integer,
  p_name text,
  p_district text,
  p_zone text,
  p_org_model text DEFAULT 'tradicional',
  p_display_name text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_user_email text := lower(trim(COALESCE(auth.jwt() ->> 'email', '')));
  v_clean_name text := trim(COALESCE(p_name, ''));
  v_clean_district text := trim(COALESCE(p_district, ''));
  v_clean_zone text := trim(COALESCE(p_zone, ''));
  v_clean_model text := COALESCE(NULLIF(trim(p_org_model), ''), 'tradicional');
  v_clean_display text := COALESCE(NULLIF(trim(p_display_name), ''), NULLIF(split_part(v_user_email, '@', 1), ''), 'Jefe de Grupo');
  v_group scout_groups%ROWTYPE;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Autenticacion requerida para crear un Grupo Scout';
  END IF;

  IF p_number IS NULL OR p_number <= 0 THEN
    RAISE EXCEPTION 'Numero de Grupo invalido';
  END IF;

  IF char_length(v_clean_name) < 3 OR char_length(v_clean_district) < 2 OR char_length(v_clean_zone) < 2 THEN
    RAISE EXCEPTION 'Completa nombre oficial, distrito y zona del Grupo';
  END IF;

  IF v_clean_model NOT IN ('tradicional', 'nucleo', 'comunitario', 'escolar') THEN
    RAISE EXCEPTION 'Modalidad organizativa invalida';
  END IF;

  IF EXISTS (SELECT 1 FROM scout_groups WHERE number = p_number) THEN
    RAISE EXCEPTION 'Ya existe un Grupo Scout registrado con el numero %', p_number;
  END IF;

  PERFORM set_config('app.tenant_provisioning', 'true', true);

  INSERT INTO scout_groups (number, name, district, zone, org_model)
  VALUES (p_number, v_clean_name, v_clean_district, v_clean_zone, v_clean_model)
  RETURNING * INTO v_group;

  INSERT INTO group_memberships (
    group_id,
    user_id,
    role,
    branch,
    display_name,
    member_email,
    is_active
  )
  VALUES (
    v_group.id,
    v_user_id,
    'jefe_grupo',
    'jefatura',
    v_clean_display,
    NULLIF(v_user_email, ''),
    true
  );

  RETURN jsonb_build_object(
    'group', to_jsonb(v_group),
    'role', 'jefe_grupo',
    'branch', 'jefatura'
  );
END;
$$;

REVOKE ALL ON FUNCTION create_scout_group_tenant(integer, text, text, text, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION create_scout_group_tenant(integer, text, text, text, text, text) TO authenticated;

CREATE OR REPLACE FUNCTION create_group_invitation(
  p_group_id uuid,
  p_role text,
  p_branch text DEFAULT 'jefatura',
  p_invited_email text DEFAULT NULL,
  p_invited_name text DEFAULT NULL,
  p_max_uses integer DEFAULT 1,
  p_expires_days integer DEFAULT 14
)
RETURNS group_invitations
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_actor_role text;
  v_code text;
  v_invitation group_invitations%ROWTYPE;
  v_clean_email text := NULLIF(lower(trim(COALESCE(p_invited_email, ''))), '');
  v_clean_name text := NULLIF(trim(COALESCE(p_invited_name, '')), '');
  v_uses integer := LEAST(GREATEST(COALESCE(p_max_uses, 1), 1), 100);
  v_days integer := LEAST(GREATEST(COALESCE(p_expires_days, 14), 1), 90);
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Autenticacion requerida';
  END IF;

  SELECT role INTO v_actor_role
  FROM group_memberships
  WHERE group_id = p_group_id
    AND user_id = v_user_id
    AND is_active = true
  LIMIT 1;

  IF v_actor_role IS NULL OR v_actor_role NOT IN ('jefe_grupo', 'subjefe_grupo') THEN
    RAISE EXCEPTION 'Solo Jefatura de Grupo puede generar invitaciones';
  END IF;

  IF p_role NOT IN ('subjefe_grupo', 'jefe_rama', 'educador') THEN
    RAISE EXCEPTION 'Rol de invitacion invalido';
  END IF;

  IF v_actor_role = 'subjefe_grupo' AND p_role = 'subjefe_grupo' THEN
    RAISE EXCEPTION 'Solo el Jefe de Grupo puede invitar a un Subjefe de Grupo';
  END IF;

  IF p_branch NOT IN ('manada', 'unidad', 'caminantes', 'rovers', 'jefatura') THEN
    RAISE EXCEPTION 'Rama invalida';
  END IF;

  v_code := 'CS-' || upper(encode(gen_random_bytes(5), 'hex'));

  INSERT INTO group_invitations (
    group_id,
    invite_code,
    invited_email,
    invited_name,
    role,
    branch,
    max_uses,
    expires_at,
    created_by
  )
  VALUES (
    p_group_id,
    v_code,
    v_clean_email,
    v_clean_name,
    p_role,
    p_branch,
    v_uses,
    now() + make_interval(days => v_days),
    v_user_id
  )
  RETURNING * INTO v_invitation;

  RETURN v_invitation;
END;
$$;

REVOKE ALL ON FUNCTION create_group_invitation(uuid, text, text, text, text, integer, integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION create_group_invitation(uuid, text, text, text, text, integer, integer) TO authenticated;

CREATE OR REPLACE FUNCTION preview_group_invitation(p_invite_code text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_code text := upper(trim(COALESCE(p_invite_code, '')));
  v_inv group_invitations%ROWTYPE;
  v_group scout_groups%ROWTYPE;
BEGIN
  IF v_code = '' THEN
    RETURN jsonb_build_object('valid', false, 'error', 'Codigo vacio');
  END IF;

  SELECT * INTO v_inv
  FROM group_invitations
  WHERE invite_code = v_code
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('valid', false, 'error', 'Codigo de invitacion inexistente');
  END IF;

  IF v_inv.status <> 'pendiente' THEN
    RETURN jsonb_build_object('valid', false, 'error', 'La invitacion ya fue utilizada o revocada');
  END IF;

  IF v_inv.expires_at <= now() THEN
    RETURN jsonb_build_object('valid', false, 'error', 'La invitacion ha expirado');
  END IF;

  IF v_inv.uses_count >= v_inv.max_uses THEN
    RETURN jsonb_build_object('valid', false, 'error', 'La invitacion alcanzo su limite de usos');
  END IF;

  SELECT * INTO v_group
  FROM scout_groups
  WHERE id = v_inv.group_id;

  RETURN jsonb_build_object(
    'valid', true,
    'group_id', v_group.id,
    'group_number', v_group.number,
    'group_name', v_group.name,
    'district', v_group.district,
    'zone', v_group.zone,
    'role', v_inv.role,
    'branch', v_inv.branch,
    'requires_email', (v_inv.invited_email IS NOT NULL),
    'expires_at', v_inv.expires_at
  );
END;
$$;

REVOKE ALL ON FUNCTION preview_group_invitation(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION preview_group_invitation(text) TO anon, authenticated;

CREATE OR REPLACE FUNCTION accept_group_invitation(
  p_invite_code text,
  p_display_name text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_user_email text := lower(trim(COALESCE(auth.jwt() ->> 'email', '')));
  v_code text := upper(trim(COALESCE(p_invite_code, '')));
  v_inv group_invitations%ROWTYPE;
  v_group scout_groups%ROWTYPE;
  v_existing_role text;
  v_final_role text;
  v_clean_display text := COALESCE(NULLIF(trim(p_display_name), ''), NULLIF(split_part(v_user_email, '@', 1), ''), 'Educador');
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Debes iniciar sesion para aceptar una invitacion';
  END IF;

  SELECT * INTO v_inv
  FROM group_invitations
  WHERE invite_code = v_code
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Codigo de invitacion inexistente';
  END IF;

  IF v_inv.status <> 'pendiente' THEN
    RAISE EXCEPTION 'La invitacion ya no se encuentra activa';
  END IF;

  IF v_inv.expires_at <= now() THEN
    UPDATE group_invitations SET status = 'expirada' WHERE id = v_inv.id;
    RAISE EXCEPTION 'La invitacion ha expirado';
  END IF;

  IF v_inv.uses_count >= v_inv.max_uses THEN
    UPDATE group_invitations SET status = 'aceptada' WHERE id = v_inv.id;
    RAISE EXCEPTION 'La invitacion alcanzo su limite de usos';
  END IF;

  IF v_inv.invited_email IS NOT NULL AND v_inv.invited_email <> v_user_email THEN
    RAISE EXCEPTION 'Esta invitacion fue emitida para otro correo electronico';
  END IF;

  PERFORM set_config('app.tenant_provisioning', 'true', true);

  SELECT role INTO v_existing_role
  FROM group_memberships
  WHERE group_id = v_inv.group_id
    AND user_id = v_user_id;

  IF v_existing_role = 'jefe_grupo' THEN
    v_final_role := 'jefe_grupo';
  ELSE
    v_final_role := v_inv.role;
  END IF;

  INSERT INTO group_memberships (
    group_id,
    user_id,
    role,
    branch,
    display_name,
    member_email,
    is_active
  )
  VALUES (
    v_inv.group_id,
    v_user_id,
    v_final_role,
    v_inv.branch,
    v_clean_display,
    NULLIF(v_user_email, ''),
    true
  )
  ON CONFLICT (group_id, user_id) DO UPDATE SET
    role = v_final_role,
    branch = EXCLUDED.branch,
    display_name = COALESCE(NULLIF(EXCLUDED.display_name, ''), group_memberships.display_name),
    member_email = COALESCE(EXCLUDED.member_email, group_memberships.member_email),
    is_active = true;

  UPDATE group_invitations
  SET
    uses_count = uses_count + 1,
    accepted_by = v_user_id,
    status = CASE WHEN uses_count + 1 >= max_uses THEN 'aceptada' ELSE 'pendiente' END
  WHERE id = v_inv.id;

  SELECT * INTO v_group
  FROM scout_groups
  WHERE id = v_inv.group_id;

  RETURN jsonb_build_object(
    'group_id', v_group.id,
    'group_number', v_group.number,
    'group_name', v_group.name,
    'role', v_final_role,
    'branch', v_inv.branch
  );
END;
$$;

REVOKE ALL ON FUNCTION accept_group_invitation(text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION accept_group_invitation(text, text) TO authenticated;

-- 4.2 Agregacion eficiente para Cron Push multi-tenant (50+ grupos sin limite de 1000 filas)

CREATE OR REPLACE FUNCTION get_daily_reminder_group_stats(
  p_camp_cutoff date,
  p_medical_cutoff date,
  p_task_cutoff date
)
RETURNS TABLE (
  group_id uuid,
  camps_count bigint,
  medical_count bigint,
  tasks_count bigint
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH camp_counts AS (
    SELECT c.group_id, count(*)::bigint AS cnt
    FROM camp_checklists c
    WHERE c.approval_status NOT IN ('aprobada', 'presentada_distrito')
      AND c.district_submission_deadline <= p_camp_cutoff
    GROUP BY c.group_id
  ),
  med_counts AS (
    SELECT m.group_id, count(*)::bigint AS cnt
    FROM group_members m
    WHERE m.is_active = true
      AND m.medical_form_expires_at IS NOT NULL
      AND m.medical_form_expires_at <= p_medical_cutoff
    GROUP BY m.group_id
  ),
  task_counts AS (
    SELECT t.group_id, count(*)::bigint AS cnt
    FROM council_tasks t
    WHERE t.status IN ('pendiente', 'en_progreso')
      AND t.due_date IS NOT NULL
      AND t.due_date <= p_task_cutoff
    GROUP BY t.group_id
  ),
  all_groups AS (
    SELECT group_id FROM camp_counts
    UNION
    SELECT group_id FROM med_counts
    UNION
    SELECT group_id FROM task_counts
  )
  SELECT
    g.group_id,
    COALESCE(cc.cnt, 0) AS camps_count,
    COALESCE(mc.cnt, 0) AS medical_count,
    COALESCE(tc.cnt, 0) AS tasks_count
  FROM all_groups g
  LEFT JOIN camp_counts cc ON cc.group_id = g.group_id
  LEFT JOIN med_counts mc ON mc.group_id = g.group_id
  LEFT JOIN task_counts tc ON tc.group_id = g.group_id;
$$;

REVOKE ALL ON FUNCTION get_daily_reminder_group_stats(date, date, date) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION get_daily_reminder_group_stats(date, date, date) TO service_role;

-- 5. Busqueda vectorial semantica de normativa SAAC

CREATE OR REPLACE FUNCTION match_saac_documents(
  query_embedding vector(768),
  match_threshold float DEFAULT 0.65,
  match_count int DEFAULT 6,
  filter_category text DEFAULT NULL
)
RETURNS TABLE (
  id uuid,
  doc_title text,
  doc_category text,
  article_ref text,
  source_url text,
  content text,
  similarity float
)
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  SELECT
    kb.id,
    kb.doc_title,
    kb.doc_category,
    kb.article_ref,
    kb.source_url,
    kb.content,
    1 - (kb.embedding <=> query_embedding) AS similarity
  FROM saac_knowledge_base kb
  WHERE (filter_category IS NULL OR kb.doc_category = filter_category)
    AND 1 - (kb.embedding <=> query_embedding) >= match_threshold
  ORDER BY kb.embedding <=> query_embedding
  LIMIT LEAST(GREATEST(match_count, 1), 25);
$$;

REVOKE ALL ON FUNCTION match_saac_documents(vector, float, int, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION match_saac_documents(vector, float, int, text) FROM anon;
GRANT EXECUTE ON FUNCTION match_saac_documents(vector, float, int, text) TO authenticated, service_role;

-- 6. Row Level Security (RLS) estricto y aislamiento por group_id

ALTER TABLE scout_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE scout_groups FORCE ROW LEVEL SECURITY;

ALTER TABLE group_memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE group_memberships FORCE ROW LEVEL SECURITY;

ALTER TABLE group_invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE group_invitations FORCE ROW LEVEL SECURITY;

ALTER TABLE group_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE group_members FORCE ROW LEVEL SECURITY;

ALTER TABLE camp_checklists ENABLE ROW LEVEL SECURITY;
ALTER TABLE camp_checklists FORCE ROW LEVEL SECURITY;

ALTER TABLE council_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE council_tasks FORCE ROW LEVEL SECURITY;

ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE push_subscriptions FORCE ROW LEVEL SECURITY;

ALTER TABLE saac_knowledge_base ENABLE ROW LEVEL SECURITY;
ALTER TABLE saac_knowledge_base FORCE ROW LEVEL SECURITY;

-- Revocar cualquier privilegio residual para el rol anon en tablas operativas
REVOKE ALL ON TABLE
  scout_groups,
  group_memberships,
  group_invitations,
  group_members,
  camp_checklists,
  council_tasks,
  push_subscriptions,
  saac_knowledge_base
FROM anon;

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE
  scout_groups,
  group_memberships,
  group_invitations,
  group_members,
  camp_checklists,
  council_tasks,
  push_subscriptions
TO authenticated;

GRANT SELECT ON TABLE saac_knowledge_base TO authenticated;

-- 6.1 Politicas para scout_groups
DROP POLICY IF EXISTS scout_groups_select ON scout_groups;
CREATE POLICY scout_groups_select
  ON scout_groups
  FOR SELECT
  TO authenticated
  USING (is_group_member(id));

-- El alta directa de tenants se realiza exclusivamente via RPC create_scout_group_tenant
DROP POLICY IF EXISTS scout_groups_insert ON scout_groups;
CREATE POLICY scout_groups_insert
  ON scout_groups
  FOR INSERT
  TO authenticated
  WITH CHECK (false);

DROP POLICY IF EXISTS scout_groups_update ON scout_groups;
CREATE POLICY scout_groups_update
  ON scout_groups
  FOR UPDATE
  TO authenticated
  USING (has_group_role(id, ARRAY['jefe_grupo', 'subjefe_grupo']))
  WITH CHECK (has_group_role(id, ARRAY['jefe_grupo', 'subjefe_grupo']));

-- DELETE en scout_groups denegado via API cliente (solo service_role)

-- 6.2 Politicas para group_memberships
DROP POLICY IF EXISTS group_memberships_select ON group_memberships;
CREATE POLICY group_memberships_select
  ON group_memberships
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid() OR is_group_member(group_id));

DROP POLICY IF EXISTS group_memberships_insert ON group_memberships;
CREATE POLICY group_memberships_insert
  ON group_memberships
  FOR INSERT
  TO authenticated
  WITH CHECK (has_group_role(group_id, ARRAY['jefe_grupo']));

DROP POLICY IF EXISTS group_memberships_update ON group_memberships;
CREATE POLICY group_memberships_update
  ON group_memberships
  FOR UPDATE
  TO authenticated
  USING (has_group_role(group_id, ARRAY['jefe_grupo']))
  WITH CHECK (has_group_role(group_id, ARRAY['jefe_grupo']));

DROP POLICY IF EXISTS group_memberships_delete ON group_memberships;
CREATE POLICY group_memberships_delete
  ON group_memberships
  FOR DELETE
  TO authenticated
  USING (has_group_role(group_id, ARRAY['jefe_grupo']));

-- 6.2b Politicas para group_invitations
DROP POLICY IF EXISTS group_invitations_select ON group_invitations;
CREATE POLICY group_invitations_select
  ON group_invitations
  FOR SELECT
  TO authenticated
  USING (has_group_role(group_id, ARRAY['jefe_grupo', 'subjefe_grupo']));

DROP POLICY IF EXISTS group_invitations_insert ON group_invitations;
CREATE POLICY group_invitations_insert
  ON group_invitations
  FOR INSERT
  TO authenticated
  WITH CHECK (
    has_group_role(group_id, ARRAY['jefe_grupo'])
    OR (
      has_group_role(group_id, ARRAY['subjefe_grupo'])
      AND role IN ('jefe_rama', 'educador')
    )
  );

DROP POLICY IF EXISTS group_invitations_update ON group_invitations;
CREATE POLICY group_invitations_update
  ON group_invitations
  FOR UPDATE
  TO authenticated
  USING (
    has_group_role(group_id, ARRAY['jefe_grupo'])
    OR (
      has_group_role(group_id, ARRAY['subjefe_grupo'])
      AND role IN ('jefe_rama', 'educador')
    )
  )
  WITH CHECK (
    has_group_role(group_id, ARRAY['jefe_grupo'])
    OR (
      has_group_role(group_id, ARRAY['subjefe_grupo'])
      AND role IN ('jefe_rama', 'educador')
    )
  );

DROP POLICY IF EXISTS group_invitations_delete ON group_invitations;
CREATE POLICY group_invitations_delete
  ON group_invitations
  FOR DELETE
  TO authenticated
  USING (has_group_role(group_id, ARRAY['jefe_grupo']));

-- 6.3 Politicas para group_members
DROP POLICY IF EXISTS group_members_select ON group_members;
CREATE POLICY group_members_select
  ON group_members
  FOR SELECT
  TO authenticated
  USING (is_group_member(group_id));

DROP POLICY IF EXISTS group_members_insert ON group_members;
CREATE POLICY group_members_insert
  ON group_members
  FOR INSERT
  TO authenticated
  WITH CHECK (
    has_group_role(group_id, ARRAY['jefe_grupo', 'subjefe_grupo', 'jefe_rama'])
  );

DROP POLICY IF EXISTS group_members_update ON group_members;
CREATE POLICY group_members_update
  ON group_members
  FOR UPDATE
  TO authenticated
  USING (
    has_group_role(group_id, ARRAY['jefe_grupo', 'subjefe_grupo', 'jefe_rama'])
  )
  WITH CHECK (
    has_group_role(group_id, ARRAY['jefe_grupo', 'subjefe_grupo', 'jefe_rama'])
  );

DROP POLICY IF EXISTS group_members_delete ON group_members;
CREATE POLICY group_members_delete
  ON group_members
  FOR DELETE
  TO authenticated
  USING (has_group_role(group_id, ARRAY['jefe_grupo', 'subjefe_grupo']));

-- 6.4 Politicas para camp_checklists
DROP POLICY IF EXISTS camp_checklists_select ON camp_checklists;
CREATE POLICY camp_checklists_select
  ON camp_checklists
  FOR SELECT
  TO authenticated
  USING (is_group_member(group_id));

DROP POLICY IF EXISTS camp_checklists_insert ON camp_checklists;
CREATE POLICY camp_checklists_insert
  ON camp_checklists
  FOR INSERT
  TO authenticated
  WITH CHECK (
    has_group_role(group_id, ARRAY['jefe_grupo', 'subjefe_grupo', 'jefe_rama', 'educador'])
  );

DROP POLICY IF EXISTS camp_checklists_update ON camp_checklists;
CREATE POLICY camp_checklists_update
  ON camp_checklists
  FOR UPDATE
  TO authenticated
  USING (
    has_group_role(group_id, ARRAY['jefe_grupo', 'subjefe_grupo', 'jefe_rama', 'educador'])
  )
  WITH CHECK (
    has_group_role(group_id, ARRAY['jefe_grupo', 'subjefe_grupo', 'jefe_rama', 'educador'])
  );

DROP POLICY IF EXISTS camp_checklists_delete ON camp_checklists;
CREATE POLICY camp_checklists_delete
  ON camp_checklists
  FOR DELETE
  TO authenticated
  USING (has_group_role(group_id, ARRAY['jefe_grupo', 'subjefe_grupo']));

-- 6.5 Politicas para council_tasks
DROP POLICY IF EXISTS council_tasks_select ON council_tasks;
CREATE POLICY council_tasks_select
  ON council_tasks
  FOR SELECT
  TO authenticated
  USING (is_group_member(group_id));

DROP POLICY IF EXISTS council_tasks_insert ON council_tasks;
CREATE POLICY council_tasks_insert
  ON council_tasks
  FOR INSERT
  TO authenticated
  WITH CHECK (is_group_member(group_id));

DROP POLICY IF EXISTS council_tasks_update ON council_tasks;
CREATE POLICY council_tasks_update
  ON council_tasks
  FOR UPDATE
  TO authenticated
  USING (is_group_member(group_id))
  WITH CHECK (is_group_member(group_id));

DROP POLICY IF EXISTS council_tasks_delete ON council_tasks;
CREATE POLICY council_tasks_delete
  ON council_tasks
  FOR DELETE
  TO authenticated
  USING (has_group_role(group_id, ARRAY['jefe_grupo', 'subjefe_grupo']));

-- 6.6 Politicas para push_subscriptions (estricto por user_id = auth.uid())
DROP POLICY IF EXISTS push_subscriptions_select ON push_subscriptions;
CREATE POLICY push_subscriptions_select
  ON push_subscriptions
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS push_subscriptions_insert ON push_subscriptions;
CREATE POLICY push_subscriptions_insert
  ON push_subscriptions
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid() AND is_group_member(group_id));

DROP POLICY IF EXISTS push_subscriptions_update ON push_subscriptions;
CREATE POLICY push_subscriptions_update
  ON push_subscriptions
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid() AND is_group_member(group_id));

DROP POLICY IF EXISTS push_subscriptions_delete ON push_subscriptions;
CREATE POLICY push_subscriptions_delete
  ON push_subscriptions
  FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- 6.7 Politicas para saac_knowledge_base (solo lectura autenticada; escritura solo service_role)
DROP POLICY IF EXISTS saac_knowledge_base_select ON saac_knowledge_base;
CREATE POLICY saac_knowledge_base_select
  ON saac_knowledge_base
  FOR SELECT
  TO authenticated
  USING (auth.uid() IS NOT NULL);
