/**
 * Briefing inicial: DNA da empresa (insumo para an�lise).
 * Planejamento m�s a m�s fica no Panorama � n�o faz parte deste formul�rio.
 */
import { Brief, Client } from '@/api/entities';
import {
  EMPTY_EMPRESA_FORM,
  empresaToForm,
  getEmpresaByClientId,
  normalizeFormato,
  saveEmpresa,
  validateEmpresaForm,
} from '@/lib/empresaConfig';
import {
  BRIEF_KIND_ANUAL,
  normalizeProdutosLinhas,
} from '@/lib/campanhaAnualSchema';

export const BRIEF_KIND_INICIAL = 'briefing_inicial';

export function emptyBriefingInicialForm(clientName = '') {
  return {
    empresa: {
      ...EMPTY_EMPRESA_FORM,
      nome: clientName || '',
      formato_padrao: { ...EMPTY_EMPRESA_FORM.formato_padrao },
      produtos_linhas: [],
    },
  };
}

export function normalizeBriefingInicialForm(raw = {}, clientName = '') {
  const base = emptyBriefingInicialForm(clientName);
  const empresaRaw = raw.empresa || raw;
  const empresa = {
    ...base.empresa,
    ...empresaToForm(
      {
        nome: empresaRaw.nome,
        publico_alvo: empresaRaw.publico_alvo,
        formato_padrao: empresaRaw.formato_padrao || empresaRaw.formato,
        orcamento_padrao_mensal:
          empresaRaw.orcamento_padrao_mensal ?? empresaRaw.orcamento,
        tom_brand: empresaRaw.tom_brand,
        restricoes_criativas: empresaRaw.restricoes_criativas,
        produtos_linhas: empresaRaw.produtos_linhas,
        brand_guidelines: empresaRaw.brand_guidelines,
      },
      clientName
    ),
  };
  empresa.formato_padrao = normalizeFormato(empresa.formato_padrao);
  empresa.produtos_linhas = normalizeProdutosLinhas(empresa.produtos_linhas);

  return { empresa };
}

export function validateBriefingInicialForm(form) {
  const n = normalizeBriefingInicialForm(form);
  const errors = {};

  const emp = validateEmpresaForm(n.empresa);
  if (!emp.valid) {
    Object.assign(errors, emp.errors);
  }
  if (!(n.empresa.produtos_linhas || []).some((p) => String(p.nome || '').trim())) {
    errors.produtos_linhas = 'Cadastre ao menos uma linha/produto';
  }

  return { valid: Object.keys(errors).length === 0, errors, value: n };
}

export function isBriefingInicialFormComplete(form) {
  return validateBriefingInicialForm(form).valid;
}

/**
 * Localiza o brief de DNA / briefing inicial do cliente.
 * Prefer�ncia: briefing_inicial; legado: campanha_anual com origem_briefing_inicial.
 */
export function findBriefingInicialBrief(briefs = []) {
  const list = Array.isArray(briefs) ? briefs : [];
  return (
    list.find((b) => b?.brief_kind === BRIEF_KIND_INICIAL) ||
    list.find(
      (b) =>
        (b?.brief_kind === BRIEF_KIND_ANUAL || b?.brief_kind === 'campanha_anual') &&
        b?.origem_briefing_inicial
    ) ||
    list.find((b) => b?.origem_briefing_inicial) ||
    null
  );
}

/**
 * @returns {{ status: 'missing' | 'draft' | 'ready', brief: object | null, label: string }}
 */
export function resolveBriefingInicialStatus(briefs = []) {
  const brief = findBriefingInicialBrief(briefs);
  if (!brief) {
    return { status: 'missing', brief: null, label: 'N�o preenchido' };
  }
  const annual = String(brief.status_anual || '').toLowerCase();
  const status = String(brief.status || '').toUpperCase();
  const isExplicitDraft = annual === 'rascunho' || status === 'DRAFT';
  const isExplicitReady =
    status === 'READY' ||
    status === 'COMPLETED' ||
    annual === 'input_pronto' ||
    annual === 'pronto' ||
    annual === 'concluido';

  if (isExplicitReady) {
    return { status: 'ready', brief, label: 'Preenchido' };
  }
  if (isExplicitDraft) {
    return { status: 'draft', brief, label: 'Rascunho' };
  }
  return { status: 'ready', brief, label: 'Preenchido' };
}

/** Notifica p�ginas do hub para recarregar briefs ap�s salvar. */
export function dispatchBriefingUpdated(clientId) {
  if (typeof window === 'undefined' || !clientId) return;
  window.dispatchEvent(
    new CustomEvent('brief:updated', { detail: { clientId: String(clientId) } })
  );
}

/** Rota can�nica do editor de briefing inicial (sem hub intermedi�rio). */
export function buildBriefingInicialHref(clientId, { briefingId = null } = {}) {
  const id = String(clientId || '').trim();
  if (!id) return 'briefing-inicial';
  const params = new URLSearchParams();
  params.set('clientId', id);
  if (briefingId) params.set('briefingId', String(briefingId));
  return `briefing-inicial?${params.toString()}`;
}

/** Progresso do formul�rio p�blico/interno (para progressData do token). */
export function countInicialProgress(form) {
  const n = normalizeBriefingInicialForm(form);
  let done = 0;
  const total = 5;
  if (String(n.empresa.nome || '').trim()) done += 1;
  if (String(n.empresa.publico_alvo || '').trim()) done += 1;
  if (String(n.empresa.tom_brand || '').trim()) done += 1;
  if (Number(n.empresa.orcamento_padrao_mensal) > 0) done += 1;
  if ((n.empresa.produtos_linhas || []).some((p) => p.nome)) done += 1;
  return { done, total };
}

/**
 * Payload do Brief briefing_inicial (DNA da empresa � sem plano anual).
 * @param {'publico'|'equipe'} [origem='publico']
 */
export function buildBriefingInicialBriefPayload({
  agencyId,
  clientId,
  empresa,
  form,
  userId = null,
  existing = null,
  origem = 'publico',
}) {
  const n = normalizeBriefingInicialForm(form);
  const fromPublic = origem === 'publico';
  const nome =
    String(empresa?.nome || n.empresa?.nome || '').trim() || 'Cliente';
  const empSnap = {
    nome: n.empresa.nome,
    publico_alvo: n.empresa.publico_alvo,
    tom_brand: n.empresa.tom_brand,
    orcamento_padrao_mensal: n.empresa.orcamento_padrao_mensal,
    formato_padrao: n.empresa.formato_padrao,
    restricoes_criativas: n.empresa.restricoes_criativas,
    produtos_linhas: n.empresa.produtos_linhas,
    brand_guidelines: n.empresa.brand_guidelines || null,
  };

  return {
    ...(existing || {}),
    agencyId,
    clientId,
    projectId: clientId,
    empresaId: empresa?.id || existing?.empresaId || null,
    brief_kind: BRIEF_KIND_INICIAL,
    title: `Briefing inicial � ${nome}`,
    status: existing?.status || 'DRAFT',
    objectives: 'Briefing inicial da empresa',
    business_context:
      'DNA da marca � an�lise pr�via antes do planejamento m�s a m�s',
    company_profile: empSnap.publico_alvo || '',
    budget_expectations: String(empSnap.orcamento_padrao_mensal || ''),
    communication_preferences: empSnap.tom_brand || '',
    produtos_snapshot: empSnap.produtos_linhas || [],
    empresa_snapshot: empSnap,
    origem_briefing_inicial: true,
    origem_preenchimento: fromPublic ? 'publico' : 'equipe',
    is_public_briefing: Boolean(existing?.is_public_briefing) || fromPublic,
    editado_em: new Date().toISOString(),
    updated_by: userId || existing?.updated_by || null,
  };
}

/** @deprecated Use buildBriefingInicialBriefPayload � briefing n�o cria plano anual. */
export function buildAnualPayloadFromInicial(args) {
  return buildBriefingInicialBriefPayload(args);
}

/**
 * Salva briefing inicial pela equipe (sem token p�blico).
 * Cria/atualiza Empresa + Brief briefing_inicial.
 */
export async function saveBriefingInicialInterno({
  agencyId,
  clientId,
  form,
  userId = null,
  briefingId = null,
  draft = false,
  existingBrief = null,
}) {
  if (!agencyId || !clientId) {
    throw new Error('agencyId e clientId obrigat�rios');
  }

  let n;
  if (!draft) {
    const { valid, errors, value } = validateBriefingInicialForm(form);
    if (!valid) {
      const err = new Error('Preencha os campos obrigat�rios');
      err.errors = errors;
      throw err;
    }
    n = value;
  } else {
    n = normalizeBriefingInicialForm(form);
  }

  const existingEmpresa = await getEmpresaByClientId(clientId, agencyId).catch(
    () => null
  );

  const empCheck = validateEmpresaForm(n.empresa);
  const hasProduto = (n.empresa.produtos_linhas || []).some((p) =>
    String(p.nome || '').trim()
  );

  let empresa = existingEmpresa;
  if (empCheck.valid && hasProduto) {
    empresa = await saveEmpresa({
      empresaId: existingEmpresa?.id || null,
      agencyId,
      clientId,
      form: n.empresa,
      userId,
    });
  } else if (!draft) {
    const err = new Error('Preencha os dados da empresa');
    err.errors = empCheck.errors || { produtos_linhas: 'Cadastre ao menos uma linha/produto' };
    throw err;
  } else if (!empresa?.id) {
    throw new Error(
      'Para rascunho, preencha ao menos nome, p�blico, tom, or�amento e um produto'
    );
  }

  let existing = existingBrief;
  if (!existing && briefingId) {
    existing = await Brief.get(briefingId).catch(() => null);
  }
  if (!existing) {
    const list = await Brief.filter({ agencyId, clientId }).catch(() => []);
    existing = findBriefingInicialBrief(list || []);
  }

  const payload = buildBriefingInicialBriefPayload({
    agencyId,
    clientId,
    empresa,
    form: n,
    userId,
    existing,
    origem: 'equipe',
  });

  payload.status = draft ? 'DRAFT' : 'READY';
  payload.completion_score = draft ? 40 : 100;
  payload.origem_briefing_inicial = true;
  payload.origem_preenchimento = 'equipe';
  payload.is_public_briefing = Boolean(existing?.is_public_briefing);
  payload.editado_em = new Date().toISOString();
  // Limpa v�nculo com plano anual r�gido (legado)
  delete payload.status_anual;
  delete payload.ciclos_comerciais;
  delete payload.briefings_mes;
  delete payload.mes_inicio;
  delete payload.ano;
  delete payload.campanhas;

  const brief = existing?.id
    ? await Brief.update(existing.id, payload)
    : await Brief.create(payload);

  if (!draft) {
    await Client.update(clientId, {
      ultimo_briefing_id: brief.id,
      ultimo_briefing_campanha: `Briefing inicial � ${empresa?.nome || n.empresa.nome || ''}`,
      ultimo_briefing_em: new Date().toISOString(),
      ultimo_briefing_objetivo: 'Briefing inicial (equipe)',
    }).catch(() => null);
  }

  if (!draft) {
    dispatchBriefingUpdated(clientId);
  }

  return { empresa, brief, form: n };
}
