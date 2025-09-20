/**
 * 🧾 Templates Padrão para Serviços de Consultoria Financeira
 * 
 * Templates baseados na especificação detalhada dos 3 serviços principais
 */

// Template 1: Diagnóstico Financeiro Avulso (1 mês)
export const DIAGNOSTICO_FINANCEIRO_TEMPLATE = {
  id: 'diagnostico_financeiro_template',
  name: 'Diagnóstico Financeiro Avulso',
  description: 'Radiografia financeira do negócio com parecer claro da situação, riscos e recomendações',
  category: 'diagnostico_financeiro',
  language: 'pt',
  
  // Configurações básicas
  pricing: {
    type: 'fixed',
    base_price: 5000,
    currency: 'BRL',
    billing_cycle: 'one_time',
    estimated_hours: 20,
    duration_months: 1
  },
  
  // Entregáveis principais
  deliverables: [
    {
      id: 'coleta_informacoes',
      name: 'Fase 1 - Coleta de Informações',
      description: 'Solicitar e organizar documentos básicos para análise',
      order: 1,
      estimated_hours: 4,
      required: true,
      tasks: [
        {
          id: 'solicitar_documentos_basicos',
          title: 'Solicitar Documentos Básicos',
          description: 'Coletar extratos bancários, fluxo de caixa, notas fiscais, planilhas de vendas e despesas fixas',
          type: 'coleta_dados',
          priority: 'high',
          estimated_hours: 2,
          checklist: [
            { text: 'Extratos bancários dos últimos 6 meses', required: true },
            { text: 'Fluxo de caixa atual', required: true },
            { text: 'Notas fiscais de vendas', required: true },
            { text: 'Planilhas de vendas', required: true },
            { text: 'Despesas fixas mensais', required: true }
          ]
        },
        {
          id: 'levantar_dados_estoque',
          title: 'Levantar Dados de Estoque',
          description: 'Coletar informações sobre estoque atual e movimentação',
          type: 'coleta_dados',
          priority: 'medium',
          estimated_hours: 1,
          checklist: [
            { text: 'Inventário atual de estoque', required: false },
            { text: 'Movimentação de estoque', required: false },
            { text: 'Custos de armazenagem', required: false }
          ]
        },
        {
          id: 'levantar_contratos_dividas',
          title: 'Levantar Contratos e Dívidas',
          description: 'Mapear contratos existentes e dívidas da empresa',
          type: 'coleta_dados',
          priority: 'high',
          estimated_hours: 1,
          checklist: [
            { text: 'Contratos de fornecedores', required: true },
            { text: 'Contratos de clientes', required: true },
            { text: 'Dívidas bancárias', required: true },
            { text: 'Financiamentos', required: true },
            { text: 'Empréstimos', required: true }
          ]
        }
      ]
    },
    {
      id: 'analise_financeira',
      name: 'Fase 2 - Análise Financeira',
      description: 'Realizar análise detalhada da situação financeira',
      order: 2,
      estimated_hours: 12,
      required: true,
      tasks: [
        {
          id: 'mapear_receitas_despesas',
          title: 'Mapear Receitas x Despesas',
          description: 'Analisar estrutura de receitas e despesas da empresa',
          type: 'analise_financeira',
          priority: 'high',
          estimated_hours: 3,
          checklist: [
            { text: 'Análise de receitas por fonte', required: true },
            { text: 'Análise de despesas por categoria', required: true },
            { text: 'Identificação de sazonalidade', required: true },
            { text: 'Tendências de crescimento/redução', required: true }
          ]
        },
        {
          id: 'analisar_endividamento',
          title: 'Analisar Endividamento e Prazos',
          description: 'Avaliar situação de endividamento e prazos de pagamento',
          type: 'analise_financeira',
          priority: 'high',
          estimated_hours: 2,
          checklist: [
            { text: 'Cálculo do endividamento total', required: true },
            { text: 'Análise de prazos de pagamento', required: true },
            { text: 'Identificação de dívidas críticas', required: true },
            { text: 'Avaliação de capacidade de pagamento', required: true }
          ]
        },
        {
          id: 'calcular_ponto_equilibrio',
          title: 'Calcular Ponto de Equilíbrio',
          description: 'Determinar ponto de equilíbrio em reais e unidades',
          type: 'analise_financeira',
          priority: 'high',
          estimated_hours: 2,
          checklist: [
            { text: 'Cálculo do ponto de equilíbrio em R$', required: true },
            { text: 'Cálculo do ponto de equilíbrio em unidades', required: true },
            { text: 'Análise de margem de segurança', required: true },
            { text: 'Comparação com vendas atuais', required: true }
          ]
        },
        {
          id: 'analisar_margens',
          title: 'Analisar Margem de Lucro Bruta e Líquida',
          description: 'Calcular e analisar margens de lucro',
          type: 'analise_financeira',
          priority: 'high',
          estimated_hours: 2,
          checklist: [
            { text: 'Cálculo da margem bruta', required: true },
            { text: 'Cálculo da margem líquida', required: true },
            { text: 'Comparação com benchmark do setor', required: true },
            { text: 'Análise de evolução histórica', required: true }
          ]
        },
        {
          id: 'avaliar_fluxo_caixa',
          title: 'Avaliar Fluxo de Caixa',
          description: 'Analisar fluxo de caixa dos últimos 3 a 6 meses',
          type: 'analise_financeira',
          priority: 'high',
          estimated_hours: 3,
          checklist: [
            { text: 'Análise do fluxo de caixa histórico', required: true },
            { text: 'Identificação de sazonalidade', required: true },
            { text: 'Análise de entradas vs saídas', required: true },
            { text: 'Identificação de períodos críticos', required: true }
          ]
        }
      ]
    },
    {
      id: 'parecer_final',
      name: 'Fase 3 - Parecer Final',
      description: 'Elaborar relatório final e apresentar recomendações',
      order: 3,
      estimated_hours: 4,
      required: true,
      tasks: [
        {
          id: 'criar_relatorio_pdf',
          title: 'Criar Relatório em PDF',
          description: 'Elaborar relatório completo com achados e indicadores',
          type: 'relatorio_financeiro',
          priority: 'high',
          estimated_hours: 2,
          checklist: [
            { text: 'Resumo executivo', required: true },
            { text: 'Análise detalhada dos indicadores', required: true },
            { text: 'Identificação de riscos', required: true },
            { text: 'Recomendações prioritárias', required: true },
            { text: 'Próximos passos sugeridos', required: true }
          ]
        },
        {
          id: 'reuniao_devolutiva',
          title: 'Reunião de Devolutiva',
          description: 'Apresentar resultados e recomendações ao cliente',
          type: 'reuniao_alinhamento',
          priority: 'high',
          estimated_hours: 2,
          checklist: [
            { text: 'Apresentação dos principais achados', required: true },
            { text: 'Explicação dos indicadores calculados', required: true },
            { text: 'Discussão dos riscos identificados', required: true },
            { text: 'Apresentação das recomendações', required: true },
            { text: 'Definição dos próximos passos', required: true }
          ]
        }
      ]
    }
  ],
  
  // KPIs padrão do diagnóstico
  default_kpis: [
    {
      id: 'margem_contribuicao',
      name: 'Margem de Contribuição (%)',
      description: 'Percentual de margem de contribuição sobre vendas',
      category: 'rentabilidade',
      formula: '(Receita - Custos Variáveis) / Receita * 100',
      target_value: 40,
      alert_thresholds: {
        low: 20,
        high: 60
      },
      frequency: 'monthly'
    },
    {
      id: 'ponto_equilibrio_reais',
      name: 'Ponto de Equilíbrio (R$)',
      description: 'Valor em reais necessário para cobrir custos fixos',
      category: 'operacional',
      formula: 'Custos Fixos / Margem de Contribuição',
      target_value: null,
      alert_thresholds: {
        low: null,
        high: null
      },
      frequency: 'monthly'
    },
    {
      id: 'ponto_equilibrio_unidades',
      name: 'Ponto de Equilíbrio (Unidades)',
      description: 'Quantidade de unidades necessárias para cobrir custos fixos',
      category: 'operacional',
      formula: 'Custos Fixos / (Preço - Custo Variável Unitário)',
      target_value: null,
      alert_thresholds: {
        low: null,
        high: null
      },
      frequency: 'monthly'
    },
    {
      id: 'endividamento_total',
      name: 'Endividamento Total (R$ e %)',
      description: 'Valor total de dívidas e percentual sobre receita',
      category: 'endividamento',
      formula: 'Total de Dívidas / Receita Anual * 100',
      target_value: 30,
      alert_thresholds: {
        low: 15,
        high: 50
      },
      frequency: 'monthly'
    },
    {
      id: 'saldo_fluxo_caixa',
      name: 'Saldo de Fluxo de Caixa Médio/Mês',
      description: 'Saldo médio de caixa por mês',
      category: 'liquidez',
      formula: 'Saldo Médio Mensal de Caixa',
      target_value: null,
      alert_thresholds: {
        low: 0,
        high: null
      },
      frequency: 'monthly'
    },
    {
      id: 'prazo_medio_recebimento_pagamento',
      name: 'Prazo Médio Recebimento x Pagamento',
      description: 'Diferença entre prazo médio de recebimento e pagamento',
      category: 'operacional',
      formula: 'Prazo Médio Recebimento - Prazo Médio Pagamento',
      target_value: 0,
      alert_thresholds: {
        low: -30,
        high: 30
      },
      frequency: 'monthly'
    }
  ],
  
  // Configurações
  cycle_frequency: 'one_time',
  approval_policy: 'manual_approve',
  template_category: 'standard',
  
  // Briefing específico
  briefing_template: {
    title: 'Briefing de Diagnóstico Financeiro',
    description: 'Coleta de informações para diagnóstico financeiro completo',
    questions: [
      {
        id: 'situacao_financeira_atual',
        text: 'Como você avalia a situação financeira atual da empresa?',
        type: 'long_text',
        required: true
      },
      {
        id: 'principais_desafios',
        text: 'Quais são os principais desafios financeiros enfrentados?',
        type: 'long_text',
        required: true
      },
      {
        id: 'objetivos_diagnostico',
        text: 'O que você espera descobrir com este diagnóstico?',
        type: 'long_text',
        required: true
      },
      {
        id: 'documentos_disponiveis',
        text: 'Que documentos financeiros estão disponíveis?',
        type: 'long_text',
        required: true
      }
    ]
  }
};

// Template 2: Mentoria em Precificação e Aumento de Margem (4 meses)
export const MENTORIA_PRECIFICACAO_TEMPLATE = {
  id: 'mentoria_precificacao_template',
  name: 'Mentoria em Precificação e Aumento de Margem',
  description: 'Corrigir precificação dos produtos/serviços e aumentar margem de lucro para garantir sustentabilidade',
  category: 'mentoria_precificacao',
  language: 'pt',
  
  // Configurações básicas
  pricing: {
    type: 'fixed',
    base_price: 8000,
    currency: 'BRL',
    billing_cycle: 'one_time',
    estimated_hours: 32,
    duration_months: 4
  },
  
  // Entregáveis principais
  deliverables: [
    {
      id: 'levantamento_diagnostico_custos',
      name: 'Fase 1 - Levantamento e Diagnóstico de Custos',
      description: 'Identificar e mapear todos os custos que afetam a margem',
      order: 1,
      estimated_hours: 8,
      required: true,
      tasks: [
        {
          id: 'identificar_custos_fixos_variaveis',
          title: 'Identificar Custos Fixos e Variáveis',
          description: 'Mapear todos os custos fixos e variáveis da empresa',
          type: 'analise_financeira',
          priority: 'high',
          estimated_hours: 3,
          checklist: [
            { text: 'Mapeamento de custos fixos', required: true },
            { text: 'Mapeamento de custos variáveis', required: true },
            { text: 'Classificação por categoria', required: true },
            { text: 'Análise de evolução histórica', required: true }
          ]
        },
        {
          id: 'mapear_cmv_custos_diretos',
          title: 'Mapear CMV ou Custos Diretos de Serviço',
          description: 'Calcular custo da mercadoria vendida ou custos diretos',
          type: 'analise_financeira',
          priority: 'high',
          estimated_hours: 3,
          checklist: [
            { text: 'Cálculo do CMV por produto', required: true },
            { text: 'Custos diretos por serviço', required: true },
            { text: 'Análise de fornecedores', required: true },
            { text: 'Identificação de oportunidades de redução', required: true }
          ]
        },
        {
          id: 'levantar_despesas_ocultas',
          title: 'Levantar Despesas Ocultas',
          description: 'Identificar despesas que afetam margem mas não são óbvias',
          type: 'analise_financeira',
          priority: 'medium',
          estimated_hours: 2,
          checklist: [
            { text: 'Fretes e logística', required: true },
            { text: 'Impostos e taxas', required: true },
            { text: 'Taxas bancárias', required: true },
            { text: 'Despesas administrativas', required: true },
            { text: 'Perdas e desperdícios', required: true }
          ]
        }
      ]
    },
    {
      id: 'definicao_politica_precos',
      name: 'Fase 2 - Definição da Nova Política de Preços',
      description: 'Desenvolver nova estratégia de precificação baseada em custos e margem',
      order: 2,
      estimated_hours: 12,
      required: true,
      tasks: [
        {
          id: 'calcular_markup',
          title: 'Calcular Markup Mínimo e Desejado',
          description: 'Determinar markup necessário para atingir margem alvo',
          type: 'analise_financeira',
          priority: 'high',
          estimated_hours: 4,
          checklist: [
            { text: 'Cálculo do markup mínimo', required: true },
            { text: 'Cálculo do markup desejado', required: true },
            { text: 'Análise de competitividade', required: true },
            { text: 'Teste de sensibilidade', required: true }
          ]
        },
        {
          id: 'estabelecer_preco_ideal',
          title: 'Estabelecer Preço Ideal de Venda',
          description: 'Definir preço ideal por produto/serviço',
          type: 'planejamento_estrategico',
          priority: 'high',
          estimated_hours: 4,
          checklist: [
            { text: 'Preço ideal por produto', required: true },
            { text: 'Preço ideal por serviço', required: true },
            { text: 'Análise de elasticidade de preço', required: true },
            { text: 'Comparação com concorrência', required: true }
          ]
        },
        {
          id: 'definir_margem_alvo',
          title: 'Definir Margem Alvo por Categoria',
          description: 'Estabelecer margem alvo para cada categoria de produto/serviço',
          type: 'planejamento_estrategico',
          priority: 'high',
          estimated_hours: 4,
          checklist: [
            { text: 'Margem alvo por categoria', required: true },
            { text: 'Estratégia de precificação diferenciada', required: true },
            { text: 'Política de descontos', required: true },
            { text: 'Política de promoções', required: true }
          ]
        }
      ]
    },
    {
      id: 'implementacao',
      name: 'Fase 3 - Implementação',
      description: 'Implementar nova política de precificação na empresa',
      order: 3,
      estimated_hours: 8,
      required: true,
      tasks: [
        {
          id: 'criar_planilha_precificacao',
          title: 'Criar Planilha Automatizada de Precificação',
          description: 'Desenvolver ferramenta para cálculo automático de preços',
          type: 'implementacao',
          priority: 'high',
          estimated_hours: 3,
          checklist: [
            { text: 'Planilha de precificação automática', required: true },
            { text: 'Cálculo de custos atualizados', required: true },
            { text: 'Aplicação de markup', required: true },
            { text: 'Validação de resultados', required: true }
          ]
        },
        {
          id: 'treinar_equipe',
          title: 'Treinar Empresário/Equipe',
          description: 'Capacitar equipe para usar nova ferramenta de precificação',
          type: 'treinamento',
          priority: 'high',
          estimated_hours: 3,
          checklist: [
            { text: 'Treinamento na planilha', required: true },
            { text: 'Treinamento em conceitos de precificação', required: true },
            { text: 'Treinamento em política de descontos', required: true },
            { text: 'Material de apoio', required: true }
          ]
        },
        {
          id: 'ajustar_politica_descontos',
          title: 'Ajustar Política de Descontos e Promoções',
          description: 'Definir nova política de descontos e promoções',
          type: 'planejamento_estrategico',
          priority: 'medium',
          estimated_hours: 2,
          checklist: [
            { text: 'Política de descontos por volume', required: true },
            { text: 'Política de descontos por prazo', required: true },
            { text: 'Política de promoções', required: true },
            { text: 'Limites de desconto', required: true }
          ]
        }
      ]
    },
    {
      id: 'acompanhamento_ajustes',
      name: 'Fase 4 - Acompanhamento e Ajustes',
      description: 'Monitorar resultados e fazer ajustes necessários',
      order: 4,
      estimated_hours: 4,
      required: true,
      tasks: [
        {
          id: 'monitorar_margens',
          title: 'Monitorar Margens Reais',
          description: 'Acompanhar margens após implementação da nova precificação',
          type: 'analise_financeira',
          priority: 'high',
          estimated_hours: 2,
          checklist: [
            { text: 'Acompanhamento mensal de margens', required: true },
            { text: 'Comparação com metas estabelecidas', required: true },
            { text: 'Identificação de desvios', required: true },
            { text: 'Análise de causas', required: true }
          ]
        },
        {
          id: 'corrigir_distorcoes',
          title: 'Corrigir Distorções',
          description: 'Ajustar produtos/serviços que não atingem margem alvo',
          type: 'planejamento_estrategico',
          priority: 'medium',
          estimated_hours: 1,
          checklist: [
            { text: 'Identificação de produtos problemáticos', required: true },
            { text: 'Análise de viabilidade', required: true },
            { text: 'Ajustes de preço ou custo', required: true },
            { text: 'Decisão sobre continuidade', required: true }
          ]
        },
        {
          id: 'relatorio_evolucao',
          title: 'Relatório de Evolução',
          description: 'Elaborar relatório de evolução da margem mês a mês',
          type: 'relatorio_financeiro',
          priority: 'high',
          estimated_hours: 1,
          checklist: [
            { text: 'Relatório mensal de evolução', required: true },
            { text: 'Comparativo antes/depois', required: true },
            { text: 'Análise de resultados', required: true },
            { text: 'Recomendações futuras', required: true }
          ]
        }
      ]
    }
  ],
  
  // KPIs padrão da mentoria
  default_kpis: [
    {
      id: 'margem_contribuicao_produto',
      name: 'Margem de Contribuição por Produto/Serviço (%)',
      description: 'Margem de contribuição individual por produto ou serviço',
      category: 'rentabilidade',
      formula: '(Preço - Custo Variável) / Preço * 100',
      target_value: 50,
      alert_thresholds: {
        low: 30,
        high: 70
      },
      frequency: 'monthly'
    },
    {
      id: 'margem_liquida_total',
      name: 'Margem Líquida Total (%)',
      description: 'Margem líquida total da empresa',
      category: 'rentabilidade',
      formula: 'Lucro Líquido / Receita Líquida * 100',
      target_value: 20,
      alert_thresholds: {
        low: 10,
        high: 30
      },
      frequency: 'monthly'
    },
    {
      id: 'ticket_medio',
      name: 'Ticket Médio (R$)',
      description: 'Valor médio por venda',
      category: 'vendas',
      formula: 'Receita Total / Número de Vendas',
      target_value: null,
      alert_thresholds: {
        low: null,
        high: null
      },
      frequency: 'monthly'
    },
    {
      id: 'volume_vendas_lucro',
      name: 'Volume de Vendas x Lucro Líquido',
      description: 'Comparativo entre volume de vendas e lucro líquido',
      category: 'rentabilidade',
      formula: 'Lucro Líquido / Volume de Vendas * 100',
      target_value: null,
      alert_thresholds: {
        low: null,
        high: null
      },
      frequency: 'monthly'
    },
    {
      id: 'produtos_margem_baixa',
      name: 'Produtos/Serviços com Margem Abaixo do Ideal (%)',
      description: 'Percentual de produtos com margem abaixo do mínimo estabelecido',
      category: 'rentabilidade',
      formula: 'Produtos com Margem Baixa / Total de Produtos * 100',
      target_value: 10,
      alert_thresholds: {
        low: 5,
        high: 20
      },
      frequency: 'monthly'
    }
  ],
  
  // Configurações
  cycle_frequency: 'monthly',
  approval_policy: 'manual_approve',
  template_category: 'standard',
  
  // Briefing específico
  briefing_template: {
    title: 'Briefing de Mentoria em Precificação',
    description: 'Coleta de informações para mentoria em precificação e aumento de margem',
    questions: [
      {
        id: 'problemas_precificacao',
        text: 'Quais problemas você enfrenta com a precificação atual?',
        type: 'long_text',
        required: true
      },
      {
        id: 'margem_atual',
        text: 'Qual é a margem de lucro atual da empresa?',
        type: 'text',
        required: true
      },
      {
        id: 'produtos_servicos',
        text: 'Quantos produtos/serviços diferentes você oferece?',
        type: 'text',
        required: true
      },
      {
        id: 'objetivos_margem',
        text: 'Qual margem de lucro você gostaria de atingir?',
        type: 'text',
        required: true
      }
    ]
  }
};

// Template 3: Gestão Financeira 360 (contínuo, 10+ meses)
export const GESTAO_FINANCEIRA_360_TEMPLATE = {
  id: 'gestao_financeira_360_template',
  name: 'Gestão Financeira 360',
  description: 'Sistema de gestão financeira completo com acompanhamento mensal e suporte estratégico',
  category: 'gestao_financeira_360',
  language: 'pt',
  
  // Configurações básicas
  pricing: {
    type: 'recurring',
    base_price: 3000,
    currency: 'BRL',
    billing_cycle: 'monthly',
    estimated_hours: 16,
    duration_months: 12
  },
  
  // Entregáveis principais
  deliverables: [
    {
      id: 'implantacao',
      name: 'Fase 1 - Implantação (1º mês)',
      description: 'Estruturar sistema de gestão financeira completo',
      order: 1,
      estimated_hours: 16,
      required: true,
      tasks: [
        {
          id: 'organizar_contas_pagar_receber',
          title: 'Organizar Contas a Pagar e Receber',
          description: 'Estruturar controle de contas a pagar e receber',
          type: 'implementacao',
          priority: 'high',
          estimated_hours: 4,
          checklist: [
            { text: 'Cadastro de fornecedores', required: true },
            { text: 'Cadastro de clientes', required: true },
            { text: 'Controle de vencimentos', required: true },
            { text: 'Fluxo de aprovação', required: true }
          ]
        },
        {
          id: 'implantar_fluxo_caixa_projetado',
          title: 'Implantar Fluxo de Caixa Projetado',
          description: 'Implementar sistema de fluxo de caixa projetado',
          type: 'implementacao',
          priority: 'high',
          estimated_hours: 4,
          checklist: [
            { text: 'Estrutura do fluxo de caixa', required: true },
            { text: 'Projeções mensais', required: true },
            { text: 'Controle de entradas e saídas', required: true },
            { text: 'Alertas de vencimento', required: true }
          ]
        },
        {
          id: 'estruturar_planilhas_sistema',
          title: 'Estruturar Planilhas ou Sistema',
          description: 'Implementar planilhas ou sistema ERP/BPO financeiro',
          type: 'implementacao',
          priority: 'high',
          estimated_hours: 4,
          checklist: [
            { text: 'Configuração do sistema', required: true },
            { text: 'Importação de dados históricos', required: true },
            { text: 'Configuração de relatórios', required: true },
            { text: 'Testes e validação', required: true }
          ]
        },
        {
          id: 'cadastrar_fornecedores_clientes',
          title: 'Cadastrar Fornecedores e Clientes',
          description: 'Completar cadastro de fornecedores e clientes',
          type: 'administrativo',
          priority: 'medium',
          estimated_hours: 4,
          checklist: [
            { text: 'Cadastro completo de fornecedores', required: true },
            { text: 'Cadastro completo de clientes', required: true },
            { text: 'Histórico de relacionamento', required: true },
            { text: 'Classificação por categoria', required: true }
          ]
        }
      ]
    },
    {
      id: 'controle_recorrente',
      name: 'Fase 2 - Controle Recorrente (mensal)',
      description: 'Atividades mensais de controle financeiro',
      order: 2,
      estimated_hours: 8,
      required: true,
      recurring: true,
      tasks: [
        {
          id: 'conciliacao_bancaria',
          title: 'Conciliação Bancária',
          description: 'Realizar conciliação bancária mensal',
          type: 'administrativo',
          priority: 'high',
          estimated_hours: 2,
          checklist: [
            { text: 'Conciliação de extratos bancários', required: true },
            { text: 'Identificação de diferenças', required: true },
            { text: 'Ajustes necessários', required: true },
            { text: 'Relatório de conciliação', required: true }
          ]
        },
        {
          id: 'atualizar_fluxo_caixa',
          title: 'Atualizar Fluxo de Caixa Real x Projetado',
          description: 'Comparar fluxo de caixa real com o projetado',
          type: 'analise_financeira',
          priority: 'high',
          estimated_hours: 2,
          checklist: [
            { text: 'Atualização do fluxo real', required: true },
            { text: 'Comparação com projeção', required: true },
            { text: 'Análise de desvios', required: true },
            { text: 'Ajustes na projeção', required: true }
          ]
        },
        {
          id: 'classificar_despesas_receitas',
          title: 'Classificar Despesas e Receitas',
          description: 'Classificar todas as despesas e receitas do mês',
          type: 'administrativo',
          priority: 'high',
          estimated_hours: 2,
          checklist: [
            { text: 'Classificação de despesas', required: true },
            { text: 'Classificação de receitas', required: true },
            { text: 'Análise de categorias', required: true },
            { text: 'Identificação de anomalias', required: true }
          ]
        },
        {
          id: 'controle_estoque',
          title: 'Controle de Estoque (se aplicável)',
          description: 'Realizar controle de estoque mensal',
          type: 'administrativo',
          priority: 'medium',
          estimated_hours: 1,
          checklist: [
            { text: 'Inventário mensal', required: false },
            { text: 'Análise de giro', required: false },
            { text: 'Identificação de obsolescência', required: false },
            { text: 'Ajustes de valor', required: false }
          ]
        },
        {
          id: 'dre_gerencial_mensal',
          title: 'DRE Gerencial Mensal',
          description: 'Elaborar DRE gerencial mensal',
          type: 'relatorio_financeiro',
          priority: 'high',
          estimated_hours: 1,
          checklist: [
            { text: 'DRE mensal consolidada', required: true },
            { text: 'Análise de margens', required: true },
            { text: 'Comparação com mês anterior', required: true },
            { text: 'Análise de tendências', required: true }
          ]
        }
      ]
    },
    {
      id: 'relatorios_acompanhamento',
      name: 'Fase 3 - Relatórios e Acompanhamento (mensal)',
      description: 'Elaboração de relatórios e reuniões de acompanhamento',
      order: 3,
      estimated_hours: 4,
      required: true,
      recurring: true,
      tasks: [
        {
          id: 'preparar_relatorios_financeiros',
          title: 'Preparar Relatórios Financeiros',
          description: 'Elaborar relatórios financeiros mensais',
          type: 'relatorio_financeiro',
          priority: 'high',
          estimated_hours: 2,
          checklist: [
            { text: 'Relatório de fluxo de caixa', required: true },
            { text: 'DRE gerencial', required: true },
            { text: 'Indicadores financeiros', required: true },
            { text: 'Análise de performance', required: true }
          ]
        },
        {
          id: 'reuniao_performance_financeira',
          title: 'Reunião de Performance Financeira',
          description: 'Reunião mensal com empresário para análise de performance',
          type: 'reuniao_alinhamento',
          priority: 'high',
          estimated_hours: 2,
          checklist: [
            { text: 'Apresentação dos resultados', required: true },
            { text: 'Análise de indicadores', required: true },
            { text: 'Identificação de problemas', required: true },
            { text: 'Definição de ações corretivas', required: true }
          ]
        }
      ]
    },
    {
      id: 'evolucao_estrategia',
      name: 'Fase 4 - Evolução e Estratégia (trimestral)',
      description: 'Revisão estratégica e definição de metas trimestrais',
      order: 4,
      estimated_hours: 8,
      required: true,
      recurring: true,
      frequency: 'quarterly',
      tasks: [
        {
          id: 'revisar_precificacao_margens',
          title: 'Revisar Precificação e Margens',
          description: 'Revisão trimestral de precificação e margens',
          type: 'planejamento_estrategico',
          priority: 'high',
          estimated_hours: 2,
          checklist: [
            { text: 'Análise de precificação atual', required: true },
            { text: 'Revisão de margens', required: true },
            { text: 'Comparação com mercado', required: true },
            { text: 'Ajustes necessários', required: true }
          ]
        },
        {
          id: 'avaliar_crescimento_lucratividade',
          title: 'Avaliar Crescimento e Lucratividade',
          description: 'Avaliar crescimento de receita e lucratividade',
          type: 'analise_financeira',
          priority: 'high',
          estimated_hours: 2,
          checklist: [
            { text: 'Análise de crescimento de receita', required: true },
            { text: 'Análise de evolução da lucratividade', required: true },
            { text: 'Comparação com metas', required: true },
            { text: 'Identificação de tendências', required: true }
          ]
        },
        {
          id: 'definir_metas_trimestre',
          title: 'Definir Metas Financeiras',
          description: 'Definir metas financeiras para o próximo trimestre',
          type: 'planejamento_estrategico',
          priority: 'high',
          estimated_hours: 2,
          checklist: [
            { text: 'Metas de receita', required: true },
            { text: 'Metas de lucratividade', required: true },
            { text: 'Metas de redução de custos', required: true },
            { text: 'Plano de ação', required: true }
          ]
        },
        {
          id: 'implementar_melhorias',
          title: 'Implementar Melhorias Estratégicas',
          description: 'Implementar melhorias identificadas na análise',
          type: 'implementacao',
          priority: 'medium',
          estimated_hours: 2,
          checklist: [
            { text: 'Novas linhas de receita', required: false },
            { text: 'Redução de inadimplência', required: false },
            { text: 'Otimização de processos', required: false },
            { text: 'Melhorias no sistema', required: false }
          ]
        }
      ]
    }
  ],
  
  // KPIs padrão da gestão financeira 360
  default_kpis: [
    {
      id: 'fluxo_caixa_projetado_realizado',
      name: 'Fluxo de Caixa Projetado vs Realizado (R$ e %)',
      description: 'Comparação entre fluxo de caixa projetado e realizado',
      category: 'liquidez',
      formula: '(Realizado - Projetado) / Projetado * 100',
      target_value: 0,
      alert_thresholds: {
        low: -10,
        high: 10
      },
      frequency: 'monthly'
    },
    {
      id: 'margem_contribuicao_360',
      name: 'Margem de Contribuição (%)',
      description: 'Margem de contribuição mensal',
      category: 'rentabilidade',
      formula: '(Receita - Custos Variáveis) / Receita * 100',
      target_value: 40,
      alert_thresholds: {
        low: 30,
        high: 50
      },
      frequency: 'monthly'
    },
    {
      id: 'margem_liquida_360',
      name: 'Margem Líquida (%)',
      description: 'Margem líquida mensal',
      category: 'rentabilidade',
      formula: 'Lucro Líquido / Receita Líquida * 100',
      target_value: 15,
      alert_thresholds: {
        low: 10,
        high: 25
      },
      frequency: 'monthly'
    },
    {
      id: 'ponto_equilibrio_360',
      name: 'Ponto de Equilíbrio (R$ e Unidades)',
      description: 'Ponto de equilíbrio mensal',
      category: 'operacional',
      formula: 'Custos Fixos / Margem de Contribuição',
      target_value: null,
      alert_thresholds: {
        low: null,
        high: null
      },
      frequency: 'monthly'
    },
    {
      id: 'endividamento_total_360',
      name: 'Endividamento Total (R$ e % da Receita)',
      description: 'Endividamento total da empresa',
      category: 'endividamento',
      formula: 'Total de Dívidas / Receita Anual * 100',
      target_value: 30,
      alert_thresholds: {
        low: 20,
        high: 40
      },
      frequency: 'monthly'
    },
    {
      id: 'prazo_medio_recebimento_pagamento_360',
      name: 'Prazo Médio Recebimento x Pagamento',
      description: 'Diferença entre prazo médio de recebimento e pagamento',
      category: 'operacional',
      formula: 'Prazo Médio Recebimento - Prazo Médio Pagamento',
      target_value: 0,
      alert_thresholds: {
        low: -15,
        high: 15
      },
      frequency: 'monthly'
    },
    {
      id: 'lucratividade_mensal',
      name: 'Lucratividade Mensal (%)',
      description: 'Lucratividade mensal da empresa',
      category: 'rentabilidade',
      formula: 'Lucro Líquido / Receita Líquida * 100',
      target_value: 15,
      alert_thresholds: {
        low: 10,
        high: 25
      },
      frequency: 'monthly'
    },
    {
      id: 'evolucao_receita_lucro_trimestre',
      name: 'Evolução Receita x Lucro no Trimestre',
      description: 'Evolução de receita e lucro no trimestre',
      category: 'crescimento',
      formula: '(Lucro Trimestre Atual - Lucro Trimestre Anterior) / Lucro Trimestre Anterior * 100',
      target_value: 10,
      alert_thresholds: {
        low: 5,
        high: 20
      },
      frequency: 'quarterly'
    }
  ],
  
  // Configurações
  cycle_frequency: 'monthly',
  approval_policy: 'manual_approve',
  template_category: 'premium',
  
  // Briefing específico
  briefing_template: {
    title: 'Briefing de Gestão Financeira 360',
    description: 'Coleta de informações para implementação da gestão financeira completa',
    questions: [
      {
        id: 'situacao_atual_gestao',
        text: 'Como está a gestão financeira atual da empresa?',
        type: 'long_text',
        required: true
      },
      {
        id: 'principais_problemas',
        text: 'Quais são os principais problemas financeiros enfrentados?',
        type: 'long_text',
        required: true
      },
      {
        id: 'objetivos_gestao',
        text: 'Quais são os objetivos com a gestão financeira 360?',
        type: 'long_text',
        required: true
      },
      {
        id: 'sistema_atual',
        text: 'Que sistema ou planilhas são usadas atualmente?',
        type: 'long_text',
        required: true
      }
    ]
  }
};

// Exportar todos os templates
export const DEFAULT_SERVICE_TEMPLATES = {
  diagnostico_financeiro: DIAGNOSTICO_FINANCEIRO_TEMPLATE,
  mentoria_precificacao: MENTORIA_PRECIFICACAO_TEMPLATE,
  gestao_financeira_360: GESTAO_FINANCEIRA_360_TEMPLATE
};

export default DEFAULT_SERVICE_TEMPLATES;

