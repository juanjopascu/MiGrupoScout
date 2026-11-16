import { useState } from 'react';
import { ClipboardList, FileSpreadsheet, Plus, Users } from 'lucide-react';
import MemberCsvImportModal from '../components/MemberCsvImportModal.jsx';
import { canDeleteRecords, canEditMembers, getRoleLabel } from '../domain/roles.js';
import { cleanUserText } from '../utils/textSanitizer.js';
import MemberListPanel from './dashboard/MemberListPanel.jsx';
import MemberModal from './dashboard/MemberModal.jsx';
import PushStatusWidget from './dashboard/PushStatusWidget.jsx';
import SaacPlatformsGrid from './dashboard/SaacPlatformsGrid.jsx';
import TaskListPanel from './dashboard/TaskListPanel.jsx';
import TaskModal from './dashboard/TaskModal.jsx';
import TrafficLightCards from './dashboard/TrafficLightCards.jsx';
import { BRANCH_FILTERS } from './dashboard/dashboardConstants.js';
import { useDashboardState } from './dashboard/useDashboardState.js';

export default function Dashboard({
  groupProfile,
  userRole = 'jefe_grupo',
  isDemoMode = false,
  hasActiveGroup = true,
  members,
  camps,
  tasks,
  pushState,
  onOpenPushManager,
  onOpenTeamManager,
  onOpenSettings,
  onOpenCampPlanner,
  onSaveTask,
  onDeleteTask,
  onSaveMember,
  onBatchImportMembers,
  onDeleteMember
}) {
  const [csvModalOpen, setCsvModalOpen] = useState(false);
  const canEditNomina = isDemoMode || canEditMembers(userRole);
  const canDelete = isDemoMode || canDeleteRecords(userRole);
  const {
    activeSegment,
    setActiveSegment,
    branchFilter,
    setBranchFilter,
    memberSearch,
    setMemberSearch,
    memberQuickFilter,
    setMemberQuickFilter,
    taskModalOpen,
    setTaskModalOpen,
    editingTask,
    taskForm,
    setTaskForm,
    taskErrors,
    memberModalOpen,
    setMemberModalOpen,
    editingMember,
    memberForm,
    setMemberForm,
    memberErrors,
    affiliationStats,
    medicalStats,
    nextCamp,
    nextCampDaysToDeadline,
    filteredTasks,
    filteredMembers,
    openNewTaskModal,
    openEditTaskModal,
    handleSubmitTask,
    handleToggleTaskStatus,
    openNewMemberModal,
    openEditMemberModal,
    handleSubmitMember
  } = useDashboardState({ members, camps, tasks, onSaveTask, onSaveMember });

  return (
    <div className="space-y-6">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              Tablero del Grupo
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold border border-[#1B365D] bg-[#EBF2FA] text-[#1B365D]">
              {isDemoMode ? 'Demo Local' : getRoleLabel(userRole)}
            </span>
          </div>
          <p className="text-sm text-slate-700 mt-0.5">
            {cleanUserText(groupProfile?.name || 'Grupo Scout')} - {cleanUserText(groupProfile?.district || 'Distrito')} ({cleanUserText(groupProfile?.zone || 'Zona')})
          </p>
        </div>
        <div className="w-full lg:max-w-md space-y-2">
          <PushStatusWidget pushState={pushState} onOpen={onOpenPushManager} />
        </div>
      </div>

      {!hasActiveGroup && (
        <div className="p-4 rounded-xl border border-[#1B365D] bg-[#EBF2FA] flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="text-sm text-slate-900">
            <p className="font-semibold">Todavia no vinculaste tu cuenta a un Grupo Scout</p>
            <p className="text-xs text-slate-700">
              Si sos Jefe de Grupo crea tu Grupo (tenant), o ingresa con el codigo de invitacion que te enviaron.
            </p>
          </div>
          <button
            type="button"
            onClick={onOpenSettings}
            className="h-10 px-4 rounded-lg bg-[#1B365D] hover:bg-[#122643] text-white text-xs sm:text-sm font-semibold shrink-0"
          >
            Configurar o aceptar invitacion
          </button>
        </div>
      )}

      <TrafficLightCards
        affiliationStats={affiliationStats}
        medicalStats={medicalStats}
        nextCamp={nextCamp}
        nextCampDaysToDeadline={nextCampDaysToDeadline}
        onFilterCruzPending={() => {
          setActiveSegment('members');
          setMemberQuickFilter('cruz_pending');
          setBranchFilter('todas');
        }}
        onFilterMedicalAlert={() => {
          setActiveSegment('members');
          setMemberQuickFilter('medical_alert');
          setBranchFilter('todas');
        }}
        onOpenCampPlanner={onOpenCampPlanner}
      />

      <SaacPlatformsGrid />

      <section className="bg-white border border-slate-300 rounded-xl p-4 md:p-5 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
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
          ) : canEditNomina ? (
            <div className="flex flex-wrap items-center gap-2">
              {onOpenTeamManager && !isDemoMode && (
                <button
                  type="button"
                  onClick={onOpenTeamManager}
                  className="h-11 px-3.5 rounded-lg border border-slate-300 text-slate-800 hover:bg-slate-100 text-sm font-semibold inline-flex items-center justify-center gap-2 transition-colors"
                >
                  <Users className="w-4 h-4" aria-hidden="true" />
                  <span>Dirigentes</span>
                </button>
              )}
              {onBatchImportMembers && (
                <button
                  type="button"
                  onClick={() => setCsvModalOpen(true)}
                  className="h-11 px-3.5 rounded-lg border border-[#1B365D] text-[#1B365D] hover:bg-[#EBF2FA] text-sm font-semibold inline-flex items-center justify-center gap-2 transition-colors"
                >
                  <FileSpreadsheet className="w-4 h-4" aria-hidden="true" />
                  <span>Importar CSV</span>
                </button>
              )}
              <button
                type="button"
                onClick={openNewMemberModal}
                className="h-11 px-4 rounded-lg bg-[#1B365D] hover:bg-[#122643] text-white text-sm font-semibold inline-flex items-center justify-center gap-2 transition-colors"
              >
                <Plus className="w-4 h-4" aria-hidden="true" />
                <span>Agregar miembro</span>
              </button>
            </div>
          ) : null}
        </div>

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

        {activeSegment === 'tasks' && (
          <TaskListPanel
            tasks={filteredTasks}
            onToggleStatus={handleToggleTaskStatus}
            onEditTask={openEditTaskModal}
            onDeleteTask={canDelete ? onDeleteTask : undefined}
          />
        )}

        {activeSegment === 'members' && (
          <MemberListPanel
            members={filteredMembers}
            memberSearch={memberSearch}
            onMemberSearchChange={setMemberSearch}
            memberQuickFilter={memberQuickFilter}
            onClearQuickFilter={() => setMemberQuickFilter('all')}
            canEdit={canEditNomina}
            canDelete={canDelete}
            onEditMember={openEditMemberModal}
            onDeleteMember={onDeleteMember}
          />
        )}
      </section>

      <TaskModal
        isOpen={taskModalOpen}
        editingTask={editingTask}
        taskForm={taskForm}
        setTaskForm={setTaskForm}
        taskErrors={taskErrors}
        onClose={() => setTaskModalOpen(false)}
        onSubmit={handleSubmitTask}
      />

      <MemberModal
        isOpen={memberModalOpen}
        editingMember={editingMember}
        memberForm={memberForm}
        setMemberForm={setMemberForm}
        memberErrors={memberErrors}
        onClose={() => setMemberModalOpen(false)}
        onSubmit={handleSubmitMember}
      />

      <MemberCsvImportModal
        isOpen={csvModalOpen}
        onClose={() => setCsvModalOpen(false)}
        onImportBatch={onBatchImportMembers}
      />
    </div>
  );
}
