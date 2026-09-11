/**
 * Serializers for Client Portal responses.
 * Never return raw Task / Document / Client rows to the portal.
 */

const ALLOWED_TASK_STATUS = new Set([
  'backlog',
  'todo',
  'in_progress',
  'in_review',
  'completed',
  'cancelled',
  'blocked',
  'ready_for_review',
]);

function asString(value) {
  if (value == null) return null;
  const s = String(value).trim();
  return s || null;
}

function asDateIso(value) {
  if (!value) return null;
  try {
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return null;
    return d.toISOString();
  } catch {
    return null;
  }
}

function stageNameFromTask(task) {
  return (
    asString(task.deliverableName) ||
    asString(task.stageName) ||
    asString(task.phaseName) ||
    asString(task.phase) ||
    null
  );
}

/**
 * @param {object} task - merged task row (parsePayload)
 * @param {{ serviceName?: string|null }} [ctx]
 */
export function toPortalTaskDto(task, ctx = {}) {
  if (!task?.id) return null;
  const statusRaw = asString(task.status) || 'todo';
  const status = ALLOWED_TASK_STATUS.has(statusRaw) ? statusRaw : 'todo';

  return {
    id: String(task.id),
    title: asString(task.title) || 'Sem título',
    description: asString(task.description),
    status,
    dueDate: asDateIso(task.dueDate),
    serviceId: asString(task.serviceId),
    serviceName: asString(ctx.serviceName) || null,
    stageName: stageNameFromTask(task),
  };
}

/**
 * @param {object} doc - merged client_documents row
 */
export function toPortalDocumentDto(doc) {
  if (!doc?.id) return null;
  const visibility = asString(doc.visibility);
  if (visibility !== 'client' && visibility !== 'public') return null;

  return {
    id: String(doc.id),
    title: asString(doc.title) || asString(doc.fileName) || 'Documento',
    fileName: asString(doc.fileName),
    group: asString(doc.group) || asString(doc.category) || 'other',
    fileUrl: asString(doc.fileUrl),
    fileType: asString(doc.fileType) || asString(doc.mimeType),
    status: asString(doc.status),
    visibility,
    createdAt: asDateIso(doc.created_date || doc.$createdAt || doc.createdAt),
    serviceId: asString(doc.serviceId),
  };
}

/**
 * @param {object} service
 */
export function toPortalServiceDto(service) {
  if (!service?.id) return null;
  return {
    id: String(service.id),
    name: asString(service.name) || 'Serviço',
    status: asString(service.status),
    category: asString(service.category),
  };
}

/**
 * @param {object} client
 */
export function toPortalClientDto(client) {
  if (!client?.id) return null;
  return {
    id: String(client.id),
    name: asString(client.name) || 'Cliente',
    company: asString(client.company),
  };
}

/**
 * @param {object} agency
 */
export function toPortalAgencyDto(agency) {
  if (!agency?.id) return null;
  return {
    id: String(agency.id),
    name: asString(agency.agencyName) || asString(agency.name) || 'Agência',
    logoUrl: asString(agency.logoUrl),
  };
}

/**
 * @param {object} approval
 */
export function toPortalApprovalDto(approval) {
  if (!approval?.id) return null;
  return {
    id: String(approval.id),
    title: asString(approval.title) || 'Aprovação pendente',
    description: asString(approval.description) || asString(approval.customMessage),
    status: asString(approval.status) || 'pending',
    contentType: asString(approval.contentType),
    contentId: asString(approval.contentId),
    expiresAt: asDateIso(approval.expiresAt),
    serviceId: asString(approval.serviceId),
  };
}

/**
 * Safe content preview for portal approvals (no internal payload dumps).
 */
export function toPortalApprovalContentPreview(contentType, content) {
  if (!content?.id) return null;
  const type = String(contentType || '').trim();

  if (type === 'cycle_plan') {
    return {
      type: 'cycle_plan',
      id: String(content.id),
      title: asString(content.title) || 'Plano do ciclo',
      status: asString(content.status),
      summary: asString(content.summary) || asString(content.description) || null,
      cyclePeriod: asString(content.cyclePeriod) || asString(content.period) || null,
    };
  }

  if (type === 'briefing' || type === 'brief') {
    return {
      type: 'briefing',
      id: String(content.id),
      title: asString(content.title) || 'Briefing',
      status: asString(content.status),
      summary: asString(content.summary) || asString(content.description) || null,
    };
  }

  return {
    type: type || 'unknown',
    id: String(content.id),
    title: asString(content.title) || 'Conteúdo',
    status: asString(content.status),
    summary: null,
  };
}
