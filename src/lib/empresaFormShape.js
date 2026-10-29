/**
 * Shape puro do formulário Empresa / DNA — sem imports de API/client.
 * Seguro para Netlify Functions (não puxa import.meta.env do Vite).
 */
import { normalizeProdutosLinhas } from './campanhaAnualSchema.js';

export const EMPTY_FORMATO = {
  num_videos: 5,
  num_designs: 2,
  duracao_videos: '30-45s',
};

/** Campos Narrativa (texto) — DNA expandido, segmento-agnóstico. */
export const NARRATIVA_DNA_TEXT_KEYS = Object.freeze([
  'nicho_modelo',
  'proposta_valor',
  'identidade_visual',
  'canais_venda',
  'historico_marketing',
  'desafios_sazonalidade',
  'foco_prioritario',
  'observacoes_estrategicas',
]);

const emptyNarrativaDna = () =>
  Object.fromEntries(NARRATIVA_DNA_TEXT_KEYS.map((k) => [k, '']));

export const EMPTY_EMPRESA_FORM = {
  nome: '',
  publico_alvo: '',
  formato_padrao: { ...EMPTY_FORMATO },
  orcamento_padrao_mensal: '',
  tom_brand: '',
  restricoes_criativas: '',
  ...emptyNarrativaDna(),
  produtos_linhas: [],
  brand_guidelines: null,
};

export function normalizeFormato(formato = {}) {
  return {
    num_videos: Number(formato?.num_videos) || 0,
    num_designs: Number(formato?.num_designs) || 0,
    duracao_videos:
      String(formato?.duracao_videos || '').trim() || EMPTY_FORMATO.duracao_videos,
  };
}

export function empresaToForm(empresa, clientName = '') {
  if (!empresa) {
    return {
      ...EMPTY_EMPRESA_FORM,
      nome: clientName || '',
      formato_padrao: { ...EMPTY_FORMATO },
      produtos_linhas: [],
    };
  }
  const narrativa = Object.fromEntries(
    NARRATIVA_DNA_TEXT_KEYS.map((k) => [k, String(empresa[k] || '').trim()])
  );
  return {
    nome: empresa.nome || clientName || '',
    publico_alvo: empresa.publico_alvo || '',
    formato_padrao: normalizeFormato(empresa.formato_padrao || EMPTY_FORMATO),
    orcamento_padrao_mensal:
      empresa.orcamento_padrao_mensal != null
        ? Number(empresa.orcamento_padrao_mensal)
        : '',
    tom_brand: empresa.tom_brand || '',
    restricoes_criativas: empresa.restricoes_criativas || '',
    ...narrativa,
    produtos_linhas: normalizeProdutosLinhas(empresa.produtos_linhas),
    brand_guidelines: empresa.brand_guidelines || null,
  };
}

/** Normaliza o envelope { empresa } do briefing inicial (sem persistência). */
export function normalizeBriefingInicialFormShape(raw = {}, clientName = '') {
  const empresaRaw = raw?.empresa && typeof raw.empresa === 'object' ? raw.empresa : raw;
  const empresa = {
    ...EMPTY_EMPRESA_FORM,
    ...empresaToForm(
      {
        nome: empresaRaw?.nome,
        publico_alvo: empresaRaw?.publico_alvo,
        formato_padrao: empresaRaw?.formato_padrao || empresaRaw?.formato,
        orcamento_padrao_mensal:
          empresaRaw?.orcamento_padrao_mensal ?? empresaRaw?.orcamento,
        tom_brand: empresaRaw?.tom_brand,
        restricoes_criativas: empresaRaw?.restricoes_criativas,
        ...Object.fromEntries(
          NARRATIVA_DNA_TEXT_KEYS.map((k) => [k, empresaRaw?.[k]])
        ),
        produtos_linhas: empresaRaw?.produtos_linhas,
        brand_guidelines: empresaRaw?.brand_guidelines,
      },
      clientName
    ),
  };
  empresa.formato_padrao = normalizeFormato(empresa.formato_padrao);
  empresa.produtos_linhas = normalizeProdutosLinhas(empresa.produtos_linhas);
  return { empresa };
}
