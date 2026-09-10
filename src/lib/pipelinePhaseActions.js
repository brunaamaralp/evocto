/**
 * Ações puras do pipeline Narrativa — transição, skip e gates.
 * Persistência fica em transitionPipelinePhase.js.
 */

import {
  buildPipelineView,
  canTransitionPhase,
  calcProgress,
} from '@/lib/pipelineNarrativa';

const TERMINAL = new Set(['completed', 'approved', 'skipped', 'cancelled']);

export function isTerminalDeliverableStatus(status) {
  return TERMINAL.has(String(status || '').toLowerCase());
}

/**
 * Enriquece buildPipelineView com flags de ação.
 */
export function buildPipelineActionsView(deliverables = [], tasks = []) {
  const view = buildPipelineView(deliverables, tasks);
  return view.map((fase, idx) => {
    const deliverableDone = isTerminalDeliverableStatus(
      deliverables.find((d) => String(d.id) === String(fase.id))?.status
    );
    const progressSource =
      (fase.subtarefas || []).length > 0 ? fase.subtarefas : fase.tasks;
    const gateCheck = canTransitionPhase(progressSource, {
      gatekeeper: fase.gatekeeper,
      gate_status: fase.gate_status,
    });
    const progress100 = calcProgress(progressSource).progress_pct >= 100;

    return {
      ...fase,
      can_transition: gateCheck.ok && !deliverableDone,
      can_approve_gate:
        Boolean(fase.gatekeeper) &&
        progress100 &&
        !deliverableDone &&
        !['aprovado', 'approved', 'skipped'].includes(
          String(fase.gate_status || '').toLowerCase()
        ),
      can_skip: !fase.required && !deliverableDone,
      transition_block_reason: gateCheck.ok ? null : gateCheck.reason,
      next_phase_id: view[idx + 1]?.id || null,
      next_phase_label: view[idx + 1]?.label || null,
    };
  });
}

/**
 * Aplica aprovação/rejeição de gate nos deliverables + tasks da fase.
 */
export function applyGateDecision(deliverables, tasks, deliverableId, decision, note = '') {
  const gate_status = decision === 'approve' ? 'aprovado' : 'rejeitado';
  const now = new Date().toISOString();

  const nextDeliverables = (deliverables || []).map((d) => {
    if (String(d.id) !== String(deliverableId)) return d;
    return {
      ...d,
      gate_status,
      gate_decided_at: now,
      gate_note: note || d.gate_note || null,
      status:
        decision === 'approve' && String(d.status) === 'ready_for_approval'
          ? 'approved'
          : d.status,
    };
  });

  const taskPatches = [];
  for (const t of tasks || []) {
    if (String(t.deliverableId) !== String(deliverableId)) continue;
    if (!t.gatekeeper && t.parentTaskId) continue;
    if (t.gatekeeper || !t.parentTaskId) {
      taskPatches.push({
        id: t.id,
        patch: {
          gate_status,
          gate_decided_at: now,
          gate_note: note || null,
          ...(decision === 'approve' && !t.parentTaskId
            ? {}
            : {}),
        },
      });
    }
  }

  return { deliverables: nextDeliverables, taskPatches };
}

/**
 * Marca fase como completed/skipped e inicia a próxima.
 */
export function applyPhaseAdvance(deliverables, fromId, { skip = false } = {}) {
  const list = Array.isArray(deliverables) ? [...deliverables] : [];
  const idx = list.findIndex((d) => String(d.id) === String(fromId));
  if (idx < 0) return { deliverables: list, nextId: null, error: 'phase_not_found' };

  const now = new Date().toISOString();
  list[idx] = {
    ...list[idx],
    status: skip ? 'skipped' : 'completed',
    completed_at: now,
    ...(skip ? { skipped_at: now } : {}),
  };

  let nextId = null;
  for (let i = idx + 1; i < list.length; i += 1) {
    const candidate = list[i];
    if (isTerminalDeliverableStatus(candidate.status)) continue;
    list[i] = {
      ...candidate,
      status: 'in_progress',
      started_at: candidate.started_at || now,
    };
    nextId = candidate.id;
    break;
  }

  return { deliverables: list, nextId, error: null };
}

/**
 * Patches para pular tarefas de uma fase opcional (ALTERAÇÕES).
 */
export function buildSkipTaskPatches(tasks, deliverableId) {
  const now = new Date().toISOString();
  return (tasks || [])
    .filter((t) => String(t.deliverableId) === String(deliverableId))
    .filter((t) => !['completed', 'cancelled', 'skipped'].includes(String(t.status || '')))
    .map((t) => ({
      id: t.id,
      patch: {
        status: 'skipped',
        skipped_at: now,
        gate_status: t.gatekeeper ? 'skipped' : t.gate_status || null,
      },
    }));
}

/**
 * Resolve dependencies que apontam para tarefas skipped/completed da fase pulada.
 */
export function buildUnlockDependencyPatches(tasks, skippedTaskIds) {
  const skipped = new Set((skippedTaskIds || []).map(String));
  const patches = [];

  for (const t of tasks || []) {
    const deps = Array.isArray(t.dependencies) ? t.dependencies : [];
    if (!deps.length) continue;
    let changed = false;
    const nextDeps = deps.map((d) => {
      if (skipped.has(String(d.taskId)) && !d.isResolved) {
        changed = true;
        return { ...d, isResolved: true, resolvedReason: 'phase_skipped' };
      }
      return d;
    });
    if (changed) {
      patches.push({ id: t.id, patch: { dependencies: nextDeps } });
    }
  }
  return patches;
}

/**
 * Detecta fases prontas para auto-transição (100% + gate ok, ainda não terminal).
 */
export function findAutoTransitionCandidates(deliverables, tasks) {
  const view = buildPipelineActionsView(deliverables, tasks);
  return view.filter((f) => f.can_transition);
}

export default {
  buildPipelineActionsView,
  applyGateDecision,
  applyPhaseAdvance,
  buildSkipTaskPatches,
  buildUnlockDependencyPatches,
  findAutoTransitionCandidates,
  isTerminalDeliverableStatus,
};
