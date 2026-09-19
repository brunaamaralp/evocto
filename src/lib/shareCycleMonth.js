/**
 * Compartilha o mês operacional (CyclePlan) com o portal do cliente.
 * - Marca o ciclo como clientVisible + sharedAt
 * - Torna clientVisible as unidades/tarefas do ciclo (exceto canceladas)
 * - Se o ciclo tiver briefing ligado, compartilha o brief também
 */

import { Brief, CyclePlan, Task } from '@/api/entities';
import { getTaskCycleIds, taskMatchesCycle } from '@/lib/taskScope';

const CANCELLED = new Set(['cancelled', 'canceled']);

function briefIdOfCycle(cycle) {
  return (
    cycle?.briefId ||
    cycle?.briefingId ||
    cycle?.planData?.briefId ||
    cycle?.planData?.briefingId ||
    null
  );
}

/**
 * @param {{
 *   cyclePlanId: string,
 *   agencyId: string,
 *   clientId: string,
 *   sharedBy?: string|null,
 * }} args
 */
export async function shareCycleMonth({
  cyclePlanId,
  agencyId,
  clientId,
  sharedBy = null,
} = {}) {
  if (!cyclePlanId) throw new Error('cyclePlanId é obrigatório');
  if (!agencyId) throw new Error('agencyId é obrigatório');
  if (!clientId) throw new Error('clientId é obrigatório');

  const cycle = await CyclePlan.get(cyclePlanId);
  if (!cycle?.id) throw new Error('Ciclo não encontrado');
  if (String(cycle.agencyId) !== String(agencyId)) {
    throw new Error('Ciclo de outra agência');
  }
  if (String(cycle.clientId) !== String(clientId)) {
    throw new Error('Ciclo de outro cliente');
  }

  const sharedAt = new Date().toISOString();
  const updatedCycle = await CyclePlan.update(cycle.id, {
    clientVisible: true,
    sharedAt,
    sharedBy: sharedBy || null,
  });

  const tasks = await Task.filter({ agencyId, clientId }).catch(() => []);
  const list = Array.isArray(tasks) ? tasks : [];
  const inCycle = list.filter(
    (t) =>
      t?.id &&
      taskMatchesCycle(t, cycle.id) &&
      !CANCELLED.has(String(t.status || '').toLowerCase())
  );

  let tasksShared = 0;
  for (const task of inCycle) {
    if (task.clientVisible === true) continue;
    await Task.update(task.id, { clientVisible: true });
    tasksShared += 1;
  }

  let briefShared = false;
  const briefId = briefIdOfCycle(updatedCycle || cycle);
  if (briefId) {
    const brief = await Brief.get(briefId).catch(() => null);
    if (
      brief?.id &&
      String(brief.agencyId) === String(agencyId) &&
      String(brief.clientId) === String(clientId) &&
      brief.clientVisible !== true
    ) {
      await Brief.update(brief.id, { clientVisible: true });
      briefShared = true;
    }
  }

  return {
    cycle: updatedCycle || { ...cycle, clientVisible: true, sharedAt },
    tasksShared,
    tasksTotal: inCycle.length,
    briefShared,
  };
}

export function isCycleSharedWithClient(cycle) {
  if (!cycle) return false;
  return (
    cycle.clientVisible === true ||
    cycle.clientVisible === 'true' ||
    Boolean(cycle.sharedAt)
  );
}

export function cycleShareLabel(cycle) {
  if (!isCycleSharedWithClient(cycle)) return null;
  if (!cycle.sharedAt) return 'Compartilhado';
  try {
    const d = new Date(cycle.sharedAt);
    if (Number.isNaN(d.getTime())) return 'Compartilhado';
    return `Compartilhado em ${d.toLocaleDateString('pt-BR')}`;
  } catch {
    return 'Compartilhado';
  }
}

/** Util para testes / debug */
export function tasksForCycle(tasks, cycleId) {
  return (Array.isArray(tasks) ? tasks : []).filter((t) =>
    getTaskCycleIds(t).includes(String(cycleId))
  );
}
