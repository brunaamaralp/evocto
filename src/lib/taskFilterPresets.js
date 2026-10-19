/**
 * Presets e helpers de filtro de tarefas (Fase B — “o que depende de mim”).
 */

import { createPageUrl } from '@/utils';

export const EMPTY_TASK_FILTERS = {
  status: 'all',
  assignee: 'all',
  phase: 'all',
  priority: 'all',
  search: '',
  dueRange: 'all', // all | this_week | overdue | next_48h
  waitingOn: 'all', // all | client | others
  openOnly: false,
  myAction: false,
  preset: null,
};

/** Status considerados “abertos” na UI operacional. */
export const OPEN_TASK_STATUSES = new Set([
  'todo',
  'in_progress',
  'pending',
  'blocked',
  'in_review',
  'backlog',
  'waiting_client',
  'not_started',
]);

const DONE_STATUSES = new Set(['completed', 'done', 'cancelled', 'canceled']);

const DONE_GATE = new Set(['aprovado', 'approved', 'skipped', 'done']);

/** Início/fim da semana (segunda → domingo) em YYYY-MM-DD local. */
export function getWeekRange(now = new Date()) {
  const d = new Date(now);
  const day = d.getDay(); // 0=dom
  const diffToMonday = day === 0 ? -6 : 1 - day;
  const monday = new Date(d);
  monday.setDate(d.getDate() + diffToMonday);
  monday.setHours(0, 0, 0, 0);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  sunday.setHours(23, 59, 59, 999);
  return {
    start: monday.toISOString().slice(0, 10),
    end: sunday.toISOString().slice(0, 10),
    startDate: monday,
    endDate: sunday,
  };
}

export function startOfLocalDay(date = new Date()) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

export function taskDueInRange(task, startYmd, endYmd) {
  if (!task?.dueDate) return false;
  const due = String(task.dueDate).slice(0, 10);
  return due >= startYmd && due <= endYmd;
}

export function getTaskAssigneeId(task) {
  return task?.assigneeId || task?.assignedTo || null;
}

export function taskMatchesAssignee(task, assigneeFilter) {
  if (!assigneeFilter || assigneeFilter === 'all') return true;
  if (assigneeFilter === 'unassigned') {
    return !getTaskAssigneeId(task);
  }
  const id = getTaskAssigneeId(task);
  return String(id) === String(assigneeFilter);
}

export function taskMatchesPhase(task, phaseFilter) {
  if (!phaseFilter || phaseFilter === 'all') return true;
  return String(task.deliverableId || '') === String(phaseFilter);
}

export function isOpenTaskStatus(task) {
  const status = String(task?.status || '').toLowerCase();
  if (!status) return true;
  if (DONE_STATUSES.has(status)) return false;
  return OPEN_TASK_STATUSES.has(status) || !DONE_STATUSES.has(status);
}

export function isTaskOverdue(task, now = new Date()) {
  if (!task?.dueDate || !isOpenTaskStatus(task)) return false;
  const due = new Date(task.dueDate);
  if (Number.isNaN(due.getTime())) return false;
  return startOfLocalDay(due) < startOfLocalDay(now);
}

/**
 * Aguardando cliente (gatekeeper) — não confundir com “minha ação”.
 */
export function isWaitingOnClient(task) {
  const gatekeeper = String(task?.gatekeeper || '').toLowerCase();
  if (gatekeeper !== 'cliente' && gatekeeper !== 'client') {
    const status = String(task?.status || '').toLowerCase();
    return status === 'waiting_client' || status === 'awaiting_client';
  }
  const gate = String(task?.gate_status || 'pendente').toLowerCase();
  return !DONE_GATE.has(gate);
}

function reviewerIdsOf(task) {
  if (Array.isArray(task?.reviewerIds)) return task.reviewerIds.map(String);
  if (Array.isArray(task?.reviewers)) return task.reviewers.map(String);
  return [];
}

/**
 * Tarefa aguarda ação do usuário (responsável ou revisor).
 * Não inclui waiting_client nem aprovações de portal.
 */
export function isAwaitingMyAction(task, userId) {
  if (!userId || !isOpenTaskStatus(task)) return false;
  if (isWaitingOnClient(task)) return false;

  const uid = String(userId);
  const status = String(task?.status || '').toLowerCase();
  const reviewers = reviewerIdsOf(task);

  if (status === 'in_review' && reviewers.includes(uid)) {
    return true;
  }

  if (!taskMatchesAssignee(task, uid)) return false;
  if (status === 'blocked') return false;
  if (status === 'in_review' && !reviewers.includes(uid)) return false;

  return true;
}

/**
 * Atribuída a mim, mas depende de terceiro (cliente, bloqueio, revisão alheia).
 */
export function isWaitingOnOthers(task, userId) {
  if (!userId || !taskMatchesAssignee(task, userId) || !isOpenTaskStatus(task)) {
    return false;
  }
  if (isWaitingOnClient(task)) return true;
  const status = String(task?.status || '').toLowerCase();
  if (status === 'blocked') return true;
  const reviewers = reviewerIdsOf(task);
  if (status === 'in_review' && !reviewers.includes(String(userId))) {
    return true;
  }
  return false;
}

/**
 * @param {object} filters
 * @param {object} task
 * @param {{ userId?: string, now?: Date }} ctx
 */
export function applyTaskFilters(task, filters, ctx = {}) {
  if (!filters) return true;
  const now = ctx.now || new Date();

  if (filters.openOnly && !isOpenTaskStatus(task)) return false;

  if (filters.status !== 'all' && filters.status) {
    const status = String(task.status || '').toLowerCase();
    if (status !== String(filters.status).toLowerCase()) return false;
  }

  if (!taskMatchesAssignee(task, filters.assignee)) return false;
  if (!taskMatchesPhase(task, filters.phase)) return false;
  if (filters.priority !== 'all' && task.priority !== filters.priority) return false;

  if (filters.search) {
    const q = String(filters.search).toLowerCase();
    const hay = `${task.title || ''} ${task.description || ''}`.toLowerCase();
    if (!hay.includes(q)) return false;
  }

  if (filters.dueRange === 'this_week') {
    const { start, end } = getWeekRange(now);
    if (!taskDueInRange(task, start, end)) return false;
  }

  if (filters.dueRange === 'overdue') {
    if (!isTaskOverdue(task, now)) return false;
  }

  if (filters.dueRange === 'next_48h') {
    if (!isOpenTaskStatus(task)) return false;
    if (!task?.dueDate) return false;
    const due = startOfLocalDay(new Date(task.dueDate));
    const today = startOfLocalDay(now);
    const horizon = new Date(today);
    horizon.setDate(horizon.getDate() + 2);
    if (due < today || due >= horizon) return false;
  }

  if (filters.waitingOn === 'client') {
    if (!isWaitingOnClient(task)) return false;
  }

  if (filters.waitingOn === 'others') {
    if (!isWaitingOnOthers(task, ctx.userId)) return false;
  }

  if (filters.myAction) {
    if (!isAwaitingMyAction(task, ctx.userId)) return false;
  }

  return true;
}

export const TASK_FILTER_PRESETS = [
  {
    id: 'my_tasks',
    label: 'Minhas tarefas',
    apply: ({ userId }) => ({
      ...EMPTY_TASK_FILTERS,
      assignee: userId || 'all',
      preset: 'my_tasks',
    }),
  },
  {
    id: 'my_open',
    label: 'Minhas abertas',
    apply: ({ userId }) => ({
      ...EMPTY_TASK_FILTERS,
      assignee: userId || 'all',
      openOnly: true,
      preset: 'my_open',
    }),
  },
  {
    id: 'my_overdue',
    label: 'Minhas atrasadas',
    apply: ({ userId }) => ({
      ...EMPTY_TASK_FILTERS,
      assignee: userId || 'all',
      dueRange: 'overdue',
      openOnly: true,
      preset: 'my_overdue',
    }),
  },
  {
    id: 'my_action',
    label: 'Aguardando minha ação',
    apply: ({ userId }) => ({
      ...EMPTY_TASK_FILTERS,
      myAction: true,
      assignee: 'all',
      openOnly: true,
      preset: 'my_action',
    }),
  },
  {
    id: 'waiting_client',
    label: 'Aguardando cliente',
    apply: () => ({
      ...EMPTY_TASK_FILTERS,
      waitingOn: 'client',
      openOnly: true,
      preset: 'waiting_client',
    }),
  },
  {
    id: 'awaiting_review',
    label: 'Em revisão',
    apply: () => ({
      ...EMPTY_TASK_FILTERS,
      status: 'in_review',
      openOnly: true,
      preset: 'awaiting_review',
    }),
  },
  {
    id: 'waiting_others',
    label: 'Dependem de terceiros',
    apply: ({ userId }) => ({
      ...EMPTY_TASK_FILTERS,
      assignee: userId || 'all',
      waitingOn: 'others',
      openOnly: true,
      preset: 'waiting_others',
    }),
  },
  {
    id: 'my_week',
    label: 'Minhas esta semana',
    apply: ({ userId }) => ({
      ...EMPTY_TASK_FILTERS,
      assignee: userId || 'all',
      dueRange: 'this_week',
      openOnly: true,
      preset: 'my_week',
    }),
  },
  {
    id: 'this_week',
    label: 'Esta semana',
    apply: () => ({
      ...EMPTY_TASK_FILTERS,
      dueRange: 'this_week',
      openOnly: true,
      preset: 'this_week',
    }),
  },
];

const PRESET_BY_ID = Object.fromEntries(
  TASK_FILTER_PRESETS.map((p) => [p.id, p])
);

export function getTaskFilterPreset(presetId) {
  if (!presetId) return null;
  return PRESET_BY_ID[String(presetId)] || null;
}

/**
 * Resolve preset da query string. Ids inválidos → null (seguro).
 * @param {string|null|undefined} raw
 */
export function resolvePresetFromQuery(raw) {
  const id = String(raw || '').trim();
  if (!id) return null;
  return getTaskFilterPreset(id);
}

/**
 * Href canônico para /tasks-manager com preset (e params extras opcionais).
 * @param {{ preset?: string, view?: string }} opts
 */
export function buildTasksManagerHref(opts = {}) {
  const params = new URLSearchParams();
  const preset = resolvePresetFromQuery(opts.preset);
  if (preset) params.set('preset', preset.id);
  if (opts.view === 'week') params.set('view', 'week');
  const qs = params.toString();
  const path = qs ? `tasks-manager?${qs}` : 'tasks-manager';
  return createPageUrl(path);
}

/**
 * Extrai opções de responsável a partir das tarefas (+ users opcionais).
 * @returns {{ id: string, label: string }[]}
 */
export function buildAssigneeOptions(tasks = [], users = []) {
  const byId = new Map();

  for (const u of users) {
    if (!u?.id) continue;
    byId.set(String(u.id), u.full_name || u.name || u.email || String(u.id));
  }

  for (const t of tasks) {
    const id = getTaskAssigneeId(t);
    if (!id) continue;
    const key = String(id);
    if (!byId.has(key)) {
      byId.set(key, t.assigneeName || t.assignedToName || key);
    }
  }

  return [...byId.entries()].map(([id, label]) => ({ id, label }));
}

/**
 * Opções de fase por deliverableId.
 */
export function buildPhaseOptions(tasks = []) {
  const byId = new Map();
  for (const t of tasks) {
    if (!t.deliverableId) continue;
    const key = String(t.deliverableId);
    if (!byId.has(key)) {
      byId.set(key, t.deliverableName || key);
    }
  }
  return [...byId.entries()].map(([id, label]) => ({ id, label }));
}

/** Presets exibidos como chips rápidos no tasks-manager (ordem de uso diário). */
export const TASKS_MANAGER_QUICK_PRESETS = [
  'my_tasks',
  'my_open',
  'my_overdue',
  'my_action',
  'waiting_client',
  'awaiting_review',
  'waiting_others',
];
