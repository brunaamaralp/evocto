/**
 * Briefing inicial público: Empresa + insumos do plano anual (ciclos/seeds).
 * Não cria campanha_mensal.
 */
import {
  EMPTY_EMPRESA_FORM,
  empresaToForm,
  normalizeFormato,
  validateEmpresaForm,
} from '@/lib/empresaConfig';
import {
  BRIEF_KIND_ANUAL,
  DEFAULT_CICLOS_COMERCIAIS,
  buildBriefingsMesSeeds,
  buildCampanhaAnualBriefPayload,
  normalizeCiclosComerciais,
  normalizeProdutosLinhas,
  validateCiclosComerciais,
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
    ano: new Date().getFullYear(),
    ciclos_comerciais: normalizeCiclosComerciais(DEFAULT_CICLOS_COMERCIAIS),
    briefings_mes: buildBriefingsMesSeeds(DEFAULT_CICLOS_COMERCIAIS),
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

  return {
    empresa,
    ano: Number(raw.ano) || base.ano,
    ciclos_comerciais: ciclos,
    briefings_mes: buildBriefingsMesSeeds(ciclos, raw.briefings_mes || base.briefings_mes),
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

  return { valid: Object.keys(errors).length === 0, errors, value: n };
}

export function isBriefingInicialFormComplete(form) {
  return validateBriefingInicialForm(form).valid;
}

/**
 * Monta payload do Brief campanha_anual a partir do form público.
 */
export function buildAnualPayloadFromInicial({
  agencyId,
  clientId,
  empresa,
  form,
  userId = null,
  existing = null,
}) {
  const n = normalizeBriefingInicialForm(form);
  return buildCampanhaAnualBriefPayload({
    agencyId,
    clientId,
    empresa,
    ano: n.ano,
    ciclos_comerciais: n.ciclos_comerciais,
    briefings_mes: n.briefings_mes,
    userId,
    existing: {
      ...(existing || {}),
      brief_kind: BRIEF_KIND_ANUAL,
      is_public_briefing: true,
      origem_briefing_inicial: true,
    },
  });
}

export function countInicialProgress(form) {
  const n = normalizeBriefingInicialForm(form);
  let done = 0;
  const total = 6;
  if (String(n.empresa.nome || '').trim()) done += 1;
  if (String(n.empresa.publico_alvo || '').trim()) done += 1;
  if (String(n.empresa.tom_brand || '').trim()) done += 1;
  if (Number(n.empresa.orcamento_padrao_mensal) > 0) done += 1;
  if ((n.empresa.produtos_linhas || []).some((p) => p.nome)) done += 1;
  if (validateCiclosComerciais(n.ciclos_comerciais, { requireFullYear: true }).valid) {
    done += 1;
  }
  return { done, total };
}
