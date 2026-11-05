/**
 * Camada de dados do perfil do lead (/comercial).
 *
 * Reaproveita entidades existentes:
 *  - AgencyLead (agency_leads) — perfil + dados comerciais (payload JSON)
 *  - Task (tasks, coluna leadId) — follow-ups, tarefas e lembretes do lead;
 *    aparecem também no quadro de tarefas da equipe como tarefas internas.
 *  - UploadFile (bucket padrão, ACL time da agência + uploader) — anexos.
 *
 * Nova tabela única: agency_lead_activities (kind = interaction | note | attachment).
 */
import { AgencyLead, AgencyLeadActivity, Task } from '@/api/entities';
import { UploadFile } from '@/api/appwrite/integrations';
import { getStorage, BUCKET_ID } from '@/api/appwriteClient';
import { completeTask } from '@/lib/completeTask';
import { isLeadTaskOpen } from './followUp.js';

export const ACTIVITY_KINDS = Object.freeze({
  INTERACTION: 'interaction',
  NOTE: 'note',
  ATTACHMENT: 'attachment',
});

export const MAX_ATTACHMENT_BYTES = 25 * 1024 * 1024;

/** Tabela/coluna ainda não provisionada no Appwrite. */
export function isSchemaMissingError(err) {
  const msg = String(err?.message || err || '').toLowerCase();
  return (
    msg.includes('not found') ||
    msg.includes('could not be found') ||
    msg.includes('unknown attribute') ||
    msg.includes('invalid document structure') ||
    msg.includes('attribute not found') ||
    msg.includes('collection') ||
    msg.includes('table') ||
    msg.includes('404')
  );
}

/** Autor pode editar/excluir; owner/admin podem tudo. */
export function canManageLeadItem(item, { userId, isAdmin } = {}) {
  if (!item) return false;
  if (isAdmin) return true;
  const author = String(item.createdBy || '');
  return Boolean(author) && author === String(userId || '');
}

function actor(user) {
  return {
    createdBy: user?.id || null,
    authorName: user?.full_name || user?.name || user?.email || 'Equipe',
  };
}

/* ─────────────────────────── Atividades (timeline/notas/anexos) ─────────────────────────── */

export async function listLeadActivities({ agencyId, leadId }) {
  if (!agencyId || !leadId) return [];
  const rows = await AgencyLeadActivity.filter({ agencyId, leadId }, '-$createdAt', 500);
  return Array.isArray(rows) ? rows : [];
}

async function touchLeadInteraction(lead, occurredAt) {
  if (!lead?.id || !occurredAt) return null;
  const prev = lead.lastInteractionAt ? new Date(lead.lastInteractionAt).getTime() : 0;
  const next = new Date(occurredAt).getTime();
  if (!Number.isFinite(next) || next <= prev) return null;
  try {
    return await AgencyLead.update(lead.id, { lastInteractionAt: new Date(next).toISOString() });
  } catch (err) {
    console.warn('[comercial] lastInteractionAt update failed:', err?.message || err);
    return null;
  }
}

/**
 * Registra interação. Se `nextStepDueAt` vier preenchido, agenda o próximo contato
 * como tarefa de follow-up vinculada ao lead.
 */
export async function createInteraction({ lead, agencyId, user, data }) {
  const occurredAt = data.occurredAt ? new Date(data.occurredAt).toISOString() : new Date().toISOString();
  const created = await AgencyLeadActivity.create({
    agencyId,
    leadId: lead.id,
    kind: ACTIVITY_KINDS.INTERACTION,
    occurredAt,
    channel: data.channel || 'outro',
    description: String(data.description || '').trim(),
    nextStep: String(data.nextStep || '').trim() || null,
    responsibleId: data.responsibleId || user?.id || null,
    ...actor(user),
  });

  const updatedLead = await touchLeadInteraction(lead, occurredAt);

  let followUp = null;
  if (data.nextStepDueAt && String(data.nextStep || '').trim()) {
    followUp = await createLeadTask({
      lead,
      agencyId,
      user,
      data: {
        title: String(data.nextStep).trim(),
        leadTaskType: 'follow_up',
        dueDate: data.nextStepDueAt,
        assigneeId: data.responsibleId || user?.id || null,
        description: `Combinado na interação de ${new Date(occurredAt).toLocaleDateString('pt-BR')}.`,
        sourceActivityId: created.id,
      },
    });
  }

  return { activity: created, lead: updatedLead, followUp };
}

export async function updateActivity(id, patch) {
  return AgencyLeadActivity.update(id, { ...patch, editedAt: new Date().toISOString() });
}

export async function deleteActivity(id) {
  return AgencyLeadActivity.delete(id);
}

export async function createNote({ lead, agencyId, user, body }) {
  const text = String(body || '').trim();
  if (!text) throw new Error('Escreva a nota antes de salvar');
  return AgencyLeadActivity.create({
    agencyId,
    leadId: lead.id,
    kind: ACTIVITY_KINDS.NOTE,
    occurredAt: new Date().toISOString(),
    body: text,
    ...actor(user),
  });
}

/* ─────────────────────────── Anexos ─────────────────────────── */

export async function uploadLeadAttachment({ lead, agencyId, user, file, category }) {
  if (!file) throw new Error('Selecione um arquivo');
  if (file.size > MAX_ATTACHMENT_BYTES) {
    throw new Error('Arquivo maior que 25 MB');
  }
  const uploaded = await UploadFile({ file, agencyId });
  try {
    return await AgencyLeadActivity.create({
      agencyId,
      leadId: lead.id,
      kind: ACTIVITY_KINDS.ATTACHMENT,
      occurredAt: new Date().toISOString(),
      fileId: uploaded.fileId,
      fileName: file.name,
      mimeType: file.type || 'application/octet-stream',
      fileSize: file.size,
      category: category || 'outro',
      ...actor(user),
    });
  } catch (err) {
    // Não deixa arquivo órfão no storage.
    try {
      await getStorage().deleteFile({ bucketId: BUCKET_ID, fileId: uploaded.fileId });
    } catch {
      // ignore
    }
    throw err;
  }
}

function hrefOf(value) {
  return typeof value === 'string' ? value : value?.href || String(value);
}

export function attachmentViewUrl(item) {
  if (!item?.fileId) return null;
  return hrefOf(getStorage().getFileView({ bucketId: BUCKET_ID, fileId: item.fileId }));
}

export function attachmentDownloadUrl(item) {
  if (!item?.fileId) return null;
  return hrefOf(getStorage().getFileDownload({ bucketId: BUCKET_ID, fileId: item.fileId }));
}

export async function deleteLeadAttachment(item) {
  if (item?.fileId) {
    try {
      await getStorage().deleteFile({ bucketId: BUCKET_ID, fileId: item.fileId });
    } catch (err) {
      // Arquivo já removido ou sem permissão no storage: segue removendo o vínculo.
      console.warn('[comercial] storage delete failed:', err?.message || err);
    }
  }
  return AgencyLeadActivity.delete(item.id);
}

/* ─────────────────────────── Tarefas / follow-ups (tabela tasks) ─────────────────────────── */

export async function listLeadTasks({ agencyId, leadId }) {
  if (!agencyId || !leadId) return [];
  const rows = await Task.filter({ agencyId, leadId }, '-$createdAt', 300);
  return Array.isArray(rows) ? rows : [];
}

/** Todas as tarefas abertas vinculadas a leads (indicadores do pipeline). */
export async function listOpenLeadTasksForAgency(agencyId) {
  if (!agencyId) return [];
  const rows = await Task.filter({ agencyId, leadId: { $notNull: true } }, 'dueDate', 1000);
  return (Array.isArray(rows) ? rows : []).filter(isLeadTaskOpen);
}

export async function createLeadTask({ lead, agencyId, user, data }) {
  const title = String(data.title || '').trim();
  if (!title) throw new Error('Informe o título da atividade');
  const leadLabel = String(lead.companyName || lead.name || '').trim();
  return Task.create({
    agencyId,
    leadId: lead.id,
    clientId: lead.convertedClientId || null,
    title,
    description: String(data.description || '').trim() || null,
    leadTaskType: data.leadTaskType || 'tarefa',
    type: 'administrativo',
    status: 'todo',
    priority: data.priority || 'medium',
    dueDate: data.dueDate ? new Date(data.dueDate).toISOString() : null,
    assigneeId: data.assigneeId || user?.id || null,
    assignedBy: user?.id || null,
    clientVisible: false,
    tags: ['interno', 'comercial'],
    source: 'comercial',
    leadName: leadLabel || null,
    sourceActivityId: data.sourceActivityId || null,
  });
}

export async function updateLeadTask(id, patch) {
  const next = { ...patch };
  if ('dueDate' in next) next.dueDate = next.dueDate ? new Date(next.dueDate).toISOString() : null;
  return Task.update(id, next);
}

export async function setLeadTaskDone(task, done, { agencyId, user } = {}) {
  if (done) {
    const result = await completeTask(task, { agencyId, user, reason: 'comercial' });
    if (!result.success) throw new Error(result.message || 'Não foi possível concluir');
    return result.task;
  }
  return Task.update(task.id, { status: 'todo', completedAt: null, progress: 0 });
}

export async function deleteLeadTask(id) {
  return Task.delete(id);
}

/** Na conversão, tarefas do lead passam a apontar para o cliente criado. */
export async function relinkLeadTasksToClient({ agencyId, leadId, clientId }) {
  if (!agencyId || !leadId || !clientId) return 0;
  let count = 0;
  try {
    const tasks = await listLeadTasks({ agencyId, leadId });
    for (const t of tasks) {
      if (t.clientId) continue;
      await Task.update(t.id, { clientId });
      count += 1;
    }
  } catch (err) {
    console.warn('[comercial] relink tasks failed:', err?.message || err);
  }
  return count;
}
