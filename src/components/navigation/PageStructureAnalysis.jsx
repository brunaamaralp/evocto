/**
 * ESTRUTURA CORRIGIDA - MANTENDO CONTEXTOS DEDICADOS
 */

export const CORRECTED_PAGE_STRUCTURE = {
  // Páginas principais (navegação global)
  global: [
    {
      id: 'dashboard',
      name: 'Dashboard', 
      path: '/dashboard',
      description: 'Visão geral da agência + resumo do dia'
    },
    {
      id: 'clients',
      name: 'Clientes',
      path: '/clients', 
      description: 'Lista e gestão geral de clientes'
    },
    {
      id: 'services',
      name: 'Serviços',
      path: '/services',
      description: 'Templates e gestão de serviços'
    },
    {
      id: 'tasks', 
      name: 'Tarefas',
      path: '/tasks',
      description: 'Visão geral de todas as tarefas'
    },
    {
      id: 'library',
      name: 'Biblioteca',
      path: '/library', 
      description: 'Aprendizados e conhecimento'
    }
  ],

  // Contextos dedicados (sidebar própria)
  contexts: [
    {
      id: 'client-context',
      basePath: '/client/:id',
      sidebarType: 'client-focused',
      description: 'Contexto dedicado para trabalhar em um cliente específico',
      routes: [
        '/client/:id/overview',      // Dashboard do cliente
        '/client/:id/briefing',      // Briefing específico
        '/client/:id/services',      // Serviços ativos do cliente  
        '/client/:id/tasks',         // Tarefas do cliente
        '/client/:id/documents',     // Documentos do cliente
        '/client/:id/reports',       // Relatórios do cliente
        '/client/:id/settings'       // Configurações do cliente
      ]
    },
    {
      id: 'service-context', 
      basePath: '/service/:id',
      sidebarType: 'service-focused',
      description: 'Contexto para gerenciar um serviço específico',
      routes: [
        '/service/:id/overview',     // Visão geral do serviço
        '/service/:id/cycles',       // Ciclos de execução
        '/service/:id/tasks',        // Tarefas do serviço
        '/service/:id/approvals',    // Aprovações pendentes
        '/service/:id/reports'       // Relatórios do serviço
      ]
    }
  ],

  // Configurações e admin (sidebar normal)
  admin: [
    {
      id: 'settings',
      path: '/settings',
      description: 'Configurações da agência e perfil'
    },
    {
      id: 'team',
      path: '/team', 
      description: 'Gestão de equipe e permissões'
    }
  ]
};

/**
 * SIDEBAR DINÂMICA baseada no contexto atual
 */
export const SIDEBAR_CONFIGS = {
  // Sidebar padrão (navegação global)
  default: [
    { path: '/dashboard', label: 'Dashboard', icon: 'Home' },
    { path: '/clients', label: 'Clientes', icon: 'Users' },
    { path: '/services', label: 'Serviços', icon: 'Briefcase' },
    { path: '/tasks', label: 'Tarefas', icon: 'CheckSquare' },
    { path: '/library', label: 'Biblioteca', icon: 'BookOpen' },
    { path: '/settings', label: 'Configurações', icon: 'Settings' },
    { path: '/team', label: 'Equipe', icon: 'UserCog' }
  ],

  // Sidebar quando em contexto de cliente
  'client-focused': (clientId, clientName) => [
    { 
      type: 'header', 
      content: clientName,
      backAction: '/clients'
    },
    { path: `/client/${clientId}/overview`, label: 'Dashboard', icon: 'BarChart3' },
    { path: `/client/${clientId}/briefing`, label: 'Briefing', icon: 'FileText' },
    { path: `/client/${clientId}/services`, label: 'Serviços', icon: 'Briefcase' },
    { path: `/client/${clientId}/tasks`, label: 'Tarefas', icon: 'CheckSquare' },
    { path: `/client/${clientId}/documents`, label: 'Documentos', icon: 'FolderOpen' },
    { path: `/client/${clientId}/reports`, label: 'Relatórios', icon: 'TrendingUp' },
    { path: `/client/${clientId}/settings`, label: 'Configurações', icon: 'Settings' }
  ],

  // Sidebar quando em contexto de serviço
  'service-focused': (serviceId, serviceName) => [
    {
      type: 'header',
      content: serviceName, 
      backAction: '/services'
    },
    { path: `/service/${serviceId}/overview`, label: 'Visão Geral', icon: 'Eye' },
    { path: `/service/${serviceId}/cycles`, label: 'Ciclos', icon: 'RefreshCw' },
    { path: `/service/${serviceId}/tasks`, label: 'Tarefas', icon: 'CheckSquare' },
    { path: `/service/${serviceId}/approvals`, label: 'Aprovações', icon: 'CheckCircle' },
    { path: `/service/${serviceId}/reports`, label: 'Relatórios', icon: 'BarChart' }
  ]
};

export default CORRECTED_PAGE_STRUCTURE;