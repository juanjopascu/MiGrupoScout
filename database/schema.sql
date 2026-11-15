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
      'educador',
      'secretario',
      'tesorero',
      'consejero'
    )),
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (group_id, user_id)
);

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
      'secretario',
      'tesorero',
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

DROP TRIGGER IF EXISTS trg_group_memberships_updated_at ON group_memberships;
CREATE TRIGGER trg_group_memberships_updated_at
  BEFORE UPDATE ON group_memberships
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

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
  group_members,
  camp_checklists,
  council_tasks,
  push_subscriptions,
  saac_knowledge_base
FROM anon;

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE
  scout_groups,
  group_memberships,
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

DROP POLICY IF EXISTS scout_groups_insert ON scout_groups;
CREATE POLICY scout_groups_insert
  ON scout_groups
  FOR INSERT
  TO authenticated
  WITH CHECK (has_group_role(id, ARRAY['jefe_grupo', 'subjefe_grupo']));

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
  WITH CHECK (has_group_role(group_id, ARRAY['jefe_grupo', 'subjefe_grupo']));

DROP POLICY IF EXISTS group_memberships_update ON group_memberships;
CREATE POLICY group_memberships_update
  ON group_memberships
  FOR UPDATE
  TO authenticated
  USING (has_group_role(group_id, ARRAY['jefe_grupo', 'subjefe_grupo']))
  WITH CHECK (has_group_role(group_id, ARRAY['jefe_grupo', 'subjefe_grupo']));

DROP POLICY IF EXISTS group_memberships_delete ON group_memberships;
CREATE POLICY group_memberships_delete
  ON group_memberships
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
    has_group_role(group_id, ARRAY['jefe_grupo', 'subjefe_grupo', 'secretario', 'jefe_rama'])
  );

DROP POLICY IF EXISTS group_members_update ON group_members;
CREATE POLICY group_members_update
  ON group_members
  FOR UPDATE
  TO authenticated
  USING (
    has_group_role(group_id, ARRAY['jefe_grupo', 'subjefe_grupo', 'secretario', 'jefe_rama'])
  )
  WITH CHECK (
    has_group_role(group_id, ARRAY['jefe_grupo', 'subjefe_grupo', 'secretario', 'jefe_rama'])
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
  USING (has_group_role(group_id, ARRAY['jefe_grupo', 'subjefe_grupo', 'secretario']));

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
