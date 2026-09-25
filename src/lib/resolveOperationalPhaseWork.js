/**
 * V2.6 — Trabalho no foco da fase operacional atual.
 *
 * Cruza:
 *   currentPhase.activityKinds
 * ×
 *   work units classificadas (activityKind válido)
 *
 * Não inventa prioridade, SLA, nem operationalPhase na Task.
 * Containers / known_gap / unclassified / invalid_kind ficam fora.
 */

import { getActivityKindLabel, isValidActivityKind } from '@/constants/activityKinds';
import { extractClassifiableWorkUnits } from '@/lib/analyzeActivityKindCoverage';
import { phaseIncludesActivityKind } from '@/lib/agencyOperationalCycle';

const TERMINAL_DONE = new Set(['completed', 'approved', 'done']);
const EXCLUDED_STATUSES = new Set(['cancelled']);

/**
 * @param {object | null | undefined} task
 * @returns {boolean}
 */
function isExcludedTask(task) {
  const status = String(task?.status || '').toLowerCase();
  return EXCLUDED_STATUSES.has(status);
}

/**
 * @param {import('@/lib/analyzeActivityKindCoverage').CoverageWorkUnit} unit
 * @param {Map<string, object>} taskById
 * @returns {boolean}
 */
export function isOperationalWorkUnitDone(unit, taskById) {
  const task = unit?.taskId ? taskById.get(unit.taskId) : null;
  if (!task) return false;

  if (unit.source === 'checklist') {
    const list = Array.isArray(task.checklist) ? task.checklist : [];
    const item = list.find(
      (c) =>
        (unit.checklistItemId && String(c.id) === String(unit.checklistItemId)) ||
        (unit.templateStepId &&
          String(c.templateStepId || '') === String(unit.templateStepId))
    );
    return Boolean(item?.completed);
  }

  const status = String(task.status || '').toLowerCase();
  return TERMINAL_DONE.has(status);
}

/**
 * Resolve work units no foco da fase.
 *
 * @param {object[]} tasks
 * @param {{
 *   agencyId?: string | null,
 *   currentPhase?: { activityKinds?: string[], phaseKey?: string, label?: string, slot?: string } | null,
 *   maxItems?: number,
 * }} [options]
 */
export function resolveOperationalPhaseWork(tasks, options = {}) {
  const agencyId = options.agencyId != null ? String(options.agencyId) : null;
  const phase = options.currentPhase || null;
  const maxItems = Number.isFinite(options.maxItems) ? options.maxItems : 8;

  const focusKinds = Array.isArray(phase?.activityKinds)
    ? phase.activityKinds.filter((k) => isValidActivityKind(k))
    : [];

  const list = Array.isArray(tasks) ? tasks : [];
  const taskById = new Map(
    list.filter((t) => t?.id).map((t) => [t.id, t])
  );

  if (!phase) {
    return {
      enabled: false,
      phaseKey: null,
      phaseLabel: null,
      focusKinds: [],
      total: 0,
      done: 0,
      open: 0,
      byKind: [],
      items: [],
      emptyReason: 'no_phase',
    };
  }

  if (focusKinds.length === 0) {
    return {
      enabled: true,
      phaseKey: phase.phaseKey || null,
      phaseLabel: phase.label || null,
      slot: phase.slot || null,
      focusKinds: [],
      total: 0,
      done: 0,
      open: 0,
      byKind: [],
      items: [],
      emptyReason: 'no_focus_kinds',
    };
  }

  const units = extractClassifiableWorkUnits(list, { agencyId });
  const focusSet = new Set(focusKinds);

  const inFocus = units.filter((u) => {
    if (!u.classifiable || u.status !== 'classified') return false;
    if (!u.activityKind || !focusSet.has(u.activityKind)) return false;
    const task = u.taskId ? taskById.get(u.taskId) : null;
    if (task && isExcludedTask(task)) return false;
    return true;
  });

  /** @type {Record<string, { key: string, label: string, total: number, done: number, open: number }>} */
  const byKindMap = {};
  for (const kind of focusKinds) {
    byKindMap[kind] = {
      key: kind,
      label: getActivityKindLabel(kind) || kind,
      total: 0,
      done: 0,
      open: 0,
    };
  }

  let done = 0;
  let open = 0;
  const items = [];

  for (const unit of inFocus) {
    const isDone = isOperationalWorkUnitDone(unit, taskById);
    if (isDone) done += 1;
    else open += 1;

    const bucket = byKindMap[unit.activityKind];
    if (bucket) {
      bucket.total += 1;
      if (isDone) bucket.done += 1;
      else bucket.open += 1;
    }

    items.push({
      id: unit.id,
      title: unit.title,
      activityKind: unit.activityKind,
      activityKindLabel: getActivityKindLabel(unit.activityKind) || unit.activityKind,
      source: unit.source,
      origin: unit.origin,
      taskId: unit.taskId,
      checklistItemId: unit.checklistItemId,
      clientId: unit.clientId,
      serviceId: unit.serviceId,
      done: isDone,
    });
  }

  // Abertas primeiro; depois concluídas. Sem prioridade artificial.
  items.sort((a, b) => {
    if (a.done !== b.done) return a.done ? 1 : -1;
    return String(a.title).localeCompare(String(b.title), 'pt-BR');
  });

  return {
    enabled: true,
    phaseKey: phase.phaseKey || null,
    phaseLabel: phase.label || null,
    slot: phase.slot || null,
    focusKinds: [...focusKinds],
    total: inFocus.length,
    done,
    open,
    byKind: focusKinds.map((k) => byKindMap[k]),
    items: items.slice(0, Math.max(0, maxItems)),
    itemTotal: items.length,
    emptyReason: inFocus.length === 0 ? 'no_classified_work' : null,
  };
}

/**
 * @param {ReturnType<typeof resolveOperationalPhaseWork>} phaseWork
 * @param {unknown} activityKind
 */
export function phaseWorkIncludesKind(phaseWork, activityKind) {
  if (!phaseWork || !isValidActivityKind(activityKind)) return false;
  return phaseIncludesActivityKind(
    { activityKinds: phaseWork.focusKinds },
    activityKind
  );
}
