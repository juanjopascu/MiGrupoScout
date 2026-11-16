import { useMemo, useState } from 'react';
import { validateCouncilTaskInput, validateMemberInput } from '../../domain/validators.js';
import { cleanUserText, getDaysFromToday, getTodayIsoLocal } from '../../utils/textSanitizer.js';

export function useDashboardState({ members, camps, tasks, onSaveTask, onSaveMember }) {
  const [activeSegment, setActiveSegment] = useState('tasks');
  const [branchFilter, setBranchFilter] = useState('todas');
  const [memberSearch, setMemberSearch] = useState('');
  const [memberQuickFilter, setMemberQuickFilter] = useState('all');

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
    return (
      sorted.find((c) => {
        const days = getDaysFromToday(c.end_date || c.start_date);
        return days === null || days >= 0;
      }) ||
      sorted[0] ||
      null
    );
  }, [camps]);

  const nextCampDaysToDeadline = nextCamp
    ? getDaysFromToday(nextCamp.district_submission_deadline)
    : null;

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
      if (q && !(member.full_name || '').toLowerCase().includes(q)) {
        return false;
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
    await onSaveTask({ ...task, status: nextStatus });
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
        memberForm.member_type === 'beneficiario' ? 'no_aplica' : memberForm.safe_from_harm_status
    };
    const validation = validateMemberInput(cleaned);
    if (!validation.valid) {
      setMemberErrors(validation.errors);
      return;
    }
    await onSaveMember({ ...(editingMember || {}), ...validation.sanitized });
    setMemberModalOpen(false);
  }

  return {
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
  };
}
