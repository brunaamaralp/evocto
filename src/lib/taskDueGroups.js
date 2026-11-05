/**
 * Agrupamento de tarefas por prazo — estilo "Minhas tarefas" (Asana):
 * Atrasadas → Hoje → Próximos 7 dias → Mais tarde → Sem prazo.
 * Funções puras (sem I/O) para uso na Home e na visão do cliente.
 */

import { isOpenTaskStatus } from '@/lib/taskFilterPresets';

export const DUE_GROUPS = [
  { id: 'overdue', label: 'Atrasadas' },
  { id: 'today', label: 'Hoje' },
  { id: 'week', label: 'Próximos 7 dias' },
  { id: 'later', label: 'Mais tarde' },
  { id: 'none', label: 'Sem prazo' },
];

const PRIORITY_RANK = { urgent: 0, high: 1, medium: 2, low: 3 };

function startOfDay(date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

export function parseTaskDue(task) {
  if (!task?.dueDate) return null;
  const d = new Date(task.dueDate);
  return Number.isNaN(d.getTime()) ? null : d;
}

/** Diferença em dias (calendário local) entre o prazo e hoje. */
export function dueDiffDays(task, now = new Date()) {
  const due = parseTaskDue(task);
  if (!due) return null;
  return Math.round((startOfDay(due) - startOfDay(now)) / 86400000);
}

export function resolveDueGroupId(task, now = new Date()) {
  const diff = dueDiffDays(task, now);
  if (diff === null) return 'none';
  if (diff < 0) return 'overdue';
  if (diff === 0) return 'today';
  if (diff <= 7) return 'week';
  return 'later';
}

export function formatDueShort(task, now = new Date()) {
  const diff = dueDiffDays(task, now);
  if (diff === null) return null;
  if (diff === 0) return 'Hoje';
  if (diff === 1) return 'Amanhã';
  if (diff === -1) return 'Ontem';
  const due = parseTaskDue(task);
  return due.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
}

function compareTasks(a, b) {
  const da = parseTaskDue(a);
  const db = parseTaskDue(b);
  if (da && db && da.getTime() !== db.getTime()) return da - db;
  if (da && !db) return -1;
  if (!da && db) return 1;
  const pa = PRIORITY_RANK[String(a.priority || 'medium').toLowerCase()] ?? 2;
  const pb = PRIORITY_RANK[String(b.priority || 'medium').toLowerCase()] ?? 2;
  if (pa !== pb) return pa - pb;
  return String(a.title || '').localeCompare(String(b.title || ''), 'pt-BR');
}

/**
 * @param {object[]} tasks
 * @param {{ now?: Date, includeDone?: boolean }} [opts]
 * @returns {{ id: string, label: string, tasks: object[] }[]} grupos (inclui vazios)
 */
export function groupTasksByDue(tasks = [], { now = new Date(), includeDone = false } = {}) {
  const buckets = Object.fromEntries(DUE_GROUPS.map((g) => [g.id, []]));
  for (const task of Array.isArray(tasks) ? tasks : []) {
    if (!task) continue;
    if (!includeDone && !isOpenTaskStatus(task)) continue;
    buckets[resolveDueGroupId(task, now)].push(task);
  }
  return DUE_GROUPS.map((g) => ({
    ...g,
    tasks: buckets[g.id].sort(compareTasks),
  }));
}

/** Contadores rápidos para cabeçalhos (abertas / atrasadas / concluídas). */
export function summarizeTasks(tasks = [], now = new Date()) {
  let open = 0;
  let overdue = 0;
  let done = 0;
  for (const task of Array.isArray(tasks) ? tasks : []) {
    if (!task) continue;
    if (isOpenTaskStatus(task)) {
      open += 1;
      if (resolveDueGroupId(task, now) === 'overdue') overdue += 1;
    } else {
      const status = String(task.status || '').toLowerCase();
      if (status === 'completed' || status === 'done') done += 1;
    }
  }
  return { open, overdue, done };
}

/** Tarefas atribuídas ao usuário (assigneeId/assignedTo). */
export function filterMyTasks(tasks = [], userId) {
  if (!userId) return [];
  return (Array.isArray(tasks) ? tasks : []).filter((t) => {
    const id = t?.assigneeId || t?.assignedTo || null;
    return id && String(id) === String(userId);
  });
}
