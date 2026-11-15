import { useMemo, useState } from 'react';
import {
  AlertTriangle,
  BadgeCheck,
  Bell,
  BellOff,
  BellRing,
  Calendar,
  CheckCircle2,
  CheckSquare,
  ChevronRight,
  ClipboardList,
  Compass,
  Edit3,
  ExternalLink,
  GraduationCap,
  HeartPulse,
  Library,
  Plus,
  Search,
  ShieldAlert,
  ShieldCheck,
  Smartphone,
  Square,
  Tent,
  Trash2,
  Users,
  X,
  XCircle
} from 'lucide-react';
import { SAAC_LINKS } from '../config/saacLinks.js';
import {
  ALLOWED_ASSIGNED_ROLES,
  ALLOWED_CRUZ_DEL_SUR_STATUS,
  ALLOWED_MEMBER_TYPES,
  ALLOWED_SAFE_FROM_HARM_STATUS,
  validateCouncilTaskInput,
  validateMemberInput
} from '../domain/validators.js';
import { cleanUserText, formatDateAr, getDaysFromToday, getTodayIsoLocal } from '../utils/textSanitizer.js';

const BRANCH_FILTERS = Object.freeze([
  { id: 'todas', label: 'Todas' },
  { id: 'manada', label: 'Manada' },
  { id: 'unidad', label: 'Unidad' },
  { id: 'caminantes', label: 'Caminantes' },
  { id: 'rovers', label: 'Rovers' },
  { id: 'jefatura', label: 'Adultos' }
]);

const BRANCH_BADGE_STYLES = Object.freeze({
  manada: 'bg-amber-100 border-amber-700 text-amber-900',
  unidad: 'bg-green-100 border-green-700 text-green-900',
  caminantes: 'bg-blue-100 border-blue-700 text-blue-900',
  rovers: 'bg-red-100 border-red-700 text-red-900',
  jefatura: 'bg-slate-100 border-slate-600 text-slate-900'
});

const BRANCH_SHORT_LABELS = Object.freeze({
  manada: 'Manada',
  unidad: 'Unidad',
  caminantes: 'Caminantes',
  rovers: 'Rovers',
  jefatura: 'Adultos'
});

const ROLE_LABELS = Object.freeze({
  jefe_grupo: 'Jefe de Grupo',
  subjefe_grupo: 'Subjefe de Grupo',
  jefe_rama: 'Jefe de Rama',
  educador: 'Educador',
  secretario: 'Secretario/a',
  tesorero: 'Tesorero/a',
  consejo_pleno: 'Consejo Pleno'
});

const SAAC_ICON_MAP = {
  Users,
  Compass,
  Library,
  GraduationCap
};

function PushStatusWidget({ pushState, onOpen }) {
  const config = useMemo(() => {
    if (pushState === 'granted') {
      return {
        icon: BellRing,
        badgeClass: 'bg-green-100 border-green-700 text-green-900',
        title: 'Alertas Push activas en este dispositivo',
        subtitle: 'Toca para configurar categorias o enviar una prueba'
      };
    }
    if (pushState === 'denied') {
      return {
        icon: BellOff,
        badgeClass: 'bg-red-100 border-red-700 text-red-900',
        title: 'Alertas Push bloqueadas en el navegador',
        subtitle: 'Toca para ver como habilitar permisos'
      };
    }
    if (pushState === 'ios-browser-unsupported') {
      return {
        icon: Smartphone,
        badgeClass: 'bg-blue-100 border-blue-700 text-blue-900',
        title: 'Instala la app en iPhone/iPad para recibir alertas',
        subtitle: 'Toca para ver la guia paso a paso'
      };
    }
    return {
      icon: Bell,
      badgeClass: 'bg-amber-100 border-amber-700 text-amber-900',
      title: 'Activa las alertas del Grupo Scout',
      subtitle: 'Recibe avisos de carpetas distritales y fichas medicas'
    };
  }, [pushState]);

  const Icon = config.icon;

  return (
    <button
      type="button"
      onClick={onOpen}
      className="w-full min-h-[56px] p-3.5 rounded-xl bg-white border border-slate-300 hover:border-[#1B365D] shadow-sm flex items-center justify-between gap-3 text-left transition-colors"
    >
      <div className="flex items-center gap-3 min-w-0">
        <span
          className={`w-10 h-10 rounded-lg border inline-flex items-center justify-center shrink-0 ${config.badgeClass}`}
        >
          <Icon className="w-5 h-5" aria-hidden="true" />
        </span>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-slate-900 truncate">{config.title}</p>
          <p className="text-xs text-slate-600 truncate">{config.subtitle}</p>
        </div>
      </div>
      <ChevronRight className="w-5 h-5 text-slate-600 shrink-0" aria-hidden="true" />
    </button>
  );
}

export default function Dashboard({
  groupProfile,
  members,
  camps,
  tasks,
  pushState,
  onOpenPushManager,
  onOpenCampPlanner,
  onSaveTask,
  onDeleteTask,
  onSaveMember,
  onDeleteMember
}) {
  const [activeSegment, setActiveSegment] = useState('tasks'); // 'tasks' | 'members'
  const [branchFilter, setBranchFilter] = useState('todas');
  const [memberSearch, setMemberSearch] = useState('');
  const [memberQuickFilter, setMemberQuickFilter] = useState('all'); // 'all' | 'cruz_pending' | 'medical_alert'

  const [taskModalOpen, setTaskModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [taskForm, setTaskForm] = useState({
    title: '',
    description: '',
    assigned_role: 'jefe_grupo',
    branch: 'jefatura',
    due_date: getTodayIsoLocal(),
    minutes_reference: ''
  });
  const [taskErrors, setTaskErrors] = useState({});

  const [memberModalOpen, setMemberModalOpen] = useState(false);
  const [editingMember, setEditingMember] = useState(null);
  const [memberForm, setMemberForm] = useState({
    full_name: '',
    member_type: 'beneficiario',
    branch: 'manada',
    cruz_del_sur_status: 'afiliado',
    medical_form_expires_at: '',
    safe_from_harm_status: 'no_aplica'
  });
  const [memberErrors, setMemberErrors] = useState({});

  // Metricas de semaforo operativo
  const activeMembers = useMemo(
    () => (members || []).filter((m) => m.is_active !== false),
    [members]
  );

  const affiliationStats = useMemo(() => {
    const total = activeMembers.length;
    const affiliated = activeMembers.filter((m) => m.cruz_del_sur_status === 'afiliado').length;
    const pending = total - affiliated;
    const percent = total > 0 ? Math.round((affiliated / total) * 100) : 100;
    let status = 'verde';
    if (percent < 75) {
      status = 'rojo';
    } else if (pending > 0) {
      status = 'amarillo';
    }
    return { total, affiliated, pending, percent, status };
  }, [activeMembers]);

  const medicalStats = useMemo(() => {
    let expiring30 = 0;
    let expiredOrMissing = 0;
    for (const member of activeMembers) {
      const days = getDaysFromToday(member.medical_form_expires_at);
      if (days === null || days < 0) {
        expiredOrMissing += 1;
      } else if (days <= 30) {
        expiring30 += 1;
      }
    }
    let status = 'verde';
    if (expiredOrMissing > 0) {
      status = 'rojo';
    } else if (expiring30 > 0) {
      status = 'amarillo';
    }
    return { expiring30, expiredOrMissing, status };
  }, [activeMembers]);

  const nextCamp = useMemo(() => {
    const sorted = [...(camps || [])].sort((a, b) =>
      (a.start_date || '').localeCompare(b.start_date || '')
    );
    return sorted.find((c) => {
      const days = getDaysFromToday(c.end_date || c.start_date);
      return days === null || days >= 0;
    }) || sorted[0] || null;
  }, [camps]);

  const nextCampDaysToDeadline = nextCamp
    ? getDaysFromToday(nextCamp.district_submission_deadline)
    : null;

  // Filtrado de tareas y miembros
  const filteredTasks = useMemo(() => {
    return (tasks || []).filter((task) => {
      if (branchFilter === 'todas') {
        return true;
      }
      return (task.branch || 'jefatura') === branchFilter;
    });
  }, [tasks, branchFilter]);

  const filteredMembers = useMemo(() => {
    const q = memberSearch.trim().toLowerCase();
    return activeMembers.filter((member) => {
      if (branchFilter !== 'todas') {
        if (branchFilter === 'jefatura') {
          if (member.branch !== 'jefatura' && member.member_type !== 'educador') {
            return false;
          }
        } else if (member.branch !== branchFilter) {
          return false;
        }
      }

      if (memberQuickFilter === 'cruz_pending' && member.cruz_del_sur_status === 'afiliado') {
        return false;
      }
      if (memberQuickFilter === 'medical_alert') {
        const days = getDaysFromToday(member.medical_form_expires_at);
        if (days !== null && days > 30) {
          return false;
        }
      }

      if (q) {
        const nameMatch = (member.full_name || '').toLowerCase().includes(q);
        if (!nameMatch) {
          return false;
        }
      }
      return true;
    });
  }, [activeMembers, branchFilter, memberQuickFilter, memberSearch]);

  function openNewTaskModal() {
    setEditingTask(null);
    setTaskForm({
      title: '',
      description: '',
      assigned_role: 'jefe_grupo',
      branch: branchFilter === 'todas' ? 'jefatura' : branchFilter,
      due_date: getTodayIsoLocal(),
      minutes_reference: ''
    });
    setTaskErrors({});
    setTaskModalOpen(true);
  }

  function openEditTaskModal(task) {
    setEditingTask(task);
    setTaskForm({
      title: task.title || '',
      description: task.description || '',
      assigned_role: task.assigned_role || 'jefe_grupo',
      branch: task.branch || 'jefatura',
      due_date: task.due_date || '',
      minutes_reference: task.minutes_reference || ''
    });
    setTaskErrors({});
    setTaskModalOpen(true);
  }

  async function handleSubmitTask(event) {
    event.preventDefault();
    const cleaned = {
      ...taskForm,
      title: cleanUserText(taskForm.title, { maxLength: 160 }),
      description: cleanUserText(taskForm.description, { maxLength: 1000, allowNewlines: true }),
      minutes_reference: cleanUserText(taskForm.minutes_reference, { maxLength: 80 }),
      status: editingTask ? editingTask.status : 'pendiente'
    };

    const validation = validateCouncilTaskInput(cleaned);
    if (!validation.valid) {
      setTaskErrors(validation.errors);
      return;
    }

    await onSaveTask({
      ...(editingTask || {}),
      ...validation.sanitized,
      branch: taskForm.branch || 'jefatura'
    });
    setTaskModalOpen(false);
  }

  async function handleToggleTaskStatus(task) {
    const nextStatus = task.status === 'completada' ? 'pendiente' : 'completada';
    await onSaveTask({
      ...task,
      status: nextStatus
    });
  }

  function openNewMemberModal() {
    setEditingMember(null);
    setMemberForm({
      full_name: '',
      member_type: branchFilter === 'jefatura' ? 'educador' : 'beneficiario',
      branch: branchFilter === 'todas' ? 'manada' : branchFilter,
      cruz_del_sur_status: 'pendiente',
      medical_form_expires_at: '',
      safe_from_harm_status: branchFilter === 'jefatura' ? 'pendiente' : 'no_aplica'
    });
    setMemberErrors({});
    setMemberModalOpen(true);
  }

  function openEditMemberModal(member) {
    setEditingMember(member);
    setMemberForm({
      full_name: member.full_name || '',
      member_type: member.member_type || 'beneficiario',
      branch: member.branch || 'manada',
      cruz_del_sur_status: member.cruz_del_sur_status || 'pendiente',
      medical_form_expires_at: member.medical_form_expires_at || '',
      safe_from_harm_status: member.safe_from_harm_status || 'no_aplica'
    });
    setMemberErrors({});
    setMemberModalOpen(true);
  }

  async function handleSubmitMember(event) {
    event.preventDefault();
    const cleaned = {
      ...memberForm,
      full_name: cleanUserText(memberForm.full_name, { maxLength: 140 }),
      safe_from_harm_status:
        memberForm.member_type === 'beneficiario'
          ? 'no_aplica'
          : memberForm.safe_from_harm_status
    };

    const validation = validateMemberInput(cleaned);
    if (!validation.valid) {
      setMemberErrors(validation.errors);
      return;
    }

    await onSaveMember({
      ...(editingMember || {}),
      ...validation.sanitized
    });
    setMemberModalOpen(false);
  }

  return (
    <div className="space-y-6">
      {/* Cabecera de Grupo + Widget Estado Push */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Tablero del Grupo
          </h1>
          <p className="text-sm text-slate-700 mt-0.5">
            {cleanUserText(groupProfile?.name || 'Grupo Scout')} - {cleanUserText(groupProfile?.district || 'Distrito')} ({cleanUserText(groupProfile?.zone || 'Zona')})
          </p>
        </div>
        <div className="w-full lg:max-w-md">
          <PushStatusWidget pushState={pushState} onOpen={onOpenPushManager} />
        </div>
      </div>

      {/* Tarjetas de Semaforo Operativo */}
      <section aria-label="Semaforo operativo del Grupo">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-4">
          {/* Tarjeta 1: Afiliaciones Cruz del Sur */}
          <article className="bg-white border border-slate-300 rounded-xl p-4 md:p-5 shadow-sm flex flex-col justify-between gap-3">
            <div className="space-y-2.5">
              <div className="flex items-center justify-between gap-2">
                <h2 className="text-base font-semibold text-slate-900">
                  Afiliaciones Cruz del Sur
                </h2>
                {affiliationStats.status === 'verde' ? (
                  <BadgeCheck className="w-5 h-5 text-green-700 shrink-0" aria-hidden="true" />
                ) : affiliationStats.status === 'amarillo' ? (
                  <AlertTriangle className="w-5 h-5 text-amber-700 shrink-0" aria-hidden="true" />
                ) : (
                  <XCircle className="w-5 h-5 text-red-700 shrink-0" aria-hidden="true" />
                )}
              </div>

              <div className="flex items-baseline gap-2">
                <span className="text-[28px] leading-8 font-bold tabular-nums text-slate-900">
                  {affiliationStats.percent}%
                </span>
                <span className="text-sm text-slate-600">
                  {affiliationStats.affiliated} vigentes / {affiliationStats.pending} pendientes
                </span>
              </div>

              <div
                className="w-full h-2 rounded-full bg-slate-200 overflow-hidden"
                role="progressbar"
                aria-valuenow={affiliationStats.percent}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label="Porcentaje de afiliaciones vigentes"
              >
                <div
                  className={`h-full rounded-full ${
                    affiliationStats.status === 'verde'
                      ? 'bg-green-700'
                      : affiliationStats.status === 'amarillo'
                      ? 'bg-amber-600'
                      : 'bg-red-700'
                  }`}
                  style={{ width: `${affiliationStats.percent}%` }}
                />
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                setActiveSegment('members');
                setMemberQuickFilter('cruz_pending');
                setBranchFilter('todas');
              }}
              className="min-h-[44px] px-3 rounded-lg border border-slate-300 hover:border-[#1B365D] hover:bg-[#EBF2FA] text-sm font-semibold text-[#1B365D] inline-flex items-center justify-between transition-colors"
            >
              <span>Ver pendientes</span>
              <ChevronRight className="w-4 h-4" aria-hidden="true" />
            </button>
          </article>

          {/* Tarjeta 2: Fichas Medicas (ventana 30 dias) */}
          <article className="bg-white border border-slate-300 rounded-xl p-4 md:p-5 shadow-sm flex flex-col justify-between gap-3">
            <div className="space-y-2.5">
              <div className="flex items-center justify-between gap-2">
                <h2 className="text-base font-semibold text-slate-900">
                  Fichas Medicas
                </h2>
                <HeartPulse className="w-5 h-5 text-[#1B365D] shrink-0" aria-hidden="true" />
              </div>

              <div className="flex items-baseline gap-2 flex-wrap">
                <span className="text-[28px] leading-8 font-bold tabular-nums text-slate-900">
                  {medicalStats.expiring30 + medicalStats.expiredOrMissing}
                </span>
                <span className="text-sm text-slate-600">
                  {medicalStats.expiring30} por vencer (30 dias) / {medicalStats.expiredOrMissing} vencidas
                </span>
              </div>

              <div>
                {medicalStats.status === 'verde' ? (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-green-100 border border-green-700 text-green-900">
                    <CheckCircle2 className="w-3.5 h-3.5" aria-hidden="true" />
                    <span>Al dia</span>
                  </span>
                ) : medicalStats.status === 'amarillo' ? (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-100 border border-amber-700 text-amber-900">
                    <AlertTriangle className="w-3.5 h-3.5" aria-hidden="true" />
                    <span>Requiere atencion</span>
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-red-100 border border-red-700 text-red-900">
                    <XCircle className="w-3.5 h-3.5" aria-hidden="true" />
                    <span>Vencimientos criticos</span>
                  </span>
                )}
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                setActiveSegment('members');
                setMemberQuickFilter('medical_alert');
                setBranchFilter('todas');
              }}
              className="min-h-[44px] px-3 rounded-lg border border-slate-300 hover:border-[#1B365D] hover:bg-[#EBF2FA] text-sm font-semibold text-[#1B365D] inline-flex items-center justify-between transition-colors"
            >
              <span>Revisar fichas</span>
              <ChevronRight className="w-4 h-4" aria-hidden="true" />
            </button>
          </article>

          {/* Tarjeta 3: Proximos Campamentos */}
          <article className="bg-white border border-slate-300 rounded-xl p-4 md:p-5 shadow-sm flex flex-col justify-between gap-3">
            <div className="space-y-1.5">
              <div className="flex items-center justify-between gap-2">
                <h2 className="text-base font-semibold text-slate-900">
                  Proximos Campamentos
                </h2>
                <Tent className="w-5 h-5 text-[#1B365D] shrink-0" aria-hidden="true" />
              </div>

              {nextCamp ? (
                <>
                  <p className="text-base font-bold text-slate-900 truncate">
                    {cleanUserText(nextCamp.title)}
                  </p>
                  <p className="text-sm text-slate-700 truncate">
                    {formatDateAr(nextCamp.start_date)} - {cleanUserText(nextCamp.location || 'Destino a definir')}
                  </p>
                  <p className="text-xs font-semibold text-slate-700">
                    {nextCampDaysToDeadline !== null
                      ? nextCampDaysToDeadline < 0
                        ? `Carpeta distrital vencida hace ${Math.abs(nextCampDaysToDeadline)} dias`
                        : `Carpeta distrital: faltan ${nextCampDaysToDeadline} dias`
                      : 'Sin fecha limite calculada'}
                  </p>
                </>
              ) : (
                <p className="text-sm text-slate-600">
                  No hay salidas planificadas todavia. Crea la proxima actividad desde el planificador.
                </p>
              )}
            </div>

            <button
              type="button"
              onClick={() => onOpenCampPlanner(nextCamp?.id || null)}
              className="h-11 px-4 rounded-lg bg-[#1B365D] hover:bg-[#122643] text-white text-sm font-semibold inline-flex items-center justify-center gap-2 transition-colors"
            >
              <Tent className="w-4 h-4" aria-hidden="true" />
              <span>Abrir planificador</span>
            </button>
          </article>
        </div>
      </section>

      {/* Accesos Directos Oficiales SAAC */}
      <section aria-label="Plataformas oficiales SAAC" className="space-y-2.5">
        <div className="flex items-baseline justify-between">
          <h2 className="text-lg font-semibold text-slate-900">Plataformas SAAC</h2>
          <span className="text-xs text-slate-600">Enlaces externos oficiales</span>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {SAAC_LINKS.map((link) => {
            const Icon = SAAC_ICON_MAP[link.iconName] || ExternalLink;
            return (
              <a
                key={link.id}
                href={link.url}
                target="_blank"
                rel="noopener noreferrer"
                className="relative min-h-[76px] p-3 rounded-xl bg-white border border-slate-300 hover:border-[#1B365D] shadow-sm flex flex-col justify-between gap-2 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <span className="w-8 h-8 rounded-lg bg-[#EBF2FA] text-[#1B365D] inline-flex items-center justify-center">
                    <Icon className="w-4 h-4" aria-hidden="true" />
                  </span>
                  <ExternalLink className="w-3.5 h-3.5 text-slate-500" aria-hidden="true" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-900 leading-tight">
                    {link.title}
                  </p>
                  <p className="text-xs text-slate-600 mt-0.5">{link.subtitle}</p>
                </div>
              </a>
            );
          })}
        </div>
      </section>

      {/* Tareas del Consejo y Nomina con Filtros por Rama */}
      <section className="bg-white border border-slate-300 rounded-xl p-4 md:p-5 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          {/* Selector Segmentado */}
          <div
            role="tablist"
            aria-label="Vista operativa"
            className="grid grid-cols-2 p-1 rounded-xl bg-slate-100 border border-slate-300 gap-1"
          >
            <button
              type="button"
              role="tab"
              aria-selected={activeSegment === 'tasks'}
              onClick={() => setActiveSegment('tasks')}
              className={`min-h-[44px] px-3 rounded-lg text-sm font-semibold inline-flex items-center justify-center gap-2 transition-colors ${
                activeSegment === 'tasks'
                  ? 'bg-[#1B365D] text-white'
                  : 'text-slate-700 hover:bg-slate-200'
              }`}
            >
              <ClipboardList className="w-4 h-4 shrink-0" aria-hidden="true" />
              <span>Tareas del Consejo</span>
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={activeSegment === 'members'}
              onClick={() => setActiveSegment('members')}
              className={`min-h-[44px] px-3 rounded-lg text-sm font-semibold inline-flex items-center justify-center gap-2 transition-colors ${
                activeSegment === 'members'
                  ? 'bg-[#1B365D] text-white'
                  : 'text-slate-700 hover:bg-slate-200'
              }`}
            >
              <Users className="w-4 h-4 shrink-0" aria-hidden="true" />
              <span>Miembros y Fichas</span>
            </button>
          </div>

          {activeSegment === 'tasks' ? (
            <button
              type="button"
              onClick={openNewTaskModal}
              className="h-11 px-4 rounded-lg bg-[#1B365D] hover:bg-[#122643] text-white text-sm font-semibold inline-flex items-center justify-center gap-2 transition-colors"
            >
              <Plus className="w-4 h-4" aria-hidden="true" />
              <span>Nueva tarea</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={openNewMemberModal}
              className="h-11 px-4 rounded-lg bg-[#1B365D] hover:bg-[#122643] text-white text-sm font-semibold inline-flex items-center justify-center gap-2 transition-colors"
            >
              <Plus className="w-4 h-4" aria-hidden="true" />
              <span>Agregar miembro</span>
            </button>
          )}
        </div>

        {/* Barra horizontal de Filtros por Rama */}
        <div
          className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1"
          role="group"
          aria-label="Filtrar por rama scout"
        >
          {BRANCH_FILTERS.map((branch) => {
            const active = branchFilter === branch.id;
            return (
              <button
                key={branch.id}
                type="button"
                onClick={() => setBranchFilter(branch.id)}
                className={`min-h-[44px] px-4 rounded-full text-sm font-semibold whitespace-nowrap border transition-colors shrink-0 ${
                  active
                    ? 'bg-[#1B365D] border-[#1B365D] text-white'
                    : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-100'
                }`}
              >
                {branch.label}
              </button>
            );
          })}
        </div>

        {/* Contenido Segmento Tareas */}
        {activeSegment === 'tasks' && (
          <div className="space-y-2.5">
            {filteredTasks.length === 0 ? (
              <div className="p-6 text-center rounded-xl border border-dashed border-slate-300 bg-slate-50">
                <p className="text-sm font-medium text-slate-700">
                  No hay tareas del Consejo registradas para este filtro.
                </p>
              </div>
            ) : (
              filteredTasks.map((task) => {
                const isDone = task.status === 'completada';
                const daysToDue = getDaysFromToday(task.due_date);
                const isOverdue = !isDone && daysToDue !== null && daysToDue < 0;
                const branchKey = task.branch || 'jefatura';

                return (
                  <div
                    key={task.id}
                    className={`min-h-[60px] p-3 rounded-xl border flex items-start justify-between gap-3 ${
                      isDone
                        ? 'bg-slate-50 border-slate-200'
                        : 'bg-white border-slate-300'
                    }`}
                  >
                    <div className="flex items-start gap-2.5 min-w-0 flex-1">
                      <button
                        type="button"
                        onClick={() => handleToggleTaskStatus(task)}
                        aria-label={
                          isDone
                            ? `Marcar como pendiente: ${cleanUserText(task.title)}`
                            : `Marcar como completada: ${cleanUserText(task.title)}`
                        }
                        className="min-w-[44px] min-h-[44px] -ml-1 inline-flex items-center justify-center rounded-lg text-[#1B365D] hover:bg-slate-100 shrink-0"
                      >
                        {isDone ? (
                          <CheckSquare className="w-5 h-5 text-green-700" aria-hidden="true" />
                        ) : (
                          <Square className="w-5 h-5" aria-hidden="true" />
                        )}
                      </button>

                      <div className="min-w-0 flex-1 pt-1">
                        <p
                          className={`text-sm font-semibold break-words ${
                            isDone ? 'line-through text-slate-500' : 'text-slate-900'
                          }`}
                        >
                          {cleanUserText(task.title)}
                        </p>
                        {task.description ? (
                          <p className="text-xs text-slate-600 mt-0.5 break-words">
                            {cleanUserText(task.description)}
                          </p>
                        ) : null}
                        <div className="flex flex-wrap items-center gap-2 mt-2">
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-xs font-semibold border ${
                              BRANCH_BADGE_STYLES[branchKey] || BRANCH_BADGE_STYLES.jefatura
                            }`}
                          >
                            {BRANCH_SHORT_LABELS[branchKey] || 'Adultos'}
                          </span>
                          <span className="text-xs font-medium text-slate-700">
                            {ROLE_LABELS[task.assigned_role] || task.assigned_role}
                          </span>
                          {task.due_date && (
                            <span
                              className={`inline-flex items-center gap-1 text-xs font-mono px-2 py-0.5 rounded-md ${
                                isOverdue
                                  ? 'bg-red-100 text-red-900 font-semibold'
                                  : 'bg-slate-100 text-slate-700'
                              }`}
                            >
                              <Calendar className="w-3.5 h-3.5" aria-hidden="true" />
                              <span>{formatDateAr(task.due_date)}</span>
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => openEditTaskModal(task)}
                        aria-label={`Editar tarea ${cleanUserText(task.title)}`}
                        className="min-w-[44px] min-h-[44px] inline-flex items-center justify-center rounded-lg text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                      >
                        <Edit3 className="w-4 h-4" aria-hidden="true" />
                      </button>
                      <button
                        type="button"
                        onClick={() => onDeleteTask(task.id)}
                        aria-label={`Eliminar tarea ${cleanUserText(task.title)}`}
                        className="min-w-[44px] min-h-[44px] inline-flex items-center justify-center rounded-lg text-red-700 hover:bg-red-50"
                      >
                        <Trash2 className="w-4 h-4" aria-hidden="true" />
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}

        {/* Contenido Segmento Miembros y Fichas */}
        {activeSegment === 'members' && (
          <div className="space-y-3">
            <div className="flex flex-col sm:flex-row gap-2.5">
              <div className="relative flex-1">
                <Search
                  className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none"
                  aria-hidden="true"
                />
                <label htmlFor="member-search-input" className="sr-only">
                  Buscar integrante por nombre
                </label>
                <input
                  id="member-search-input"
                  type="search"
                  value={memberSearch}
                  onChange={(e) => setMemberSearch(e.target.value)}
                  placeholder="Buscar integrante por nombre..."
                  className="w-full h-11 pl-10 pr-3 rounded-lg border border-slate-500 text-base text-slate-900 bg-white"
                />
              </div>

              {memberQuickFilter !== 'all' && (
                <button
                  type="button"
                  onClick={() => setMemberQuickFilter('all')}
                  className="h-11 px-3 rounded-lg border border-amber-700 bg-amber-100 text-amber-900 text-sm font-semibold inline-flex items-center gap-1.5"
                >
                  <X className="w-4 h-4" aria-hidden="true" />
                  <span>
                    {memberQuickFilter === 'cruz_pending'
                      ? 'Filtro: Cruz del Sur pendiente'
                      : 'Filtro: Fichas por vencer / vencidas'}
                  </span>
                </button>
              )}
            </div>

            {filteredMembers.length === 0 ? (
              <div className="p-6 text-center rounded-xl border border-dashed border-slate-300 bg-slate-50">
                <p className="text-sm font-medium text-slate-700">
                  No se encontraron integrantes con los filtros actuales.
                </p>
              </div>
            ) : (
              <div className="space-y-2.5">
                {filteredMembers.map((member) => {
                  const medDays = getDaysFromToday(member.medical_form_expires_at);
                  const medStatus =
                    medDays === null || medDays < 0
                      ? 'rojo'
                      : medDays <= 30
                      ? 'amarillo'
                      : 'verde';
                  const isAdult =
                    member.member_type === 'educador' || member.branch === 'jefatura';
                  const sfhOk = member.safe_from_harm_status === 'vigente';

                  return (
                    <div
                      key={member.id}
                      className="p-3 rounded-xl border border-slate-300 bg-white flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3"
                    >
                      <div className="space-y-2 min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-sm font-semibold text-slate-900">
                            {cleanUserText(member.full_name)}
                          </p>
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-xs font-semibold border ${
                              BRANCH_BADGE_STYLES[member.branch] || BRANCH_BADGE_STYLES.jefatura
                            }`}
                          >
                            {BRANCH_SHORT_LABELS[member.branch] || 'Adultos'}
                          </span>
                        </div>

                        <div className="flex flex-wrap items-center gap-2">
                          {/* Badge Cruz del Sur */}
                          <span
                            className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold border ${
                              member.cruz_del_sur_status === 'afiliado'
                                ? 'bg-green-100 border-green-700 text-green-900'
                                : member.cruz_del_sur_status === 'pendiente'
                                ? 'bg-amber-100 border-amber-700 text-amber-900'
                                : 'bg-red-100 border-red-700 text-red-900'
                            }`}
                          >
                            {member.cruz_del_sur_status === 'afiliado' ? (
                              <CheckCircle2 className="w-3.5 h-3.5" aria-hidden="true" />
                            ) : member.cruz_del_sur_status === 'pendiente' ? (
                              <AlertTriangle className="w-3.5 h-3.5" aria-hidden="true" />
                            ) : (
                              <XCircle className="w-3.5 h-3.5" aria-hidden="true" />
                            )}
                            <span>
                              Afiliacion: {cleanUserText(member.cruz_del_sur_status)}
                            </span>
                          </span>

                          {/* Badge Ficha Medica */}
                          <span
                            className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold border ${
                              medStatus === 'verde'
                                ? 'bg-green-100 border-green-700 text-green-900'
                                : medStatus === 'amarillo'
                                ? 'bg-amber-100 border-amber-700 text-amber-900'
                                : 'bg-red-100 border-red-700 text-red-900'
                            }`}
                          >
                            <HeartPulse className="w-3.5 h-3.5" aria-hidden="true" />
                            <span>
                              {medDays === null
                                ? 'Ficha: Sin fecha'
                                : medDays < 0
                                ? `Ficha: Vencida (${formatDateAr(member.medical_form_expires_at)})`
                                : medDays <= 30
                                ? `Ficha: Vence en ${medDays}d`
                                : `Ficha: Vigente (${formatDateAr(member.medical_form_expires_at)})`}
                            </span>
                          </span>

                          {/* Badge A Salvo del Peligro para adultos */}
                          {isAdult && (
                            <span
                              className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold border ${
                                sfhOk
                                  ? 'bg-green-100 border-green-700 text-green-900'
                                  : 'bg-red-100 border-red-700 text-red-900'
                              }`}
                            >
                              {sfhOk ? (
                                <ShieldCheck className="w-3.5 h-3.5" aria-hidden="true" />
                              ) : (
                                <ShieldAlert className="w-3.5 h-3.5" aria-hidden="true" />
                              )}
                              <span>
                                A Salvo del Peligro: {sfhOk ? 'Vigente' : 'Pendiente'}
                              </span>
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-1 self-end sm:self-center shrink-0">
                        <button
                          type="button"
                          onClick={() => openEditMemberModal(member)}
                          aria-label={`Editar integrante ${cleanUserText(member.full_name)}`}
                          className="min-w-[44px] min-h-[44px] inline-flex items-center justify-center rounded-lg text-slate-700 hover:bg-slate-100"
                        >
                          <Edit3 className="w-4 h-4" aria-hidden="true" />
                        </button>
                        <button
                          type="button"
                          onClick={() => onDeleteMember(member.id)}
                          aria-label={`Eliminar integrante ${cleanUserText(member.full_name)}`}
                          className="min-w-[44px] min-h-[44px] inline-flex items-center justify-center rounded-lg text-red-700 hover:bg-red-50"
                        >
                          <Trash2 className="w-4 h-4" aria-hidden="true" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </section>

      {/* Modal Alta/Edicion de Tarea */}
      {taskModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-900/50 p-0 sm:p-4"
          role="presentation"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setTaskModalOpen(false);
            }
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="task-modal-title"
            className="w-full sm:max-w-lg bg-white border border-slate-300 rounded-t-2xl sm:rounded-2xl shadow-lg p-5 space-y-4 max-h-[90dvh] overflow-y-auto pb-safe-bottom"
          >
            <div className="flex items-center justify-between">
              <h2 id="task-modal-title" className="text-lg font-semibold text-slate-900">
                {editingTask ? 'Editar tarea del Consejo' : 'Nueva tarea del Consejo'}
              </h2>
              <button
                type="button"
                onClick={() => setTaskModalOpen(false)}
                aria-label="Cerrar formulario de tarea"
                className="min-w-[44px] min-h-[44px] inline-flex items-center justify-center rounded-lg text-slate-600 hover:bg-slate-100"
              >
                <X className="w-5 h-5" aria-hidden="true" />
              </button>
            </div>

            <form onSubmit={handleSubmitTask} className="space-y-3.5">
              <div>
                <label htmlFor="task-title" className="block text-sm font-medium text-slate-700 mb-1">
                  Titulo de la tarea
                </label>
                <input
                  id="task-title"
                  type="text"
                  required
                  value={taskForm.title}
                  onChange={(e) => setTaskForm((p) => ({ ...p, title: e.target.value }))}
                  placeholder="Ej. Presentar carpeta distrital"
                  className="w-full h-11 px-3 rounded-lg border border-slate-500 text-base text-slate-900 bg-white"
                />
                {taskErrors.title && (
                  <p className="text-xs text-red-700 mt-1">{taskErrors.title}</p>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label htmlFor="task-branch" className="block text-sm font-medium text-slate-700 mb-1">
                    Rama / Area
                  </label>
                  <select
                    id="task-branch"
                    value={taskForm.branch}
                    onChange={(e) => setTaskForm((p) => ({ ...p, branch: e.target.value }))}
                    className="w-full h-11 px-3 rounded-lg border border-slate-500 text-base text-slate-900 bg-white"
                  >
                    <option value="jefatura">Adultos / Jefatura</option>
                    <option value="manada">Manada</option>
                    <option value="unidad">Unidad Scout</option>
                    <option value="caminantes">Caminantes</option>
                    <option value="rovers">Rovers</option>
                  </select>
                </div>

                <div>
                  <label htmlFor="task-role" className="block text-sm font-medium text-slate-700 mb-1">
                    Responsable
                  </label>
                  <select
                    id="task-role"
                    value={taskForm.assigned_role}
                    onChange={(e) => setTaskForm((p) => ({ ...p, assigned_role: e.target.value }))}
                    className="w-full h-11 px-3 rounded-lg border border-slate-500 text-base text-slate-900 bg-white"
                  >
                    {ALLOWED_ASSIGNED_ROLES.map((role) => (
                      <option key={role} value={role}>
                        {ROLE_LABELS[role] || role}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label htmlFor="task-due" className="block text-sm font-medium text-slate-700 mb-1">
                    Fecha limite
                  </label>
                  <input
                    id="task-due"
                    type="date"
                    value={taskForm.due_date}
                    onChange={(e) => setTaskForm((p) => ({ ...p, due_date: e.target.value }))}
                    className="w-full h-11 px-3 rounded-lg border border-slate-500 text-base text-slate-900 bg-white"
                  />
                </div>

                <div>
                  <label htmlFor="task-ref" className="block text-sm font-medium text-slate-700 mb-1">
                    Referencia de Acta
                  </label>
                  <input
                    id="task-ref"
                    type="text"
                    value={taskForm.minutes_reference}
                    onChange={(e) =>
                      setTaskForm((p) => ({ ...p, minutes_reference: e.target.value }))
                    }
                    placeholder="Acta 15/2026"
                    className="w-full h-11 px-3 rounded-lg border border-slate-500 text-base text-slate-900 bg-white"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="task-desc" className="block text-sm font-medium text-slate-700 mb-1">
                  Detalle operativo (opcional)
                </label>
                <textarea
                  id="task-desc"
                  rows={2}
                  value={taskForm.description}
                  onChange={(e) => setTaskForm((p) => ({ ...p, description: e.target.value }))}
                  className="w-full p-3 rounded-lg border border-slate-500 text-base text-slate-900 bg-white"
                />
              </div>

              <button
                type="submit"
                className="w-full h-12 bg-[#1B365D] hover:bg-[#122643] text-white font-semibold rounded-lg transition-colors"
              >
                {editingTask ? 'Guardar cambios' : 'Crear tarea'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Modal Alta/Edicion de Miembro */}
      {memberModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-900/50 p-0 sm:p-4"
          role="presentation"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setMemberModalOpen(false);
            }
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="member-modal-title"
            className="w-full sm:max-w-lg bg-white border border-slate-300 rounded-t-2xl sm:rounded-2xl shadow-lg p-5 space-y-4 max-h-[90dvh] overflow-y-auto pb-safe-bottom"
          >
            <div className="flex items-center justify-between">
              <h2 id="member-modal-title" className="text-lg font-semibold text-slate-900">
                {editingMember ? 'Editar integrante' : 'Agregar integrante'}
              </h2>
              <button
                type="button"
                onClick={() => setMemberModalOpen(false)}
                aria-label="Cerrar formulario de miembro"
                className="min-w-[44px] min-h-[44px] inline-flex items-center justify-center rounded-lg text-slate-600 hover:bg-slate-100"
              >
                <X className="w-5 h-5" aria-hidden="true" />
              </button>
            </div>

            <form onSubmit={handleSubmitMember} className="space-y-3.5">
              <div>
                <label htmlFor="member-name" className="block text-sm font-medium text-slate-700 mb-1">
                  Nombre y apellido
                </label>
                <input
                  id="member-name"
                  type="text"
                  required
                  value={memberForm.full_name}
                  onChange={(e) => setMemberForm((p) => ({ ...p, full_name: e.target.value }))}
                  className="w-full h-11 px-3 rounded-lg border border-slate-500 text-base text-slate-900 bg-white"
                />
                {memberErrors.full_name && (
                  <p className="text-xs text-red-700 mt-1">{memberErrors.full_name}</p>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label htmlFor="member-type" className="block text-sm font-medium text-slate-700 mb-1">
                    Estamento
                  </label>
                  <select
                    id="member-type"
                    value={memberForm.member_type}
                    onChange={(e) =>
                      setMemberForm((p) => ({
                        ...p,
                        member_type: e.target.value,
                        safe_from_harm_status:
                          e.target.value === 'beneficiario' ? 'no_aplica' : 'pendiente'
                      }))
                    }
                    className="w-full h-11 px-3 rounded-lg border border-slate-500 text-base text-slate-900 bg-white"
                  >
                    {ALLOWED_MEMBER_TYPES.map((type) => (
                      <option key={type} value={type}>
                        {type === 'beneficiario'
                          ? 'Beneficiario'
                          : type === 'educador'
                          ? 'Educador'
                          : 'Colaborador'}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label htmlFor="member-branch" className="block text-sm font-medium text-slate-700 mb-1">
                    Rama
                  </label>
                  <select
                    id="member-branch"
                    value={memberForm.branch}
                    onChange={(e) => setMemberForm((p) => ({ ...p, branch: e.target.value }))}
                    className="w-full h-11 px-3 rounded-lg border border-slate-500 text-base text-slate-900 bg-white"
                  >
                    <option value="manada">Manada</option>
                    <option value="unidad">Unidad Scout</option>
                    <option value="caminantes">Caminantes</option>
                    <option value="rovers">Rovers</option>
                    <option value="jefatura">Jefatura / Adultos</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label htmlFor="member-cruz" className="block text-sm font-medium text-slate-700 mb-1">
                    Afiliacion Cruz del Sur
                  </label>
                  <select
                    id="member-cruz"
                    value={memberForm.cruz_del_sur_status}
                    onChange={(e) =>
                      setMemberForm((p) => ({ ...p, cruz_del_sur_status: e.target.value }))
                    }
                    className="w-full h-11 px-3 rounded-lg border border-slate-500 text-base text-slate-900 bg-white"
                  >
                    {ALLOWED_CRUZ_DEL_SUR_STATUS.map((status) => (
                      <option key={status} value={status}>
                        {status}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label htmlFor="member-med" className="block text-sm font-medium text-slate-700 mb-1">
                    Vencimiento Ficha Medica
                  </label>
                  <input
                    id="member-med"
                    type="date"
                    value={memberForm.medical_form_expires_at}
                    onChange={(e) =>
                      setMemberForm((p) => ({ ...p, medical_form_expires_at: e.target.value }))
                    }
                    className="w-full h-11 px-3 rounded-lg border border-slate-500 text-base text-slate-900 bg-white"
                  />
                  {memberErrors.medical_form_expires_at && (
                    <p className="text-xs text-red-700 mt-1">
                      {memberErrors.medical_form_expires_at}
                    </p>
                  )}
                </div>
              </div>

              {memberForm.member_type !== 'beneficiario' && (
                <div>
                  <label htmlFor="member-sfh" className="block text-sm font-medium text-slate-700 mb-1">
                    Curso A Salvo del Peligro
                  </label>
                  <select
                    id="member-sfh"
                    value={memberForm.safe_from_harm_status}
                    onChange={(e) =>
                      setMemberForm((p) => ({ ...p, safe_from_harm_status: e.target.value }))
                    }
                    className="w-full h-11 px-3 rounded-lg border border-slate-500 text-base text-slate-900 bg-white"
                  >
                    {ALLOWED_SAFE_FROM_HARM_STATUS.map((status) => (
                      <option key={status} value={status}>
                        {status}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <button
                type="submit"
                className="w-full h-12 bg-[#1B365D] hover:bg-[#122643] text-white font-semibold rounded-lg transition-colors"
              >
                {editingMember ? 'Guardar cambios' : 'Guardar integrante'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
