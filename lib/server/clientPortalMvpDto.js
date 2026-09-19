/**
 * DTOs do MVP Portal do Cliente (Planejamento / Campanha / Pendência).
 * Nunca retornar payload bruto de Brief ou Task.
 */

const MES_NOMES = [
  '',
  'Janeiro',
  'Fevereiro',
  'Março',
  'Abril',
  'Maio',
  'Junho',
  'Julho',
  'Agosto',
  'Setembro',
  'Outubro',
  'Novembro',
  'Dezembro',
];

const DONE = new Set(['completed', 'done']);
const PENDING = new Set([
  'todo',
  'in_progress',
  'in_review',
  'ready_for_review',
  'pending',
  'backlog',
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

function asBool(value) {
  return value === true || value === 'true';
}

export function isClientVisibleFlag(row) {
  return asBool(row?.clientVisible);
}

export function isClientActionTask(task) {
  return String(task?.type || '').trim() === 'client_action' && isClientVisibleFlag(task);
}

/** Conteúdo compartilhado aguardando aprovação do cliente (hub "pronto" / drawer). */
export function isContentApprovalTask(task) {
  if (!task?.id || !isClientVisibleFlag(task)) return false;
  if (isClientActionTask(task)) return false;
  const status = String(task.status || '').toLowerCase();
  return status === 'in_review' || status === 'ready_for_review';
}

/**
 * Item de aprovação de conteúdo (anexos da tarefa) para a aba Aprovações.
 */
export function toContentApprovalDto(task, ctx = {}) {
  if (!isContentApprovalTask(task)) return null;
  const attachments = Array.isArray(task.attachments)
    ? task.attachments
        .filter((a) => a && String(a.url || '').trim())
        .map((a) => ({
          id: String(a.id || a.url),
          name: String(a.name || 'Arquivo'),
          url: String(a.url),
          type: a.type || null,
          mimeType: a.mimeType || null,
        }))
    : [];

  return {
    id: String(task.id),
    kind: 'content',
    title: asString(task.title) || 'Conteúdo para aprovação',
    description: asString(task.description),
    status: 'pending',
    contentType: 'content_task',
    contentId: String(task.id),
    serviceId: asString(task.serviceId),
    serviceName: asString(ctx.serviceName) || null,
    expiresAt: null,
    canDecide: true,
    reviewUrl: null,
    attachments,
  };
}

export function portalActionStatus(task) {
  const raw = String(task?.status || '').toLowerCase();
  if (DONE.has(raw)) return 'completed';
  if (PENDING.has(raw) || !raw) return 'pending';
  // blocked e demais → tratar como pending no MVP (sem status blocked no produto)
  return 'pending';
}

export function campaignIdOfTask(task) {
  return (
    asString(task?.briefingId) ||
    asString(task?.briefId) ||
    asString(task?.campanhaId) ||
    asString(task?.campaignId) ||
    null
  );
}

/**
 * @param {object} task
 * @param {{ campaignName?: string|null, completedByName?: string|null }} [ctx]
 */
export function toClientActionDto(task, ctx = {}) {
  if (!task?.id || !isClientActionTask(task)) return null;
  return {
    id: String(task.id),
    title: asString(task.title) || 'Pendência',
    description: asString(task.description),
    dueDate: asDateIso(task.dueDate),
    status: portalActionStatus(task),
    campaignId: campaignIdOfTask(task),
    campaignName: asString(ctx.campaignName) || null,
    completedAt: asDateIso(task.completedAt),
    completedByName: asString(ctx.completedByName) || null,
  };
}

/**
 * @param {object} brief - campanha_mensal merged
 */
export function toCampaignDto(brief, { includeNullExtras = true } = {}) {
  if (!brief?.id) return null;
  if (!isClientVisibleFlag(brief)) return null;
  if (String(brief.brief_kind || '') === 'campanha_anual') return null;

  const name =
    asString(brief.nome_campanha) || asString(brief.title) || 'Campanha';
  const year = brief.ano != null ? Number(brief.ano) : null;
  const month = brief.mes != null ? Number(brief.mes) : null;

  const dto = {
    id: String(brief.id),
    name,
    year: Number.isFinite(year) ? year : null,
    month: Number.isFinite(month) && month >= 1 && month <= 12 ? month : null,
    period: {
      start: asString(brief.data_gravacao_inicio),
      end: asString(brief.data_gravacao_fim),
    },
    objective: asString(brief.objetivo) || asString(brief.objectives),
    audience: asString(brief.publico_alvo) || asString(brief.company_profile),
    products: asString(brief.linha_focal),
    actions: asString(brief.acoes_comerciais) || asString(brief.business_context),
    annualPlanId: asString(brief.annualPlanId),
  };

  if (includeNullExtras) {
    dto.concept = null;
    dto.narrative = null;
    dto.channels = null;
    dto.visualDirection = null;
  }

  return dto;
}

/**
 * @param {object} plan - campanha_anual merged (must be clientVisible)
 * @param {Map<string, object>} sharedCampaignById - id → campaign brief (clientVisible)
 */
export function toAnnualPlanDto(plan, sharedCampaignById = new Map()) {
  if (!plan?.id || !isClientVisibleFlag(plan)) return null;
  if (String(plan.brief_kind || '') !== 'campanha_anual') return null;

  const year = Number(plan.ano) || new Date().getFullYear();
  const slots = Array.isArray(plan.campanhas) ? plan.campanhas : [];
  const byMes = new Map();
  for (const slot of slots) {
    const mes = Number(slot?.mes);
    if (mes >= 1 && mes <= 12) byMes.set(mes, slot);
  }

  const months = [];
  for (let mes = 1; mes <= 12; mes++) {
    const slot = byMes.get(mes);
    const label = MES_NOMES[mes];
    const briefId = asString(slot?.brief_mensal_id);
    const shared = briefId ? sharedCampaignById.get(String(briefId)) : null;
    const slotName = asString(slot?.nome_campanha);

    if (shared) {
      months.push({
        month: mes,
        label,
        campaignId: String(shared.id),
        campaignName:
          asString(shared.nome_campanha) || asString(shared.title) || slotName,
        status: 'shared',
      });
      continue;
    }

    if (slotName) {
      months.push({
        month: mes,
        label,
        campaignId: null,
        campaignName: slotName,
        status: 'planned',
      });
      continue;
    }

    months.push({
      month: mes,
      label,
      campaignId: null,
      campaignName: null,
      status: 'empty',
    });
  }

  return {
    id: String(plan.id),
    year,
    title: asString(plan.title) || `Planejamento ${year}`,
    status: asString(plan.status_anual) || asString(plan.status) || null,
    months,
  };
}

export function sortCampaignsForPortal(campaigns = []) {
  return [...campaigns].sort((a, b) => {
    const ya = a.year ?? 9999;
    const yb = b.year ?? 9999;
    if (ya !== yb) return ya - yb;
    const ma = a.month ?? 99;
    const mb = b.month ?? 99;
    if (ma !== mb) return ma - mb;
    const sa = a.period?.start || '';
    const sb = b.period?.start || '';
    return String(sa).localeCompare(String(sb));
  });
}

export function sortActionsByDue(actions = []) {
  return [...actions].sort((a, b) => {
    if (!a.dueDate && !b.dueDate) return 0;
    if (!a.dueDate) return 1;
    if (!b.dueDate) return -1;
    return String(a.dueDate).localeCompare(String(b.dueDate));
  });
}

function monthKeyFromStart(cycle) {
  const start = cycle?.startDate || cycle?.start_date;
  if (start) return String(start).slice(0, 7);
  return null;
}

function formatMonthTitle(cycle) {
  const title = asString(cycle?.title);
  if (title) return title;
  const key = monthKeyFromStart(cycle);
  if (!key) return 'Mês compartilhado';
  try {
    const d = new Date(`${key}-01T12:00:00`);
    const label = d.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
    return label.charAt(0).toUpperCase() + label.slice(1);
  } catch {
    return key;
  }
}

export function isSharedCyclePlan(cycle) {
  if (!cycle?.id) return false;
  return (
    asBool(cycle.clientVisible) || Boolean(asString(cycle.sharedAt))
  );
}

/**
 * Resumo de mês compartilhado para listagem no portal.
 */
export function toSharedMonthDto(cycle, ctx = {}) {
  if (!isSharedCyclePlan(cycle)) return null;
  const monthKey = monthKeyFromStart(cycle);
  let year = null;
  let month = null;
  if (monthKey && /^\d{4}-\d{2}$/.test(monthKey)) {
    year = Number(monthKey.slice(0, 4));
    month = Number(monthKey.slice(5, 7));
  }
  return {
    id: String(cycle.id),
    title: formatMonthTitle(cycle),
    monthKey,
    year,
    month: Number.isFinite(month) ? month : null,
    monthLabel:
      Number.isFinite(month) && month >= 1 && month <= 12
        ? MES_NOMES[month]
        : null,
    sharedAt: asDateIso(cycle.sharedAt),
    serviceId: asString(cycle.serviceId),
    serviceName: asString(ctx.serviceName) || null,
    status: asString(cycle.status),
  };
}

export function sortSharedMonths(months = []) {
  return [...months].sort((a, b) => {
    const ka = a.monthKey || '';
    const kb = b.monthKey || '';
    if (ka !== kb) return String(kb).localeCompare(String(ka));
    return String(b.sharedAt || '').localeCompare(String(a.sharedAt || ''));
  });
}

export { MES_NOMES };
