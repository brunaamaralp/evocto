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

/**
 * Após salvar o briefing mensal: cria/reusa serviço + CyclePlan + tarefas,
 * e vincula o Brief ao ciclo (caminho dourado Nova campanha).
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

  const campaignName = briefing.nome_campanha || briefing.title || 'Campanha';
  const serviceName = resolvedServiceId
    ? undefined
    : `${empresaNome || campaignName} — ${campaignName}`;

  const cycleResult = await createMonthCycle({
    agencyId,
    clientId,
    startDate,
    serviceId: resolvedServiceId || undefined,
    serviceName,
    generateTasks,
    ownerId: userId,
    pipeline: 'narrativa',
    tipo_campanha,
    ciclo_comercial,
    linha_focal,
    briefId: briefing.id,
  });

  const cyclePlanId = cycleResult?.cyclePlan?.id || null;
  const createdServiceId = cycleResult?.service?.id || resolvedServiceId || null;

  let updatedBrief = briefing;
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
    console.warn('[launchCampanhaFromBrief] falha ao vincular brief ao ciclo:', err);
  }

  return {
    success: true,
    briefing: updatedBrief || briefing,
    cyclePlan: cycleResult?.cyclePlan || null,
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
