import { describe, it, expect } from 'vitest';
import {
  resolveTaskStatusId,
  getTaskStatusConfig,
  taskStatusLabelPt,
  getKanbanBoardColumns,
  getTaskStatusSelectMap,
  TASK_STATUS_CANONICAL,
} from '../taskStatusCanonical.js';
import { statusLabelPt } from '../statusLabelsPt.js';

describe('taskStatusCanonical', () => {
  it('resolves aliases to canonical ids', () => {
    expect(resolveTaskStatusId('doing')).toBe('in_progress');
    expect(resolveTaskStatusId('done')).toBe('completed');
    expect(resolveTaskStatusId('pending')).toBe('todo');
    expect(resolveTaskStatusId('awaiting_client')).toBe('waiting_client');
    expect(resolveTaskStatusId('canceled')).toBe('cancelled');
    expect(resolveTaskStatusId('ready_for_review')).toBe('in_review');
  });

  it('keeps canonical ids stable', () => {
    for (const id of Object.keys(TASK_STATUS_CANONICAL)) {
      expect(resolveTaskStatusId(id)).toBe(id);
    }
  });

  it('returns consistent label, badge and icon for the same status across helpers', () => {
    const config = getTaskStatusConfig('in_progress');
    expect(config.label).toBe('Em andamento');
    expect(config.badge).toContain('text-');
    expect(config.icon).toBe('Play');
    expect(taskStatusLabelPt('doing')).toBe('Em andamento');
    expect(statusLabelPt('in_progress')).toBe('Em andamento');
  });

  it('preserves explicit non-task labels like approved', () => {
    expect(statusLabelPt('approved')).toBe('Aprovado');
  });

  it('builds kanban columns from the canonical map', () => {
    const cols = getKanbanBoardColumns();
    expect(cols.map((c) => c.id)).toEqual([
      'backlog',
      'todo',
      'in_progress',
      'in_review',
      'completed',
      'blocked',
    ]);
    expect(cols[0].title).toBe(TASK_STATUS_CANONICAL.backlog.label);
    expect(cols.every((c) => typeof c.color === 'string' && c.color.length > 0)).toBe(true);
  });

  it('select map matches drawer options', () => {
    const map = getTaskStatusSelectMap();
    expect(map.todo.label).toBe('A fazer');
    expect(map.waiting_client.label).toBe('Aguardando cliente');
    expect(map.todo.kanbanColor).toBe(getTaskStatusConfig('todo').dot);
  });
});
