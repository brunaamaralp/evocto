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
