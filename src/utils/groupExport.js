import { getRoleLabel } from '../domain/roles.js';

const FORMULA_PREFIX_REGEX = /^[\s\u00A0]*[=+\-@\t\r]/;

export function escapeCsvCell(value) {
  if (value === null || value === undefined) {
    return '';
  }

  let str = typeof value === 'string' ? value : String(value);
  // Neutraliza CSV / Spreadsheet Formula Injection al abrir en Excel o Sheets
  if (FORMULA_PREFIX_REGEX.test(str)) {
    str = `'${str}`;
  }

  if (/[",\r\n]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function toSlug(value) {
  return String(value || 'grupo')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48) || 'grupo';
}

export function buildExportFilename(group, extension = 'csv') {
  const safeExt = extension === 'json' ? 'json' : 'csv';
  const num = group?.number ? String(group.number) : 'demo';
  const nameSlug = toSlug(group?.name || 'consejoscout');
  const datePart = new Date().toISOString().slice(0, 10);
  return `grupo-scout-${num}-${nameSlug}-${datePart}.${safeExt}`;
}

export function buildGroupCsvContent(exportData) {
  const group = exportData?.group || {};
  const team = Array.isArray(exportData?.team) ? exportData.team : [];
  const members = Array.isArray(exportData?.members) ? exportData.members : [];
  const camps = Array.isArray(exportData?.camps) ? exportData.camps : [];
  const tasks = Array.isArray(exportData?.tasks) ? exportData.tasks : [];

  const rows = [
    [
      'Seccion',
      'Tipo o Rol',
      'Rama',
      'Nombre o Titulo',
      'Correo / Documento / Lugar',
      'Estado / Aprobacion',
      'Fechas / Vencimiento / Detalles'
    ]
  ];

  rows.push([
    'Grupo',
    `Nro. ${group.number || '-'}`,
    group.org_model || 'tradicional',
    group.name || '',
    `${group.district || ''} / ${group.zone || ''}`.trim(),
    'activo',
    `Exportado: ${exportData?.exportedAt || new Date().toISOString()}`
  ]);

  for (const t of team) {
    rows.push([
      'Equipo',
      getRoleLabel(t.role),
      t.branch || 'jefatura',
      t.display_name || '',
      t.member_email || '',
      t.is_active === false ? 'inactivo' : 'activo',
      t.created_at ? String(t.created_at).slice(0, 10) : ''
    ]);
  }

  for (const m of members) {
    rows.push([
      'Padron',
      m.member_type || 'beneficiario',
      m.branch || '',
      m.full_name || '',
      m.document_number || '',
      `Cruz del Sur: ${m.cruz_del_sur_status || 'pendiente'} | A Salvo: ${m.safe_from_harm_status || 'no_aplica'}`,
      m.medical_form_expires_at ? `Venc. Ficha Medica: ${m.medical_form_expires_at}` : ''
    ]);
  }

  for (const c of camps) {
    rows.push([
      'Salida',
      c.camp_type || '',
      c.branch_scope || '',
      c.title || '',
      c.location || '',
      c.approval_status || 'borrador',
      `${c.start_date || ''} a ${c.end_date || ''} | Jovenes: ${c.youth_count ?? 0} | Adultos: ${c.adult_count ?? 0}/${c.required_adults ?? 2}`
    ]);
  }

  for (const task of tasks) {
    rows.push([
      'Tarea',
      task.assigned_role || '',
      '',
      task.title || '',
      task.minutes_reference || '',
      task.status || 'pendiente',
      `${task.due_date ? `Vence: ${task.due_date}` : ''} ${task.description || ''}`.trim()
    ]);
  }

  const csvBody = rows
    .map((row) => row.map((cell) => escapeCsvCell(cell)).join(','))
    .join('\r\n');

  // UTF-8 BOM para correcta visualizacion de acentos y caracteres en Excel
  return `\uFEFF${csvBody}`;
}

export function buildGroupJsonContent(exportData) {
  const group = exportData?.group || null;
  const team = Array.isArray(exportData?.team) ? exportData.team : [];
  const members = Array.isArray(exportData?.members) ? exportData.members : [];
  const camps = Array.isArray(exportData?.camps) ? exportData.camps : [];
  const tasks = Array.isArray(exportData?.tasks) ? exportData.tasks : [];

  const sanitizedTeam = team.map((t) => ({
    role: t.role,
    branch: t.branch,
    display_name: t.display_name || null,
    member_email: t.member_email || null,
    is_active: t.is_active !== false,
    created_at: t.created_at || null
  }));

  const payload = {
    schemaVersion: '1.0',
    exportedAt: exportData?.exportedAt || new Date().toISOString(),
    summary: {
      teamCount: sanitizedTeam.length,
      membersCount: members.length,
      campsCount: camps.length,
      tasksCount: tasks.length
    },
    group: group
      ? {
          id: group.id,
          number: group.number,
          name: group.name,
          district: group.district,
          zone: group.zone,
          org_model: group.org_model || 'tradicional',
          primary_color: group.primary_color || '#4D207A',
          accent_color: group.accent_color || '#7C3AED'
        }
      : null,
    team: sanitizedTeam,
    members,
    camps,
    tasks
  };

  return JSON.stringify(payload, null, 2);
}

export function triggerBrowserDownload(content, filename, mimeType) {
  if (typeof document === 'undefined' || typeof URL === 'undefined') {
    return false;
  }

  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.style.display = 'none';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  return true;
}
