import { Brief, Service } from '@/api/entities';
import { createMonthCycle } from '@/api/functions/createMonthCycle';
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
 * Após salvar o briefing mensal: cria/reusa serviço + CyclePlan + tarefas,
 * e vincula o Brief ao ciclo (caminho dourado Nova campanha).
 *
 * O vínculo brief ↔ ciclo é obrigatório: falha se o ciclo não for criado
 * ou se o Brief não gravar ciclo_id / cycleId / cyclePlanId.
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

  const serviceName = resolvedServiceId
    ? undefined
    : `${empresaNome || campaignName} — ${campaignName}`;

  const cycleResult = await createMonthCycle({
    agencyId,
    clientId,
    startDate,
    serviceId: resolvedServiceId || undefined,
    serviceName,
    title: campaignName,
    generateTasks,
    ownerId: userId,
    pipeline: 'narrativa',
    tipo_campanha,
    ciclo_comercial,
    linha_focal,
    briefId: briefing.id,
  });

  const cyclePlan = cycleResult?.cyclePlan || null;
  const cyclePlanId = cyclePlan?.id || null;
  const createdServiceId = cycleResult?.service?.id || resolvedServiceId || null;

  if (!cyclePlanId) {
    throw new Error('Ciclo operacional não foi criado para a campanha');
  }

  let updatedBrief;
  try {
    updatedBrief = await Brief.update(briefing.id, {
      ciclo_id: cyclePlanId,
      cycleId: cyclePlanId,
      cyclePlanId,
      serviceId: createdServiceId,
      status_campanha: generateTasks ? 'em_execucao' : briefing.status_campanha || 'rápido',
      editado_em: new Date().toISOString(),
    });
  } catch (err) {
    console.error('[launchCampanhaFromBrief] falha ao vincular brief ao ciclo:', err);
    throw new Error(
      err?.message ||
        'Ciclo criado, mas não foi possível vincular a campanha. Tente novamente.'
    );
  }

  if (!briefHasCycleLink(updatedBrief, cyclePlanId)) {
    // Leitura imediata: payload às vezes só confirma no get
    const fresh = await Brief.get(briefing.id).catch(() => null);
    if (!briefHasCycleLink(fresh, cyclePlanId)) {
      throw new Error(
        'Ciclo criado, mas o vínculo com a campanha não foi persistido. Tente novamente.'
      );
    }
    updatedBrief = fresh;
  }

  return {
    success: true,
    briefing: updatedBrief || briefing,
    cyclePlan,
    service: cycleResult?.service || null,
    tasksCreated: cycleResult?.tasksCreated || 0,
    tasks: cycleResult?.tasks || [],
    tipo_campanha,
    ciclo_comercial,
    linha_focal,
    startDate,
  };
}

export default launchCampanhaFromBrief;
