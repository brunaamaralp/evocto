/**
 * Saúde de acompanhamento do lead — usado nos cards do pipeline e no perfil.
 * Função pura: recebe lead + tarefas abertas vinculadas (tabela `tasks`, campo leadId).
 */
import { isOpenLeadStage } from './constants.js';
import { leadEnteredAt } from './leadFields.js';

export const DUE_SOON_HOURS = 48;
export const STALE_AFTER_DAYS = 7;

const DONE_STATUSES = new Set(['done', 'completed', 'cancelled', 'canceled', 'archived']);

export function isLeadTaskOpen(task) {
  return !DONE_STATUSES.has(String(task?.status || '').trim().toLowerCase());
}

function toTime(value) {
  if (!value) return null;
  const t = new Date(value).getTime();
  return Number.isNaN(t) ? null : t;
}

/**
 * @param {object} lead
 * @param {Array} tasks — tarefas do lead (qualquer status)
 * @param {Date} [now]
 * @returns {{
 *   state: 'overdue'|'due_soon'|'scheduled'|'no_next_step'|'stale'|'closed',
 *   label: string,
 *   tone: 'danger'|'warning'|'ok'|'muted'|'neutral',
 *   nextTask: object|null,
 *   openCount: number,
 *   overdueCount: number,
 *   daysSinceContact: number|null,
 * }}
 */
export function computeLeadFollowUp(lead = {}, tasks = [], now = new Date()) {
  const nowMs = now.getTime();
  const open = (tasks || []).filter(isLeadTaskOpen);
  const withDue = open
    .map((t) => ({ task: t, due: toTime(t.dueDate) }))
    .filter((x) => x.due !== null)
    .sort((a, b) => a.due - b.due);

  const overdueCount = withDue.filter((x) => x.due < nowMs).length;
  const nextTask = withDue[0]?.task || open[0] || null;
  const nextDue = withDue[0]?.due ?? null;

  const lastTouch = toTime(lead.lastInteractionAt) ?? toTime(leadEnteredAt(lead));
  const daysSinceContact =
    lastTouch === null ? null : Math.floor((nowMs - lastTouch) / 86400000);

  const base = { nextTask, openCount: open.length, overdueCount, daysSinceContact };

  if (!isOpenLeadStage(lead.status)) {
    return { ...base, state: 'closed', label: '', tone: 'neutral' };
  }

  if (overdueCount > 0) {
    return {
      ...base,
      state: 'overdue',
      label: overdueCount > 1 ? `${overdueCount} follow-ups atrasados` : 'Follow-up atrasado',
      tone: 'danger',
    };
  }

  if (nextDue !== null && nextDue - nowMs <= DUE_SOON_HOURS * 3600000) {
    return { ...base, state: 'due_soon', label: 'Follow-up próximo', tone: 'warning' };
  }

  if (open.length > 0) {
    return { ...base, state: 'scheduled', label: 'Próximo passo agendado', tone: 'ok' };
  }

  if (daysSinceContact !== null && daysSinceContact >= STALE_AFTER_DAYS) {
    return {
      ...base,
      state: 'stale',
      label: `Sem acompanhamento há ${daysSinceContact} dias`,
      tone: 'danger',
    };
  }

  return { ...base, state: 'no_next_step', label: 'Sem próximo passo', tone: 'muted' };
}

/** Agrupa tarefas por leadId. */
export function groupTasksByLead(tasks = []) {
  const map = new Map();
  for (const t of tasks || []) {
    const id = String(t?.leadId || '');
    if (!id) continue;
    if (!map.has(id)) map.set(id, []);
    map.get(id).push(t);
  }
  return map;
}

/** Ordenação cronológica decrescente (mais recente primeiro) por occurredAt/created_date. */
export function sortTimeline(items = []) {
  return [...(items || [])].sort((a, b) => {
    const ta = toTime(a.occurredAt) ?? toTime(a.created_date) ?? 0;
    const tb = toTime(b.occurredAt) ?? toTime(b.created_date) ?? 0;
    return tb - ta;
  });
}

/** Tarefas: abertas primeiro (vencimento mais próximo), depois concluídas (mais recentes). */
export function sortLeadTasks(tasks = []) {
  return [...(tasks || [])].sort((a, b) => {
    const oa = isLeadTaskOpen(a);
    const ob = isLeadTaskOpen(b);
    if (oa !== ob) return oa ? -1 : 1;
    const da = toTime(a.dueDate);
    const db = toTime(b.dueDate);
    if (oa) {
      if (da === null && db === null) return 0;
      if (da === null) return 1;
      if (db === null) return -1;
      return da - db;
    }
    const ca = toTime(a.completedAt) ?? toTime(a.updated_date) ?? 0;
    const cb = toTime(b.completedAt) ?? toTime(b.updated_date) ?? 0;
    return cb - ca;
  });
}

/** Estado de uma tarefa individual (para badge). */
export function taskDueState(task, now = new Date()) {
  if (!isLeadTaskOpen(task)) return 'done';
  const due = toTime(task?.dueDate);
  if (due === null) return 'none';
  const nowMs = now.getTime();
  if (due < nowMs) return 'overdue';
  if (due - nowMs <= DUE_SOON_HOURS * 3600000) return 'due_soon';
  return 'scheduled';
}
