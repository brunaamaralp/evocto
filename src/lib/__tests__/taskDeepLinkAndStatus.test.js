import { describe, it, expect } from 'vitest';
import {
  applyTaskIdToSearch,
  buildTaskDeepLink,
  readTaskIdFromSearch,
} from '../openTaskDrawer.js';
import {
  CLIENT_INBOX_KANBAN_IDS,
  opsKanbanColumnForTask,
} from '../taskStatusTransition.js';

describe('openTaskDrawer helpers', () => {
  it('reads taskId or legacy task param', () => {
    expect(readTaskIdFromSearch('?taskId=abc')).toBe('abc');
    expect(readTaskIdFromSearch('?task=xyz&clientId=1')).toBe('xyz');
    expect(readTaskIdFromSearch('')).toBe(null);
  });

  it('builds canonical deep link', () => {
    expect(buildTaskDeepLink('t1')).toBe('/tasks-manager?taskId=t1');
    expect(buildTaskDeepLink('t1', '/client-tasks?clientId=c1')).toBe(
      '/client-tasks?clientId=c1&taskId=t1'
    );
  });

  it('applies and clears taskId in search', () => {
    expect(applyTaskIdToSearch('?clientId=c1', 't9')).toBe('?clientId=c1&taskId=t9');
    expect(applyTaskIdToSearch('?taskId=t9&clientId=c1', null)).toBe('?clientId=c1');
  });
});

describe('opsKanbanColumnForTask', () => {
  it('maps campaign stages onto agency columns', () => {
    expect(opsKanbanColumnForTask({ status: 'roteiro', kanbanColumn: 'roteiros' })).toBe('todo');
    expect(opsKanbanColumnForTask({ status: 'in_progress', kanbanColumn: 'producao' })).toBe(
      'in_progress'
    );
    expect(opsKanbanColumnForTask({ status: 'in_review', kanbanColumn: 'revisao' })).toBe(
      'in_review'
    );
    expect(opsKanbanColumnForTask({ status: 'completed', kanbanColumn: 'publicacao' })).toBe(
      'completed'
    );
  });

  it('keeps review/blocked on full inbox board columns', () => {
    expect(
      opsKanbanColumnForTask(
        { status: 'in_review', kanbanColumn: 'revisao' },
        { columns: CLIENT_INBOX_KANBAN_IDS }
      )
    ).toBe('in_review');
    expect(
      opsKanbanColumnForTask({ status: 'blocked' }, { columns: CLIENT_INBOX_KANBAN_IDS })
    ).toBe('blocked');
  });

  it('compresses review/blocked when board has only 4 columns', () => {
    const four = ['backlog', 'todo', 'in_progress', 'completed'];
    expect(
      opsKanbanColumnForTask(
        { status: 'in_review', kanbanColumn: 'revisao' },
        { columns: four }
      )
    ).toBe('in_progress');
    expect(opsKanbanColumnForTask({ status: 'blocked' }, { columns: four })).toBe('backlog');
  });
});
