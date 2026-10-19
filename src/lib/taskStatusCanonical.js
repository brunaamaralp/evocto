/**
 * Mapa canônico de status de tarefas (Fase A UX).
 * Rótulo PT + cor Soft UI (pastéis) + nome de ícone Lucide.
 * Aliases resolvem para o id canônico sem alterar dados persistidos.
 */

import { STAGE_ALIASES, STAGE_PASTELS, getStagePastel } from '@/lib/modulePastels';

/** Status canônicos de tarefa (UI). icon = nome Lucide. */
export const TASK_STATUS_CANONICAL = Object.freeze({
  backlog: {
    id: 'backlog',
    label: 'Fila',
    icon: 'Circle',
    description: 'Aguardando priorização',
    semantic: 'neutral',
  },
  todo: {
    id: 'todo',
    label: 'A fazer',
    icon: 'Circle',
    description: 'Pronta para início',
    semantic: 'info',
  },
  in_progress: {
    id: 'in_progress',
    label: 'Em andamento',
    icon: 'Play',
    description: 'Sendo executada',
    semantic: 'warning',
  },
  in_review: {
    id: 'in_review',
    label: 'Em revisão',
    icon: 'Eye',
    description: 'Aguardando revisão',
    semantic: 'info',
  },
  completed: {
    id: 'completed',
    label: 'Concluído',
    icon: 'CheckCircle',
    description: 'Tarefa finalizada',
    semantic: 'success',
  },
  blocked: {
    id: 'blocked',
    label: 'Bloqueado',
    icon: 'AlertTriangle',
    description: 'Com impedimentos',
    semantic: 'danger',
  },
  cancelled: {
    id: 'cancelled',
    label: 'Cancelado',
    icon: 'XCircle',
    description: 'Não será executada',
    semantic: 'neutral',
  },
  waiting_client: {
    id: 'waiting_client',
    label: 'Aguardando cliente',
    icon: 'Clock',
    description: 'Dependência do cliente',
    semantic: 'warning',
  },
  not_started: {
    id: 'not_started',
    label: 'Não iniciado',
    icon: 'Pause',
    description: 'Aguardando início',
    semantic: 'neutral',
  },
});

/** Colunas do kanban operacional (ordem de exibição). */
export const TASK_KANBAN_COLUMN_IDS = Object.freeze([
  'backlog',
  'todo',
  'in_progress',
  'in_review',
  'completed',
  'blocked',
]);

/** Opções do seletor de status no drawer (ordem estável). */
export const TASK_STATUS_SELECT_IDS = Object.freeze([
  'backlog',
  'todo',
  'in_progress',
  'in_review',
  'waiting_client',
  'completed',
  'blocked',
  'cancelled',
  'not_started',
]);

const EXTRA_ALIASES = Object.freeze({
  a_fazer: 'todo',
  to_do: 'todo',
  open: 'todo',
  doing: 'in_progress',
  em_andamento: 'in_progress',
  production: 'in_progress',
  producao: 'in_progress',
  review: 'in_review',
  em_revisao: 'in_review',
  revisao: 'in_review',
  ready_for_review: 'in_review',
  pending_approval: 'in_review',
  ready_for_approval: 'in_review',
  awaiting_approval: 'in_review',
  done: 'completed',
  concluido: 'completed',
  concluída: 'completed',
  concluida: 'completed',
  published: 'completed',
  approved: 'completed',
  canceled: 'cancelled',
  awaiting_client: 'waiting_client',
  waiting: 'waiting_client',
  pending: 'todo',
  planning: 'backlog',
  roteiro: 'todo',
  roteiros: 'todo',
  script: 'todo',
  drafting: 'in_progress',
});

/**
 * @param {string|null|undefined} status
 * @returns {string} id canônico
 */
export function resolveTaskStatusId(status) {
  const key = String(status || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '_');
  if (!key) return 'todo';
  if (TASK_STATUS_CANONICAL[key]) return key;
  if (EXTRA_ALIASES[key]) return EXTRA_ALIASES[key];
  if (STAGE_ALIASES[key] && TASK_STATUS_CANONICAL[STAGE_ALIASES[key]]) {
    return STAGE_ALIASES[key];
  }
  return 'todo';
}

/**
 * Config visual completa para um status (rótulo, ícone Lucide name, pastéis Soft UI).
 * @param {string|null|undefined} status
 */
export function getTaskStatusConfig(status) {
  const id = resolveTaskStatusId(status);
  const meta = TASK_STATUS_CANONICAL[id] || TASK_STATUS_CANONICAL.todo;
  const pastel = getStagePastel(id);
  return {
    ...meta,
    pastel,
    badge: pastel.badge,
    column: pastel.column,
    bar: pastel.bar,
    text: pastel.text,
    dot: pastel.dot,
    /** Classes Tailwind para bolinha no select (compat Drawer). */
    kanbanColor: pastel.dot,
    color: pastel.badge,
  };
}

/**
 * Rótulo PT canônico.
 * @param {string|null|undefined} status
 * @param {string|null} [fallback='—'] use null para “sem match”
 */
export function taskStatusLabelPt(status, fallback = '—') {
  const key = String(status || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '_');
  if (!key) return fallback;
  if (TASK_STATUS_CANONICAL[key]) return TASK_STATUS_CANONICAL[key].label;
  if (EXTRA_ALIASES[key] || (STAGE_ALIASES[key] && TASK_STATUS_CANONICAL[STAGE_ALIASES[key]])) {
    return getTaskStatusConfig(key).label;
  }
  return fallback;
}

/**
 * Colunas do board com cor Soft UI alinhada ao mapa.
 */
export function getKanbanBoardColumns() {
  return TASK_KANBAN_COLUMN_IDS.map((id) => {
    const config = getTaskStatusConfig(id);
    return {
      id,
      title: config.label,
      color: config.column,
      description: config.description,
      status: id,
    };
  });
}

/**
 * Mapa id → config para Select do TaskDrawer (API compatível com STATUS_CONFIG legado).
 */
export function getTaskStatusSelectMap() {
  const map = {};
  for (const id of TASK_STATUS_SELECT_IDS) {
    const config = getTaskStatusConfig(id);
    map[id] = {
      label: config.label,
      color: config.badge,
      kanbanColor: config.dot,
      icon: config.icon,
    };
  }
  return map;
}

/** Pastéis brutos (testes / consumidores sem Lucide). */
export function getTaskStatusPastel(status) {
  return STAGE_PASTELS[resolveTaskStatusId(status)] || STAGE_PASTELS.todo;
}
