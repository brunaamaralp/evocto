import { Brief, Profile } from '@/api/entities';
import { NotificationService } from '@/components/notifications/NotificationService';
import { configFromEmpresa, normalizeFormato } from '@/lib/empresaConfig';

export const EMPTY_CAMPANHA_FORM = {
  nome_campanha: '',
  objetivo: '',
  acoes_comerciais: '',
  talento_locacao: '',
  data_gravacao_inicio: '',
  data_gravacao_fim: '',
};

export function validateCampanhaForm(form) {
  const errors = {};
  if (!String(form.nome_campanha || '').trim()) errors.nome_campanha = 'Obrigatório';
  if (!String(form.objetivo || '').trim()) errors.objetivo = 'Obrigatório';
  if (!String(form.acoes_comerciais || '').trim()) errors.acoes_comerciais = 'Obrigatório';
  if (!String(form.talento_locacao || '').trim()) errors.talento_locacao = 'Obrigatório';
  if (!String(form.data_gravacao_inicio || '').trim()) {
    errors.data_gravacao_inicio = 'Data início obrigatória';
  }
  if (!String(form.data_gravacao_fim || '').trim()) {
    errors.data_gravacao_fim = 'Data fim obrigatória';
  }
  if (
    form.data_gravacao_inicio &&
    form.data_gravacao_fim &&
    form.data_gravacao_fim < form.data_gravacao_inicio
  ) {
    errors.data_gravacao_fim = 'Data fim deve ser ≥ início';
  }
  return { valid: Object.keys(errors).length === 0, errors };
}

export function isCampanhaFormComplete(form) {
  return validateCampanhaForm(form).valid;
}

/**
 * Monta payload do Brief com herança da empresa + overrides do mês.
 */
export function buildCampanhaBriefPayload({
  agencyId,
  clientId,
  empresa,
  campanhaForm,
  configOverride = null,
  modo_criacao = 'formulario',
  cicloId = null,
  userId = null,
  texto_livre = null,
}) {
  const inherited = configFromEmpresa(empresa) || {
    publico_alvo: '',
    formato: normalizeFormato({}),
    orcamento: 0,
    tom_brand: '',
  };

  const config = {
    publico_alvo: configOverride?.publico_alvo ?? inherited.publico_alvo,
    formato: normalizeFormato(configOverride?.formato || inherited.formato),
    orcamento: Number(configOverride?.orcamento ?? inherited.orcamento) || 0,
    tom_brand: configOverride?.tom_brand ?? inherited.tom_brand,
  };

  const overrideApplied = Boolean(
    configOverride &&
      (configOverride.publico_alvo != null ||
        configOverride.formato != null ||
        configOverride.orcamento != null ||
        configOverride.tom_brand != null)
  );

  return {
    agencyId,
    clientId,
    projectId: clientId,
    empresaId: empresa?.id || null,
    ciclo_id: cicloId,
    title: String(campanhaForm.nome_campanha || '').trim(),
    status: 'READY',
    // Campos únicos
    nome_campanha: String(campanhaForm.nome_campanha || '').trim(),
    objetivo: String(campanhaForm.objetivo || '').trim(),
    acoes_comerciais: String(campanhaForm.acoes_comerciais || '').trim(),
    talento_locacao: String(campanhaForm.talento_locacao || '').trim(),
    data_gravacao_inicio: campanhaForm.data_gravacao_inicio || null,
    data_gravacao_fim: campanhaForm.data_gravacao_fim || null,
    // Herdados / override do mês
    publico_alvo: config.publico_alvo,
    formato: config.formato,
    orcamento: config.orcamento,
    tom_brand: config.tom_brand,
    config_override_mes: overrideApplied,
    // Compat com score/hub legado
    objectives: String(campanhaForm.objetivo || '').trim(),
    business_context: String(campanhaForm.acoes_comerciais || '').trim(),
    company_profile: config.publico_alvo,
    budget_expectations: String(config.orcamento),
    communication_preferences: config.tom_brand,
    timeline_expectations: `${campanhaForm.data_gravacao_inicio || ''} → ${campanhaForm.data_gravacao_fim || ''}`,
    completion_score: 100,
    // Metadata
    brief_kind: 'campanha_mensal',
    modo_criacao,
    status_campanha: 'rápido',
    texto_livre: texto_livre || null,
    criado_por: userId || null,
    criado_em: new Date().toISOString(),
    editado_em: null,
    historico: [
      {
        data: new Date().toISOString(),
        usuario: userId,
        acao: 'create',
        campo: null,
        antes: null,
        depois: null,
      },
    ],
  };
}

export async function saveCampanhaBriefing(args) {
  const payload = buildCampanhaBriefPayload(args);
  const { valid, errors } = validateCampanhaForm(args.campanhaForm);
  if (!valid) {
    const err = new Error('Validação do briefing falhou');
    err.errors = errors;
    throw err;
  }
  return Brief.create(payload);
}

/**
 * Notifica equipe (prioriza perfis com nome "Duda") sobre novo briefing.
 */
export async function notifyNovoBriefing({
  agencyId,
  briefing,
  empresaNome,
  actorUserId,
}) {
  if (!agencyId || !briefing?.id) return [];

  let recipients = [];
  try {
    const profiles = await Profile.filter({ agencyId }).catch(() => []);
    const duda = (profiles || []).filter((p) =>
      /duda/i.test(`${p.name || ''} ${p.full_name || ''} ${p.email || ''}`)
    );
    recipients = duda.length
      ? duda
      : (profiles || []).filter((p) => p.role !== 'client' && p.id !== actorUserId);
  } catch {
    recipients = [];
  }

  const nome = briefing.nome_campanha || briefing.title || 'Campanha';
  const empresa = empresaNome || 'Cliente';
  const href = `/client-briefing?clientId=${briefing.clientId}&briefingId=${briefing.id}`;

  const created = [];
  for (const profile of recipients) {
    const userId = profile.userId || profile.id;
    if (!userId || userId === actorUserId) continue;
    try {
      const n = await NotificationService.createNotification({
        userId,
        agencyId,
        type: 'novo_briefing',
        subject: 'briefing',
        title: `Novo briefing: ${nome} (${empresa})`,
        context: 'Campanha mensal criada',
        href,
        severity: 'info',
        metadata: {
          briefingId: briefing.id,
          clientId: briefing.clientId,
          empresaId: briefing.empresaId,
        },
        dedupKey: `novo_briefing:${briefing.id}:${userId}`,
      });
      created.push(n);
    } catch (err) {
      console.warn('Falha ao notificar:', err?.message || err);
    }
  }
  return created;
}
