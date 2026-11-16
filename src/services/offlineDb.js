import { openDB } from 'idb';

export const OFFLINE_DB_NAME = 'consejoscout_db_v1';
export const OFFLINE_DB_VERSION = 1;
export const DEMO_GROUP_ID = 'local-demo-group-412';

const STORE_KV_CACHE = 'kv_cache';
const STORE_OUTBOX = 'outbox_queue';

export const LS_KEYS = Object.freeze({
  ACTIVE_GROUP_ID: 'consejoscout:active_group_id',
  LAST_SYNC_AT: 'consejoscout:last_sync_at',
  INSTALL_DISMISSED_AT: 'consejoscout:install_dismissed_at',
  PUSH_PREFS: 'consejoscout:push_prefs',
  CAMP_ALERTS: 'consejoscout:scheduled_camp_alerts',
  DEMO_INITIALIZED: 'consejoscout:demo_initialized',
  PENDING_INVITE_CODE: 'consejoscout:pending_invite_code'
});

let dbPromise = null;

function getDb() {
  if (!dbPromise) {
    dbPromise = openDB(OFFLINE_DB_NAME, OFFLINE_DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains(STORE_KV_CACHE)) {
          db.createObjectStore(STORE_KV_CACHE, { keyPath: 'key' });
        }
        if (!db.objectStoreNames.contains(STORE_OUTBOX)) {
          db.createObjectStore(STORE_OUTBOX, { keyPath: 'localId' });
        }
      }
    });
  }
  return dbPromise;
}

export function generateLocalId(prefix = 'loc') {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function relativeIsoDate(daysOffset) {
  const now = new Date();
  const utc = Date.UTC(
    now.getUTCFullYear(),
    now.getUTCMonth(),
    now.getUTCDate() + daysOffset
  );
  return new Date(utc).toISOString().slice(0, 10);
}

export function buildDemoSeedData(groupId = DEMO_GROUP_ID) {
  const nowIso = new Date().toISOString();

  const groupProfile = {
    id: groupId,
    number: 412,
    name: 'Grupo Scout Nro. 412 - San Martin',
    district: 'Distrito 2',
    zone: 'Zona 14',
    org_model: 'tradicional',
    userRole: 'jefe_grupo',
    isDemo: true,
    updated_at: nowIso
  };

  const members = [
    {
      id: 'demo-member-01',
      group_id: groupId,
      member_type: 'educador',
      branch: 'jefatura',
      full_name: 'Carolina Mendez',
      document_number: null,
      cruz_del_sur_status: 'afiliado',
      medical_form_expires_at: relativeIsoDate(180),
      safe_from_harm_status: 'vigente',
      safe_from_harm_expires_at: relativeIsoDate(260),
      is_active: true,
      updated_at: nowIso
    },
    {
      id: 'demo-member-02',
      group_id: groupId,
      member_type: 'educador',
      branch: 'manada',
      full_name: 'Matias Pellegrini',
      document_number: null,
      cruz_del_sur_status: 'afiliado',
      medical_form_expires_at: relativeIsoDate(22),
      safe_from_harm_status: 'vigente',
      safe_from_harm_expires_at: relativeIsoDate(190),
      is_active: true,
      updated_at: nowIso
    },
    {
      id: 'demo-member-03',
      group_id: groupId,
      member_type: 'educador',
      branch: 'unidad',
      full_name: 'Lucia Benitez',
      document_number: null,
      cruz_del_sur_status: 'afiliado',
      medical_form_expires_at: relativeIsoDate(95),
      safe_from_harm_status: 'pendiente',
      safe_from_harm_expires_at: null,
      is_active: true,
      updated_at: nowIso
    },
    {
      id: 'demo-member-04',
      group_id: groupId,
      member_type: 'educador',
      branch: 'caminantes',
      full_name: 'Federico Ibarra',
      document_number: null,
      cruz_del_sur_status: 'afiliado',
      medical_form_expires_at: relativeIsoDate(140),
      safe_from_harm_status: 'vigente',
      safe_from_harm_expires_at: relativeIsoDate(310),
      is_active: true,
      updated_at: nowIso
    },
    {
      id: 'demo-member-05',
      group_id: groupId,
      member_type: 'beneficiario',
      branch: 'manada',
      full_name: 'Tomas Ferreyra',
      document_number: null,
      cruz_del_sur_status: 'afiliado',
      medical_form_expires_at: relativeIsoDate(11),
      safe_from_harm_status: 'no_aplica',
      safe_from_harm_expires_at: null,
      is_active: true,
      updated_at: nowIso
    },
    {
      id: 'demo-member-06',
      group_id: groupId,
      member_type: 'beneficiario',
      branch: 'manada',
      full_name: 'Valentina Sosa',
      document_number: null,
      cruz_del_sur_status: 'pendiente',
      medical_form_expires_at: relativeIsoDate(160),
      safe_from_harm_status: 'no_aplica',
      safe_from_harm_expires_at: null,
      is_active: true,
      updated_at: nowIso
    },
    {
      id: 'demo-member-07',
      group_id: groupId,
      member_type: 'beneficiario',
      branch: 'unidad',
      full_name: 'Joaquin Navarro',
      document_number: null,
      cruz_del_sur_status: 'afiliado',
      medical_form_expires_at: relativeIsoDate(-4),
      safe_from_harm_status: 'no_aplica',
      safe_from_harm_expires_at: null,
      is_active: true,
      updated_at: nowIso
    },
    {
      id: 'demo-member-08',
      group_id: groupId,
      member_type: 'beneficiario',
      branch: 'unidad',
      full_name: 'Camila Quiroga',
      document_number: null,
      cruz_del_sur_status: 'afiliado',
      medical_form_expires_at: relativeIsoDate(28),
      safe_from_harm_status: 'no_aplica',
      safe_from_harm_expires_at: null,
      is_active: true,
      updated_at: nowIso
    },
    {
      id: 'demo-member-09',
      group_id: groupId,
      member_type: 'beneficiario',
      branch: 'caminantes',
      full_name: 'Agustin Peralta',
      document_number: null,
      cruz_del_sur_status: 'afiliado',
      medical_form_expires_at: relativeIsoDate(210),
      safe_from_harm_status: 'no_aplica',
      safe_from_harm_expires_at: null,
      is_active: true,
      updated_at: nowIso
    },
    {
      id: 'demo-member-10',
      group_id: groupId,
      member_type: 'beneficiario',
      branch: 'rovers',
      full_name: 'Martina Acosta',
      document_number: null,
      cruz_del_sur_status: 'pendiente',
      medical_form_expires_at: relativeIsoDate(14),
      safe_from_harm_status: 'no_aplica',
      safe_from_harm_expires_at: null,
      is_active: true,
      updated_at: nowIso
    }
  ];

  const camps = [
    {
      id: 'demo-camp-01',
      group_id: groupId,
      title: 'Acampe de Primavera',
      camp_type: 'campamento_corto',
      branch_scope: 'grupal',
      location: 'Campo Scout El Jaguel',
      locality: 'El Jaguel',
      province: 'Provincia de Buenos Aires',
      operational_notes:
        'Predio cercano al area metropolitana de Buenos Aires; verificar control de acceso, asignacion de parcelas y cupo sanitario previo.',
      start_date: relativeIsoDate(20),
      end_date: relativeIsoDate(22),
      district_submission_deadline: relativeIsoDate(5),
      branch_counts: {
        manada: 14,
        unidad: 16,
        caminantes: 10,
        rovers: 6
      },
      youth_count: 46,
      adult_count: 8,
      safe_from_harm_count: 7,
      qualified_leaders_count: 4,
      required_adults: 8,
      ratio_compliant: true,
      documentation_status: {
        carpeta_medica: true,
        autorizaciones: false,
        seguro_cruz_del_sur: true,
        proyecto_educativo: true,
        a_salvo_del_peligro: false,
        nota_pedido_acampe: false
      },
      documentation_progress: {
        carpeta_medica: 'completo',
        autorizaciones: 'en_proceso',
        seguro_cruz_del_sur: 'completo',
        proyecto_educativo: 'completo',
        a_salvo_del_peligro: 'en_proceso',
        nota_pedido_acampe: 'pendiente'
      },
      push_reminders: {
        days15: true,
        days7: true,
        hours48: true
      },
      approval_status: 'en_revision_consejo',
      updated_at: nowIso
    },
    {
      id: 'demo-camp-02',
      group_id: groupId,
      title: 'Campamento Anual de Verano',
      camp_type: 'campamento_largo',
      branch_scope: 'grupal',
      location: 'Centro Scout Necochea',
      locality: 'Necochea',
      province: 'Provincia de Buenos Aires',
      operational_notes:
        'Zona costera con amplitud termica y vientos intensos; prever anclaje reforzado de carpas y reserva institucional.',
      start_date: relativeIsoDate(62),
      end_date: relativeIsoDate(69),
      district_submission_deadline: relativeIsoDate(32),
      branch_counts: {
        manada: 12,
        unidad: 18,
        caminantes: 12,
        rovers: 8
      },
      youth_count: 50,
      adult_count: 8,
      safe_from_harm_count: 8,
      qualified_leaders_count: 5,
      required_adults: 7,
      ratio_compliant: true,
      documentation_status: {
        carpeta_medica: false,
        autorizaciones: false,
        seguro_cruz_del_sur: true,
        proyecto_educativo: true,
        a_salvo_del_peligro: true,
        nota_pedido_acampe: false
      },
      documentation_progress: {
        carpeta_medica: 'en_proceso',
        autorizaciones: 'pendiente',
        seguro_cruz_del_sur: 'completo',
        proyecto_educativo: 'completo',
        a_salvo_del_peligro: 'completo',
        nota_pedido_acampe: 'pendiente'
      },
      push_reminders: {
        days15: true,
        days7: true,
        hours48: true
      },
      approval_status: 'borrador',
      updated_at: nowIso
    }
  ];

  const tasks = [
    {
      id: 'demo-task-01',
      group_id: groupId,
      title: 'Presentar carpeta distrital del Acampe de Primavera',
      description: 'Consolidar autorizaciones firmadas y elevar nota al Jefe de Distrito.',
      assigned_role: 'jefe_grupo',
      branch: 'jefatura',
      due_date: relativeIsoDate(5),
      status: 'en_progreso',
      meeting_date: relativeIsoDate(-5),
      minutes_reference: 'Acta 14/2026',
      updated_at: nowIso
    },
    {
      id: 'demo-task-02',
      group_id: groupId,
      title: 'Regularizar curso A Salvo del Peligro de educadora de Unidad',
      description: 'Confirmar inscripcion y aprobacion en Campus SAAC antes del acampe.',
      assigned_role: 'jefe_rama',
      branch: 'unidad',
      due_date: relativeIsoDate(3),
      status: 'pendiente',
      meeting_date: relativeIsoDate(-5),
      minutes_reference: 'Acta 14/2026',
      updated_at: nowIso
    },
    {
      id: 'demo-task-03',
      group_id: groupId,
      title: 'Solicitar renovacion de fichas medicas por vencer en Manada',
      description: 'Enviar comunicado por canal de familias con fecha limite de entrega.',
      assigned_role: 'subjefe_grupo',
      branch: 'manada',
      due_date: relativeIsoDate(7),
      status: 'pendiente',
      meeting_date: relativeIsoDate(-5),
      minutes_reference: 'Acta 14/2026',
      updated_at: nowIso
    },
    {
      id: 'demo-task-04',
      group_id: groupId,
      title: 'Verificar altas pendientes en sistema Cruz del Sur',
      description: 'Validar comprobantes de afiliacion de Manada y Comunidad Rover.',
      assigned_role: 'educador',
      branch: 'rovers',
      due_date: relativeIsoDate(-1),
      status: 'completada',
      meeting_date: relativeIsoDate(-12),
      minutes_reference: 'Acta 13/2026',
      updated_at: nowIso
    }
  ];

  return { groupProfile, members, camps, tasks };
}

export function readLocalPref(key, fallback = null) {
  try {
    const raw = window.localStorage.getItem(key);
    if (raw === null) {
      return fallback;
    }
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

export function writeLocalPref(key, value) {
  try {
    if (value === null || value === undefined) {
      window.localStorage.removeItem(key);
    } else {
      window.localStorage.setItem(key, JSON.stringify(value));
    }
  } catch {
    // Ignorar errores de cuota de almacenamiento
  }
}

export async function getCacheItem(key) {
  const db = await getDb();
  const entry = await db.get(STORE_KV_CACHE, key);
  return entry ? entry.value : null;
}

export async function setCacheItem(key, value) {
  const db = await getDb();
  await db.put(STORE_KV_CACHE, {
    key,
    value,
    updatedAt: new Date().toISOString()
  });
}

function cacheKey(entity, groupId) {
  return `${entity}:${groupId}`;
}

export async function seedDemoDataIfEmpty(hasAuthSession = false) {
  if (hasAuthSession) {
    return false;
  }
  const existingGroup = await getCacheItem(cacheKey('scout_group', DEMO_GROUP_ID));
  const alreadyInitialized = readLocalPref(LS_KEYS.DEMO_INITIALIZED, false);
  if (existingGroup || alreadyInitialized) {
    return false;
  }

  const seed = buildDemoSeedData(DEMO_GROUP_ID);
  await Promise.all([
    setCacheItem(cacheKey('scout_group', DEMO_GROUP_ID), seed.groupProfile),
    setCacheItem(cacheKey('group_members', DEMO_GROUP_ID), seed.members),
    setCacheItem(cacheKey('camp_checklists', DEMO_GROUP_ID), seed.camps),
    setCacheItem(cacheKey('council_tasks', DEMO_GROUP_ID), seed.tasks)
  ]);
  writeLocalPref(LS_KEYS.ACTIVE_GROUP_ID, DEMO_GROUP_ID);
  writeLocalPref(LS_KEYS.DEMO_INITIALIZED, true);
  return true;
}

export async function getGroupProfile(groupId = DEMO_GROUP_ID) {
  const stored = await getCacheItem(cacheKey('scout_group', groupId));
  if (stored) {
    return stored;
  }
  return {
    id: groupId,
    number: 412,
    name: 'Grupo Scout Nro. 412 - San Martin',
    district: 'Distrito 2',
    zone: 'Zona 14',
    org_model: 'tradicional',
    isDemo: groupId === DEMO_GROUP_ID
  };
}

export async function saveGroupProfile(profile) {
  const groupId = profile?.id || DEMO_GROUP_ID;
  const next = {
    ...profile,
    id: groupId,
    updated_at: new Date().toISOString()
  };
  await setCacheItem(cacheKey('scout_group', groupId), next);
  return next;
}

export async function getCachedCollection(entity, groupId = DEMO_GROUP_ID) {
  const list = await getCacheItem(cacheKey(entity, groupId));
  return Array.isArray(list) ? list : [];
}

export async function setCachedCollection(entity, groupId, items) {
  await setCacheItem(cacheKey(entity, groupId), Array.isArray(items) ? items : []);
}

export async function upsertCachedRecord(entity, groupId, record) {
  const current = await getCachedCollection(entity, groupId);
  const nowIso = new Date().toISOString();
  const nextRecord = {
    ...record,
    id: record.id || generateLocalId(entity),
    group_id: groupId,
    updated_at: nowIso
  };
  const idx = current.findIndex((item) => item.id === nextRecord.id);
  const updated =
    idx >= 0
      ? current.map((item, i) => (i === idx ? nextRecord : item))
      : [nextRecord, ...current];

  await setCachedCollection(entity, groupId, updated);
  return { record: nextRecord, list: updated, isNew: idx < 0 };
}

export async function upsertCachedBatch(entity, groupId, records = []) {
  const current = await getCachedCollection(entity, groupId);
  const nowIso = new Date().toISOString();
  const byId = new Map(current.map((item) => [item.id, item]));
  const prepared = [];

  for (const raw of records) {
    const id = raw.id || generateLocalId(entity);
    const nextRecord = {
      ...raw,
      id,
      group_id: groupId,
      updated_at: nowIso
    };
    byId.set(id, nextRecord);
    prepared.push(nextRecord);
  }

  const updated = Array.from(byId.values());
  await setCachedCollection(entity, groupId, updated);
  return { records: prepared, list: updated };
}

export async function deleteCachedRecord(entity, groupId, recordId) {
  const current = await getCachedCollection(entity, groupId);
  const updated = current.filter((item) => item.id !== recordId);
  await setCachedCollection(entity, groupId, updated);
  return updated;
}

// Cola FIFO de mutaciones offline (outbox_queue)
export async function getOutboxQueue() {
  const db = await getDb();
  const items = await db.getAll(STORE_OUTBOX);
  return items.sort((a, b) => (a.updatedAt || '').localeCompare(b.updatedAt || ''));
}

export async function enqueueOutboxMutation({
  table,
  operation,
  recordId,
  payload
}) {
  const db = await getDb();
  const item = {
    localId: generateLocalId('outbox'),
    table,
    operation,
    recordId,
    payload,
    updatedAt: new Date().toISOString(),
    retries: 0,
    status: 'pending'
  };
  await db.put(STORE_OUTBOX, item);
  return item;
}

export async function updateOutboxItem(item) {
  const db = await getDb();
  await db.put(STORE_OUTBOX, item);
  return item;
}

export async function removeOutboxItem(localId) {
  const db = await getDb();
  await db.delete(STORE_OUTBOX, localId);
}

/**
 * Limpieza de seguridad al cerrar sesion: purga IndexedDB (kv_cache y outbox_queue)
 * y claves de sesion en localStorage para proteger nominas de menores en equipos compartidos.
 */
export async function clearAllOfflineData() {
  const db = await getDb();
  await Promise.all([
    db.clear(STORE_KV_CACHE),
    db.clear(STORE_OUTBOX)
  ]);

  writeLocalPref(LS_KEYS.ACTIVE_GROUP_ID, null);
  writeLocalPref(LS_KEYS.LAST_SYNC_AT, null);
  writeLocalPref(LS_KEYS.PUSH_PREFS, null);
  writeLocalPref(LS_KEYS.CAMP_ALERTS, null);
  writeLocalPref(LS_KEYS.DEMO_INITIALIZED, null);
}
