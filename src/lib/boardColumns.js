/**
 * Colunas personalizáveis do quadro de tarefas.
 *
 * Cada coluna tem nome livre e um "tipo" (status base). O status base mantém o
 * resto do sistema funcionando (atrasadas, concluídas, minhas tarefas…):
 * mover um card grava `boardColumnId` (a coluna) e `status` (o tipo dela).
 *
 * Onde fica salvo (sem mudar schema — vai no payload JSON da linha):
 *   Agency.board_columns → padrão da agência (quadro geral e clientes sem colunas próprias)
 *   Client.board_columns → colunas próprias do cliente (opcional)
 */

import { opsKanbanColumnForTask } from '@/lib/taskStatusTransition';

/** Tipos de coluna (status base), na ordem exibida no editor. */
export const COLUMN_STATUS_OPTIONS = Object.freeze([
  { id: 'backlog', label: 'Fila' },
  { id: 'todo', label: 'A fazer' },
  { id: 'in_progress', label: 'Em andamento' },
  { id: 'in_review', label: 'Em revisão' },
  { id: 'blocked', label: 'Bloqueada' },
  { id: 'completed', label: 'Concluída' },
]);

const STATUS_IDS = COLUMN_STATUS_OPTIONS.map((s) => s.id);
const STATUS_SET = new Set(STATUS_IDS);

export const MAX_COLUMNS = 12;
export const MAX_COLUMN_NAME = 40;

/** Colunas de fábrica (iguais ao quadro antigo). Ids = status, para tarefas antigas caírem certo. */
export const DEFAULT_BOARD_COLUMNS = Object.freeze([
  { id: 'backlog', name: 'Fila', status: 'backlog' },
  { id: 'todo', name: 'A fazer', status: 'todo' },
  { id: 'in_progress', name: 'Em andamento', status: 'in_progress' },
  { id: 'in_review', name: 'Em revisão', status: 'in_review' },
  { id: 'blocked', name: 'Bloqueado', status: 'blocked' },
  { id: 'completed', name: 'Concluído', status: 'completed' },
]);

export function newColumnId() {
  return `col_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
}

/**
 * Valida/normaliza uma lista vinda do banco ou do editor.
 * @returns {object[]|null} null quando não há lista utilizável
 */
export function normalizeBoardColumns(raw) {
  let list = raw;
  if (typeof list === 'string') {
    try {
      list = JSON.parse(list);
    } catch {
      return null;
    }
  }
  if (!Array.isArray(list)) return null;

  const seen = new Set();
  const out = [];
  for (const col of list) {
    if (!col || typeof col !== 'object') continue;
    const name = String(col.name ?? '').trim().slice(0, MAX_COLUMN_NAME);
    if (!name) continue;
    let id = String(col.id ?? '').trim();
    if (!id || seen.has(id)) id = newColumnId();
    seen.add(id);
    const status = STATUS_SET.has(col.status) ? col.status : 'todo';
    out.push({ id, name, status });
    if (out.length >= MAX_COLUMNS) break;
  }
  return out.length > 0 ? out : null;
}

/**
 * Colunas efetivas do quadro.
 * @returns {{ columns: object[], source: 'client'|'agency'|'default' }}
 */
export function resolveBoardColumns({ agency = null, client = null } = {}) {
  const fromClient = normalizeBoardColumns(client?.board_columns);
  if (fromClient) return { columns: fromClient, source: 'client' };
  const fromAgency = normalizeBoardColumns(agency?.board_columns);
  if (fromAgency) return { columns: fromAgency, source: 'agency' };
  return { columns: DEFAULT_BOARD_COLUMNS.map((c) => ({ ...c })), source: 'default' };
}

/** Status base da tarefa (resolve aliases antigos). */
export function baseStatusForTask(task) {
  return opsKanbanColumnForTask(task, { columns: STATUS_IDS });
}

/**
 * Coluna em que a tarefa aparece.
 * 1. `boardColumnId` salvo, ainda existente e do mesmo tipo do status atual → essa coluna.
 *    (Se o status mudou fora do quadro — drawer, lista — a coluna salva é ignorada.)
 * 2. Senão, a primeira coluna do mesmo tipo do status da tarefa.
 * 3. Senão, tipo "parecido" (revisão/bloqueada → andamento; fila → a fazer).
 * 4. Senão, a primeira coluna (ou a última, se a tarefa está concluída).
 */
export function columnIdForTask(task, columns = []) {
  if (!columns.length) return null;
  const status = baseStatusForTask(task);
  const saved = task?.boardColumnId ? String(task.boardColumnId) : '';
  if (saved && columns.some((c) => c.id === saved && c.status === status)) return saved;

  const byStatus = (s) => columns.find((c) => c.status === s)?.id || null;
  const fallbacks = {
    in_review: ['in_progress', 'todo'],
    blocked: ['in_progress', 'todo', 'backlog'],
    backlog: ['todo'],
    todo: ['backlog'],
    in_progress: ['todo'],
    completed: [],
  };
  const direct = byStatus(status);
  if (direct) return direct;
  for (const s of fallbacks[status] || []) {
    const id = byStatus(s);
    if (id) return id;
  }
  return status === 'completed' ? columns[columns.length - 1].id : columns[0].id;
}

/** Agrupa tarefas por coluna (todas as colunas presentes, mesmo vazias). */
export function groupTasksByColumn(tasks = [], columns = []) {
  const map = Object.fromEntries(columns.map((c) => [c.id, []]));
  for (const task of Array.isArray(tasks) ? tasks : []) {
    if (!task) continue;
    const id = columnIdForTask(task, columns);
    if (id && map[id]) map[id].push(task);
  }
  return map;
}

export function columnStatusLabel(status) {
  return COLUMN_STATUS_OPTIONS.find((s) => s.id === status)?.label || status;
}
