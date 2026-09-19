/**
 * Upload de arquivos para anexos de Task (ordem estável = carrossel).
 */

import { ClientDocument, Task } from '@/api/entities';
import { UploadPrivateFile } from '@/api/integrations';

export function isImageAttachment(attachmentOrMime) {
  if (!attachmentOrMime) return false;
  if (typeof attachmentOrMime === 'string') {
    return attachmentOrMime.startsWith('image/');
  }
  const mime = attachmentOrMime.mimeType || '';
  const type = attachmentOrMime.type || '';
  return mime.startsWith('image/') || type === 'image';
}

export function buildAttachmentRecord(file, fileUrl, meta = {}) {
  const mime = file?.type || 'application/octet-stream';
  return {
    id: `att_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
    name: file?.name || 'arquivo',
    url: fileUrl,
    type: mime.startsWith('image/') ? 'image' : 'document',
    mimeType: mime,
    size: file?.size || 0,
    uploadedBy: meta.uploadedBy || null,
    uploadedByName: meta.uploadedByName || null,
    uploadedAt: new Date().toISOString(),
    description: file?.name || '',
    isEvidence: false,
  };
}

/**
 * Faz upload de uma lista de File e devolve registros de anexo (ordem preservada).
 * @param {File[]} files
 * @param {{ uploadedBy?: string, uploadedByName?: string, onProgress?: (pct: number) => void }} [meta]
 */
export async function uploadFilesToAttachmentRecords(files, meta = {}) {
  const list = Array.isArray(files) ? files.filter(Boolean) : [];
  const records = [];
  const failures = [];

  for (let i = 0; i < list.length; i++) {
    const f = list[i];
    meta.onProgress?.(Math.round(((i) / Math.max(list.length, 1)) * 90) + 5);
    try {
      const uploaded = await UploadPrivateFile({ file: f });
      const fileUrl = uploaded?.file_url || uploaded?.url || uploaded?.file_uri;
      if (!fileUrl) throw new Error('URL do arquivo não retornada');
      records.push(buildAttachmentRecord(f, fileUrl, meta));
    } catch (err) {
      console.error('[taskAttachmentsUpload]', f?.name, err);
      failures.push({ name: f?.name || 'arquivo', error: err });
    }
  }

  meta.onProgress?.(100);
  return { records, failures };
}

/**
 * Espelha anexos em ClientDocument (best-effort, não bloqueia).
 */
export async function mirrorAttachmentsAsClientDocuments(task, records, uploadedBy) {
  if (!task?.agencyId || !task?.clientId || !records?.length) return;
  await Promise.all(
    records.map((a) =>
      ClientDocument.create({
        agencyId: task.agencyId,
        clientId: task.clientId,
        serviceId: task.serviceId || null,
        deliverable_id: task.deliverableId || null,
        group: 'other',
        fileName: a.name,
        title: a.name,
        description: `Anexo da tarefa: ${task.title}`,
        fileUrl: a.url,
        fileType: a.mimeType || 'application/octet-stream',
        fileSize: a.size || 0,
        version: '1.0',
        visibility: 'internal',
        status: 'approved',
        metadata: { attached_to_task: task.id },
        uploadedBy: uploadedBy || a.uploadedBy || null,
      }).catch(() => null)
    )
  );
}

/**
 * Upload + append em task.attachments (novos no início ou no fim conforme prepend).
 * @returns {{ task, added: object[], failures: object[] }}
 */
export async function appendFilesToTaskAttachments(task, files, meta = {}) {
  if (!task?.id) throw new Error('Tarefa inválida');
  const { records, failures } = await uploadFilesToAttachmentRecords(files, meta);
  if (!records.length) {
    return { task, added: [], failures };
  }

  await mirrorAttachmentsAsClientDocuments(task, records, meta.uploadedBy);

  const prev = Array.isArray(task.attachments) ? [...task.attachments] : [];
  const attachments = meta.prepend === false ? [...prev, ...records] : [...records, ...prev];
  const updated = await Task.update(task.id, { attachments });
  return { task: updated, added: records, failures };
}

/**
 * Substitui a lista completa de anexos (ex.: após reordenar).
 */
export async function saveTaskAttachmentsOrder(taskId, attachments) {
  return Task.update(taskId, { attachments: Array.isArray(attachments) ? attachments : [] });
}

/**
 * Move um anexo na lista (índice from → to).
 */
export function reorderAttachments(attachments, fromIndex, toIndex) {
  const list = Array.isArray(attachments) ? attachments : [];
  if (
    fromIndex < 0 ||
    toIndex < 0 ||
    fromIndex >= list.length ||
    toIndex >= list.length ||
    fromIndex === toIndex
  ) {
    return list;
  }
  const next = [...list];
  const [item] = next.splice(fromIndex, 1);
  next.splice(toIndex, 0, item);
  return next;
}
