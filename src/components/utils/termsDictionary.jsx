/**
 * Dicionário de Termos Consistentes - Evocto MVP
 * Padronização de linguagem em toda aplicação
 */

export const TERMS = {
  // Entidades principais
  ENTITIES: {
    CLIENT: 'Cliente',
    CLIENTS: 'Clientes',
    AGENCY: 'Agência', // Consistente em toda app
    SERVICE: 'Serviço',
    SERVICES: 'Serviços',
    TASK: 'Tarefa',
    TASKS: 'Tarefas',
    PROJECT: 'Projeto',
    PROJECTS: 'Projetos',
    USER: 'Usuário',
    USERS: 'Usuários'
  },

  // Status consistentes
  STATUS: {
    ACTIVE: 'Ativo',
    INACTIVE: 'Inativo',
    PENDING: 'Pendente',
    COMPLETED: 'Concluído',
    IN_PROGRESS: 'Em Andamento',
    CANCELLED: 'Cancelado',
    APPROVED: 'Aprovado',
    REJECTED: 'Rejeitado'
  },

  // Roles/Permissões
  ROLES: {
    OWNER: 'Proprietário',
    ADMIN: 'Administrador', 
    TEAM: 'Equipe',
    CLIENT: 'Cliente'
  },

  // Ações consistentes
  ACTIONS: {
    CREATE: 'Criar',
    ADD: 'Adicionar',
    NEW: 'Novo',
    EDIT: 'Editar',
    UPDATE: 'Atualizar',
    DELETE: 'Excluir',
    REMOVE: 'Remover',
    SAVE: 'Salvar',
    CANCEL: 'Cancelar',
    CONFIRM: 'Confirmar',
    VIEW: 'Visualizar',
    DOWNLOAD: 'Baixar',
    UPLOAD: 'Fazer Upload',
    IMPORT: 'Importar',
    EXPORT: 'Exportar'
  },

  // Navegação
  NAVIGATION: {
    DASHBOARD: 'Painel',
    OVERVIEW: 'Visão Geral',
    SETTINGS: 'Configurações',
    PROFILE: 'Perfil',
    BACK: 'Voltar',
    NEXT: 'Próximo',
    PREVIOUS: 'Anterior',
    HOME: 'Início'
  },

  // Estados de dados
  DATA_STATES: {
    LOADING: 'Carregando...',
    ERROR: 'Erro',
    SUCCESS: 'Sucesso',
    NO_DATA: 'Nenhum dado disponível',
    EMPTY_STATE: 'Nenhum resultado encontrado',
    TRY_AGAIN: 'Tentar novamente'
  },

  // Formulários
  FORMS: {
    REQUIRED_FIELD: 'Campo obrigatório',
    OPTIONAL: 'Opcional',
    SAVE_SUCCESS: 'Dados salvos com sucesso',
    SAVE_ERROR: 'Erro ao salvar dados',
    INVALID_FORMAT: 'Formato inválido'
  },

  // Upload/Arquivos
  FILES: {
    UPLOAD: 'Fazer Upload',
    UPLOAD_SUCCESS: 'Arquivo enviado com sucesso',
    UPLOAD_ERROR: 'Erro ao enviar arquivo',
    FILE_TOO_LARGE: 'Arquivo muito grande',
    INVALID_FORMAT: 'Formato de arquivo não suportado',
    PROCESSING: 'Processando arquivo...'
  },

  // Tempo
  TIME: {
    JUST_NOW: 'Agora mesmo',
    MINUTES_AGO: 'minutos atrás',
    HOURS_AGO: 'horas atrás',
    DAYS_AGO: 'dias atrás',
    TODAY: 'Hoje',
    YESTERDAY: 'Ontem',
    THIS_WEEK: 'Esta semana',
    THIS_MONTH: 'Este mês'
  }
};

// Funções utilitárias
export const formatRole = (role) => {
  return TERMS.ROLES[role?.toUpperCase()] || role;
};

export const formatStatus = (status) => {
  return TERMS.STATUS[status?.toUpperCase()] || status;
};

export const formatAction = (action) => {
  return TERMS.ACTIONS[action?.toUpperCase()] || action;
};

// Textos de placeholder consistentes
export const PLACEHOLDERS = {
  SEARCH: 'Buscar...',
  SEARCH_CLIENTS: 'Buscar por nome, CNPJ ou setor...',
  SEARCH_SERVICES: 'Buscar por nome ou categoria...',
  EMAIL: 'seu@email.com',
  PHONE: '(11) 99999-9999',
  CNPJ: '00.000.000/0001-00',
  COMPANY_NAME: 'Nome da empresa',
  FULL_NAME: 'Nome completo'
};

// Labels de formulário consistentes
export const LABELS = {
  NAME: 'Nome',
  FULL_NAME: 'Nome Completo',
  EMAIL: 'Email',
  PHONE: 'Telefone',
  CNPJ: 'CNPJ',
  COMPANY_NAME: 'Nome da Empresa',
  LEGAL_NAME: 'Razão Social',
  SECTOR: 'Setor',
  PASSWORD: 'Senha',
  CONFIRM_PASSWORD: 'Confirmar Senha',
  DESCRIPTION: 'Descrição',
  NOTES: 'Observações'
};