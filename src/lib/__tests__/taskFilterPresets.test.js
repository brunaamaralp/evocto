import { describe, it, expect } from 'vitest';
import {
  applyTaskFilters,
  buildTasksManagerHref,
  getTaskFilterPreset,
  isAwaitingMyAction,
  isOpenTaskStatus,
  isTaskOverdue,
  isWaitingOnClient,
  isWaitingOnOthers,
  OPEN_TASK_STATUSES,
  resolvePresetFromQuery,
  TASK_FILTER_PRESETS,
} from '../taskFilterPresets.js';
import { buildManualTaskPayload } from '../createManualTask.js';

describe('taskFilterPresets Phase B', () => {
  const userId = 'user-1';
  const now = new Date('2026-10-19T12:00:00');

  it('exposes daily presets including overdue and waiting client', () => {
    const ids = TASK_FILTER_PRESETS.map((p) => p.id);
    expect(ids).toContain('my_tasks');
    expect(ids).toContain('my_open');
    expect(ids).toContain('my_overdue');
    expect(ids).toContain('waiting_client');
    expect(ids).toContain('awaiting_review');
    expect(ids).toContain('my_action');
  });

  it('resolves valid presets and rejects invalid query ids', () => {
    expect(resolvePresetFromQuery('my_overdue')?.id).toBe('my_overdue');
    expect(resolvePresetFromQuery('hack;drop')).toBe(null);
    expect(resolvePresetFromQuery('')).toBe(null);
  });

  it('builds tasks-manager href with preset query', () => {
    const href = buildTasksManagerHref({ preset: 'my_open' });
    expect(href).toContain('tasks-manager');
    expect(href).toContain('preset=my_open');
    expect(buildTasksManagerHref({ preset: 'nope' })).toMatch(/tasks-manager\/?$/);
  });

  it('agency_overdue and agency_blocked deep-link presets', () => {
    expect(getTaskFilterPreset('agency_overdue')?.apply({}).dueRange).toBe(
      'overdue'
    );
    expect(getTaskFilterPreset('agency_blocked')?.apply({}).status).toBe(
      'blocked'
    );
    expect(buildTasksManagerHref({ preset: 'agency_overdue' })).toContain(
      'preset=agency_overdue'
    );
    expect(buildTasksManagerHref({ preset: 'agency_blocked' })).toContain(
      'preset=agency_blocked'
    );
  });

  it('filters my overdue assigned tasks', () => {
    const filters = getTaskFilterPreset('my_overdue').apply({ userId });
    const overdueMine = {
      id: '1',
      status: 'todo',
      assigneeId: userId,
      dueDate: '2026-10-10',
    };
    const openMine = {
      id: '2',
      status: 'todo',
      assigneeId: userId,
      dueDate: '2026-10-25',
    };
    const overdueOther = {
      id: '3',
      status: 'todo',
      assigneeId: 'other',
      dueDate: '2026-10-10',
    };
    expect(applyTaskFilters(overdueMine, filters, { userId, now })).toBe(true);
    expect(applyTaskFilters(openMine, filters, { userId, now })).toBe(false);
    expect(applyTaskFilters(overdueOther, filters, { userId, now })).toBe(false);
  });

  it('distinguishes waiting on client from my action', () => {
    const waitingClient = {
      status: 'in_progress',
      assigneeId: userId,
      gatekeeper: 'cliente',
      gate_status: 'pendente',
    };
    const myTodo = {
      status: 'todo',
      assigneeId: userId,
    };
    expect(isWaitingOnClient(waitingClient)).toBe(true);
    expect(isAwaitingMyAction(waitingClient, userId)).toBe(false);
    expect(isAwaitingMyAction(myTodo, userId)).toBe(true);
    expect(isWaitingOnOthers(waitingClient, userId)).toBe(true);
  });

  it('treats reviewer in_review as my action', () => {
    const task = {
      status: 'in_review',
      assigneeId: 'someone-else',
      reviewerIds: [userId],
    };
    expect(isAwaitingMyAction(task, userId)).toBe(true);
  });

  it('isTaskOverdue ignores completed', () => {
    expect(
      isTaskOverdue(
        { status: 'completed', dueDate: '2020-01-01' },
        now
      )
    ).toBe(false);
  });

  it('treats waiting_client as open (agency attention + filters)', () => {
    expect(OPEN_TASK_STATUSES.has('waiting_client')).toBe(true);
    expect(isOpenTaskStatus({ status: 'waiting_client' })).toBe(true);
    expect(isOpenTaskStatus({ status: 'completed' })).toBe(false);
  });

  it('dueRange overdue matches open past-due tasks', () => {
    const overdue = {
      status: 'todo',
      dueDate: '2026-10-10',
    };
    const future = {
      status: 'todo',
      dueDate: '2026-10-25',
    };
    expect(
      applyTaskFilters(overdue, { dueRange: 'overdue' }, { userId, now })
    ).toBe(true);
    expect(
      applyTaskFilters(future, { dueRange: 'overdue' }, { userId, now })
    ).toBe(false);
  });
});

describe('createManualTask payload', () => {
  it('builds quick-add payload with safe status', () => {
    const payload = buildManualTaskPayload({
      title: '  Nova  ',
      agencyId: 'ag-1',
      userId: 'u-1',
      status: 'completed',
      quickAdd: true,
    });
    expect(payload.title).toBe('Nova');
    expect(payload.status).toBe('todo');
    expect(payload.tags).toContain('quick_add');
    expect(payload.agencyId).toBe('ag-1');
  });

  it('rejects empty title', () => {
    expect(() => buildManualTaskPayload({ title: ' ', agencyId: 'ag' })).toThrow(
      /Título/
    );
  });

  it('scopes campaign quick-add with briefingId and kanbanColumn', () => {
    const payload = buildManualTaskPayload({
      title: 'Roteiro',
      agencyId: 'ag-1',
      clientId: 'c1',
      serviceId: 's1',
      briefingId: 'b1',
      cycleId: 'cy1',
      status: 'roteiro',
      kanbanColumn: 'roteiros',
      quickAdd: true,
    });
    expect(payload.briefingId).toBe('b1');
    expect(payload.briefId).toBe('b1');
    expect(payload.cycleId).toBe('cy1');
    expect(payload.kanbanColumn).toBe('roteiros');
    expect(payload.status).toBe('roteiro');
  });

  it('persists assignee dual-write and dueDate from quick-add', () => {
    const payload = buildManualTaskPayload({
      title: 'Com prazo',
      agencyId: 'ag-1',
      userId: 'u-creator',
      assignedTo: 'u-assignee',
      dueDate: '2026-10-25',
      quickAdd: true,
    });
    expect(payload.assigneeId).toBe('u-assignee');
    expect(payload.assignedTo).toBe('u-assignee');
    expect(payload.dueDate).toMatch(/^2026-10-25/);
    expect(payload.tags).toContain('quick_add');
  });
});
