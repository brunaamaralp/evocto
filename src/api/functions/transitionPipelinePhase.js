import { Service, Task, Profile, Notification } from '@/api/entities';
import {
  buildPipelineActionsView,
  applyGateDecision,
  applyPhaseAdvance,
  buildSkipTaskPatches,
  buildUnlockDependencyPatches,
  findAutoTransitionCandidates,
  isTerminalDeliverableStatus,
} from '@/lib/pipelinePhaseActions';
import { calcProgress, isNarrativaPipeline } from '@/lib/pipelineNarrativa';
import { resolveResponsavelAssignee } from '@/lib/resolveResponsavelAssignee';

async function applyTaskPatches(patches = []) {
  const updated = [];
  for (const { id, patch } of patches) {
    if (!id || !patch) continue;
    const row = await Task.update(id, patch);
    updated.push(row || { id, ...patch });
  }
  return updated;
}

async function notifyGatekeeper({ agencyId, profiles, gatekeeper, service, phaseLabel, href }) {
  if (!gatekeeper || gatekeeper === 'cliente') return;
  const resolved = resolveResponsavelAssignee(profiles, gatekeeper);
  if (!resolved?.assigneeId) return;

  const dayKey = new Date().toISOString().slice(0, 10);
  const dedupKey = `gate_ready_${service.id}_${phaseLabel}_${resolved.assigneeId}_${dayKey}`;

  try {
    await Notification.create({
      agencyId,
      userId: resolved.assigneeId,
      type: 'pipeline_gate',
      subject: `service:${service.id}`,
      title: `Gate pendente: ${phaseLabel}`,
      context: `${phaseLabel} pronto para aprovação (${gatekeeper})`,
      href: href || `/delivery-workspace?serviceId=${service.id}`,
      severity: 'warn',
      dedupKey,
      metadata: { serviceId: service.id, gatekeeper, phaseLabel },
    });
  } catch (err) {
    console.warn('[transitionPipelinePhase] notify gate', err);
  }
}

/**
 * @param {{
 *   serviceId: string,
 *   deliverableId?: string,
 *   action: 'transition' | 'skip' | 'approve_gate' | 'reject_gate' | 'sync',
 *   note?: string,
 *   actorId?: string,
 *   auto?: boolean,
 * }} opts
 */
export async function transitionPipelinePhase(opts = {}) {
  const {
    serviceId,
    deliverableId,
    action,
    note = '',
    actorId = null,
    auto = false,
  } = opts;

  if (!serviceId) throw new Error('serviceId é obrigatório');
  if (!action) throw new Error('action é obrigatório');

  const service = await Service.get(serviceId);
  if (!service) throw new Error('Serviço não encontrado');
  if (!isNarrativaPipeline(service)) {
    throw new Error('Serviço não usa Pipeline Narrativa');
  }

  const agencyId = service.agencyId;
  const tasks = await Task.filter({ agencyId, serviceId }).catch(() => []);
  const taskList = Array.isArray(tasks) ? tasks : [];
  let deliverables = Array.isArray(service.deliverables) ? [...service.deliverables] : [];
  const profiles = await Profile.filter({ agencyId }).catch(() => []);

  const result = {
    success: true,
    action,
    serviceId,
    transitions: [],
    skipped: [],
    gates: [],
    tasksUpdated: 0,
  };

  const persistDeliverables = async (next) => {
    deliverables = next;
    const updated = await Service.update(serviceId, { deliverables: next });
    result.service = updated || { ...service, deliverables: next };
    return result.service;
  };

  if (action === 'approve_gate' || action === 'reject_gate') {
    if (!deliverableId) throw new Error('deliverableId é obrigatório');
    const fase = deliverables.find((d) => String(d.id) === String(deliverableId));
    if (!fase) throw new Error('Fase não encontrada');

    const decision = action === 'approve_gate' ? 'approve' : 'reject';
    const { deliverables: nextD, taskPatches } = applyGateDecision(
      deliverables,
      taskList,
      deliverableId,
      decision,
      note
    );
    await persistDeliverables(nextD);
    const updatedTasks = await applyTaskPatches(taskPatches);
    result.tasksUpdated += updatedTasks.length;
    result.gates.push({ deliverableId, decision, note });

    // Após aprovar gate, tenta auto-avançar se 100%
    if (decision === 'approve') {
      const sync = await transitionPipelinePhase({
        serviceId,
        action: 'sync',
        actorId,
        auto: true,
      });
      result.transitions.push(...(sync.transitions || []));
      result.service = sync.service || result.service;
      result.tasksUpdated += sync.tasksUpdated || 0;
    }

    return result;
  }

  if (action === 'skip') {
    if (!deliverableId) throw new Error('deliverableId é obrigatório');
    const fase = deliverables.find((d) => String(d.id) === String(deliverableId));
    if (!fase) throw new Error('Fase não encontrada');
    if (fase.required !== false) {
      throw new Error('Só fases opcionais podem ser puladas');
    }
    if (isTerminalDeliverableStatus(fase.status)) {
      return { ...result, skipped: [], message: 'Fase já finalizada' };
    }

    const skipPatches = buildSkipTaskPatches(taskList, deliverableId);
    const skippedIds = skipPatches.map((p) => p.id);
    const unlockPatches = buildUnlockDependencyPatches(taskList, skippedIds);

    const advanced = applyPhaseAdvance(deliverables, deliverableId, { skip: true });
    if (advanced.error) throw new Error(advanced.error);
    await persistDeliverables(advanced.deliverables);

    const updatedTasks = await applyTaskPatches([...skipPatches, ...unlockPatches]);
    result.tasksUpdated += updatedTasks.length;
    result.skipped.push({
      deliverableId,
      nextId: advanced.nextId,
      auto,
      actorId,
      note,
    });

    return result;
  }

  if (action === 'transition') {
    if (!deliverableId) throw new Error('deliverableId é obrigatório');
    const view = buildPipelineActionsView(deliverables, taskList);
    const fase = view.find((f) => String(f.id) === String(deliverableId));
    if (!fase) throw new Error('Fase não encontrada');

    if (!fase.can_transition) {
      throw new Error(
        fase.transition_block_reason === 'gate_pending'
          ? `Gate pendente (${fase.gatekeeper})`
          : 'Fase ainda não está 100% concluída'
      );
    }

    const advanced = applyPhaseAdvance(deliverables, deliverableId, { skip: false });
    if (advanced.error) throw new Error(advanced.error);
    await persistDeliverables(advanced.deliverables);

    // Pais da fase: marcar completed se subtarefas 100%
    const phaseParentPatches = taskList
      .filter((t) => String(t.deliverableId) === String(deliverableId) && !t.parentTaskId)
      .filter((t) => !['completed', 'skipped', 'cancelled'].includes(String(t.status || '')))
      .map((t) => ({
        id: t.id,
        patch: { status: 'completed', completed_at: new Date().toISOString() },
      }));
    const updatedTasks = await applyTaskPatches(phaseParentPatches);
    result.tasksUpdated += updatedTasks.length;

    result.transitions.push({
      from: deliverableId,
      to: advanced.nextId,
      auto,
      actorId,
    });

    // Notifica gatekeeper da próxima fase se houver
    const nextFase = (result.service?.deliverables || advanced.deliverables).find(
      (d) => String(d.id) === String(advanced.nextId)
    );
    if (nextFase?.gatekeeper) {
      await notifyGatekeeper({
        agencyId,
        profiles,
        gatekeeper: nextFase.gatekeeper,
        service: result.service || service,
        phaseLabel: nextFase.name,
      });
    }

    return result;
  }

  if (action === 'sync') {
    // Auto-avança todas as fases prontas em sequência; notifica gates pendentes em 100%
    let guard = 0;
    while (guard < 8) {
      guard += 1;
      const freshTasks = await Task.filter({ agencyId, serviceId }).catch(() => []);
      const list = Array.isArray(freshTasks) ? freshTasks : [];
      deliverables = Array.isArray(result.service?.deliverables)
        ? result.service.deliverables
        : deliverables;

      const candidates = findAutoTransitionCandidates(deliverables, list);
      if (!candidates.length) {
        // Notifica gates esperando aprovação
        const view = buildPipelineActionsView(deliverables, list);
        for (const fase of view) {
          if (fase.can_approve_gate && fase.gatekeeper && fase.gatekeeper !== 'cliente') {
            await notifyGatekeeper({
              agencyId,
              profiles,
              gatekeeper: fase.gatekeeper,
              service,
              phaseLabel: fase.label,
            });
          }
        }
        break;
      }

      const next = candidates[0];
      const advanced = applyPhaseAdvance(deliverables, next.id, { skip: false });
      if (advanced.error) break;
      await persistDeliverables(advanced.deliverables);

      const phaseParentPatches = list
        .filter((t) => String(t.deliverableId) === String(next.id) && !t.parentTaskId)
        .filter((t) => !['completed', 'skipped', 'cancelled'].includes(String(t.status || '')))
        .map((t) => ({
          id: t.id,
          patch: { status: 'completed', completed_at: new Date().toISOString() },
        }));
      const updatedTasks = await applyTaskPatches(phaseParentPatches);
      result.tasksUpdated += updatedTasks.length;
      result.transitions.push({
        from: next.id,
        to: advanced.nextId,
        auto: true,
        actorId,
      });
    }

    return result;
  }

  throw new Error(`action inválida: ${action}`);
}

/**
 * Após concluir subtarefa: se pai 100%, marca pai; depois sync de fases.
 */
export async function syncPipelineAfterTaskComplete({ serviceId, taskId, actorId } = {}) {
  if (!serviceId) return { success: false, reason: 'no_service' };

  const service = await Service.get(serviceId).catch(() => null);
  if (!service || !isNarrativaPipeline(service)) {
    return { success: false, reason: 'not_narrativa' };
  }

  const agencyId = service.agencyId;
  const tasks = await Task.filter({ agencyId, serviceId }).catch(() => []);
  const list = Array.isArray(tasks) ? tasks : [];
  const task = list.find((t) => String(t.id) === String(taskId));

  let tasksUpdated = 0;

  if (task?.parentTaskId) {
    const siblings = list.filter((t) => String(t.parentTaskId) === String(task.parentTaskId));
    const { progress_pct } = calcProgress(
      siblings.map((s) =>
        String(s.id) === String(taskId) ? { ...s, status: 'completed' } : s
      )
    );
    if (progress_pct >= 100) {
      const parent = list.find((t) => String(t.id) === String(task.parentTaskId));
      if (parent && parent.status !== 'completed') {
        await Task.update(parent.id, {
          status: 'completed',
          completed_at: new Date().toISOString(),
        });
        tasksUpdated += 1;
      }
    }
  }

  const sync = await transitionPipelinePhase({
    serviceId,
    action: 'sync',
    actorId,
    auto: true,
  });

  return {
    success: true,
    tasksUpdated: tasksUpdated + (sync.tasksUpdated || 0),
    transitions: sync.transitions || [],
    service: sync.service,
  };
}

export default transitionPipelinePhase;
