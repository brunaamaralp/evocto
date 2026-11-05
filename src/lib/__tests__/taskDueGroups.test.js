import { describe, it, expect } from 'vitest';
import {
  groupTasksByDue,
  resolveDueGroupId,
  summarizeTasks,
  filterMyTasks,
  formatDueShort,
} from '@/lib/taskDueGroups';

const NOW = new Date(2026, 10, 5, 10, 0, 0); // 5 nov 2026

function at(dayOffset) {
  const d = new Date(NOW);
  d.setDate(d.getDate() + dayOffset);
  d.setHours(12, 0, 0, 0);
  return d.toISOString();
}

describe('taskDueGroups', () => {
  it('classifica por prazo', () => {
    expect(resolveDueGroupId({ dueDate: at(-2) }, NOW)).toBe('overdue');
    expect(resolveDueGroupId({ dueDate: at(0) }, NOW)).toBe('today');
    expect(resolveDueGroupId({ dueDate: at(3) }, NOW)).toBe('week');
    expect(resolveDueGroupId({ dueDate: at(20) }, NOW)).toBe('later');
    expect(resolveDueGroupId({}, NOW)).toBe('none');
  });

  it('agrupa só abertas, ordenadas por prazo', () => {
    const groups = groupTasksByDue(
      [
        { id: 'a', title: 'A', dueDate: at(5) },
        { id: 'b', title: 'B', dueDate: at(2) },
        { id: 'c', title: 'C', dueDate: at(-1), status: 'completed' },
        { id: 'd', title: 'D' },
      ],
      { now: NOW }
    );
    const byId = Object.fromEntries(groups.map((g) => [g.id, g.tasks.map((t) => t.id)]));
    expect(byId.week).toEqual(['b', 'a']);
    expect(byId.overdue).toEqual([]);
    expect(byId.none).toEqual(['d']);
    expect(groups.map((g) => g.id)).toEqual(['overdue', 'today', 'week', 'later', 'none']);
  });

  it('resume contadores', () => {
    expect(
      summarizeTasks(
        [
          { dueDate: at(-1) },
          { dueDate: at(1) },
          { status: 'completed' },
          { status: 'cancelled' },
        ],
        NOW
      )
    ).toEqual({ open: 2, overdue: 1, done: 1 });
  });

  it('filtra minhas tarefas', () => {
    const mine = filterMyTasks(
      [{ id: 1, assignedTo: 'u1' }, { id: 2, assigneeId: 'u1' }, { id: 3, assignedTo: 'u2' }, { id: 4 }],
      'u1'
    );
    expect(mine.map((t) => t.id)).toEqual([1, 2]);
    expect(filterMyTasks([{ assignedTo: 'u1' }], null)).toEqual([]);
  });

  it('formata prazo curto', () => {
    expect(formatDueShort({ dueDate: at(0) }, NOW)).toBe('Hoje');
    expect(formatDueShort({ dueDate: at(1) }, NOW)).toBe('Amanhã');
    expect(formatDueShort({}, NOW)).toBeNull();
  });
});
