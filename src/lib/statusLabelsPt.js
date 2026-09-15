/**
 * Rótulos PT-BR para status de tarefas, entregáveis e ações de histórico.
 * Evita exibir snake_case em inglês na UI (ex.: "in progress", "not started").
 */

export const STATUS_LABELS_PT = Object.freeze({
  // Tarefas / kanban
  backlog: 'Fila',
  todo: 'A fazer',
  not_started: 'Não iniciado',
  planned: 'Planejado',
  planejamento: 'Planejamento',
  in_progress: 'Em andamento',
  doing: 'Em andamento',
  production: 'Produção',
  producao: 'Produção',
  roteiro: 'Roteiro',
  roteiros: 'Roteiros',
  script: 'Roteiro',
  drafting: 'Em elaboração',
  in_review: 'Em revisão',
  ready_for_review: 'Pronto para revisão',
  pending_approval: 'Aguardando aprovação',
  ready_for_approval: 'Aguardando aprovação',
  revisao: 'Revisão',
  review: 'Revisão',
  approved: 'Aprovado',
  completed: 'Concluído',
  done: 'Concluído',
  published: 'Publicado',
  publicacao: 'Publicação',
  blocked: 'Bloqueado',
  cancelled: 'Cancelado',
  canceled: 'Cancelado',
  rejected: 'Rejeitado',
  waiting_client: 'Aguardando cliente',
  awaiting_client: 'Aguardando cliente',

  // Tipos comuns de tarefa
  analise_documentos: 'Análise de documentos',
  coleta_dados: 'Coleta de dados',
  analise_dados: 'Análise de dados',
  analise_financeira: 'Análise financeira',
  relatorio_financeiro: 'Relatório financeiro',
  reuniao_alinhamento: 'Reunião de alinhamento',
  planejamento_estrategico: 'Planejamento estratégico',
  implementacao: 'Implementação',
  treinamento: 'Treinamento',
  administrativo: 'Administrativo',
  auditoria: 'Auditoria',
  consultoria: 'Consultoria',

  // Entregáveis / serviço
  draft: 'Rascunho',
  awaiting_approval: 'Aguardando aprovação',
  changes_requested: 'Alterações solicitadas',
  setup: 'Configuração',
  briefing_pending: 'Aguardando briefing',
  kpis_setup: 'KPIs',
  in_execution: 'Em execução',
  em_execucao: 'Em execução',
  closing: 'Finalizando',
  archived: 'Arquivado',

  // Status de campanha (planejamento)
  planejada: 'Planejada',
  planned: 'Planejada',
  em_planejamento: 'Em planejamento',
  concluida: 'Concluída',
  concluído: 'Concluído',
  finalizada: 'Finalizada',
});

export const HISTORY_ACTION_LABELS_PT = Object.freeze({
  created: 'Criado',
  updated: 'Atualizado',
  deleted: 'Excluído',
  status_changed: 'Status alterado',
  status_change: 'Status alterado',
  completed: 'Concluído',
  task_completed: 'Tarefa concluída',
  task_created: 'Tarefa criada',
  task_updated: 'Tarefa atualizada',
  advanced: 'Avançado',
  moved: 'Movido',
  assigned: 'Atribuído',
  comment_added: 'Comentário adicionado',
  checklist_updated: 'Checklist atualizado',
  attachment_added: 'Anexo adicionado',
  evento: 'Evento',
});

/**
 * @param {string|null|undefined} status
 * @param {string} [fallback='—']
 */
export function statusLabelPt(status, fallback = '—') {
  const key = String(status || '')
    .trim()
    .toLowerCase();
  if (!key) return fallback;
  return STATUS_LABELS_PT[key] || key.replace(/_/g, ' ');
}

/**
 * @param {string|null|undefined} action
 */
export function historyActionLabelPt(action) {
  const key = String(action || '')
    .trim()
    .toLowerCase();
  if (!key) return 'Evento';
  return HISTORY_ACTION_LABELS_PT[key] || statusLabelPt(key, key.replace(/_/g, ' '));
}
