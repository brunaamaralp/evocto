/**
 * Briefing inicial: Empresa + insumos do plano anual (ciclos/seeds).
 * Pode ser preenchido pelo cliente (link) ou pela equipe.
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
  DEFAULT_CICLOS_COMERCIAIS,
  buildBriefingsMesSeeds,
  buildCampanhaAnualBriefPayload,
  normalizeCiclosComerciais,
  normalizeMesInicio,
  normalizeProdutosLinhas,
  validateCiclosComerciais,
} from '@/lib/campanhaAnualSchema';

export const BRIEF_KIND_INICIAL = 'briefing_inicial';

export function emptyBriefingInicialForm(clientName = '') {
  const now = new Date();
  const mes_inicio = now.getMonth() + 1;
  const ciclos = normalizeCiclosComerciais(DEFAULT_CICLOS_COMERCIAIS);
  return {
    empresa: {
      ...EMPTY_EMPRESA_FORM,
      nome: clientName || '',
      formato_padrao: { ...EMPTY_EMPRESA_FORM.formato_padrao },
      produtos_linhas: [],
    },
    ano: now.getFullYear(),
    mes_inicio,
    ciclos_comerciais: ciclos,
    briefings_mes: buildBriefingsMesSeeds(ciclos, [], mes_inicio),
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

  const ciclos = normalizeCiclosComerciais(
    raw.ciclos_comerciais || base.ciclos_comerciais
  );
  const mes_inicio = normalizeMesInicio(
    raw.mes_inicio ?? raw.mesInicio,
    raw.mes_inicio == null && raw.mesInicio == null ? base.mes_inicio : base.mes_inicio
  );

  return {
    empresa,
    ano: Number(raw.ano) || base.ano,
    mes_inicio,
    ciclos_comerciais: ciclos,
    briefings_mes: buildBriefingsMesSeeds(
      ciclos,
      raw.briefings_mes || base.briefings_mes,
      mes_inicio
    ),
  };
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

  const cic = validateCiclosComerciais(n.ciclos_comerciais, { requireFullYear: true });
  if (!cic.valid) Object.assign(errors, cic.errors);

  if (!n.ano || n.ano < 2020 || n.ano > 2100) errors.ano = 'Ano inválido';
  if (!n.mes_inicio || n.mes_inicio < 1 || n.mes_inicio > 12) {
    errors.mes_inicio = 'Mês de início inválido';
  }

  return { valid: Object.keys(errors).length === 0, errors, value: n };
}

export function isBriefingInicialFormComplete(form) {
  return validateBriefingInicialForm(form).valid;
}

/**
 * Monta payload do Brief campanha_anual a partir do form do briefing inicial.
 * @param {'publico'|'equipe'} [origem='publico']
 */
export function buildAnualPayloadFromInicial({
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
  return buildCampanhaAnualBriefPayload({
    agencyId,
    clientId,
    empresa,
    ano: n.ano,
    mes_inicio: n.mes_inicio,
    ciclos_comerciais: n.ciclos_comerciais,
    briefings_mes: n.briefings_mes,
    userId,
    existing: {
      ...(existing || {}),
      brief_kind: BRIEF_KIND_ANUAL,
      is_public_briefing: fromPublic,
      origem_briefing_inicial: true,
      origem_preenchimento: fromPublic ? 'publico' : 'equipe',
    },
  });
}

/**
 * Salva briefing inicial pela equipe (sem token público).
 * Cria/atualiza Empresa + Brief campanha_anual.
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
    throw new Error('agencyId e clientId obrigatórios');
  }

  let n;
  if (!draft) {
    const { valid, errors, value } = validateBriefingInicialForm(form);
    if (!valid) {
      const err = new Error('Preencha os campos obrigatórios');
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
      'Para rascunho, preencha ao menos nome, público, tom, orçamento e um produto'
    );
  }

  let existing = existingBrief;
  if (!existing && briefingId) {
    existing = await Brief.get(briefingId).catch(() => null);
  }
  if (!existing) {
    const list = await Brief.filter({ agencyId, clientId }).catch(() => []);
    existing =
      (list || []).find(
        (b) =>
          b.brief_kind === BRIEF_KIND_ANUAL &&
          (b.origem_briefing_inicial || b.status_anual === 'rascunho')
      ) ||
      (list || []).find((b) => b.brief_kind === BRIEF_KIND_ANUAL) ||
      null;
  }

  const payload = buildAnualPayloadFromInicial({
    agencyId,
    clientId,
    empresa,
    form: n,
    userId,
    existing,
    origem: 'equipe',
  });

  payload.status = draft ? 'DRAFT' : payload.status || 'DRAFT';
  payload.status_anual = draft ? 'rascunho' : 'input_pronto';
  payload.completion_score = draft ? 40 : 60;
  payload.origem_briefing_inicial = true;
  payload.origem_preenchimento = 'equipe';
  payload.is_public_briefing = Boolean(existing?.is_public_briefing);
  payload.editado_em = new Date().toISOString();

  const brief = existing?.id
    ? await Brief.update(existing.id, payload)
    : await Brief.create(payload);

  if (!draft) {
    await Client.update(clientId, {
      ultimo_briefing_id: brief.id,
      ultimo_briefing_campanha: `Plano anual ${n.ano}`,
      ultimo_briefing_em: new Date().toISOString(),
      ultimo_briefing_objetivo: 'Briefing inicial (equipe)',
    }).catch(() => null);
  }

  return { empresa, brief, form: n };
}
