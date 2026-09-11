/**
 * Fase 1 — Modelo Ideia (unidade de campanha) sobre Brief legado.
 * Spec: docs/SPEC_CAMPANHA_DADOS_FASE1.md
 *
 * Storage continua `brief_kind: 'campanha_mensal'`.
 * UX/produto: Ideia (não “briefing mensal”).
 */

export const BRIEF_KIND_CAMPANHA_MENSAL = 'campanha_mensal';

/** Kind de produto (não é campo DB obrigatório). */
export const UX_KIND_CAMPANHA = 'campanha';

export const EMPTY_IDEIA = Object.freeze({
  titulo: '',
  conceito: '',
  mecanismo: '',
  foco: '',
  ciclo: '',
});

function asString(v) {
  if (v == null) return '';
  return String(v).trim();
}

function firstNonEmpty(...values) {
  for (const v of values) {
    const s = asString(v);
    if (s) return s;
  }
  return '';
}

/**
 * @param {object | null | undefined} brief
 */
export function isCampanhaUnitBrief(brief) {
  if (!brief || typeof brief !== 'object') return false;
  const kind = asString(brief.brief_kind || brief.briefKind);
  if (kind === BRIEF_KIND_CAMPANHA_MENSAL) return true;
  // Heurística: docs antigos sem brief_kind mas com ficha mensal
  if (kind) return false;
  return Boolean(
    brief.nome_campanha ||
      brief.ciclo_comercial ||
      brief.acoes_comerciais ||
      brief.ideia
  );
}

/**
 * Ciclo operacional ligado ao documento (CyclePlan id).
 * @param {object | null | undefined} brief
 */
export function getCampanhaCycleId(brief) {
  return (
    firstNonEmpty(brief?.ciclo_id, brief?.cycleId, brief?.cyclePlanId) || null
  );
}

/**
 * Lê bloco aninhado `ideia` se existir; senão espelha campos flat do Brief.
 * @param {object | null | undefined} brief
 * @returns {{ titulo: string, conceito: string, mecanismo: string, foco: string, ciclo: string }}
 */
export function ideiaFromBrief(brief) {
  const nested = brief?.ideia && typeof brief.ideia === 'object' ? brief.ideia : null;
  const dims = brief?.dimensoes_anual || brief?._meta?.dimensoes || null;
  const conceitoDim = dims?.['02_conceito'] || null;

  return {
    titulo: firstNonEmpty(
      nested?.titulo,
      brief?.nome_campanha,
      brief?.title,
      conceitoDim?.nome
    ),
    conceito: firstNonEmpty(
      nested?.conceito,
      brief?.objetivo,
      brief?.objectives,
      conceitoDim?.ideia_central,
      conceitoDim?.mensagem,
      brief?.resumo_executivo
    ),
    mecanismo: firstNonEmpty(
      nested?.mecanismo,
      brief?.acoes_comerciais,
      brief?.business_context,
      conceitoDim?.mensagem
    ),
    foco: firstNonEmpty(
      nested?.foco,
      brief?.linha_focal,
      brief?.produto_focal,
      dims?.['01_estrategia']?.produto_focal
    ),
    ciclo: firstNonEmpty(
      nested?.ciclo,
      brief?.ciclo_final,
      brief?.ciclo_comercial,
      brief?.ciclo_plano,
      dims?.['01_estrategia']?.ciclo_comercial
    ),
  };
}

/**
 * Campos operacionais que NÃO são a Ideia, mas ainda moram no mesmo Brief.
 * @param {object | null | undefined} brief
 */
export function operacaoFromBrief(brief) {
  return {
    talento_locacao: asString(brief?.talento_locacao),
    data_gravacao_inicio: brief?.data_gravacao_inicio || null,
    data_gravacao_fim: brief?.data_gravacao_fim || null,
    tipo_campanha: asString(brief?.tipo_campanha) || '5_videos',
    publico_alvo: asString(brief?.publico_alvo || brief?.company_profile),
    tom_brand: asString(brief?.tom_brand || brief?.communication_preferences),
    orcamento: Number(brief?.orcamento) || 0,
    formato: brief?.formato || null,
  };
}

/**
 * Unidade de campanha normalizada para Hub / Workspace (Fase 1+).
 * @param {object | null | undefined} brief
 */
export function normalizeCampanhaUnit(brief) {
  if (!brief || typeof brief !== 'object') return null;

  const ideia = ideiaFromBrief(brief);
  const historico = Array.isArray(brief.historico) ? brief.historico : [];

  return {
    id: brief.id || null,
    agencyId: brief.agencyId || null,
    clientId: brief.clientId || brief.projectId || null,
    serviceId: brief.serviceId || null,
    cycleId: getCampanhaCycleId(brief),
    empresaId: brief.empresaId || null,
    annualPlanId: brief.annualPlanId || null,
    mes: brief.mes != null ? Number(brief.mes) : null,
    ano: brief.ano != null ? Number(brief.ano) : null,
    /** Storage legado — não usar como label de UI */
    brief_kind: BRIEF_KIND_CAMPANHA_MENSAL,
    ux_kind: UX_KIND_CAMPANHA,
    clientVisible: brief.clientVisible === true,
    modo_criacao: asString(brief.modo_criacao) || null,
    status_campanha: asString(brief.status_campanha) || null,
    ideia,
    operacao: operacaoFromBrief(brief),
    historico,
    /** Título de lista (Hub) */
    label: ideia.titulo || 'Campanha',
  };
}

/**
 * Patch para Brief.update / create: escreve nested `ideia` + flat legado (compat).
 * @param {Partial<typeof EMPTY_IDEIA>} ideia
 * @param {{ includeTitle?: boolean }} [opts]
 */
export function briefPatchFromIdeia(ideia = {}, opts = {}) {
  const includeTitle = opts.includeTitle !== false;
  const next = {
    titulo: asString(ideia.titulo),
    conceito: asString(ideia.conceito),
    mecanismo: asString(ideia.mecanismo),
    foco: asString(ideia.foco),
    ciclo: asString(ideia.ciclo),
  };

  const patch = {
    ideia: next,
    objetivo: next.conceito,
    objectives: next.conceito,
    acoes_comerciais: next.mecanismo,
    business_context: next.mecanismo,
    linha_focal: next.foco || null,
    ciclo_comercial: next.ciclo || null,
    ciclo_final: next.ciclo || null,
    ux_kind: UX_KIND_CAMPANHA,
    brief_kind: BRIEF_KIND_CAMPANHA_MENSAL,
    editado_em: new Date().toISOString(),
  };

  if (includeTitle && next.titulo) {
    patch.nome_campanha = next.titulo;
    patch.title = next.titulo;
  }

  return patch;
}

/**
 * Mescla Ideia no form legado de create (`EMPTY_CAMPANHA_FORM`).
 * @param {object} form
 * @param {Partial<typeof EMPTY_IDEIA>} ideia
 */
export function mergeIdeiaIntoCampanhaForm(form = {}, ideia = {}) {
  const i = ideiaFromBrief({ ...form, ideia, nome_campanha: ideia.titulo ?? form.nome_campanha });
  return {
    ...form,
    nome_campanha: i.titulo || form.nome_campanha || '',
    objetivo: i.conceito || form.objetivo || '',
    acoes_comerciais: i.mecanismo || form.acoes_comerciais || '',
    linha_focal: i.foco || form.linha_focal || '',
    ciclo_comercial: i.ciclo || form.ciclo_comercial || '',
    ciclo_final: i.ciclo || form.ciclo_final || form.ciclo_comercial || '',
  };
}

/**
 * Anexa bloco `ideia` ao payload de create (forward-compat).
 * @param {object} payload - retorno de buildCampanhaBriefPayload
 */
export function attachIdeiaToCampanhaPayload(payload) {
  if (!payload || typeof payload !== 'object') return payload;
  const ideia = ideiaFromBrief(payload);
  return {
    ...payload,
    ideia,
    ux_kind: UX_KIND_CAMPANHA,
  };
}
