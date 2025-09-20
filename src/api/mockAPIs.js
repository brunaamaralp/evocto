// Mock APIs para funcionamento dos novos componentes
// TODO: Implementar APIs reais no backend

/**
 * Mock API para dados do dashboard executivo
 */
export const mockClientDashboardAPI = {
  async getDashboardData(clientId, serviceId, period = '3m') {
    // Simular delay de API
    await new Promise(resolve => setTimeout(resolve, 500));
    
    return {
      cliente: {
        id: clientId,
        nome: "Oficina Bom Torque"
      },
      servico: {
        id: serviceId,
        nome: "Mentoria em Aumento de Margem",
        tipo: "mentoria_margem"
      },
      kpis: [
        {
          key: "receita_mensal",
          label: "Receita mensal",
          unit: "BRL",
          value: 128000,
          target: null,
          visible: true
        },
        {
          key: "margem_percent",
          label: "Margem (%)",
          unit: "%",
          value: 15.2,
          target: 18.0,
          visible: true
        },
        {
          key: "fluxo_saldo",
          label: "Fluxo de caixa (saldo)",
          unit: "BRL",
          value: 24500,
          target: null,
          visible: true
        },
        {
          key: "inadimplencia_percent",
          label: "Inadimplência (%)",
          unit: "%",
          value: 11.0,
          target: 8.0,
          visible: true
        }
      ],
      metas: [
        {
          key: "margem_percent",
          label: "Margem alvo",
          target: 18.0,
          current: 15.2,
          progress: 0.84
        }
      ],
      insights: [
        "Sua margem subiu +0,3 pp no mês e está 2,8 pp abaixo da meta (18%).",
        "Inadimplência acima do alvo: priorize cobrança e revisão de crédito."
      ]
    };
  },

  async getProgressData(clientId, serviceId) {
    await new Promise(resolve => setTimeout(resolve, 300));
    
    return {
      overallProgress: 68,
      phaseProgress: [
        { name: 'Diagnóstico', progress: 100, status: 'completed', deliverables: 3 },
        { name: 'Planejamento', progress: 85, status: 'in_progress', deliverables: 2 },
        { name: 'Implementação', progress: 45, status: 'in_progress', deliverables: 1 },
        { name: 'Monitoramento', progress: 0, status: 'pending', deliverables: 0 }
      ],
      deliverables: [
        { name: 'Relatório de Diagnóstico', status: 'completed', completedAt: '2025-01-10' },
        { name: 'Plano de Ação', status: 'completed', completedAt: '2025-01-15' },
        { name: 'Análise de Mercado', status: 'completed', completedAt: '2025-01-12' },
        { name: 'Estratégia de Preços', status: 'in_progress', dueDate: '2025-01-25' },
        { name: 'Implementação de Processos', status: 'pending', dueDate: '2025-02-01' }
      ],
      nextSteps: [
        { title: 'Revisar Relatório Mensal', priority: 'alta', dueDate: 'Em 5 dias' },
        { title: 'Implementar Sugestões de Margem', priority: 'média', dueDate: 'Em 10 dias' },
        { title: 'Reunião de Acompanhamento', priority: 'baixa', dueDate: 'Em 15 dias' }
      ],
      milestones: [
        { name: 'Diagnóstico Concluído', achieved: true, date: '2025-01-10' },
        { name: 'Plano Aprovado', achieved: true, date: '2025-01-15' },
        { name: 'Implementação Iniciada', achieved: false, date: '2025-02-01' },
        { name: 'Primeiros Resultados', achieved: false, date: '2025-03-01' }
      ]
    };
  },

  async getInsights(clientId, serviceId) {
    await new Promise(resolve => setTimeout(resolve, 200));
    
    return {
      insights: [
        "Sua margem subiu +0,3 pp no mês e está 2,8 pp abaixo da meta (18%).",
        "Inadimplência acima do alvo: priorize cobrança e revisão de crédito.",
        "Receita cresceu 4% no mês - mantenha o foco na qualidade."
      ],
      recommendations: [
        "Revisar política de crédito para reduzir inadimplência",
        "Implementar estratégias de precificação para aumentar margem",
        "Otimizar fluxo de caixa com melhor gestão de recebimentos"
      ]
    };
  }
};

/**
 * Mock API para dados educativos
 */
export const mockEducationalAPI = {
  async getKPIDefinitions() {
    await new Promise(resolve => setTimeout(resolve, 200));
    
    return [
      {
        id: 'receita_mensal',
        name: 'Receita Mensal',
        shortDescription: 'Total de vendas realizadas no mês',
        fullDescription: 'A receita mensal representa todo o dinheiro que sua empresa recebeu através de vendas de produtos ou serviços em um mês específico.',
        whyImportant: 'A receita é o ponto de partida para calcular a lucratividade.',
        howToImprove: 'Para aumentar a receita: melhore a qualidade dos produtos, invista em marketing.',
        examples: ['Loja que vendeu R$ 50.000 em produtos no mês'],
        target: 'Crescer 10-15% ao mês é um bom objetivo'
      },
      {
        id: 'margem_percent',
        name: 'Margem de Lucro',
        shortDescription: 'Percentual de lucro sobre as vendas',
        fullDescription: 'A margem de lucro mostra quanto você ganha de cada real vendido, após descontar todos os custos.',
        whyImportant: 'Uma margem saudável garante que você tenha dinheiro para investir e crescer.',
        howToImprove: 'Para melhorar a margem: reduza custos desnecessários, aumente preços estrategicamente.',
        examples: ['Margem de 20% = R$ 0,20 de lucro para cada R$ 1,00 vendido'],
        target: 'Margem entre 15-25% é considerada saudável'
      }
    ];
  },

  async getProjectPhases() {
    await new Promise(resolve => setTimeout(resolve, 200));
    
    return [
      {
        id: 'diagnostico',
        name: 'Diagnóstico',
        description: 'Análise completa da situação atual do seu negócio',
        duration: '1-2 semanas',
        deliverables: ['Relatório de Diagnóstico', 'Análise de Mercado'],
        whatHappens: 'Coletamos dados sobre sua empresa e identificamos pontos de melhoria.',
        whyImportant: 'Sem diagnóstico preciso, não sabemos por onde começar as melhorias.'
      },
      {
        id: 'planejamento',
        name: 'Planejamento',
        description: 'Criação do plano de ação para alcançar seus objetivos',
        duration: '1 semana',
        deliverables: ['Plano de Ação', 'Cronograma'],
        whatHappens: 'Definimos estratégias e estabelecemos metas claras.',
        whyImportant: 'Um bom plano é a base para o sucesso de qualquer projeto.'
      }
    ];
  },

  async getGlossary() {
    await new Promise(resolve => setTimeout(resolve, 200));
    
    return [
      {
        id: 'kpi',
        term: 'KPI',
        fullName: 'Key Performance Indicator',
        description: 'Indicador-chave de performance que mostra se você está atingindo seus objetivos',
        example: 'Receita mensal, margem de lucro, número de clientes'
      },
      {
        id: 'roi',
        term: 'ROI',
        fullName: 'Return on Investment',
        description: 'Retorno sobre investimento - quanto você ganha para cada real investido',
        example: 'ROI de 200% significa que você ganha R$ 2,00 para cada R$ 1,00 investido'
      }
    ];
  }
};

/**
 * Mock API para onboarding
 */
export const mockOnboardingAPI = {
  async getOnboardingProgress(clientId) {
    await new Promise(resolve => setTimeout(resolve, 200));
    
    const completedSteps = localStorage.getItem(`onboarding_steps_${clientId}`);
    return {
      completedSteps: completedSteps ? JSON.parse(completedSteps) : [],
      currentStep: 0,
      isCompleted: false
    };
  },

  async completeStep(clientId, stepId) {
    await new Promise(resolve => setTimeout(resolve, 200));
    
    const completedSteps = JSON.parse(localStorage.getItem(`onboarding_steps_${clientId}`) || '[]');
    if (!completedSteps.includes(stepId)) {
      completedSteps.push(stepId);
      localStorage.setItem(`onboarding_steps_${clientId}`, JSON.stringify(completedSteps));
    }
    
    return { success: true };
  },

  async completeOnboarding(clientId) {
    await new Promise(resolve => setTimeout(resolve, 200));
    
    localStorage.setItem(`onboarding_completed_${clientId}`, 'true');
    return { success: true };
  }
};

/**
 * Hook para usar APIs mock
 */
export const useMockAPIs = () => {
  return {
    clientDashboard: mockClientDashboardAPI,
    educational: mockEducationalAPI,
    onboarding: mockOnboardingAPI
  };
};

