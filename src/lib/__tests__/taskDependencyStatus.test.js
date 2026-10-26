import { describe, it, expect } from 'vitest';
import {
  buildDependencyStatus,
  checkDependencyResolution,
  listManualBlockers,
} from '../taskDependencyStatus.js';

describe('taskDependencyStatus', () => {
  it('resolve finish_to_start only when dep is completed', () => {
    const dep = { taskId: 'a', type: 'finish_to_start' };
    expect(
      checkDependencyResolution(dep, { id: 'a', status: 'todo' }).isResolved
    ).toBe(false);
    expect(
      checkDependencyResolution(dep, { id: 'a', status: 'completed' }).isResolved
    ).toBe(true);
  });

  it('buildDependencyStatus defaults safely without prop (drawer crash fix)', () => {
    const task = {
      dependencies: [{ taskId: 'x', type: 'finish_to_start' }],
    };
    const status = buildDependencyStatus(task, {});
    expect(status.canStart).toBe(false);
    expect(status.blockedBy).toHaveLength(1);
    expect(status.blockedBy[0].task).toBeNull();
  });

  it('canStart when all deps resolved', () => {
    const task = {
      dependencies: [{ taskId: 'x', type: 'finish_to_start' }],
    };
    const status = buildDependencyStatus(task, {
      x: { id: 'x', status: 'completed', title: 'Done' },
    });
    expect(status.canStart).toBe(true);
    expect(status.blockedBy).toHaveLength(0);
  });

  it('lists manual blockers from array or string', () => {
    expect(listManualBlockers({ blockedBy: 'Waiting copy' })).toEqual([
      { reason: 'Waiting copy' },
    ]);
    expect(
      listManualBlockers({
        blockedBy: [{ reason: 'A', critical: true }],
      })
    ).toEqual([{ reason: 'A', critical: true }]);
    expect(listManualBlockers({})).toEqual([]);
  });
});
