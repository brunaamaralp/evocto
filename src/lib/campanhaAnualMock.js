import {
  emptyCampanhaMesGerada,
  mesParaCicloMap,
} from './campanhaAnualSchema.js';

/**
 * Mock local (DEV / VITE_CAMPANHA_IA_MOCK=1) — 9 dimensões a partir dos seeds.
 * Sem imports de Appwrite (testável em Node).
 */
export function buildMockGeracaoFromInput(inputIa) {
  const map = mesParaCicloMap(inputIa.ciclos_comerciais);
  const seedsByMes = new Map(
    (inputIa.briefings_mes || []).map((s) => [Number(s.mes), s])
  );
  const formato = inputIa.empresa?.formato_padrao || {};
  const orcamento = Number(inputIa.empresa?.orcamento_mensal) || 2500;
  const produtos = inputIa.produtos_linhas || [];

  const campanhas = Array.from({ length: 12 }, (_, i) => {
    const mes = i + 1;
    const seed = seedsByMes.get(mes) || {};
    const est = seed['01_estrategia'] || {};
    const con = seed['02_conceito'] || {};
    const ciclo = est.ciclo_comercial || map[mes] || 'reconhecimento';
    const produto =
      est.produto_focal ||
      produtos[mes % Math.max(produtos.length, 1)]?.nome ||
      'Variado';
    const nome =
      seed.nome_campanha_sugerido ||
      con.nome_sugerido ||
      `Campanha ${mes} · ${ciclo}`;

    const base = emptyCampanhaMesGerada(mes);
    return {
      ...base,
      mes,
      nome_campanha: nome,
      ciclo_comercial: ciclo,
      produto_focal: produto,
      resumo_executivo:
        con.ideia_central ||
        est.objetivo_especifico ||
        `Campanha de ${ciclo} focada em ${produto} (mock P1).`,
      '01_estrategia': {
        objetivo: est.objetivo_especifico || `Objetivo de ${ciclo}`,
        publico: est.publico || inputIa.empresa?.publico_alvo || '',
        oferta: est.oferta_se_houver || (ciclo === 'vendas' ? 'Oferta do mês' : 'Nenhuma'),
        periodo: est.periodo || `Mês ${mes}`,
        meta: est.meta || 'Definir KPIs com o time',
        justificativa: `Ciclo ${ciclo} no mês ${mes}; produto ${produto}.`,
      },
      '02_conceito': {
        nome,
        ideia_central: con.ideia_central || `Narrativa de ${ciclo}`,
        mensagem: con.mensagem_principal || `Mensagem alinhada a ${ciclo}`,
        tom: con.tom || inputIa.empresa?.tom_brand || inputIa.empresa?.tom_marca || '',
      },
      '03_narrativa_visual': {
        cenario: 'Ambientes reais alinhados à marca',
        ambientacao: 'Luz natural, autenticidade',
        fotografia: 'Documentary / pessoas reais',
        video: `${formato.num_videos || 5} peças no tom do ciclo`,
        direcao_arte: 'Coerente com identidade da marca',
      },
      '04_identidade_visual': {
        cores: ['Neutros da marca', 'Accent sazonal'],
        tipografia: 'Tipografia da marca',
        grafismos: 'Minimalistas',
        tratamento_visual: 'Natural, sem filtro agressivo',
      },
      '05_comunicacao': {
        feed: '3–5 posts/semana',
        stories: 'Daily',
        reels: String(formato.num_videos || 5),
        whatsapp: ciclo === 'vendas' ? 'Broadcast com urgência' : 'Broadcast educativo',
        site: ciclo === 'vendas' ? 'Landing / oferta' : 'Conteúdo / guia',
        anuncios: ciclo === 'vendas' ? 'Meta Ads com orçamento do mês' : 'Orgânico prioritário',
        influenciadores: 'Conforme restrições criativas',
      },
      '06_experiencia': {
        vitrine: `Tema ${nome}`,
        site: 'Experiência alinhada ao ciclo',
        embalagem: 'Detalhe de campanha',
        tags_etiquetas: `#${String(nome).replace(/\s+/g, '')}`,
        pdv: 'Sinalização do mês',
        unboxing: 'Momento compartilhável',
      },
      '07_producao': {
        data_gravacao: '5-12',
        local_locacao: 'Locações reais',
        equipe: 'Bruna + Duda',
        produtos: produto,
        shot_list: 'Hero + detalhes + lifestyle',
        roteiros: 'Conforme ciclo (educativo / conversão / UGC / marca)',
        entregas: `${formato.num_videos || 5} vídeos + ${formato.num_designs || 2} designs`,
      },
      '08_ativacao': {
        pre_campanha: 'Teasers no fim do mês anterior',
        lancamento: `Início do mês ${mes}`,
        sustentacao: 'Cadência semanal',
        conversao: ciclo === 'vendas' ? 'CTA direto' : 'CTA suave',
        encerramento: 'Ponte para o mês seguinte',
      },
      '09_mensuracao': {
        investimento: orcamento,
        kpis: ['Alcance', 'Engajamento', ciclo === 'vendas' ? 'Conversões' : 'Salvos'],
        meta: est.meta || 'Validar hipótese do ciclo',
      },
    };
  });

  const counts = { autoridade: 0, vendas: 0, engajamento: 0, reconhecimento: 0 };
  for (const c of campanhas) {
    if (counts[c.ciclo_comercial] != null) counts[c.ciclo_comercial] += 1;
  }

  return {
    status: 'sucesso',
    campanhas,
    validacoes: {
      ciclos_respeitados: true,
      variacao_narrativas: counts,
      produtos_distribuidos: true,
    },
    avisos: [
      {
        tipo: 'oportunidade',
        mes: null,
        mensagem:
          'Resultado mock (sem Anthropic). Configure ANTHROPIC_API_KEY + vercel dev para geração real.',
        sugestao: 'VITE_CAMPANHA_IA_MOCK=1 força mock; sem isso, DEV faz fallback em 404/503.',
      },
    ],
    sugestoes: [],
  };
}
