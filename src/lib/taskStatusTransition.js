import { Task } from '@/api/entities';
import { appendStatusHistoryEntry } from '@/lib/taskActivityHistory';

const TERMINAL = new Set(['completed', 'cancelled']);
const ACTIVE_STATUSES = new Set(['in_progress', 'in_review', 'completed']);

/** Colunas do board operacional da agência. */
export const OPS_KANBAN_COLUMN_IDS = Object.freeze([
  'backlog',
  'todo',
  'in_progress',
  'in_review',
  'completed',
  'blocked',
]);

/** Colunas do kanban embutido no inbox do cliente (alinhado ao board da agência). */
export const CLIENT_INBOX_KANBAN_IDS = OPS_KANBAN_COLUMN_IDS;

const DONE_STATUSES = new Set([
  'done',
  'concluido',
  'concluida',
  'concluída',
  'completed',
  'approved',
  'published',
]);

const CAMPAIGN_STAGE_TO_OPS = {
  planejamento: 'todo',
  roteiros: 'todo',
  producao: 'in_progress',
  revisao: 'in_review',
  publicacao: 'completed',
};

const STATUS_TO_OPS = {
  not_started: 'backlog',
  planned: 'todo',
  planejamento: 'todo',
  roteiro: 'todo',
  roteiros: 'todo',
  script: 'todo',
  drafting: 'todo',
  producao: 'in_progress',
  production: 'in_progress',
  doing: 'in_progress',
  ready_for_review: 'in_review',
  pending_approval: 'in_review',
  revisao: 'in_review',
  review: 'in_review',
  waiting_client: 'in_review',
  cancelled: 'completed',
};

/**
 * Mapeia status/kanbanColumn de campanha (ou aliases) para coluna do board operacional.
 * Assim tarefas de campanha não "somem" no /tasks-manager nem no inbox.
 */
export function opsKanbanColumnForTask(task, { columns = OPS_KANBAN_COLUMN_IDS } = {}) {
  const allowed = new Set(columns);
  const fallback = allowed.has('todo')
    ? 'todo'
    : allowed.has('backlog')
      ? 'backlog'
      : columns[0] || 'todo';

  const rawStatus = String(task?.status || '').toLowerCase().trim();
  const stage = String(task?.kanbanColumn || task?.stage || task?.pipeline_stage || '')
    .toLowerCase()
    .trim();

  if (DONE_STATUSES.has(rawStatus) || stage === 'publicacao') {
    return allowed.has('completed') ? 'completed' : fallback;
  }

  let col = null;
  if (allowed.has(rawStatus)) col = rawStatus;
  else if (STATUS_TO_OPS[rawStatus]) col = STATUS_TO_OPS[rawStatus];
  else if (CAMPAIGN_STAGE_TO_OPS[stage]) col = CAMPAIGN_STAGE_TO_OPS[stage];
  else if (allowed.has(stage)) col = stage;
  else if (STATUS_TO_OPS[stage]) col = STATUS_TO_OPS[stage];
  else col = rawStatus || fallback;

  if (allowed.has(col)) return col;

  // Inbox 4 cols: comprimir in_review / blocked
  if (col === 'in_review') return allowed.has('in_progress') ? 'in_progress' : fallback;
  if (col === 'blocked') return allowed.has('backlog') ? 'backlog' : fallback;
  if (col === 'backlog') return allowed.has('todo') ? 'todo' : fallback;
  return fallback;
}

/** Coluna kanban ao concluir: campanha → Publicação; board global → Concluído. */
export function completedKanbanColumnForTask(task) {
  const stage = String(task?.kanbanColumn || '').toLowerCase();
  const hasCampaign =
    Boolean(task?.briefingId || task?.briefId || task?.campaignId) ||
    ['planejamento', 'roteiros', 'producao', 'revisao', 'publicacao'].includes(stage);
  return hasCampaign ? 'publicacao' : 'completed';
}
function isCompletionStatus(status) {
  return ['completed', 'done'].includes(String(status || '').toLowerCase());
}

/**
 * Verifica dependências FS ao avançar status.
 * Conclusão nunca é bloqueada — só retorna aviso.
 * Outros avanços (in_progress / in_review) ainda avisam, mas também não bloqueiam.
 * @returns {{ allowed: boolean, message?: string, warning?: string, blocking?: object[] }}
 */
export async function canTransitionTaskStatus(task, nextStatus) {
  if (!task) return { allowed: false, message: 'Tarefa inválida' };
  if (!nextStatus || nextStatus === task.status) return { allowed: true };

  const deps = Array.isArray(task.dependencies) ? task.dependencies : [];
  if (deps.length === 0) return { allowed: true };

  // Só avalia ao avançar para progresso / conclusão
  if (!ACTIVE_STATUSES.has(nextStatus) && !isCompletionStatus(nextStatus)) {
    return { allowed: true };
  }

  const blocking = [];

  for (const dep of deps) {
    const type = dep.type || 'finish_to_start';
    if (type !== 'finish_to_start' && type !== 'FS') continue;

    if (dep.isResolved) continue;

    try {
      const upstream = await Task.get(dep.taskId);
      if (!upstream) {
        blocking.push({ taskId: dep.taskId, title: dep.taskId, status: 'missing' });
        continue;
      }
      if (!TERMINAL.has(upstream.status)) {
        blocking.push({
          taskId: upstream.id,
          title: upstream.title || upstream.id,
          status: upstream.status,
        });
      }
    } catch {
      blocking.push({ taskId: dep.taskId, title: dep.taskId, status: 'error' });
    }
  }

  if (blocking.length > 0) {
    const names = blocking.map((b) => `"${b.title}" (${b.status})`).join(', ');
    const warning = `Dependências ainda pendentes: ${names}`;
    // Nunca bloqueia — só avisa (toast no caller / completeTask).
    return {
      allowed: true,
      warning,
      message: warning,
      blocking,
    };
  }

  return { allowed: true };
}

/**
 * Ao concluir uma tarefa, marca dependências que apontam para ela como resolvidas.
 */
export async function resolveDownstreamDependencies(completedTask, agencyId) {
  if (!completedTask?.id) return { updated: 0 };

  const filter = agencyId
    ? { agencyId, clientId: completedTask.clientId }
    : { clientId: completedTask.clientId };

  const siblings = await Task.filter(filter).catch(() => []);
  let updated = 0;

  for (const sibling of Array.isArray(siblings) ? siblings : []) {
    const deps = Array.isArray(sibling.dependencies) ? sibling.dependencies : [];
    if (deps.length === 0) continue;

    let changed = false;
    const nextDeps = deps.map((dep) => {
      if (String(dep.taskId) !== String(completedTask.id)) return dep;
      if (dep.isResolved) return dep;
      changed = true;
      return {
        ...dep,
        isResolved: true,
        resolvedAt: new Date().toISOString(),
      };
    });

    if (changed) {
      await Task.update(sibling.id, { dependencies: nextDeps });
      updated += 1;
    }
  }

  return { updated };
}

/**
 * Transiciona status com guards de dependência + statusHistory.
 * @returns {{ success: boolean, task?: object, message?: string }}
 */
export async function transitionTaskStatus(task, nextStatus, { agencyId, user, reason } = {}) {
  const gate = await canTransitionTaskStatus(task, nextStatus);
  if (!gate.allowed) {
    return { success: false, message: gate.message, blocking: gate.blocking };
  }

  const previousStatus = task.status;
  const payload = {
    status: nextStatus,
    kanbanColumn: nextStatus,
    statusHistory: appendStatusHistoryEntry(task, {
      status: nextStatus,
      previousStatus,
      user,
      reason,
    }),
  };

  if (nextStatus === 'completed') {
    payload.completedAt = new Date().toISOString();
    payload.progress = 100;
    payload.kanbanColumn = completedKanbanColumnForTask(task);
    if (payload.actualHours == null) {
      payload.actualHours = task.actualHours || task.estimatedHours || 0;
    }
  } else if (task.status === 'completed' && nextStatus !== 'completed') {
    payload.completedAt = null;
    payload.progress = 0;
  }

  const updated = await Task.update(task.id, payload);

  if (nextStatus === 'completed') {
    await resolveDownstreamDependencies(updated || task, agencyId || task.agencyId).catch(
      () => {}
    );
  }

  return {
    success: true,
    task: updated,
    warning: gate.warning || null,
    blocking: gate.blocking || null,
  };
}

export default transitionTaskStatus;
