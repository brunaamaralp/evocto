import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/api/entities', () => ({
  CyclePlan: {
    get: vi.fn(),
    update: vi.fn(),
  },
  Task: {
    filter: vi.fn(),
    update: vi.fn(),
  },
  Brief: {
    get: vi.fn(),
    update: vi.fn(),
  },
}));

import { CyclePlan, Task, Brief } from '@/api/entities';
import {
  shareCycleMonth,
  isCycleSharedWithClient,
  tasksForCycle,
} from '../shareCycleMonth.js';

describe('shareCycleMonth', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('detecta ciclo compartilhado', () => {
    expect(isCycleSharedWithClient({ clientVisible: true })).toBe(true);
    expect(isCycleSharedWithClient({ sharedAt: '2026-09-01' })).toBe(true);
    expect(isCycleSharedWithClient({})).toBe(false);
  });

  it('filtra tasks do ciclo', () => {
    const tasks = [
      { id: '1', cyclePlanId: 'c1' },
      { id: '2', cycleId: 'c1' },
      { id: '3', cyclePlanId: 'other' },
    ];
    expect(tasksForCycle(tasks, 'c1').map((t) => t.id)).toEqual(['1', '2']);
  });

  it('marca ciclo + tasks + brief', async () => {
    CyclePlan.get.mockResolvedValue({
      id: 'c1',
      agencyId: 'ag',
      clientId: 'cli',
      briefId: 'b1',
    });
    CyclePlan.update.mockResolvedValue({
      id: 'c1',
      agencyId: 'ag',
      clientId: 'cli',
      briefId: 'b1',
      clientVisible: true,
      sharedAt: '2026-09-19T00:00:00.000Z',
    });
    Task.filter.mockResolvedValue([
      { id: 't1', cyclePlanId: 'c1', status: 'todo', clientVisible: false },
      { id: 't2', cyclePlanId: 'c1', status: 'in_review', clientVisible: true },
      { id: 't3', cyclePlanId: 'c1', status: 'cancelled' },
      { id: 't4', cyclePlanId: 'other', status: 'todo' },
    ]);
    Task.update.mockResolvedValue({});
    Brief.get.mockResolvedValue({
      id: 'b1',
      agencyId: 'ag',
      clientId: 'cli',
      clientVisible: false,
    });
    Brief.update.mockResolvedValue({});

    const result = await shareCycleMonth({
      cyclePlanId: 'c1',
      agencyId: 'ag',
      clientId: 'cli',
      sharedBy: 'u1',
    });

    expect(CyclePlan.update).toHaveBeenCalledWith(
      'c1',
      expect.objectContaining({
        clientVisible: true,
        sharedBy: 'u1',
      })
    );
    expect(Task.update).toHaveBeenCalledTimes(1);
    expect(Task.update).toHaveBeenCalledWith('t1', { clientVisible: true });
    expect(Brief.update).toHaveBeenCalledWith('b1', { clientVisible: true });
    expect(result.tasksShared).toBe(1);
    expect(result.tasksTotal).toBe(2);
    expect(result.briefShared).toBe(true);
  });
});
