/**
 * Smoke test do schema de campanha anual (sem runner de testes no projeto).
 * Uso: node scripts/test-campanha-anual-schema.mjs
 */
import {
  normalizeProdutosLinhas,
  normalizeCiclosComerciais,
  validateCiclosComerciais,
  buildBriefingsMesSeeds,
  buildInputIaFromAnual,
  validateInputIa,
  buildCampanhaAnualBriefPayload,
  normalizeGeracaoIaOutput,
  validateGeracaoIaOutput,
  applyGeracaoIaToAnual,
  mapAnualMesToCampanhaMensalForm,
  BRIEF_KIND_ANUAL,
} from '../src/lib/campanhaAnualSchema.js';

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

const empresa = {
  id: 'emp_malu',
  nome: 'MALU',
  publico_alvo: 'Mulheres 25-45',
  tom_brand: 'Warm, aconchego',
  formato_padrao: { num_videos: 5, num_designs: 2, duracao_videos: '30-45s' },
  orcamento_padrao_mensal: 2500,
  restricoes_criativas: 'Sem atores profissionais',
  produtos_linhas: [
    {
      nome: 'Linha Premium',
      preco_faixa: { min: 300, max: 400 },
      margem: 60,
      sazonalidade: 'Fevereiro, Dezembro',
      story: 'Luxo acessível',
      skus: ['Gold', 'Silver'],
    },
    {
      id: 'classica',
      nome: 'Linha Clássica',
      preco_faixa: { min: 120, max: 180 },
      margem: 45,
    },
  ],
};

const ciclos = {
  autoridade: [1, 4, 6],
  vendas: [2, 5, 10, 11, 12],
  engajamento: [3, 7],
  reconhecimento: [8, 9],
};

const produtos = normalizeProdutosLinhas(empresa.produtos_linhas);
assert(produtos[0].id === 'linha_premium', 'id slug da linha premium');
assert(produtos[1].id === 'classica', 'preserva id explícito');

const cicNorm = normalizeCiclosComerciais(ciclos);
const cicVal = validateCiclosComerciais(cicNorm, { requireFullYear: true });
assert(cicVal.valid, `ciclos devem cobrir o ano: ${JSON.stringify(cicVal.errors)}`);

const seeds = buildBriefingsMesSeeds(ciclos);
assert(seeds.length === 12, '12 seeds');
assert(seeds[0]['01_estrategia'].ciclo_comercial === 'autoridade', 'jan=autoridade');
assert(seeds[1]['01_estrategia'].ciclo_comercial === 'vendas', 'fev=vendas');

const input = buildInputIaFromAnual({
  empresa,
  ciclos_comerciais: ciclos,
  ano: 2026,
});
const inputVal = validateInputIa(input);
assert(inputVal.valid, `input IA inválido: ${JSON.stringify(inputVal.errors)}`);
assert(input.empresa.tom_marca === 'Warm, aconchego', 'alias tom_marca');

const brief = buildCampanhaAnualBriefPayload({
  agencyId: 'ag1',
  clientId: 'cl1',
  empresa,
  ano: 2026,
  ciclos_comerciais: ciclos,
  userId: 'u1',
});
assert(brief.brief_kind === BRIEF_KIND_ANUAL, 'brief_kind');
assert(brief.status_anual === 'input_pronto', `status=${brief.status_anual}`);
assert(brief.produtos_snapshot.length === 2, 'snapshot produtos');

const fakeIa = {
  status: 'sucesso',
  campanhas: Array.from({ length: 12 }, (_, i) => ({
    mes: i + 1,
    nome_campanha: `Campanha ${i + 1}`,
    ciclo_comercial: seeds[i]['01_estrategia'].ciclo_comercial,
    produto_focal: 'Clássica',
    resumo_executivo: 'Resumo',
    '01_estrategia': {
      objetivo: 'Obj',
      publico: 'P',
      oferta: 'Nenhuma',
      periodo: 'mês',
      meta: 'meta',
      justificativa: 'porque',
    },
    '02_conceito': {
      nome: `Campanha ${i + 1}`,
      ideia_central: 'ideia',
      mensagem: 'msg',
      tom: 'tom',
    },
    '03_narrativa_visual': {
      cenario: 'c',
      ambientacao: 'a',
      fotografia: 'f',
      video: 'v',
      direcao_arte: 'd',
    },
    '04_identidade_visual': {
      cores: ['Branco'],
      tipografia: 't',
      grafismos: 'g',
      tratamento_visual: 'tv',
    },
    '05_comunicacao': {
      feed: 'sim',
      stories: 'sim',
      reels: '2',
      whatsapp: 'nao',
      site: 'lp',
      anuncios: 'nao',
      influenciadores: 'nao',
    },
    '06_experiencia': {
      vitrine: 'v',
      site: 's',
      embalagem: 'e',
      tags_etiquetas: 't',
      pdv: 'p',
      unboxing: 'u',
    },
    '07_producao': {
      data_gravacao: '5-10',
      local_locacao: 'casa',
      equipe: 'Bruna + Duda',
      produtos: 'Clássica',
      shot_list: 'shots',
      roteiros: 'min',
      entregas: '5v+2d',
    },
    '08_ativacao': {
      pre_campanha: 'pre',
      lancamento: 'go',
      sustentacao: 'sust',
      conversao: 'cta',
      encerramento: 'fim',
    },
    '09_mensuracao': { investimento: 2500, kpis: ['engajamento'], meta: 'meta' },
  })),
  validacoes: {
    ciclos_respeitados: true,
    variacao_narrativas: {
      autoridade: 3,
      vendas: 5,
      engajamento: 2,
      reconhecimento: 2,
    },
    produtos_distribuidos: true,
  },
  avisos: [],
  sugestoes: [{ mes: 5, mensagem: 'Dia das Mães' }],
};

const geracao = normalizeGeracaoIaOutput(fakeIa);
assert(geracao.campanhas.length === 12, '12 campanhas normalizadas');

const gerVal = validateGeracaoIaOutput(geracao, ciclos);
assert(gerVal.valid, `validação IA: ${JSON.stringify(gerVal.errors)}`);

const applied = applyGeracaoIaToAnual(brief, fakeIa, { model: 'claude-test' });
assert(applied.status_anual === 'ia_gerou', `status após IA=${applied.status_anual}`);
assert(applied.geracao.model === 'claude-test', 'model gravado');

const form = mapAnualMesToCampanhaMensalForm(applied.campanhas[0], { ano: 2026 });
assert(form.nome_campanha === 'Campanha 1', 'map nome');
assert(form.data_gravacao_inicio === '2026-01-05', `data inicio=${form.data_gravacao_inicio}`);
assert(form._meta.ciclo_comercial === 'autoridade', 'meta ciclo');

console.log('OK campanhaAnualSchema smoke test');
