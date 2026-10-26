/**
 * Criação de tarefa avulsa/manual — payload único para modal e quick-add.
 * Não altera schema; reutiliza as mesmas validações implícitas do Task.create.
 */

import { Task } from '@/api/entities';
import { buildTaskScopeFields } from '@/lib/taskScope';

/**
 * @param {object} input
 * @param {string} input.title
 * @param {string} input.agencyId
 * @param {string|null} [input.userId] — assignedBy
 * @param {string|null} [input.clientId]
 * @param {string|null} [input.serviceId]
 * @param {string|null} [input.assignedTo]
 * @param {string} [input.status='todo']
 * @param {string} [input.priority='medium']
 * @param {string} [input.description='']
 * @param {string|null} [input.dueDate] ISO ou data parseável
 * @param {number} [input.estimatedHours=4]
 * @param {string} [input.type='analise_documentos']
 * @param {boolean} [input.quickAdd]
 * @param {boolean} [input.isMeeting]
 * @param {string|null} [input.activityKind]
 * @param {string[]} [input.extraTags]
 * @param {string|null} [input.startDate]
 * @param {string|null} [input.cycleId]
 * @param {string|null} [input.briefingId]
 * @param {string|null} [input.kanbanColumn]
 */
export function buildManualTaskPayload(input = {}) {
  const title = String(input.title || '').trim();
  if (!title) {
    throw new Error('Título é obrigatório');
  }
  if (!input.agencyId) {
    throw new Error('Agência é obrigatória');
  }

  const status = String(input.status || 'todo').toLowerCase();
  const safeStatus = ['completed', 'cancelled', 'canceled'].includes(status)
    ? 'todo'
    : status;
  const clientId = input.clientId || null;
  const isInternal = !clientId;
  // Sentinela de UI (Select Radix) nunca deve persistir como id
  const rawAssignee = input.assignedTo;
  const assignedTo =
    !rawAssignee ||
    rawAssignee === 'unassigned' ||
    rawAssignee === '__unassigned__'
      ? null
      : rawAssignee;
  const isMeeting = Boolean(input.isMeeting);
  const baseTags = ['avulsa', 'manual'];
  if (isInternal) baseTags.push('interno');
  if (input.quickAdd) baseTags.push('quick_add');
  if (isMeeting) baseTags.push('reuniao');
  if (Array.isArray(input.extraTags)) {
    for (const tag of input.extraTags) {
      if (tag && !baseTags.includes(tag)) baseTags.push(tag);
    }
  }

  const dueDateIso = input.dueDate
    ? new Date(input.dueDate).toISOString()
    : null;
  const startDate =
    input.startDate ||
    (isMeeting && dueDateIso ? dueDateIso : new Date().toISOString());
  const scope = buildTaskScopeFields({
    cycleId: input.cycleId || input.cyclePlanId || null,
    briefingId: input.briefingId || input.briefId || null,
  });
  const hasCampaignScope = Boolean(scope.briefingId || scope.briefId);
  const kanbanColumn =
    input.kanbanColumn ||
    (hasCampaignScope
      ? 'planejamento'
      : safeStatus === 'todo'
        ? 'todo'
        : safeStatus);

  return {
    agencyId: input.agencyId,
    clientId,
    serviceId: isInternal ? null : input.serviceId || null,
    deliverableId: null,
    parentTaskId: null,
    title,
    description: input.description || '',
    status: safeStatus,
    priority: input.priority || 'medium',
    type: input.type || (isMeeting ? 'reuniao' : 'analise_documentos'),
    activityKind: input.activityKind ?? (isMeeting ? 'meeting' : null),
    assignedTo,
    assigneeId: assignedTo,
    assignedBy: input.userId || null,
    dueDate: dueDateIso,
    startDate,
    estimatedHours: Number(input.estimatedHours) || (isMeeting ? 1 : 4),
    actualHours: 0,
    progress: 0,
    kanbanColumn,
    kanbanPosition: 0,
    ...scope,
    clientVisible: false,
    dependencies: [],
    blockedBy: [],
    checklist: [],
    comments: [],
    attachments: [],
    timeEntries: [],
    statusHistory: [],
    tags: baseTags,
    automation: {
      autoAssign: false,
      autoComplete: false,
      notifyOnUpdate: true,
      escalateAfterDays: null,
      blockAutoStart: false,
      dependencyCheckEnabled: false,
    },
    metrics: {
      complexity: 5,
      businessValue: 5,
      riskLevel: 'medium',
      customerImpact: 'medium',
    },
  };
}

/**
 * @param {Parameters<typeof buildManualTaskPayload>[0]} input
 * @returns {Promise<object>}
 */
export async function createManualTask(input) {
  const payload = buildManualTaskPayload(input);
  return Task.create(payload);
}
