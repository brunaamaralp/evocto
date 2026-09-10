import { Brief, Service } from '@/api/entities';
import {
  ensureClientMonthCycle,
  generateCampaignTasksOnCycle,
} from '@/lib/clientMonthCycle';
import {
  inferTipoCampanhaFromText,
  normalizeCicloComercialOps,
  normalizeTipoCampanha,
} from '@/lib/tipoCampanhaPipeline';

function todayYmd() {
  return new Date().toISOString().slice(0, 10);
}

function briefHasCycleLink(brief, cyclePlanId) {
  if (!brief || !cyclePlanId) return false;
  const id = String(cyclePlanId);
  return [brief.ciclo_id, brief.cycleId, brief.cyclePlanId]
    .filter(Boolean)
    .some((v) => String(v) === id);
}

/**
 * Lança campanha no ciclo do cliente/mês.
 * - Reutiliza o ciclo do mês se já existir
 * - Só cria um ciclo novo se o mês ainda não tiver
 * - Gera tarefas da campanha dentro desse ciclo
 */
export async function launchCampanhaFromBrief({
  briefing,
  agencyId,
  clientId,
  userId = null,
  generateTasks = true,
  serviceId = null,
  empresaNome = null,
} = {}) {
  if (!briefing?.id) throw new Error('Briefing da campanha é obrigatório');
  if (!agencyId) throw new Error('agencyId é obrigatório');
  if (!clientId) throw new Error('clientId é obrigatório');

  const startDate =
    String(briefing.data_gravacao_inicio || '').slice(0, 10) || todayYmd();

  const tipo_campanha = normalizeTipoCampanha(
    briefing.tipo_campanha ||
      inferTipoCampanhaFromText(
        briefing.objetivo,
        briefing.acoes_comerciais,
        briefing.talento_locacao,
        briefing.nome_campanha
      )
  );
  const ciclo_comercial = normalizeCicloComercialOps(briefing.ciclo_comercial);
  const linha_focal = briefing.linha_focal || '';
  const campaignName = briefing.nome_campanha || briefing.title || 'Campanha';

  let resolvedServiceId = serviceId || briefing.serviceId || null;
  if (!resolvedServiceId) {
    const list = await Service.filter({
      agencyId,
      clientId,
      is_template: false,
    }).catch(() => []);
    const active = (Array.isArray(list) ? list : []).find(
      (s) => s?.is_active !== false && s?.id
    );
    resolvedServiceId = active?.id || null;
  }

  const ensured = await ensureClientMonthCycle({
    agencyId,
    clientId,
    startDate,
    serviceId: resolvedServiceId || undefined,
    ownerId: userId,
    empresaNome,
  });

  let cyclePlan = ensured.cyclePlan;
  let service = ensured.service;

  if (!cyclePlan?.id) {
    throw new Error('Ciclo operacional do mês não disponível');
  }

  if (!service?.id && cyclePlan.serviceId) {
    service = await Service.get(cyclePlan.serviceId).catch(() => null);
  }
  if (!service?.id && resolvedServiceId) {
    service = await Service.get(resolvedServiceId).catch(() => null);
  }
  if (!service?.id) {
    throw new Error('Serviço do ciclo do mês não encontrado');
  }

  let tasks = [];
  let tasksCreated = 0;

  if (generateTasks) {
    const generated = await generateCampaignTasksOnCycle({
      agencyId,
      cyclePlan,
      service,
      briefing,
      startDate,
      ownerId: userId,
      tipo_campanha,
      ciclo_comercial,
      linha_focal,
    });
    tasks = generated.tasks || [];
    tasksCreated = generated.tasksCreated || 0;
    cyclePlan = generated.cyclePlan || cyclePlan;
  }

  let updatedBrief;
  try {
    updatedBrief = await Brief.update(briefing.id, {
      ciclo_id: cyclePlan.id,
      cycleId: cyclePlan.id,
      cyclePlanId: cyclePlan.id,
      serviceId: service.id,
      status_campanha: generateTasks ? 'em_execucao' : briefing.status_campanha || 'rápido',
      editado_em: new Date().toISOString(),
    });
  } catch (err) {
    console.error('[launchCampanhaFromBrief] falha ao vincular brief ao ciclo:', err);
    throw new Error(
      err?.message ||
        'Ciclo disponível, mas não foi possível vincular a campanha. Tente novamente.'
    );
  }

  if (!briefHasCycleLink(updatedBrief, cyclePlan.id)) {
    const fresh = await Brief.get(briefing.id).catch(() => null);
    if (!briefHasCycleLink(fresh, cyclePlan.id)) {
      throw new Error(
        'O vínculo da campanha com o ciclo do mês não foi persistido. Tente novamente.'
      );
    }
    updatedBrief = fresh;
  }

  return {
    success: true,
    briefing: updatedBrief || briefing,
    cyclePlan,
    service,
    tasksCreated,
    tasks,
    tipo_campanha,
    ciclo_comercial,
    linha_focal,
    startDate,
    cycleReused: !ensured.created,
    cycleTitle: ensured.title || cyclePlan.title || cyclePlan.cyclePeriod,
    campaignName,
  };
}

export default launchCampanhaFromBrief;
