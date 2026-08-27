/**
 * Templates padrão — Serviços de Comunicação e Marketing
 *
 * Os 3 produtos principais da agência:
 * 1. Diagnóstico de Comunicação e Marca (avulso)
 * 2. Estratégia de Conteúdo e Posicionamento
 * 3. Marketing Operacional 360 (retainer)
 */

export const DIAGNOSTICO_COMUNICACAO_TEMPLATE = {
  id: 'diagnostico_comunicacao_template',
  name: 'Diagnóstico de Comunicação e Marca',
  description:
    'Radiografia da presença de marca, canais e mensagem — com parecer claro, gaps e recomendações priorizadas',
  category: 'comunicacao',
  language: 'pt',

  pricing: {
    type: 'fixed',
    base_price: 4500,
    currency: 'BRL',
    billing_cycle: 'one_time',
    estimated_hours: 24,
    duration_months: 1,
  },

  deliverables: [
    {
      id: 'imercao_e_coleta',
      name: 'Fase 1 — Imersão e Coleta',
      description: 'Reunir materiais, acessos e contexto do negócio e da comunicação atual',
      order: 1,
      estimated_hours: 6,
      required: true,
      tasks: [
        {
          id: 'coleta_materiais_marca',
          title: 'Coletar Materiais de Marca',
          description: 'Logo, manual, tom de voz, peças recentes e guidelines existentes',
          type: 'coleta_dados',
          priority: 'high',
          estimated_hours: 2,
          checklist: [
            { text: 'Identidade visual e logo', required: true },
            { text: 'Manual ou guia de marca (se houver)', required: false },
            { text: 'Peças recentes (ads, posts, e-mails)', required: true },
            { text: 'Site / landing pages atuais', required: true },
          ],
        },
        {
          id: 'mapear_canais',
          title: 'Mapear Canais e Presença',
          description: 'Inventário de canais ativos, frequência e responsabilidades',
          type: 'pesquisa',
          priority: 'high',
          estimated_hours: 2,
          checklist: [
            { text: 'Redes sociais ativas e métricas básicas', required: true },
            { text: 'E-mail marketing / CRM', required: false },
            { text: 'Mídia paga (se houver)', required: false },
            { text: 'PR / assessoria / imprensa', required: false },
          ],
        },
        {
          id: 'entrevista_stakeholders',
          title: 'Entrevistar Stakeholders',
          description: 'Alinhar percepção interna de marca, objetivos e dores de comunicação',
          type: 'reuniao',
          priority: 'high',
          estimated_hours: 2,
          checklist: [
            { text: 'Entrevista com decisor / marketing', required: true },
            { text: 'Objetivos de negócio e de marca', required: true },
            { text: 'Restrições de tom, legal e brand safety', required: true },
          ],
        },
      ],
    },
    {
      id: 'analise_comunicacao',
      name: 'Fase 2 — Análise de Comunicação',
      description: 'Avaliar mensagem, consistência, concorrência e experiência do público',
      order: 2,
      estimated_hours: 12,
      required: true,
      tasks: [
        {
          id: 'auditoria_mensagem',
          title: 'Auditoria de Mensagem e Tom',
          description: 'Consistência de posicionamento, proposta de valor e tom de voz',
          type: 'analise',
          priority: 'high',
          estimated_hours: 4,
          checklist: [
            { text: 'Proposta de valor clara e diferenciada', required: true },
            { text: 'Consistência entre canais', required: true },
            { text: 'Gaps de tom / linguagem', required: true },
          ],
        },
        {
          id: 'analise_concorrencia',
          title: 'Análise de Concorrência e Referências',
          description: 'Benchmark de comunicação de 3–5 players e referências de categoria',
          type: 'pesquisa',
          priority: 'high',
          estimated_hours: 4,
          checklist: [
            { text: 'Mapa de posicionamento competitivo', required: true },
            { text: 'Oportunidades de diferenciação', required: true },
            { text: 'Referências de comunicação relevantes', required: false },
          ],
        },
        {
          id: 'avaliar_jornada',
          title: 'Avaliar Jornada e Pontos de Contato',
          description: 'Do primeiro contato à conversão — fricções e oportunidades',
          type: 'analise',
          priority: 'medium',
          estimated_hours: 4,
          checklist: [
            { text: 'Mapa simplificado da jornada', required: true },
            { text: 'Pontos de atrito identificados', required: true },
            { text: 'Quick wins de comunicação', required: true },
          ],
        },
      ],
    },
    {
      id: 'parecer_e_plano',
      name: 'Fase 3 — Parecer e Plano de Ação',
      description: 'Documento executivo com diagnóstico, prioridades e roadmap sugerido',
      order: 3,
      estimated_hours: 6,
      required: true,
      tasks: [
        {
          id: 'relatorio_diagnostico',
          title: 'Elaborar Relatório de Diagnóstico',
          description: 'Parecer claro da situação, riscos e recomendações priorizadas',
          type: 'entregavel',
          priority: 'high',
          estimated_hours: 4,
          checklist: [
            { text: 'Sumário executivo', required: true },
            { text: 'Achados por canal / mensagem', required: true },
            { text: 'Priorização (impacto x esforço)', required: true },
            { text: 'Roadmap sugerido (30/60/90)', required: true },
          ],
        },
        {
          id: 'apresentacao_cliente',
          title: 'Apresentar Diagnóstico ao Cliente',
          description: 'Sessão de alinhamento e validação das recomendações',
          type: 'reuniao',
          priority: 'high',
          estimated_hours: 2,
          checklist: [
            { text: 'Apresentação executiva', required: true },
            { text: 'Decisões e próximos passos registrados', required: true },
          ],
        },
      ],
    },
  ],

  kpis: [
    {
      id: 'clareza_posicionamento',
      name: 'Clareza de Posicionamento (score)',
      description: 'Nota 1–10 da clareza da proposta de valor após o diagnóstico',
      category: 'marca',
      formula: 'Avaliação qualitativa ponderada',
      target_value: 8,
      alert_thresholds: { low: 5, high: 9 },
      frequency: 'one_time',
    },
    {
      id: 'consistencia_canais',
      name: 'Consistência entre Canais (%)',
      description: 'Percentual de canais alinhados ao tom e mensagem definidos',
      category: 'comunicacao',
      formula: 'Canais alinhados / Total de canais * 100',
      target_value: 80,
      alert_thresholds: { low: 50, high: 95 },
      frequency: 'one_time',
    },
  ],

  cycle_frequency: 'one_time',
  approval_policy: 'manual_approve',
  template_category: 'standard',

  briefing_template: {
    title: 'Briefing — Diagnóstico de Comunicação e Marca',
    description: 'Contexto para auditar mensagem, canais e posicionamento',
    questions: [
      {
        id: 'setor_e_oferta',
        text: 'Qual é o setor e a oferta principal da empresa?',
        type: 'long_text',
        required: true,
      },
      {
        id: 'principal_dor_comunicacao',
        text: 'Qual a principal dor de comunicação ou marca hoje?',
        type: 'long_text',
        required: true,
      },
      {
        id: 'publico_alvo',
        text: 'Quem é o público-alvo prioritário?',
        type: 'long_text',
        required: true,
      },
      {
        id: 'canais_prioritarios',
        text: 'Quais canais são prioritários (social, site, mídia, e-mail, PR)?',
        type: 'long_text',
        required: true,
      },
    ],
  },
};

export const ESTRATEGIA_CONTEUDO_TEMPLATE = {
  id: 'estrategia_conteudo_template',
  name: 'Estratégia de Conteúdo e Posicionamento',
  description:
    'Definição de pilares editoriais, narrativa de marca e calendário para gerar autoridade e demanda',
  category: 'conteudo',
  language: 'pt',

  pricing: {
    type: 'fixed',
    base_price: 6500,
    currency: 'BRL',
    billing_cycle: 'one_time',
    estimated_hours: 32,
    duration_months: 1.5,
  },

  deliverables: [
    {
      id: 'discovery_narrativa',
      name: 'Fase 1 — Discovery e Narrativa',
      description: 'Descobrir diferenciais, prova social e história que a marca precisa contar',
      order: 1,
      estimated_hours: 8,
      required: true,
      tasks: [
        {
          id: 'workshop_posicionamento',
          title: 'Workshop de Posicionamento',
          description: 'Sessão facilitada para alinhar promessa, prova e personalidade',
          type: 'reuniao',
          priority: 'high',
          estimated_hours: 3,
          checklist: [
            { text: 'Promessa de marca definida', required: true },
            { text: 'Provas / claims validáveis', required: true },
            { text: 'Personalidade e tom', required: true },
          ],
        },
        {
          id: 'mapear_personas',
          title: 'Mapear Personas e Jobs',
          description: 'Personas prioritárias, dores, objeções e gatilhos de conteúdo',
          type: 'pesquisa',
          priority: 'high',
          estimated_hours: 3,
          checklist: [
            { text: '1–3 personas documentadas', required: true },
            { text: 'Objeções e perguntas frequentes', required: true },
            { text: 'Momentos de decisão mapeados', required: true },
          ],
        },
        {
          id: 'auditoria_conteudo_existente',
          title: 'Auditar Conteúdo Existente',
          description: 'O que performa, o que inconsistente e o que merece aposentadoria',
          type: 'analise',
          priority: 'medium',
          estimated_hours: 2,
          checklist: [
            { text: 'Inventário de conteúdos recentes', required: true },
            { text: 'Top performers identificados', required: false },
          ],
        },
      ],
    },
    {
      id: 'arquitetura_editorial',
      name: 'Fase 2 — Arquitetura Editorial',
      description: 'Pilares, formatos, frequência e matriz de distribuição',
      order: 2,
      estimated_hours: 14,
      required: true,
      tasks: [
        {
          id: 'definir_pilares',
          title: 'Definir Pilares de Conteúdo',
          description: '3–5 pilares alinhados a objetivos de negócio e SEO/demanda',
          type: 'estrategia',
          priority: 'high',
          estimated_hours: 4,
          checklist: [
            { text: 'Pilares nomeados e justificados', required: true },
            { text: 'Mix de formatos por pilar', required: true },
            { text: 'KPIs por pilar', required: true },
          ],
        },
        {
          id: 'guia_tom_voz',
          title: 'Guia de Tom de Voz e Mensagens',
          description: 'Do / don’t, exemplos e mensagens-chave por persona',
          type: 'entregavel',
          priority: 'high',
          estimated_hours: 5,
          checklist: [
            { text: 'Tom de voz documentado', required: true },
            { text: 'Mensagens-chave por persona', required: true },
            { text: 'Exemplos de copy boa / ruim', required: true },
          ],
        },
        {
          id: 'calendario_editorial',
          title: 'Montar Calendário Editorial',
          description: 'Primeiro ciclo (4–6 semanas) com temas, formatos e CTAs',
          type: 'planejamento',
          priority: 'high',
          estimated_hours: 5,
          checklist: [
            { text: 'Calendário do primeiro ciclo', required: true },
            { text: 'Responsáveis e SLAs de produção', required: true },
            { text: 'CTAs alinhados ao funil', required: true },
          ],
        },
      ],
    },
    {
      id: 'handoff_operacao',
      name: 'Fase 3 — Handoff para Operação',
      description: 'Playbook pronto para o time produzir e medir',
      order: 3,
      estimated_hours: 10,
      required: true,
      tasks: [
        {
          id: 'playbook_producao',
          title: 'Entregar Playbook de Produção',
          description: 'Fluxo briefing → produção → revisão → publicação → aprendizado',
          type: 'entregavel',
          priority: 'high',
          estimated_hours: 6,
          checklist: [
            { text: 'Fluxo operacional documentado', required: true },
            { text: 'Checklist de qualidade editorial', required: true },
            { text: 'Templates de briefing de peça', required: true },
          ],
        },
        {
          id: 'sessao_alinhamento',
          title: 'Sessão de Alinhamento com o Time',
          description: 'Treinar o time no playbook e no calendário',
          type: 'reuniao',
          priority: 'medium',
          estimated_hours: 4,
          checklist: [
            { text: 'Time alinhado no processo', required: true },
            { text: 'Dúvidas e ajustes registrados', required: true },
          ],
        },
      ],
    },
  ],

  kpis: [
    {
      id: 'taxa_publicacao',
      name: 'Taxa de Publicação no Prazo (%)',
      description: 'Peças publicadas no prazo / planejadas',
      category: 'operacao',
      formula: 'Publicadas no prazo / Planejadas * 100',
      target_value: 90,
      alert_thresholds: { low: 70, high: 100 },
      frequency: 'monthly',
    },
    {
      id: 'engajamento_medio',
      name: 'Engajamento Médio',
      description: 'Interações / alcance nos canais prioritários',
      category: 'performance',
      formula: 'Interações / Alcance * 100',
      target_value: 3,
      alert_thresholds: { low: 1.5, high: 6 },
      frequency: 'monthly',
    },
  ],

  cycle_frequency: 'one_time',
  approval_policy: 'manual_approve',
  template_category: 'standard',

  briefing_template: {
    title: 'Briefing — Estratégia de Conteúdo e Posicionamento',
    description: 'Informações para construir narrativa, pilares e calendário',
    questions: [
      {
        id: 'objetivo_conteudo',
        text: 'O conteúdo deve gerar autoridade, demanda, retenção ou recrutamento?',
        type: 'long_text',
        required: true,
      },
      {
        id: 'diferenciais',
        text: 'Quais diferenciais e provas a marca pode reivindicar com segurança?',
        type: 'long_text',
        required: true,
      },
      {
        id: 'restricoes_tom',
        text: 'Há restrições de tom, compliance ou temas sensíveis?',
        type: 'long_text',
        required: false,
      },
      {
        id: 'capacidade_producao',
        text: 'Qual a capacidade real de produção (interna + agência) por semana?',
        type: 'short_text',
        required: true,
      },
    ],
  },
};

export const MARKETING_360_TEMPLATE = {
  id: 'marketing_360_template',
  name: 'Marketing Operacional 360',
  description:
    'Retainer completo: planejamento, produção, mídia, distribuição e governança de ciclo com a agência',
  category: 'marketing_digital',
  language: 'pt',

  pricing: {
    type: 'retainer',
    base_price: 12000,
    currency: 'BRL',
    billing_cycle: 'monthly',
    estimated_hours: 80,
    duration_months: 6,
  },

  deliverables: [
    {
      id: 'planejamento_ciclo',
      name: 'Planejamento do Ciclo',
      description: 'Objetivos, hipóteses, backlog e OKRs do ciclo mensal',
      order: 1,
      estimated_hours: 12,
      required: true,
      tasks: [
        {
          id: 'definir_objetivos_ciclo',
          title: 'Definir Objetivos do Ciclo',
          description: 'Metas de negócio e de marketing mensuráveis para o mês',
          type: 'planejamento',
          priority: 'high',
          estimated_hours: 3,
          checklist: [
            { text: 'OKRs / metas do ciclo', required: true },
            { text: 'Hipóteses prioritárias', required: true },
            { text: 'Critérios de sucesso', required: true },
          ],
        },
        {
          id: 'backlog_campanhas',
          title: 'Montar Backlog de Campanhas e Peças',
          description: 'Priorizar iniciativas de conteúdo, mídia e comunicação',
          type: 'planejamento',
          priority: 'high',
          estimated_hours: 5,
          checklist: [
            { text: 'Backlog priorizado', required: true },
            { text: 'Estimativas e dependências', required: true },
            { text: 'Aprovação do cliente no plano', required: true },
          ],
        },
        {
          id: 'briefing_pecas',
          title: 'Briefings das Peças-Chave',
          description: 'Briefs de criação para as entregas do ciclo',
          type: 'briefing',
          priority: 'medium',
          estimated_hours: 4,
          checklist: [
            { text: 'Briefs das peças prioritárias', required: true },
            { text: 'Referências e restrições de marca', required: true },
          ],
        },
      ],
    },
    {
      id: 'producao_distribuicao',
      name: 'Produção e Distribuição',
      description: 'Criação, revisão, publicação e ativação de mídia',
      order: 2,
      estimated_hours: 48,
      required: true,
      tasks: [
        {
          id: 'producao_conteudo',
          title: 'Produzir Conteúdo e Peças',
          description: 'Copy, design e formatos acordados no plano',
          type: 'producao',
          priority: 'high',
          estimated_hours: 24,
          checklist: [
            { text: 'Peças no prazo de revisão', required: true },
            { text: 'Checklist de marca aplicado', required: true },
            { text: 'Versões para cada canal', required: true },
          ],
        },
        {
          id: 'gestao_midia',
          title: 'Gestão de Mídia e Distribuição',
          description: 'Setup, otimização e monitoring de campanhas pagas e orgânicas',
          type: 'midia',
          priority: 'high',
          estimated_hours: 16,
          checklist: [
            { text: 'Campanhas no ar conforme plano', required: true },
            { text: 'Otimizações semanais registradas', required: true },
            { text: 'Budget controlado', required: true },
          ],
        },
        {
          id: 'aprovacoes_cliente',
          title: 'Fluxo de Aprovações com o Cliente',
          description: 'Garantir reviews sem atrito e registro de decisões',
          type: 'aprovacao',
          priority: 'medium',
          estimated_hours: 8,
          checklist: [
            { text: 'Peças enviadas no portal', required: true },
            { text: 'Feedback consolidado', required: true },
            { text: 'Versão final aprovada', required: true },
          ],
        },
      ],
    },
    {
      id: 'fechamento_aprendizado',
      name: 'Fechamento e Aprendizado',
      description: 'Relatório do ciclo, insights e recomendações para o próximo',
      order: 3,
      estimated_hours: 20,
      required: true,
      tasks: [
        {
          id: 'relatorio_ciclo',
          title: 'Relatório de Performance do Ciclo',
          description: 'Resultados vs metas, o que funcionou e o que ajustar',
          type: 'relatorio',
          priority: 'high',
          estimated_hours: 10,
          checklist: [
            { text: 'KPIs vs meta', required: true },
            { text: 'Learnings documentados', required: true },
            { text: 'Recomendações do próximo ciclo', required: true },
          ],
        },
        {
          id: 'review_com_cliente',
          title: 'Review Mensal com o Cliente',
          description: 'Apresentação e alinhamento do próximo ciclo',
          type: 'reuniao',
          priority: 'high',
          estimated_hours: 4,
          checklist: [
            { text: 'Apresentação enviada', required: true },
            { text: 'Decisões e prioridades do próximo mês', required: true },
          ],
        },
        {
          id: 'atualizar_playbooks',
          title: 'Atualizar Playbooks e Biblioteca',
          description: 'Promover aprendizados úteis para a operação',
          type: 'aprendizado',
          priority: 'low',
          estimated_hours: 6,
          checklist: [
            { text: 'Learnings na biblioteca', required: false },
            { text: 'Ajustes de processo registrados', required: true },
          ],
        },
      ],
    },
  ],

  kpis: [
    {
      id: 'roas',
      name: 'ROAS',
      description: 'Retorno sobre investimento em mídia',
      category: 'performance',
      formula: 'Receita atribuída / Investimento em mídia',
      target_value: 3,
      alert_thresholds: { low: 1.5, high: 5 },
      frequency: 'monthly',
    },
    {
      id: 'cac',
      name: 'CAC',
      description: 'Custo de aquisição de cliente no período',
      category: 'performance',
      formula: 'Investimento total de marketing / Novos clientes',
      target_value: 0,
      alert_thresholds: { low: 0, high: 0 },
      frequency: 'monthly',
    },
    {
      id: 'taxa_aprovacao_ciclo',
      name: 'Taxa de Aprovação no Ciclo (%)',
      description: 'Peças aprovadas na 1ª ou 2ª rodada / total',
      category: 'operacao',
      formula: 'Aprovadas em até 2 rodadas / Total * 100',
      target_value: 85,
      alert_thresholds: { low: 60, high: 100 },
      frequency: 'monthly',
    },
    {
      id: 'leads_qualificados',
      name: 'Leads Qualificados',
      description: 'Volume de leads que atendem critérios do cliente',
      category: 'demanda',
      formula: 'Contagem de leads qualificados no ciclo',
      target_value: 50,
      alert_thresholds: { low: 20, high: 120 },
      frequency: 'monthly',
    },
  ],

  cycle_frequency: 'monthly',
  approval_policy: 'manual_approve',
  template_category: 'premium',

  briefing_template: {
    title: 'Briefing — Marketing Operacional 360',
    description: 'Contexto para operar o retainer mensal de marketing e comunicação',
    questions: [
      {
        id: 'objetivos_negocio',
        text: 'Quais objetivos de negócio o marketing deve apoiar neste trimestre?',
        type: 'long_text',
        required: true,
      },
      {
        id: 'canais_e_budget',
        text: 'Quais canais estão no escopo e qual o budget de mídia mensal?',
        type: 'long_text',
        required: true,
      },
      {
        id: 'stakeholders_aprovacao',
        text: 'Quem aprova peças e em quanto tempo (SLA de aprovação)?',
        type: 'long_text',
        required: true,
      },
      {
        id: 'restricoes_marca',
        text: 'Há restrições de marca, legais ou de comunicação?',
        type: 'long_text',
        required: false,
      },
    ],
  },
};

/** Aliases legados para não quebrar imports antigos */
export const DIAGNOSTICO_FINANCEIRO_TEMPLATE = DIAGNOSTICO_COMUNICACAO_TEMPLATE;
export const MENTORIA_PRECIFICACAO_TEMPLATE = ESTRATEGIA_CONTEUDO_TEMPLATE;
export const GESTAO_FINANCEIRA_360_TEMPLATE = MARKETING_360_TEMPLATE;

export const DEFAULT_SERVICE_TEMPLATES = {
  diagnostico_comunicacao: DIAGNOSTICO_COMUNICACAO_TEMPLATE,
  estrategia_conteudo: ESTRATEGIA_CONTEUDO_TEMPLATE,
  marketing_360: MARKETING_360_TEMPLATE,
  // legado (mesmo objeto)
  diagnostico_financeiro: DIAGNOSTICO_COMUNICACAO_TEMPLATE,
  mentoria_precificacao: ESTRATEGIA_CONTEUDO_TEMPLATE,
  gestao_financeira_360: MARKETING_360_TEMPLATE,
};

export default DEFAULT_SERVICE_TEMPLATES;
