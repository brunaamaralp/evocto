import { describe, it, expect, vi, beforeEach } from 'vitest';

const update = vi.fn().mockResolvedValue({});
const completeTask = vi.fn();
const transitionTaskStatus = vi.fn();

vi.mock('@/api/entities', () => ({ Task: { update: (...a) => update(...a) } }));
vi.mock('@/lib/completeTask', () => ({
  completeTask: (...a) => completeTask(...a),
  isTaskCompletedStatus: (s) => ['completed', 'done'].includes(String(s || '')),
}));
vi.mock('@/lib/taskStatusTransition', () => ({
  transitionTaskStatus: (...a) => transitionTaskStatus(...a),
}));

const { moveTaskToColumn } = await import('../moveTaskToColumn.js');

beforeEach(() => {
  update.mockClear();
  completeTask.mockReset().mockResolvedValue({ success: true });
  transitionTaskStatus.mockReset().mockResolvedValue({ success: true });
});

describe('moveTaskToColumn', () => {
  it('coluna do tipo Concluída conclui a tarefa e grava a coluna', async () => {
    const res = await moveTaskToColumn({ id: 't1', status: 'todo' }, { id: 'feito', status: 'completed' });
    expect(res.success).toBe(true);
    expect(completeTask).toHaveBeenCalledTimes(1);
    expect(update).toHaveBeenCalledWith('t1', { boardColumnId: 'feito' });
  });

  it('troca de tipo usa a transição de status', async () => {
    await moveTaskToColumn({ id: 't1', status: 'todo' }, { id: 'x', status: 'in_review' });
    expect(transitionTaskStatus).toHaveBeenCalledWith(
      expect.objectContaining({ id: 't1' }),
      'in_review',
      expect.any(Object)
    );
    expect(update).toHaveBeenCalledWith('t1', { boardColumnId: 'x' });
  });

  it('mesmo tipo só muda a coluna', async () => {
    await moveTaskToColumn({ id: 't1', status: 'in_progress' }, { id: 'y', status: 'in_progress' });
    expect(transitionTaskStatus).not.toHaveBeenCalled();
    expect(completeTask).not.toHaveBeenCalled();
    expect(update).toHaveBeenCalledWith('t1', { boardColumnId: 'y' });
  });

  it('falha na transição não grava a coluna', async () => {
    transitionTaskStatus.mockResolvedValue({ success: false, message: 'Dependência' });
    const res = await moveTaskToColumn({ id: 't1', status: 'todo' }, { id: 'x', status: 'in_progress' });
    expect(res).toEqual({ success: false, message: 'Dependência' });
    expect(update).not.toHaveBeenCalled();
  });
});

describe('dropTaskInColumn', () => {
  it('grava coluna e posição do card e renumera vizinhos quando precisa', async () => {
    const { dropTaskInColumn } = await import('../moveTaskToColumn.js');
    const res = await dropTaskInColumn({
      task: { id: 'n', status: 'todo' },
      column: { id: 'todo', status: 'todo' },
      columnTasks: [{ id: 'x', status: 'todo' }, { id: 'y', status: 'todo' }],
      destIndex: 1,
    });
    expect(res.success).toBe(true);
    expect(update).toHaveBeenCalledWith('n', { boardColumnId: 'todo', boardPosition: 2000 });
    expect(update).toHaveBeenCalledWith('x', { boardPosition: 1000 });
    expect(update).toHaveBeenCalledWith('y', { boardPosition: 3000 });
  });

  it('reordenar na mesma coluna com vizinhos posicionados atualiza só o card', async () => {
    const { dropTaskInColumn } = await import('../moveTaskToColumn.js');
    await dropTaskInColumn({
      task: { id: 'a', status: 'todo', boardPosition: 1000 },
      column: { id: 'todo', status: 'todo' },
      columnTasks: [
        { id: 'a', boardPosition: 1000 },
        { id: 'b', boardPosition: 2000 },
        { id: 'c', boardPosition: 3000 },
      ],
      destIndex: 1,
    });
    expect(update).toHaveBeenCalledTimes(1);
    expect(update).toHaveBeenCalledWith('a', { boardColumnId: 'todo', boardPosition: 2500 });
    expect(transitionTaskStatus).not.toHaveBeenCalled();
  });
});
