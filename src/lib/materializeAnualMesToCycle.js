import { Brief, CyclePlan } from '@/api/entities';
import { createMonthCycle } from '@/api/functions/createMonthCycle';
import { saveCampanhaBriefing } from '@/lib/campanhaBriefing';
import {
  mapAnualMesToCampanhaMensalForm,
  normalizeCampanhaAnualPayload,
  normalizeCampanhaMesGerada,
  summarizeAnualProgress,
} from '@/lib/campanhaAnualSchema';
import {
  inferTipoCampanhaFromText,
  normalizeCicloComercialOps,
  normalizeTipoCampanha,
} from '@/lib/tipoCampanhaPipeline';

/**
 * Materializa 1 mês do plano anual → briefing mensal + CyclePlan Narrativa.
 */
export async function materializeAnualMesToCycle({
  briefingId,
  campanhaMes,
  existingPayload,
  agencyId,
  clientId,
  empresa,
  ano,
  userId,
  startDate,
  generateTasks = true,
  tipo_campanha: tipoOverride = null,
} = {}) {
  if (!briefingId || !clientId || !agencyId || !empresa?.id) {
    throw new Error('Salve o plano e configure a empresa antes de materializar');
  }

  const c = normalizeCampanhaMesGerada(campanhaMes);
  const form = mapAnualMesToCampanhaMensalForm(c, { ano });

  if (!form.data_gravacao_inicio || !form.data_gravacao_fim) {
    const y = Number(ano) || new Date().getFullYear();
    const m = String(c.mes).padStart(2, '0');
    form.data_gravacao_inicio = `${y}-${m}-01`;
    form.data_gravacao_fim = `${y}-${m}-10`;
  }
  if (!form.talento_locacao) form.talento_locacao = 'A definir';

  const ciclo_comercial = normalizeCicloComercialOps(
    form._meta?.ciclo_comercial || c.ciclo_comercial
  );
  const linha_focal = form._meta?.produto_focal || c.produto_focal || '';
  const tipo_campanha = normalizeTipoCampanha(
    tipoOverride ||
      inferTipoCampanhaFromText(
        form.objetivo,
        form.acoes_comerciais,
        form.talento_locacao,
        c.resumo_executivo,
        JSON.stringify(c['07_producao'] || {})
      )
  );

  form.tipo_campanha = tipo_campanha;
  form.ciclo_comercial = ciclo_comercial;
  form.linha_focal = linha_focal;

  let brief = null;
  if (c.brief_mensal_id) {
    brief = await Brief.get(c.brief_mensal_id).catch(() => null);
  }
  if (!brief) {
    brief = await saveCampanhaBriefing({
      agencyId,
      clientId,
      empresa,
      campanhaForm: form,
      modo_criacao: 'materializado_anual',
      userId,
      annualPlanId: briefingId,
      mes: c.mes,
      ano: Number(ano) || new Date().getFullYear(),
      clientVisible: false,
    });
  } else {
    // Garante link reverso para o portal (sem alterar clientVisible existente)
    brief = await Brief.update(brief.id, {
      annualPlanId: briefingId,
      mes: c.mes,
      ano: Number(ano) || brief.ano || new Date().getFullYear(),
    });
  }

  let cycleResult = null;
  if (!c.ciclo_entrega_id) {
    const cycleStart =
      startDate ||
      form.data_gravacao_inicio ||
      `${Number(ano) || new Date().getFullYear()}-${String(c.mes).padStart(2, '0')}-01`;

    cycleResult = await createMonthCycle({
      agencyId,
      clientId,
      startDate: String(cycleStart).slice(0, 10),
      pipeline: 'narrativa',
      tipo_campanha,
      ciclo_comercial,
      linha_focal,
      generateTasks,
      ownerId: userId,
      serviceName: `${empresa.nome || 'Cliente'} — ${form.nome_campanha}`,
      briefId: brief.id,
    });
  } else {
    cycleResult = {
      cyclePlan: await CyclePlan.get(c.ciclo_entrega_id).catch(() => ({ id: c.ciclo_entrega_id })),
      service: null,
      tasksCreated: 0,
    };
  }

  const base = normalizeCampanhaAnualPayload(existingPayload || {});
  const nextCampanhas = (base.campanhas || []).map((item) => {
    const n = normalizeCampanhaMesGerada(item);
    if (n.mes !== c.mes) return n;
    return {
      ...n,
      status_mes: 'materializado',
      brief_mensal_id: brief.id,
      ciclo_entrega_id: cycleResult?.cyclePlan?.id || n.ciclo_entrega_id,
      service_id: cycleResult?.service?.id || n.service_id || null,
      tipo_campanha,
    };
  });

  const progress = summarizeAnualProgress({ ...base, campanhas: nextCampanhas });
  const status_anual = progress.materializado >= 12 ? 'aprovado' : 'aprovado_parcial';

  const updated = await Brief.update(briefingId, {
    ...base,
    campanhas: nextCampanhas,
    status_anual,
    editado_em: new Date().toISOString(),
  });

  return {
    success: true,
    briefingMensal: brief,
    cyclePlan: cycleResult?.cyclePlan || null,
    service: cycleResult?.service || null,
    tasksCreated: cycleResult?.tasksCreated || 0,
    anualPayload: normalizeCampanhaAnualPayload(updated),
    tipo_campanha,
    ciclo_comercial,
    linha_focal,
  };
}

/**
 * Materializa todos os meses ainda não materializados.
 */
export async function materializeAnualAllMonths(opts = {}) {
  const base = normalizeCampanhaAnualPayload(opts.existingPayload || {});
  const pending = (base.campanhas || [])
    .map((c) => normalizeCampanhaMesGerada(c))
    .filter((c) => c.status_mes !== 'materializado' && c.status_mes !== 'rejeitado');

  const results = [];
  let payload = base;
  for (const mes of pending) {
    const r = await materializeAnualMesToCycle({
      ...opts,
      campanhaMes: mes,
      existingPayload: payload,
    });
    payload = r.anualPayload;
    results.push(r);
  }
  return { success: true, count: results.length, results, anualPayload: payload };
}

export default materializeAnualMesToCycle;
