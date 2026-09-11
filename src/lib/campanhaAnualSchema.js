/**
 * Schema canônico do Gerador de Campanhas Anuais (9 dimensões + ciclos + produtos).
 *
 * Persistência (sem collection nova):
 * - Empresa.payload: produtos_linhas[], restricoes_criativas
 * - Brief.payload com brief_kind: 'campanha_anual'
 *
 * Ciclo comercial ≠ CyclePlan (entrega operacional).
 */

export const BRIEF_KIND_ANUAL = 'campanha_anual';

/** Calendário comercial padrão (editável no wizard) */
export const DEFAULT_CICLOS_COMERCIAIS = Object.freeze({
  autoridade: [1, 4, 6],
  vendas: [2, 5, 10, 11, 12],
  engajamento: [3, 7],
  reconhecimento: [8, 9],
});

export const CICLOS_COMERCIAIS = Object.freeze([
  'autoridade',
  'vendas',
  'engajamento',
  'reconhecimento',
]);

/** Status do artefato anual no Brief */
export const STATUS_CAMPANHA_ANUAL = Object.freeze([
  'rascunho', // input incompleto
  'input_pronto', // pronto para IA de temas
  'temas_prontos', // temas sugeridos e escolhidos
  'gerando', // chamada em andamento
  'ia_gerou', // JSON gerado, pendente review
  'revisao', // usuário editando
  'aprovado_parcial', // alguns meses materializados
  'aprovado', // 12 meses aprovados/materializados
  'erro',
]);

export const AVISO_TIPOS = Object.freeze([
  'redundancia',
  'oportunidade',
  'falta_viabilidade',
]);

export const DIMENSAO_KEYS = Object.freeze([
  '01_estrategia',
  '02_conceito',
  '03_narrativa_visual',
  '04_identidade_visual',
  '05_comunicacao',
  '06_experiencia',
  '07_producao',
  '08_ativacao',
  '09_mensuracao',
]);

const MESES = Object.freeze([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);

function asString(v, fallback = '') {
  return v == null ? fallback : String(v).trim();
}

function asNumber(v, fallback = 0) {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

function asStringArray(v) {
  if (Array.isArray(v)) return v.map((x) => asString(x)).filter(Boolean);
  if (typeof v === 'string' && v.trim()) {
    return v
      .split(/[,;\n]/)
      .map((x) => x.trim())
      .filter(Boolean);
  }
  return [];
}

function isCiclo(v) {
  return CICLOS_COMERCIAIS.includes(String(v || '').toLowerCase());
}

function normalizeCiclo(v) {
  const c = String(v || '').toLowerCase().trim();
  return isCiclo(c) ? c : '';
}

// ---------------------------------------------------------------------------
// Produto / linha (Empresa)
// ---------------------------------------------------------------------------

export const EMPTY_PRODUTO_LINHA = Object.freeze({
  id: '',
  nome: '',
  descricao: '',
  preco_faixa: { min: 0, max: 0 },
  margem: 0,
  sazonalidade: '',
  story: '',
  skus: [],
});

export function normalizePrecoFaixa(faixa = {}) {
  const min = asNumber(faixa?.min, 0);
  const max = asNumber(faixa?.max, min);
  return { min, max: max < min ? min : max };
}

export function normalizeProdutoLinha(raw = {}, index = 0) {
  const nome = asString(raw.nome);
  const id =
    asString(raw.id) ||
    (nome
      ? nome
          .toLowerCase()
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '')
          .replace(/[^a-z0-9]+/g, '_')
          .replace(/^_|_$/g, '')
      : `linha_${index + 1}`);

  return {
    id,
    nome,
    descricao: asString(raw.descricao),
    preco_faixa: normalizePrecoFaixa(raw.preco_faixa),
    margem: asNumber(raw.margem, 0),
    sazonalidade: asString(raw.sazonalidade),
    story: asString(raw.story),
    skus: asStringArray(raw.skus),
  };
}

export function normalizeProdutosLinhas(list) {
  if (!Array.isArray(list)) return [];
  return list.map((item, i) => normalizeProdutoLinha(item, i));
}

export function validateProdutoLinha(produto) {
  const errors = {};
  const p = normalizeProdutoLinha(produto);
  if (!p.nome) errors.nome = 'Nome obrigatório';
  if (p.preco_faixa.min < 0) errors.preco_min = 'Preço mínimo inválido';
  if (p.preco_faixa.max < p.preco_faixa.min) {
    errors.preco_max = 'Preço máximo deve ser ≥ mínimo';
  }
  if (p.margem < 0 || p.margem > 100) errors.margem = 'Margem deve ser 0–100';
  return { valid: Object.keys(errors).length === 0, errors, value: p };
}

export function validateProdutosLinhas(list, { required = false } = {}) {
  const produtos = normalizeProdutosLinhas(list);
  const errors = {};
  if (required && produtos.length === 0) {
    errors.produtos_linhas = 'Informe ao menos uma linha/produto';
  }
  const ids = new Set();
  produtos.forEach((p, i) => {
    const { valid, errors: pe } = validateProdutoLinha(p);
    if (!valid) errors[`produtos_linhas.${i}`] = pe;
    if (ids.has(p.id)) errors[`produtos_linhas.${i}.id`] = 'ID duplicado';
    ids.add(p.id);
  });
  return { valid: Object.keys(errors).length === 0, errors, value: produtos };
}

// ---------------------------------------------------------------------------
// Ciclos comerciais (calendário 1–12)
// ---------------------------------------------------------------------------

export function emptyCiclosComerciais() {
  return {
    autoridade: [],
    vendas: [],
    engajamento: [],
    reconhecimento: [],
  };
}

export function normalizeCiclosComerciais(raw = {}) {
  const out = emptyCiclosComerciais();
  for (const ciclo of CICLOS_COMERCIAIS) {
    const arr = Array.isArray(raw?.[ciclo]) ? raw[ciclo] : [];
    out[ciclo] = [
      ...new Set(
        arr
          .map((m) => asNumber(m, 0))
          .filter((m) => m >= 1 && m <= 12)
      ),
    ].sort((a, b) => a - b);
  }
  return out;
}

/**
 * Mapa mês → ciclo. Meses sem ciclo ficam ''.
 */
export function mesParaCicloMap(ciclos) {
  const c = normalizeCiclosComerciais(ciclos);
  const map = Object.fromEntries(MESES.map((m) => [m, '']));
  for (const ciclo of CICLOS_COMERCIAIS) {
    for (const mes of c[ciclo]) {
      map[mes] = ciclo;
    }
  }
  return map;
}

export function validateCiclosComerciais(raw, { requireFullYear = true } = {}) {
  const ciclos = normalizeCiclosComerciais(raw);
  const errors = {};
  const seen = new Map(); // mes → ciclo

  for (const ciclo of CICLOS_COMERCIAIS) {
    for (const mes of ciclos[ciclo]) {
      if (seen.has(mes)) {
        errors[`mes_${mes}`] = `Mês ${mes} em ${seen.get(mes)} e ${ciclo}`;
      } else {
        seen.set(mes, ciclo);
      }
    }
  }

  if (requireFullYear) {
    const missing = MESES.filter((m) => !seen.has(m));
    if (missing.length) {
      errors.meses_faltando = `Meses sem ciclo: ${missing.join(', ')}`;
    }
  }

  const counts = Object.fromEntries(
    CICLOS_COMERCIAIS.map((c) => [c, ciclos[c].length])
  );
  if (Object.values(counts).every((n) => n === 0)) {
    errors.ciclos_comerciais = 'Defina ao menos um ciclo comercial';
  }

  return { valid: Object.keys(errors).length === 0, errors, value: ciclos, counts };
}

// ---------------------------------------------------------------------------
// Seeds de briefing por mês (INPUT parcial — wizard / humano)
// ---------------------------------------------------------------------------

export function emptyEstrategiaSeed() {
  return {
    ciclo_comercial: '',
    objetivo_especifico: '',
    publico: '',
    produto_focal: '',
    oferta_se_houver: '',
    periodo: '',
    meta: '',
  };
}

export function emptyConceitoSeed() {
  return {
    nome_sugerido: '',
    ideia_central: '',
    mensagem_principal: '',
    tom: '',
  };
}

export function emptyBriefingMesSeed(mes = 1) {
  return {
    mes: asNumber(mes, 1),
    nome_campanha_sugerido: '',
    '01_estrategia': emptyEstrategiaSeed(),
    '02_conceito': emptyConceitoSeed(),
  };
}

export function normalizeBriefingMesSeed(raw = {}, mesFallback = 1) {
  const mes = asNumber(raw.mes, mesFallback);
  const est = raw['01_estrategia'] || raw.estrategia || {};
  const con = raw['02_conceito'] || raw.conceito || {};
  return {
    mes: mes >= 1 && mes <= 12 ? mes : mesFallback,
    nome_campanha_sugerido: asString(
      raw.nome_campanha_sugerido || raw.nome_campanha
    ),
    '01_estrategia': {
      ciclo_comercial: normalizeCiclo(est.ciclo_comercial),
      objetivo_especifico: asString(est.objetivo_especifico),
      publico: asString(est.publico),
      produto_focal: asString(est.produto_focal),
      oferta_se_houver: asString(est.oferta_se_houver),
      periodo: asString(est.periodo),
      meta: asString(est.meta),
    },
    '02_conceito': {
      nome_sugerido: asString(con.nome_sugerido || con.nome),
      ideia_central: asString(con.ideia_central),
      mensagem_principal: asString(
        con.mensagem_principal || con.mensagem
      ),
      tom: asString(con.tom),
    },
  };
}

/**
 * Gera 12 seeds a partir dos ciclos (preenche ciclo_comercial por mês).
 * Seeds existentes são preservados/mesclados.
 */
export function buildBriefingsMesSeeds(ciclos, existing = []) {
  const mapCiclo = mesParaCicloMap(ciclos);
  const byMes = new Map(
    (Array.isArray(existing) ? existing : []).map((s) => {
      const n = normalizeBriefingMesSeed(s);
      return [n.mes, n];
    })
  );

  return MESES.map((mes) => {
    const base = byMes.get(mes) || emptyBriefingMesSeed(mes);
    const ciclo = mapCiclo[mes];
    return {
      ...base,
      mes,
      '01_estrategia': {
        ...base['01_estrategia'],
        ciclo_comercial: ciclo || base['01_estrategia'].ciclo_comercial,
      },
    };
  });
}

// ---------------------------------------------------------------------------
// OUTPUT IA — 9 dimensões por mês
// ---------------------------------------------------------------------------

export function emptyDimEstrategia() {
  return {
    objetivo: '',
    publico: '',
    oferta: '',
    periodo: '',
    meta: '',
    justificativa: '',
  };
}

export function emptyDimConceito() {
  return {
    nome: '',
    ideia_central: '',
    mensagem: '',
    tom: '',
  };
}

export function emptyDimNarrativaVisual() {
  return {
    cenario: '',
    ambientacao: '',
    fotografia: '',
    video: '',
    direcao_arte: '',
  };
}

export function emptyDimIdentidadeVisual() {
  return {
    cores: [],
    tipografia: '',
    grafismos: '',
    tratamento_visual: '',
  };
}

export function emptyDimComunicacao() {
  return {
    feed: '',
    stories: '',
    reels: '',
    whatsapp: '',
    site: '',
    anuncios: '',
    influenciadores: '',
  };
}

export function emptyDimExperiencia() {
  return {
    vitrine: '',
    site: '',
    embalagem: '',
    tags_etiquetas: '',
    pdv: '',
    unboxing: '',
  };
}

export function emptyDimProducao() {
  return {
    data_gravacao: '',
    local_locacao: '',
    equipe: '',
    produtos: '',
    shot_list: '',
    roteiros: '',
    entregas: '',
  };
}

export function emptyDimAtivacao() {
  return {
    pre_campanha: '',
    lancamento: '',
    sustentacao: '',
    conversao: '',
    encerramento: '',
  };
}

export function emptyDimMensuracao() {
  return {
    investimento: 0,
    kpis: [],
    meta: '',
  };
}

export function emptyCampanhaMesGerada(mes = 1) {
  return {
    mes: asNumber(mes, 1),
    nome_campanha: '',
    ciclo_comercial: '',
    produto_focal: '',
    resumo_executivo: '',
    status_mes: 'gerado', // gerado | editado | aprovado | materializado | rejeitado
    brief_mensal_id: null,
    ciclo_entrega_id: null,
    '01_estrategia': emptyDimEstrategia(),
    '02_conceito': emptyDimConceito(),
    '03_narrativa_visual': emptyDimNarrativaVisual(),
    '04_identidade_visual': emptyDimIdentidadeVisual(),
    '05_comunicacao': emptyDimComunicacao(),
    '06_experiencia': emptyDimExperiencia(),
    '07_producao': emptyDimProducao(),
    '08_ativacao': emptyDimAtivacao(),
    '09_mensuracao': emptyDimMensuracao(),
  };
}

function normalizeDimStringMap(raw, emptyFn) {
  const base = emptyFn();
  const out = { ...base };
  for (const key of Object.keys(base)) {
    if (key === 'cores' || key === 'kpis') {
      out[key] = asStringArray(raw?.[key]);
    } else if (key === 'investimento') {
      out[key] = asNumber(raw?.[key], 0);
    } else {
      out[key] = asString(raw?.[key]);
    }
  }
  return out;
}

export function normalizeCampanhaMesGerada(raw = {}, mesFallback = 1) {
  const mes = asNumber(raw.mes, mesFallback);
  const empty = emptyCampanhaMesGerada(mes);
  return {
    ...empty,
    mes: mes >= 1 && mes <= 12 ? mes : mesFallback,
    nome_campanha: asString(raw.nome_campanha || raw['02_conceito']?.nome),
    ciclo_comercial: normalizeCiclo(raw.ciclo_comercial),
    produto_focal: asString(raw.produto_focal),
    resumo_executivo: asString(raw.resumo_executivo),
    status_mes: asString(raw.status_mes) || 'gerado',
    brief_mensal_id: raw.brief_mensal_id || null,
    ciclo_entrega_id: raw.ciclo_entrega_id || null,
    '01_estrategia': normalizeDimStringMap(
      raw['01_estrategia'],
      emptyDimEstrategia
    ),
    '02_conceito': normalizeDimStringMap(raw['02_conceito'], emptyDimConceito),
    '03_narrativa_visual': normalizeDimStringMap(
      raw['03_narrativa_visual'],
      emptyDimNarrativaVisual
    ),
    '04_identidade_visual': normalizeDimStringMap(
      raw['04_identidade_visual'],
      emptyDimIdentidadeVisual
    ),
    '05_comunicacao': normalizeDimStringMap(
      raw['05_comunicacao'],
      emptyDimComunicacao
    ),
    '06_experiencia': normalizeDimStringMap(
      raw['06_experiencia'],
      emptyDimExperiencia
    ),
    '07_producao': normalizeDimStringMap(raw['07_producao'], emptyDimProducao),
    '08_ativacao': normalizeDimStringMap(raw['08_ativacao'], emptyDimAtivacao),
    '09_mensuracao': normalizeDimStringMap(
      raw['09_mensuracao'],
      emptyDimMensuracao
    ),
  };
}

export function emptyValidacoes() {
  return {
    ciclos_respeitados: false,
    variacao_narrativas: {
      autoridade: 0,
      vendas: 0,
      engajamento: 0,
      reconhecimento: 0,
    },
    produtos_distribuidos: false,
  };
}

export function normalizeValidacoes(raw = {}) {
  const _base = emptyValidacoes();
  const v = raw.variacao_narrativas || {};
  return {
    ciclos_respeitados: Boolean(raw.ciclos_respeitados),
    variacao_narrativas: {
      autoridade: asNumber(v.autoridade, 0),
      vendas: asNumber(v.vendas, 0),
      engajamento: asNumber(v.engajamento, 0),
      reconhecimento: asNumber(v.reconhecimento, 0),
    },
    produtos_distribuidos: Boolean(raw.produtos_distribuidos),
  };
}

export function normalizeAviso(raw = {}) {
  const tipo = asString(raw.tipo);
  return {
    tipo: AVISO_TIPOS.includes(tipo) ? tipo : 'oportunidade',
    mes: asNumber(raw.mes, 0) || null,
    mensagem: asString(raw.mensagem),
    sugestao: asString(raw.sugestao),
  };
}

export function normalizeSugestao(raw = {}) {
  return {
    mes: asNumber(raw.mes, 0) || null,
    mensagem: asString(raw.mensagem),
  };
}

export function normalizeGeracaoIaOutput(raw = {}) {
  const campanhasRaw = Array.isArray(raw.campanhas) ? raw.campanhas : [];
  const campanhas = MESES.map((mes) => {
    const found = campanhasRaw.find((c) => asNumber(c?.mes, 0) === mes);
    return normalizeCampanhaMesGerada(found || { mes }, mes);
  });

  return {
    status: asString(raw.status) || 'sucesso',
    campanhas,
    validacoes: normalizeValidacoes(raw.validacoes),
    avisos: Array.isArray(raw.avisos)
      ? raw.avisos.map(normalizeAviso)
      : [],
    sugestoes: Array.isArray(raw.sugestoes)
      ? raw.sugestoes.map(normalizeSugestao)
      : [],
  };
}

/**
 * Valida coerência do output com os ciclos atribuídos no input.
 * Meses sem ciclo esperado e sem conteúdo são ignorados (lotes parciais).
 */
export function validateGeracaoIaOutput(output, ciclosEsperados) {
  const geracao = normalizeGeracaoIaOutput(output);
  const map = mesParaCicloMap(ciclosEsperados);
  const errors = {};
  const avisos = [...geracao.avisos];

  const counts = { autoridade: 0, vendas: 0, engajamento: 0, reconhecimento: 0 };
  let ciclosOk = true;

  for (const c of geracao.campanhas) {
    const esperado = map[c.mes];
    const hasContent = Boolean(c.nome_campanha || c.resumo_executivo);
    if (!esperado && !hasContent) continue;

    if (esperado && c.ciclo_comercial && c.ciclo_comercial !== esperado) {
      ciclosOk = false;
      errors[`mes_${c.mes}_ciclo`] =
        `Esperado ${esperado}, gerado ${c.ciclo_comercial}`;
    }
    if (!c.nome_campanha) errors[`mes_${c.mes}_nome`] = 'Sem nome_campanha';
    for (const key of DIMENSAO_KEYS) {
      if (!c[key] || typeof c[key] !== 'object') {
        errors[`mes_${c.mes}_${key}`] = 'Dimensão ausente';
      }
    }
    if (c.ciclo_comercial && counts[c.ciclo_comercial] != null) {
      counts[c.ciclo_comercial] += 1;
    }
  }

  geracao.validacoes = {
    ciclos_respeitados:
      ciclosOk &&
      Object.keys(errors).filter((k) => k.includes('_ciclo')).length === 0,
    variacao_narrativas: counts,
    produtos_distribuidos: geracao.validacoes.produtos_distribuidos,
  };

  return {
    valid: Object.keys(errors).length === 0,
    errors,
    value: { ...geracao, avisos },
  };
}

// ---------------------------------------------------------------------------
// INPUT IA (montado a partir de Empresa + plano anual)
// ---------------------------------------------------------------------------

export function buildInputIaFromAnual({
  empresa,
  ciclos_comerciais,
  briefings_mes = [],
  ano,
}) {
  const formato = empresa?.formato_padrao || {};
  const ciclos = normalizeCiclosComerciais(ciclos_comerciais);
  const seeds = buildBriefingsMesSeeds(ciclos, briefings_mes);
  const tom = asString(empresa?.tom_brand || empresa?.tom_marca);

  return {
    ano: asNumber(ano, new Date().getFullYear()),
    empresa: {
      nome: asString(empresa?.nome),
      publico_alvo: asString(empresa?.publico_alvo),
      tom_marca: tom, // alias no contrato da IA
      tom_brand: tom,
      formato_padrao: {
        num_videos: asNumber(formato.num_videos, 0),
        num_designs: asNumber(formato.num_designs, 0),
        duracao_videos: asString(formato.duracao_videos) || '30-45s',
      },
      orcamento_mensal: asNumber(
        empresa?.orcamento_padrao_mensal ?? empresa?.orcamento_mensal,
        0
      ),
      restricoes_criativas: asString(empresa?.restricoes_criativas),
    },
    produtos_linhas: normalizeProdutosLinhas(empresa?.produtos_linhas),
    ciclos_comerciais: ciclos,
    briefings_mes: seeds,
  };
}

export function validateInputIa(input) {
  const errors = {};
  if (!asString(input?.empresa?.nome)) errors.empresa_nome = 'Nome da empresa obrigatório';
  if (!asString(input?.empresa?.publico_alvo)) {
    errors.publico_alvo = 'Público-alvo obrigatório';
  }

  const prod = validateProdutosLinhas(input?.produtos_linhas, { required: true });
  if (!prod.valid) Object.assign(errors, prod.errors);

  const cic = validateCiclosComerciais(input?.ciclos_comerciais, {
    requireFullYear: true,
  });
  if (!cic.valid) Object.assign(errors, cic.errors);

  return {
    valid: Object.keys(errors).length === 0,
    errors,
    value: input,
  };
}

// ---------------------------------------------------------------------------
// Brief campanha_anual (persistência)
// ---------------------------------------------------------------------------

export function emptyTemaMesSugestao(mes = 1, ciclo = '') {
  return {
    mes: asNumber(mes, 1),
    ciclo: normalizeCiclo(ciclo) || '',
    titulo: '',
    ideia_central: '',
    produto_focal: '',
    selecionado: true,
    origem: 'humano',
    opcoes: [
      { id: 'principal', titulo: '', ideia_central: '', produto_focal: '' },
      { id: 'alternativa', titulo: '', ideia_central: '', produto_focal: '' },
    ],
    selecionado_id: 'principal',
  };
}

export function normalizeTemaMesSugestao(raw = {}, mesFallback = 1) {
  const mes = asNumber(raw.mes, mesFallback);
  const opcoesRaw = Array.isArray(raw.opcoes) ? raw.opcoes : [];
  const principal = opcoesRaw.find((o) => o?.id === 'principal') || opcoesRaw[0] || {};
  const alternativa = opcoesRaw.find((o) => o?.id === 'alternativa') || opcoesRaw[1] || {};
  const opcoes = [
    {
      id: 'principal',
      titulo: asString(principal.titulo || raw.titulo),
      ideia_central: asString(principal.ideia_central || raw.ideia_central),
      produto_focal: asString(principal.produto_focal || raw.produto_focal),
    },
    {
      id: 'alternativa',
      titulo: asString(alternativa.titulo),
      ideia_central: asString(alternativa.ideia_central),
      produto_focal: asString(alternativa.produto_focal),
    },
  ];
  const selecionado_id =
    asString(raw.selecionado_id) === 'alternativa' ? 'alternativa' : 'principal';
  const chosen = opcoes.find((o) => o.id === selecionado_id) || opcoes[0];
  return {
    mes,
    ciclo: normalizeCiclo(raw.ciclo) || '',
    titulo: asString(raw.titulo) || chosen.titulo,
    ideia_central: asString(raw.ideia_central) || chosen.ideia_central,
    produto_focal: asString(raw.produto_focal) || chosen.produto_focal,
    selecionado: raw.selecionado !== false,
    origem: asString(raw.origem) === 'ia' ? 'ia' : 'humano',
    opcoes,
    selecionado_id,
  };
}

export function normalizeTemasSugeridos(raw = [], ciclos = null) {
  const map = mesParaCicloMap(ciclos || emptyCiclosComerciais());
  const byMes = new Map();
  if (Array.isArray(raw)) {
    for (const item of raw) {
      const n = normalizeTemaMesSugestao(item);
      byMes.set(n.mes, n);
    }
  }
  return MESES.map((mes) => {
    const existing = byMes.get(mes);
    if (existing) {
      return {
        ...existing,
        ciclo: existing.ciclo || map[mes] || '',
      };
    }
    return emptyTemaMesSugestao(mes, map[mes] || '');
  });
}

/** Aplica temas escolhidos como seeds efetivos para a geração 9 dimensões. */
export function applyTemasEscolhidosToSeeds(temas, ciclos, existingSeeds = []) {
  const seeds = buildBriefingsMesSeeds(ciclos, existingSeeds);
  const temasN = normalizeTemasSugeridos(temas, ciclos);
  return seeds.map((seed) => {
    const tema = temasN.find((t) => t.mes === seed.mes);
    if (!tema || !tema.selecionado || !tema.titulo) return seed;
    return normalizeBriefingMesSeed({
      ...seed,
      nome_campanha_sugerido: tema.titulo,
      '01_estrategia': {
        ...seed['01_estrategia'],
        ciclo_comercial: tema.ciclo || seed['01_estrategia']?.ciclo_comercial,
        produto_focal: tema.produto_focal || seed['01_estrategia']?.produto_focal,
      },
      '02_conceito': {
        ...seed['02_conceito'],
        nome_sugerido: tema.titulo,
        ideia_central: tema.ideia_central || seed['02_conceito']?.ideia_central,
      },
    });
  });
}

export function countTemasEscolhidos(temas) {
  const list = Array.isArray(temas) ? temas.map((t) => normalizeTemaMesSugestao(t)) : [];
  const escolhidos = list.filter(
    (t) => t.selecionado && asString(t.titulo)
  );
  return { total: 12, escolhidos: escolhidos.length, complete: escolhidos.length >= 12 };
}

export function emptyCampanhaAnualPayload() {
  return {
    brief_kind: BRIEF_KIND_ANUAL,
    ano: new Date().getFullYear(),
    status_anual: 'rascunho',
    empresaId: null,
    ciclos_comerciais: emptyCiclosComerciais(),
    /** Snapshot opcional no momento da geração (desacopla de edits posteriores na Empresa) */
    produtos_snapshot: [],
    briefings_mes: MESES.map((m) => emptyBriefingMesSeed(m)),
    temas_sugeridos: MESES.map((m) => emptyTemaMesSugestao(m)),
    temas_gerados: false,
    campanhas: [],
    validacoes: emptyValidacoes(),
    avisos: [],
    sugestoes: [],
    geracao: {
      model: null,
      processado_em: null,
      erro: null,
      tokens_estimados: null,
    },
    criado_por: null,
    criado_em: null,
    editado_em: null,
  };
}

export function normalizeCampanhaAnualPayload(raw = {}) {
  const base = emptyCampanhaAnualPayload();
  const status = asString(raw.status_anual) || base.status_anual;
  const ciclos = normalizeCiclosComerciais(raw.ciclos_comerciais);
  const briefings_mes = buildBriefingsMesSeeds(ciclos, raw.briefings_mes);

  let campanhas = [];
  if (Array.isArray(raw.campanhas) && raw.campanhas.length) {
    campanhas = MESES.map((mes) => {
      const found = raw.campanhas.find((c) => asNumber(c?.mes, 0) === mes);
      return normalizeCampanhaMesGerada(found || { mes }, mes);
    });
  }

  return {
    ...base,
    ...raw,
    brief_kind: BRIEF_KIND_ANUAL,
    ano: asNumber(raw.ano, base.ano),
    status_anual: STATUS_CAMPANHA_ANUAL.includes(status) ? status : 'rascunho',
    empresaId: raw.empresaId || null,
    ciclos_comerciais: ciclos,
    produtos_snapshot: normalizeProdutosLinhas(
      raw.produtos_snapshot || raw.produtos_linhas
    ),
    briefings_mes,
    temas_sugeridos: normalizeTemasSugeridos(raw.temas_sugeridos, ciclos),
    temas_gerados: Boolean(raw.temas_gerados),
    campanhas,
    validacoes: normalizeValidacoes(raw.validacoes),
    avisos: Array.isArray(raw.avisos) ? raw.avisos.map(normalizeAviso) : [],
    sugestoes: Array.isArray(raw.sugestoes)
      ? raw.sugestoes.map(normalizeSugestao)
      : [],
    geracao: {
      model: raw.geracao?.model ?? null,
      processado_em: raw.geracao?.processado_em ?? null,
      erro: raw.geracao?.erro ?? null,
      tokens_estimados: raw.geracao?.tokens_estimados ?? null,
    },
    criado_por: raw.criado_por || null,
    criado_em: raw.criado_em || null,
    editado_em: raw.editado_em || null,
  };
}

/**
 * Aplica sugestão de temas IA no payload anual.
 */
export function applyTemasIaToAnual(anualPayload, temasOutput, { model } = {}) {
  const base = normalizeCampanhaAnualPayload(anualPayload);
  const temas = normalizeTemasSugeridos(
    temasOutput?.temas || temasOutput?.temas_sugeridos || [],
    base.ciclos_comerciais
  ).map((t) => ({ ...t, origem: 'ia' }));
  const { complete } = countTemasEscolhidos(temas);
  return {
    ...base,
    temas_sugeridos: temas,
    temas_gerados: true,
    status_anual: complete ? 'temas_prontos' : 'input_pronto',
    geracao: {
      ...base.geracao,
      model: model || base.geracao.model,
      processado_em: new Date().toISOString(),
      erro: null,
    },
    editado_em: new Date().toISOString(),
  };
}

export function validateTemasIaOutput(raw, ciclos) {
  const temas = normalizeTemasSugeridos(raw?.temas || raw?.temas_sugeridos || [], ciclos);
  const errors = {};
  const withTitle = temas.filter((t) => asString(t.titulo) || asString(t.opcoes?.[0]?.titulo));
  if (withTitle.length < 12) {
    errors.temas = `Esperados 12 meses com tema; recebidos ${withTitle.length}`;
  }
  return {
    valid: Object.keys(errors).length === 0,
    errors,
    value: { temas },
  };
}

export function validateCampanhaAnualDraft(payload) {
  const p = normalizeCampanhaAnualPayload(payload);
  const errors = {};

  if (!p.ano || p.ano < 2020 || p.ano > 2100) errors.ano = 'Ano inválido';
  if (!p.empresaId) errors.empresaId = 'empresaId obrigatório';

  const cic = validateCiclosComerciais(p.ciclos_comerciais, {
    requireFullYear: true,
  });
  if (!cic.valid) Object.assign(errors, cic.errors);

  const prod = validateProdutosLinhas(p.produtos_snapshot, { required: true });
  if (!prod.valid) {
    errors.produtos_snapshot =
      'Snapshot de produtos vazio — copie de Empresa.produtos_linhas antes de gerar';
  }

  const status =
    Object.keys(errors).length === 0 ? 'input_pronto' : 'rascunho';

  return {
    valid: Object.keys(errors).length === 0,
    errors,
    value: { ...p, status_anual: p.status_anual === 'rascunho' ? status : p.status_anual },
  };
}

/**
 * Monta payload completo para Brief.create / Brief.update.
 */
export function buildCampanhaAnualBriefPayload({
  agencyId,
  clientId,
  empresa,
  ano = new Date().getFullYear(),
  ciclos_comerciais = null,
  briefings_mes = null,
  userId = null,
  existing = null,
}) {
  const ciclos = normalizeCiclosComerciais(
    ciclos_comerciais || existing?.ciclos_comerciais
  );
  const produtos = normalizeProdutosLinhas(
    empresa?.produtos_linhas || existing?.produtos_snapshot
  );
  const seeds = buildBriefingsMesSeeds(
    ciclos,
    briefings_mes || existing?.briefings_mes
  );

  const draft = normalizeCampanhaAnualPayload({
    ...(existing || {}),
    brief_kind: BRIEF_KIND_ANUAL,
    ano,
    empresaId: empresa?.id || existing?.empresaId || null,
    ciclos_comerciais: ciclos,
    produtos_snapshot: produtos,
    briefings_mes: seeds,
    criado_por: existing?.criado_por || userId || null,
    criado_em: existing?.criado_em || new Date().toISOString(),
    editado_em: existing ? new Date().toISOString() : null,
  });

  const { value: validated, valid } = validateCampanhaAnualDraft(draft);
  const payload = valid ? validated : draft;
  if (valid && payload.status_anual === 'rascunho') {
    payload.status_anual = 'input_pronto';
  }

  const title = `Plano anual ${payload.ano} — ${asString(empresa?.nome) || 'Campanhas'}`;

  return {
    agencyId,
    clientId,
    projectId: clientId,
    empresaId: payload.empresaId,
    title,
    status: payload.status_anual === 'aprovado' ? 'READY' : 'DRAFT',
    ...payload,
    clientVisible: existing?.clientVisible === true,
    // Compat hub
    objectives: `Plano anual ${payload.ano}`,
    business_context: `Ciclos: ${CICLOS_COMERCIAIS.map(
      (c) => `${c}=${payload.ciclos_comerciais[c].length}`
    ).join(', ')}`,
    company_profile: asString(empresa?.publico_alvo),
    budget_expectations: String(empresa?.orcamento_padrao_mensal || ''),
    communication_preferences: asString(empresa?.tom_brand),
    completion_score: valid ? 60 : 20,
  };
}

/**
 * Aplica resultado da IA no payload anual (imutável-ish).
 */
export function applyGeracaoIaToAnual(anualPayload, iaOutput, { model } = {}) {
  const base = normalizeCampanhaAnualPayload(anualPayload);
  const { value: geracao, valid, errors } = validateGeracaoIaOutput(
    iaOutput,
    base.ciclos_comerciais
  );

  return {
    ...base,
    campanhas: geracao.campanhas,
    validacoes: geracao.validacoes,
    avisos: geracao.avisos,
    sugestoes: geracao.sugestoes,
    status_anual: valid ? 'ia_gerou' : 'erro',
    geracao: {
      model: model || base.geracao.model,
      processado_em: new Date().toISOString(),
      erro: valid ? null : JSON.stringify(errors),
      tokens_estimados: base.geracao.tokens_estimados,
    },
    editado_em: new Date().toISOString(),
    _geracao_valid: valid,
    _geracao_errors: errors,
  };
}

// ---------------------------------------------------------------------------
// Bridge: mês anual (9 dim) → formulário campanha_mensal (5 campos)
// ---------------------------------------------------------------------------

/**
 * Extrai datas aproximadas de strings como "5-10 de janeiro" / "7-14 fevereiro".
 * Retorno: { inicio: 'YYYY-MM-DD'|'', fim: 'YYYY-MM-DD'|'' }
 */
export function parsePeriodoGravacao(dataGravacao, mes, ano) {
  const text = asString(dataGravacao);
  const y = asNumber(ano, new Date().getFullYear());
  const m = String(asNumber(mes, 1)).padStart(2, '0');
  const nums = (text.match(/\d{1,2}/g) || []).map((n) => Number(n));
  if (nums.length >= 2) {
    const d1 = String(Math.min(nums[0], 28)).padStart(2, '0');
    const d2 = String(Math.min(nums[1], 28)).padStart(2, '0');
    return { inicio: `${y}-${m}-${d1}`, fim: `${y}-${m}-${d2}` };
  }
  if (nums.length === 1) {
    const d = String(Math.min(nums[0], 28)).padStart(2, '0');
    return { inicio: `${y}-${m}-${d}`, fim: `${y}-${m}-${d}` };
  }
  return { inicio: '', fim: '' };
}

/**
 * Mapeia uma campanha do plano anual para o form de campanha_mensal.
 * As 9 dimensões NÃO cabem no form rápido — ficam no plano anual;
 * o mensal recebe resumo operacional.
 */
export function mapAnualMesToCampanhaMensalForm(campanhaMes, { ano } = {}) {
  const c = normalizeCampanhaMesGerada(campanhaMes);
  const prod = c['07_producao'] || {};
  const est = c['01_estrategia'] || {};
  const datas = parsePeriodoGravacao(prod.data_gravacao, c.mes, ano);

  const acoes = [
    est.oferta && `Oferta: ${est.oferta}`,
    est.meta && `Meta: ${est.meta}`,
    c.ciclo_comercial && `Ciclo comercial: ${c.ciclo_comercial}`,
    c.produto_focal && `Produto focal: ${c.produto_focal}`,
  ]
    .filter(Boolean)
    .join('\n');

  return {
    nome_campanha: c.nome_campanha || c['02_conceito']?.nome || `Campanha mês ${c.mes}`,
    objetivo: est.objetivo || c.resumo_executivo || '',
    acoes_comerciais: acoes || c.resumo_executivo || '',
    talento_locacao: [prod.equipe, prod.local_locacao].filter(Boolean).join(' · ') || 'A definir',
    data_gravacao_inicio: datas.inicio,
    data_gravacao_fim: datas.fim,
    // extras (não vão no validateCampanhaForm, úteis no save)
    tipo_campanha: inferTipoFromAnual(c),
    ciclo_comercial: c.ciclo_comercial || '',
    linha_focal: c.produto_focal || '',
    _meta: {
      mes: c.mes,
      ciclo_comercial: c.ciclo_comercial,
      produto_focal: c.produto_focal,
      resumo_executivo: c.resumo_executivo,
      dimensoes: Object.fromEntries(DIMENSAO_KEYS.map((k) => [k, c[k]])),
    },
  };
}

function inferTipoFromAnual(c) {
  const blob = [
    c.resumo_executivo,
    c['07_producao']?.formato,
    c['07_producao']?.equipe,
    c['02_conceito']?.nome,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
  if (/ugc|user.?generated|comunidade/.test(blob)) return 'ugc';
  if (/influenc|creator|embaixador/.test(blob)) return 'influenciador';
  if (/s[oó]\s*posts|apenas posts|carrossel/.test(blob) && !/v[ií]deo/.test(blob)) {
    return 'so_posts';
  }
  return '5_videos';
}

/**
 * Conta meses materializados / aprovados no plano.
 */
export function summarizeAnualProgress(payload) {
  const p = normalizeCampanhaAnualPayload(payload);
  const campanhas = p.campanhas || [];
  const byStatus = {
    gerado: 0,
    editado: 0,
    aprovado: 0,
    materializado: 0,
    rejeitado: 0,
  };
  for (const c of campanhas) {
    const s = c.status_mes || 'gerado';
    if (byStatus[s] != null) byStatus[s] += 1;
  }
  return {
    ano: p.ano,
    status_anual: p.status_anual,
    total_meses: campanhas.length,
    ...byStatus,
    com_brief_mensal: campanhas.filter((c) => c.brief_mensal_id).length,
    com_ciclo_entrega: campanhas.filter((c) => c.ciclo_entrega_id).length,
  };
}
