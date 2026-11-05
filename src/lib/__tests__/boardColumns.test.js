import { describe, it, expect } from 'vitest';
import {
  DEFAULT_BOARD_COLUMNS,
  normalizeBoardColumns,
  resolveBoardColumns,
  columnIdForTask,
  groupTasksByColumn,
  sortColumnTasks,
  planColumnDrop,
} from '@/lib/boardColumns';

const CUSTOM = [
  { id: 'a', name: 'Ideias', status: 'backlog' },
  { id: 'b', name: 'Fazendo', status: 'in_progress' },
  { id: 'c', name: 'Aprovação', status: 'in_progress' },
  { id: 'd', name: 'Feito', status: 'completed' },
];

describe('normalizeBoardColumns', () => {
  it('descarta itens inválidos e corrige ids e tipos', () => {
    const cols = normalizeBoardColumns([
      { id: 'x', name: '  Um  ', status: 'todo' },
      { id: 'x', name: 'Dois', status: 'inventado' },
      { name: '' },
      null,
    ]);
    expect(cols).toHaveLength(2);
    expect(cols[0]).toEqual({ id: 'x', name: 'Um', status: 'todo' });
    expect(cols[1].id).not.toBe('x');
    expect(cols[1].status).toBe('todo');
  });

  it('aceita JSON em string e devolve null para vazio', () => {
    expect(normalizeBoardColumns(JSON.stringify(CUSTOM))).toHaveLength(4);
    expect(normalizeBoardColumns([])).toBeNull();
    expect(normalizeBoardColumns(null)).toBeNull();
    expect(normalizeBoardColumns('não é json')).toBeNull();
  });
});

describe('resolveBoardColumns', () => {
  it('cliente > agência > padrão', () => {
    expect(resolveBoardColumns({}).source).toBe('default');
    expect(resolveBoardColumns({}).columns).toHaveLength(DEFAULT_BOARD_COLUMNS.length);
    expect(resolveBoardColumns({ agency: { board_columns: CUSTOM } }).source).toBe('agency');
    expect(
      resolveBoardColumns({
        agency: { board_columns: CUSTOM },
        client: { board_columns: [{ id: 'z', name: 'Só', status: 'todo' }] },
      }).source
    ).toBe('client');
    expect(
      resolveBoardColumns({ agency: { board_columns: CUSTOM }, client: { board_columns: null } }).source
    ).toBe('agency');
  });
});

describe('columnIdForTask', () => {
  it('usa a coluna salva quando ainda existe', () => {
    expect(columnIdForTask({ status: 'in_progress', boardColumnId: 'c' }, CUSTOM)).toBe('c');
  });

  it('ignora a coluna salva se o status mudou fora do quadro', () => {
    expect(columnIdForTask({ status: 'completed', boardColumnId: 'c' }, CUSTOM)).toBe('d');
  });

  it('cai na primeira coluna do mesmo tipo quando a coluna salva sumiu', () => {
    expect(columnIdForTask({ status: 'in_progress', boardColumnId: 'apagada' }, CUSTOM)).toBe('b');
    expect(columnIdForTask({ status: 'completed' }, CUSTOM)).toBe('d');
    expect(columnIdForTask({ status: 'backlog' }, CUSTOM)).toBe('a');
  });

  it('usa tipos parecidos e aliases antigos', () => {
    expect(columnIdForTask({ status: 'in_review' }, CUSTOM)).toBe('b');
    expect(columnIdForTask({ status: 'todo' }, CUSTOM)).toBe('a');
    expect(columnIdForTask({ status: 'done' }, CUSTOM)).toBe('d');
  });

  it('concluída sem coluna de concluídas vai para a última', () => {
    const cols = [
      { id: 'p', name: 'P', status: 'todo' },
      { id: 'q', name: 'Q', status: 'in_progress' },
    ];
    expect(columnIdForTask({ status: 'completed' }, cols)).toBe('q');
  });

  it('tarefas antigas caem certo nas colunas padrão', () => {
    const grouped = groupTasksByColumn(
      [{ id: 1, status: 'todo' }, { id: 2, status: 'blocked' }, { id: 3, status: 'completed' }],
      DEFAULT_BOARD_COLUMNS
    );
    expect(grouped.todo.map((t) => t.id)).toEqual([1]);
    expect(grouped.blocked.map((t) => t.id)).toEqual([2]);
    expect(grouped.completed.map((t) => t.id)).toEqual([3]);
  });
});


describe('ordem dentro da coluna', () => {
  it('ordena por posição e deixa os sem posição no fim, na ordem original', () => {
    const sorted = sortColumnTasks([
      { id: 'x' },
      { id: 'b', boardPosition: 2000 },
      { id: 'y' },
      { id: 'a', boardPosition: 1000 },
    ]);
    expect(sorted.map((t) => t.id)).toEqual(['a', 'b', 'x', 'y']);
  });

  it('encaixa entre vizinhos com posição mudando só o card movido', () => {
    const col = [
      { id: 'a', boardPosition: 1000 },
      { id: 'b', boardPosition: 2000 },
    ];
    expect(planColumnDrop({ columnTasks: col, taskId: 'n', destIndex: 1 })).toEqual([
      { id: 'n', boardPosition: 1500 },
    ]);
    expect(planColumnDrop({ columnTasks: col, taskId: 'n', destIndex: 0 })).toEqual([
      { id: 'n', boardPosition: 0 },
    ]);
    expect(planColumnDrop({ columnTasks: col, taskId: 'n', destIndex: 2 })).toEqual([
      { id: 'n', boardPosition: 3000 },
    ]);
    expect(planColumnDrop({ columnTasks: [], taskId: 'n', destIndex: 0 })).toEqual([
      { id: 'n', boardPosition: 1000 },
    ]);
  });

  it('reordena dentro da mesma coluna', () => {
    const col = [
      { id: 'a', boardPosition: 1000 },
      { id: 'b', boardPosition: 2000 },
      { id: 'c', boardPosition: 3000 },
    ];
    // "a" vai para o fim (destIndex 2 na lista sem "a")
    expect(planColumnDrop({ columnTasks: col, taskId: 'a', destIndex: 2 })).toEqual([
      { id: 'a', boardPosition: 4000 },
    ]);
  });

  it('renumera quando o vizinho de cima ainda não tem posição', () => {
    const col = [{ id: 'x' }, { id: 'y' }];
    const updates = planColumnDrop({ columnTasks: col, taskId: 'n', destIndex: 1 });
    expect(updates).toEqual([
      { id: 'x', boardPosition: 1000 },
      { id: 'n', boardPosition: 2000 },
      { id: 'y', boardPosition: 3000 },
    ]);
    // aplicado, a ordem fica x, n, y
    const applied = sortColumnTasks(
      [...col, { id: 'n' }].map((t) => ({ ...t, ...updates.find((u) => u.id === t.id) }))
    );
    expect(applied.map((t) => t.id)).toEqual(['x', 'n', 'y']);
  });

  it('renumera quando não há espaço entre os vizinhos', () => {
    const col = [
      { id: 'a', boardPosition: 1 },
      { id: 'b', boardPosition: 1 + 1e-9 },
    ];
    const updates = planColumnDrop({ columnTasks: col, taskId: 'n', destIndex: 1 });
    expect(updates.map((u) => u.id)).toEqual(['a', 'n', 'b']);
  });
});
