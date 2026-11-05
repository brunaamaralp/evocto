import { describe, expect, it } from 'vitest';
import {
  buildRecentTeamProjects,
  formatRelativeActivity,
} from '../buildRecentTeamProjects.js';

const now = new Date('2026-11-05T12:00:00.000Z').getTime();
const hoursAgo = (h) => new Date(now - h * 3600000).toISOString();

describe('buildRecentTeamProjects', () => {
  const clients = [
    { id: 'c1', name: 'Alpha' },
    { id: 'c2', name: 'Beta' },
    { id: 'c3', name: 'Gamma' },
  ];

  it('orders clients by most recent activity across tasks, briefs and cycles', () => {
    const rows = buildRecentTeamProjects({
      clients,
      tasks: [
        { id: 't1', clientId: 'c1', title: 'Post', updated_date: hoursAgo(10), assigneeName: 'Ana' },
        { id: 't2', clientId: 'c2', title: 'Reels', updated_date: hoursAgo(2), status: 'done' },
      ],
      briefs: [{ id: 'b1', projectId: 'c3', title: 'Briefing Q4', updated_date: hoursAgo(1) }],
      now,
      createClientHref: (id) => `/client-detail?clientId=${id}`,
    });

    expect(rows.map((r) => r.id)).toEqual(['c3', 'c2', 'c1']);
    expect(rows[0]).toMatchObject({ lastActivityLabel: 'Briefing Q4', lastActivityVerb: 'Briefing' });
    expect(rows[1].lastActivityVerb).toBe('Concluída');
    expect(rows[2]).toMatchObject({ lastActorName: 'Ana', href: '/client-detail?clientId=c1' });
  });

  it('prefers statusHistory author and ignores old or unknown-client activity', () => {
    const rows = buildRecentTeamProjects({
      clients,
      tasks: [
        {
          id: 't1',
          clientId: 'c1',
          title: 'Arte',
          updated_date: hoursAgo(3),
          assigneeName: 'Ana',
          statusHistory: [{ changedAt: hoursAgo(3), changedByName: 'Bruno' }],
        },
        { id: 't2', clientId: 'c2', title: 'Velha', updated_date: hoursAgo(24 * 60) },
        { id: 't3', clientId: 'zz', title: 'Órfã', updated_date: hoursAgo(1) },
      ],
      now,
    });

    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ id: 'c1', lastActorName: 'Bruno' });
    expect(rows[0].actors).toEqual(['Bruno']);
  });

  it('respects max', () => {
    const many = Array.from({ length: 10 }, (_, i) => ({ id: `c${i}`, name: `C${i}` }));
    const tasks = many.map((c, i) => ({ clientId: c.id, updated_date: hoursAgo(i + 1) }));
    expect(buildRecentTeamProjects({ clients: many, tasks, now, max: 4 })).toHaveLength(4);
  });
});

describe('formatRelativeActivity', () => {
  it('formats relative labels', () => {
    expect(formatRelativeActivity(now - 30000, now)).toBe('agora');
    expect(formatRelativeActivity(now - 5 * 60000, now)).toBe('há 5 min');
    expect(formatRelativeActivity(now - 3 * 3600000, now)).toBe('há 3 h');
    expect(formatRelativeActivity(now - 30 * 3600000, now)).toBe('ontem');
    expect(formatRelativeActivity(now - 3 * 86400000, now)).toBe('há 3 dias');
    expect(formatRelativeActivity(0, now)).toBeNull();
  });
});
