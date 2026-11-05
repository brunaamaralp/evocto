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

const POSITION_STEP = 1000;

function hasPosition(task) {
  return typeof task?.boardPosition === 'number' && Number.isFinite(task.boardPosition);
}

/**
 * Ordem dentro da coluna: cards com posição (arrastados) primeiro, pela posição;
 * depois os sem posição, na ordem em que chegaram (estável).
 */
export function sortColumnTasks(tasks = []) {
  return tasks
    .map((task, index) => ({ task, index }))
    .sort((a, b) => {
      const pa = hasPosition(a.task);
      const pb = hasPosition(b.task);
      if (pa && pb && a.task.boardPosition !== b.task.boardPosition) {
        return a.task.boardPosition - b.task.boardPosition;
      }
      if (pa !== pb) return pa ? -1 : 1;
      return a.index - b.index;
    })
    .map((x) => x.task);
}

/** Agrupa tarefas por coluna (todas as colunas presentes, mesmo vazias), já ordenadas. */
export function groupTasksByColumn(tasks = [], columns = []) {
  const map = Object.fromEntries(columns.map((c) => [c.id, []]));
  for (const task of Array.isArray(tasks) ? tasks : []) {
    if (!task) continue;
    const id = columnIdForTask(task, columns);
    if (id && map[id]) map[id].push(task);
  }
  for (const id of Object.keys(map)) map[id] = sortColumnTasks(map[id]);
  return map;
}

/**
 * Calcula as posições ao soltar um card numa coluna.
 * Na maioria dos casos só o card movido muda (posição entre os vizinhos).
 * Se os vizinhos ainda não têm posição, renumera a coluna inteira.
 *
 * @param {{ columnTasks: object[], taskId: string, destIndex: number }} input
 *   columnTasks: tarefas da coluna de destino, na ordem exibida (pode incluir o card movido)
 * @returns {{ id: string, boardPosition: number }[]} só o que muda
 */
export function planColumnDrop({ columnTasks = [], taskId, destIndex = 0 }) {
  const others = columnTasks.filter((t) => String(t.id) !== String(taskId));
  const index = Math.max(0, Math.min(destIndex, others.length));
  const prev = others[index - 1] || null;
  const next = others[index] || null;

  const canSlot = !prev || hasPosition(prev);
  if (canSlot) {
    const nextPos = next && hasPosition(next) ? next.boardPosition : null;
    let position;
    if (!prev && nextPos == null) position = POSITION_STEP;
    else if (!prev) position = nextPos - POSITION_STEP;
    else if (nextPos == null) position = prev.boardPosition + POSITION_STEP;
    else position = (prev.boardPosition + nextPos) / 2;

    const tooTight =
      prev && nextPos != null && (nextPos - prev.boardPosition < 1e-6 || position === prev.boardPosition);
    if (!tooTight) return [{ id: taskId, boardPosition: position }];
  }

  // Renumera a coluna inteira na nova ordem
  const ordered = [...others];
  ordered.splice(index, 0, { id: taskId });
  const updates = [];
  ordered.forEach((t, i) => {
    const boardPosition = (i + 1) * POSITION_STEP;
    if (String(t.id) === String(taskId) || t.boardPosition !== boardPosition) {
      updates.push({ id: t.id, boardPosition });
    }
  });
  return updates;
}

export function columnStatusLabel(status) {
  return COLUMN_STATUS_OPTIONS.find((s) => s.id === status)?.label || status;
}
