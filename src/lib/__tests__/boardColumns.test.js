import { describe, it, expect } from 'vitest';
import {
  DEFAULT_BOARD_COLUMNS,
  normalizeBoardColumns,
  resolveBoardColumns,
  columnIdForTask,
  groupTasksByColumn,
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
