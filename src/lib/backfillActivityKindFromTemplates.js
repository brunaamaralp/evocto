/**
 * Backfill seletivo de activityKind em Tasks / checklist abertos.
 *
 * Regras:
 * - só trabalho aberto (não concluído / não cancelado);
 * - só unclassified com template_id ou templateStepId inequívoco;
 * - nunca known_gap (ex.: producao), containers, inferência por título;
 * - nunca grava operationalPhase.
 */

import { normalizeActivityKind } from '@/constants/activityKinds';
import { extractClassifiableWorkUnits } from '@/lib/analyzeActivityKindCoverage';
import {
  buildActivityKindTemplateLookup,
  resolveStepIdActivityKind,
  resolveTemplateIdActivityKind,
} from '@/lib/activityKindTemplateLookup';
import { isOperationalWorkUnitDone } from '@/lib/resolveOperationalPhaseWork';

/**
 * @param {object[]} tasks
 * @param {{
 *   agencyId?: string | null,
 *   openOnly?: boolean,
 *   lookup?: ReturnType<typeof buildActivityKindTemplateLookup>,
 * }} [options]
 */
export function buildActivityKindBackfillPlan(tasks, options = {}) {
  const agencyId = options.agencyId != null ? String(options.agencyId) : null;
  const openOnly = options.openOnly !== false;
  const lookup = options.lookup || buildActivityKindTemplateLookup();

  const list = Array.isArray(tasks) ? tasks : [];
  const taskById = new Map(list.filter((t) => t?.id).map((t) => [t.id, t]));

  const units = extractClassifiableWorkUnits(list, { agencyId });

  /** @type {object[]} */
  const plan = [];
  /** @type {object[]} */
  const skipped = [];

  for (const unit of units) {
    if (!unit?.classifiable) continue;

    if (unit.status === 'classified') {
      skipped.push({
        id: unit.id,
        taskId: unit.taskId,
        source: unit.source,
        reason: 'already_classified',
      });
      continue;
    }
    if (unit.status === 'intentional_container') {
      skipped.push({
        id: unit.id,
        taskId: unit.taskId,
        source: unit.source,
        reason: 'intentional_container',
      });
      continue;
    }
    if (unit.status === 'known_gap') {
      skipped.push({
        id: unit.id,
        taskId: unit.taskId,
        source: unit.source,
        reason: 'known_gap',
        templateId: unit.templateId,
        templateStepId: unit.templateStepId,
      });
      continue;
    }
    if (unit.status === 'invalid_kind') {
      skipped.push({
        id: unit.id,
        taskId: unit.taskId,
        source: unit.source,
        reason: 'invalid_kind',
      });
      continue;
    }
    if (unit.status !== 'unclassified') {
      skipped.push({
        id: unit.id,
        taskId: unit.taskId,
        source: unit.source,
        reason: `status_${unit.status}`,
      });
      continue;
    }

    if (openOnly && isOperationalWorkUnitDone(unit, taskById)) {
      skipped.push({
        id: unit.id,
        taskId: unit.taskId,
        source: unit.source,
        reason: 'not_open',
      });
      continue;
    }

    const task = unit.taskId ? taskById.get(unit.taskId) : null;
    if (!task) {
      skipped.push({
        id: unit.id,
        taskId: unit.taskId,
        source: unit.source,
        reason: 'task_missing',
      });
      continue;
    }

    let resolved;
    if (unit.source === 'checklist') {
      resolved = resolveStepIdActivityKind(unit.templateStepId, lookup);
    } else {
      resolved = resolveTemplateIdActivityKind(unit.templateId, lookup);
    }

    if (!resolved.kind) {
      skipped.push({
        id: unit.id,
        taskId: unit.taskId,
        source: unit.source,
        reason: resolved.reason || 'unresolved',
        templateId: unit.templateId,
        templateStepId: unit.templateStepId,
      });
      continue;
    }

    plan.push({
      id: unit.id,
      taskId: unit.taskId,
      source: unit.source,
      checklistItemId: unit.checklistItemId || null,
      templateId: unit.templateId || null,
      templateStepId: unit.templateStepId || null,
      title: unit.title,
      from: null,
      to: resolved.kind,
      clientId: unit.clientId || null,
    });
  }

  return {
    plan,
    skipped,
    lookupMeta: {
      templateIds: lookup.byTemplateId.size,
      stepIds: lookup.byStepId.size,
      ambiguousTemplateIds: lookup.ambiguousTemplateIds,
      ambiguousStepIds: lookup.ambiguousStepIds,
    },
  };
}

/**
 * @param {object[]} plan
 * @param {object[]} [skipped]
 */
export function summarizeActivityKindBackfillPlan(plan, skipped = []) {
  /** @type {Record<string, number>} */
  const byKind = {};
  /** @type {Record<string, number>} */
  const bySource = { task: 0, checklist: 0 };
  /** @type {Record<string, number>} */
  const bySkipReason = {};

  for (const row of plan || []) {
    byKind[row.to] = (byKind[row.to] || 0) + 1;
    if (row.source === 'checklist') bySource.checklist += 1;
    else bySource.task += 1;
  }
  for (const row of skipped || []) {
    const r = row.reason || 'unknown';
    bySkipReason[r] = (bySkipReason[r] || 0) + 1;
  }

  return {
    eligible: (plan || []).length,
    skippedTotal: (skipped || []).length,
    byKind,
    bySource,
    bySkipReason,
    taskUpdates: new Set((plan || []).map((p) => p.taskId).filter(Boolean)).size,
  };
}

/**
 * Agrupa o plano em patches por Task (um update por Task).
 * @param {object[]} plan
 * @param {object[]} tasks
 * @returns {{ taskId: string, patch: { activityKind?: string, checklist?: object[] }, items: object[] }[]}
 */
export function groupActivityKindBackfillPatches(plan, tasks) {
  const taskById = new Map(
    (Array.isArray(tasks) ? tasks : []).filter((t) => t?.id).map((t) => [t.id, t])
  );

  /** @type {Map<string, object[]>} */
  const byTask = new Map();
  for (const row of plan || []) {
    if (!row?.taskId) continue;
    if (!byTask.has(row.taskId)) byTask.set(row.taskId, []);
    byTask.get(row.taskId).push(row);
  }

  /** @type {{ taskId: string, patch: object, items: object[] }[]} */
  const patches = [];

  for (const [taskId, items] of byTask) {
    const task = taskById.get(taskId);
    if (!task) continue;

    /** @type {object} */
    const patch = {};
    const taskLevel = items.find((i) => i.source === 'task');
    if (taskLevel?.to) {
      patch.activityKind = normalizeActivityKind(taskLevel.to);
    }

    const checklistItems = items.filter((i) => i.source === 'checklist');
    if (checklistItems.length > 0) {
      const list = Array.isArray(task.checklist)
        ? task.checklist.map((c) => ({ ...c }))
        : [];
      for (const row of checklistItems) {
        const idx = list.findIndex(
          (c) =>
            (row.checklistItemId && String(c.id) === String(row.checklistItemId)) ||
            (row.templateStepId &&
              String(c.templateStepId || '') === String(row.templateStepId))
        );
        if (idx < 0) continue;
        list[idx] = {
          ...list[idx],
          activityKind: normalizeActivityKind(row.to),
        };
      }
      patch.checklist = list;
    }

    if (Object.keys(patch).length === 0) continue;
    patches.push({ taskId, patch, items });
  }

  return patches;
}

/**
 * Aplica o plano. dryRun=true não chama Task.update.
 *
 * @param {object[]} plan
 * @param {object[]} tasks
 * @param {{
 *   dryRun?: boolean,
 *   Task?: { update: (id: string, data: object) => Promise<unknown> },
 *   onProgress?: (info: { done: number, total: number, taskId: string }) => void,
 * }} [options]
 */
export async function applyActivityKindBackfill(plan, tasks, options = {}) {
  const dryRun = options.dryRun !== false;
  const TaskEntity = options.Task;
  const patches = groupActivityKindBackfillPatches(plan, tasks);

  /** @type {{ taskId: string, ok: boolean, error?: string, dryRun: boolean }[]} */
  const results = [];

  for (let i = 0; i < patches.length; i += 1) {
    const { taskId, patch } = patches[i];
    options.onProgress?.({ done: i, total: patches.length, taskId });

    if (dryRun || !TaskEntity?.update) {
      results.push({ taskId, ok: true, dryRun: true });
      continue;
    }

    try {
      await TaskEntity.update(taskId, patch);
      results.push({ taskId, ok: true, dryRun: false });
    } catch (err) {
      results.push({
        taskId,
        ok: false,
        dryRun: false,
        error: err?.message || String(err),
      });
    }
  }

  options.onProgress?.({
    done: patches.length,
    total: patches.length,
    taskId: null,
  });

  return {
    dryRun,
    patchCount: patches.length,
    updated: results.filter((r) => r.ok && !r.dryRun).length,
    failed: results.filter((r) => !r.ok).length,
    results,
  };
}
