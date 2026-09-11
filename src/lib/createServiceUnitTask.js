/**
 * Cria unidade operacional (conteúdo / sessão / vídeo / …) ou inicia projeto único.
 * Garante CyclePlan do serviço sem gerar tarefas de pipeline automaticamente.
 */

import { CyclePlan, Service, Task } from '@/api/entities';
import { createMonthCycle } from '@/api/functions/createMonthCycle';
import {
  cycleMonthKey,
  formatClientMonthCycleTitle,
  monthKeyFromYmd,
} from '@/lib/clientMonthCycle';
import {
  getServiceDisplayName,
  getServiceOperationProfile,
  PERIOD_MODES,
} from '@/lib/serviceOperationProfile';
import {
  buildChecklistFromContentItemTemplate,
  isItemCycleService,
  resolveItemCyclePipeline,
} from '@/templates/itemCycleTemplateHelpers';

const ACTIVE_CYCLE_STATUSES = new Set(['approved', 'in_execution']);

function todayYmd() {
  return new Date().toISOString().slice(0, 10);
}

async function loadService(serviceOrId) {
  if (!serviceOrId) throw new Error('Serviço é obrigatório');
  if (typeof serviceOrId === 'object' && serviceOrId.id) return serviceOrId;
  const service = await Service.get(serviceOrId);
  if (!service?.id) throw new Error('Serviço não encontrado');
  return service;
}

/**
 * Reutiliza ciclo ativo do serviço (no mês, se periodMode monthly) ou cria vazio.
 */
export async function ensureServiceOperationalCycle({
  agencyId,
  clientId,
  service,
  startDate = todayYmd(),
  ownerId = null,
} = {}) {
  if (!agencyId) throw new Error('agencyId é obrigatório');
  if (!clientId) throw new Error('clientId é obrigatório');
  const svc = await loadService(service);
  const profile = getServiceOperationProfile(svc);
  const ymd = String(startDate).slice(0, 10);
  const monthKey = monthKeyFromYmd(ymd);

  const list = await CyclePlan.filter({
    agencyId,
    clientId,
    serviceId: svc.id,
  }).catch(() => []);
  const cycles = Array.isArray(list) ? list : [];

  const active = cycles.filter((c) =>
    ACTIVE_CYCLE_STATUSES.has(String(c?.status || ''))
  );

  if (profile.periodMode === PERIOD_MODES.MONTHLY) {
    const existing = active.find((c) => cycleMonthKey(c) === monthKey);
    if (existing?.id) {
      return { cyclePlan: existing, service: svc, created: false, monthKey };
    }
  } else {
    const existing = active[0];
    if (existing?.id) {
      return {
        cyclePlan: existing,
        service: svc,
        created: false,
        monthKey: cycleMonthKey(existing),
      };
    }
  }

  const pipeline = isItemCycleService(svc)
    ? resolveItemCyclePipeline(svc)
    : svc.pipeline || svc.offering_key || 'narrativa';

  const title =
    profile.periodMode === PERIOD_MODES.MONTHLY
      ? formatClientMonthCycleTitle(ymd)
      : getServiceDisplayName(svc);

  const result = await createMonthCycle({
    agencyId,
    clientId,
    startDate: ymd,
    serviceId: svc.id,
    title,
    generateTasks: false,
    ownerId,
    pipeline,
  });

  const cyclePlan = result?.cyclePlan;
  if (!cyclePlan?.id) {
    throw new Error('Não foi possível preparar o período operacional');
  }

  // Título canônico do mês no hub (sem nome de campanha/item)
  if (profile.periodMode === PERIOD_MODES.MONTHLY) {
    const normalized = await CyclePlan.update(cyclePlan.id, {
      title,
      cyclePeriod: cyclePlan.cyclePeriod || title,
      briefId: null,
    }).catch(() => cyclePlan);
    return {
      cyclePlan: normalized || cyclePlan,
      service: result?.service || svc,
      created: true,
      monthKey,
    };
  }

  return {
    cyclePlan,
    service: result?.service || svc,
    created: true,
    monthKey: cycleMonthKey(cyclePlan),
  };
}

function buildUnitTaskPayload({
  agencyId,
  clientId,
  service,
  cyclePlan,
  title,
  ownerId,
  profile,
}) {
  const tpl = service.content_item_template || {};
  const checklist = buildChecklistFromContentItemTemplate(service);
  const tag =
    String(service.offering_key || service.slug || profile.itemLabel || 'item')
      .trim() || 'item';

  return {
    agencyId,
    clientId,
    customerId: clientId,
    serviceId: service.id,
    cyclePlanId: cyclePlan.id,
    cycleId: cyclePlan.id,
    title:
      String(title || '').trim() ||
      tpl.title ||
      `Novo ${profile.itemLabel || 'item'}`,
    description: tpl.description || '',
    type: tpl.type || 'creative',
    status: 'todo',
    priority: tpl.priority || 'medium',
    estimatedHours: tpl.estimated_hours || null,
    checklist,
    tags: [tag],
    progress: 0,
    assigneeId: ownerId || null,
    assignedTo: ownerId || null,
  };
}

/**
 * Cria uma unidade (task + checklist do template) no ciclo do serviço.
 */
export async function createServiceUnitTask({
  agencyId,
  clientId,
  service: serviceOrId,
  title,
  ownerId = null,
  startDate = todayYmd(),
} = {}) {
  const service = await loadService(serviceOrId);
  const profile = getServiceOperationProfile(service);

  const { cyclePlan, created: cycleCreated } = await ensureServiceOperationalCycle({
    agencyId,
    clientId,
    service,
    startDate,
    ownerId,
  });

  const payload = buildUnitTaskPayload({
    agencyId,
    clientId,
    service,
    cyclePlan,
    title,
    ownerId,
    profile,
  });

  const task = await Task.create(payload);
  if (!task?.id) throw new Error('Falha ao criar a unidade');

  return {
    task,
    cyclePlan,
    service,
    profile,
    cycleCreated,
  };
}

/**
 * Inicia operação 1:1 (posicionamento etc.). Reutiliza task raiz se já existir.
 */
export async function startSingleProjectOperation({
  agencyId,
  clientId,
  service: serviceOrId,
  ownerId = null,
  startDate = todayYmd(),
} = {}) {
  const service = await loadService(serviceOrId);
  const profile = getServiceOperationProfile(service);

  const existingTasks = await Task.filter({
    agencyId,
    clientId,
    serviceId: service.id,
  }).catch(() => []);
  const roots = (Array.isArray(existingTasks) ? existingTasks : []).filter(
    (t) =>
      t?.id &&
      !t.parentTaskId &&
      !t.parent_task_id &&
      !t.parentId &&
      !['cancelled', 'canceled'].includes(String(t.status || ''))
  );

  if (roots.length > 0) {
    const main = roots.sort((a, b) => {
      const ad = new Date(a.created_date || a.createdAt || 0).getTime();
      const bd = new Date(b.created_date || b.createdAt || 0).getTime();
      return ad - bd;
    })[0];
    return {
      task: main,
      cyclePlan: main.cyclePlanId
        ? await CyclePlan.get(main.cyclePlanId).catch(() => null)
        : null,
      service,
      profile,
      alreadyStarted: true,
    };
  }

  const result = await createServiceUnitTask({
    agencyId,
    clientId,
    service,
    title: getServiceDisplayName(service),
    ownerId,
    startDate,
  });

  return { ...result, alreadyStarted: false };
}

export default createServiceUnitTask;
