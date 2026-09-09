/**
 * Presets e helpers de filtro de tarefas.
 */

export const EMPTY_TASK_FILTERS = {
  status: 'all',
  assignee: 'all',
  phase: 'all',
  priority: 'all',
  search: '',
  dueRange: 'all',
  preset: null,
};

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

/**
 * @param {object} filters
 * @param {object} task
 * @param {{ userId?: string, now?: Date }} ctx
 */
export function applyTaskFilters(task, filters, ctx = {}) {
  if (!filters) return true;

  if (filters.status !== 'all' && task.status !== filters.status) return false;
  if (!taskMatchesAssignee(task, filters.assignee)) return false;
  if (!taskMatchesPhase(task, filters.phase)) return false;
  if (filters.priority !== 'all' && task.priority !== filters.priority) return false;

  if (filters.search) {
    const q = String(filters.search).toLowerCase();
    const hay = `${task.title || ''} ${task.description || ''}`.toLowerCase();
    if (!hay.includes(q)) return false;
  }

  if (filters.dueRange === 'this_week') {
    const { start, end } = getWeekRange(ctx.now || new Date());
    if (!taskDueInRange(task, start, end)) return false;
  }

  return true;
}

export const TASK_FILTER_PRESETS = [
  {
    id: 'my_week',
    label: 'Minhas esta semana',
    apply: ({ userId }) => ({
      ...EMPTY_TASK_FILTERS,
      assignee: userId || 'all',
      dueRange: 'this_week',
      preset: 'my_week',
    }),
  },
  {
    id: 'this_week',
    label: 'Esta semana',
    apply: () => ({
      ...EMPTY_TASK_FILTERS,
      dueRange: 'this_week',
      preset: 'this_week',
    }),
  },
  {
    id: 'my_open',
    label: 'Minhas abertas',
    apply: ({ userId }) => ({
      ...EMPTY_TASK_FILTERS,
      assignee: userId || 'all',
      status: 'all',
      preset: 'my_open',
      // status filter left open; consumer can further narrow
    }),
  },
];

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
