// Mock function for generating tasks from cycle plan
export const generateTasksFromCyclePlan = async (cyclePlanId, options = {}) => {
  try {
    // Simular geração de tarefas baseada no plano de ciclo
    const mockTasks = [
      {
        id: `task-${Date.now()}-1`,
        title: 'Análise de Requisitos',
        description: 'Analisar requisitos do cliente',
        status: 'pending',
        priority: 'high',
        assignee: null,
        dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        estimatedHours: 8,
        phase: 'analysis'
      },
      {
        id: `task-${Date.now()}-2`,
        title: 'Desenvolvimento Inicial',
        description: 'Implementar funcionalidades básicas',
        status: 'pending',
        priority: 'medium',
        assignee: null,
        dueDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
        estimatedHours: 16,
        phase: 'development'
      },
      {
        id: `task-${Date.now()}-3`,
        title: 'Testes e Validação',
        description: 'Executar testes e validar funcionalidades',
        status: 'pending',
        priority: 'high',
        assignee: null,
        dueDate: new Date(Date.now() + 21 * 24 * 60 * 60 * 1000).toISOString(),
        estimatedHours: 12,
        phase: 'testing'
      }
    ];

    return {
      success: true,
      tasks: mockTasks,
      message: `${mockTasks.length} tarefas geradas com sucesso`
    };
  } catch (error) {
    console.error('Erro ao gerar tarefas do plano de ciclo:', error);
    return {
      success: false,
      tasks: [],
      error: error.message
    };
  }
};




