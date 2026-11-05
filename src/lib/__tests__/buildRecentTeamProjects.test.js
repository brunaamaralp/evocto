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
      briefs: [{ id: 'b1', clientId: 'c3', projectId: 'c3', title: 'Briefing Q4', updated_date: hoursAgo(1) }],
      now,
      createClientHref: (id) => `/client-detail?clientId=${id}`,
    });

    expect(rows.map((r) => r.id)).toEqual(['client:c3', 'client:c2', 'client:c1']);
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
    expect(rows[0]).toMatchObject({ id: 'client:c1', lastActorName: 'Bruno' });
    expect(rows[0].actors).toEqual(['Bruno']);
  });

  it('groups by real project and links to the project page', () => {
    const rows = buildRecentTeamProjects({
      clients,
      projects: [
        { id: 'p1', clientId: 'c1', name: 'Social Media' },
        { id: 'p2', clientId: 'c1', name: 'Site' },
        { id: 'pi', clientId: null, name: 'Interno da agência' },
        { id: 'px', clientId: 'c2', name: 'Velho', status: 'arquivado' },
      ],
      tasks: [
        { clientId: 'c1', projectId: 'p1', title: 'A', updated_date: hoursAgo(5) },
        { clientId: 'c1', projectId: 'p2', title: 'B', updated_date: hoursAgo(1) },
        { clientId: 'c1', projectId: 'p1', title: 'C', updated_date: hoursAgo(2) },
        { clientId: null, projectId: 'pi', title: 'Interna', updated_date: hoursAgo(3) },
        { clientId: 'c2', projectId: 'px', title: 'Arq', updated_date: hoursAgo(1) },
      ],
      now,
      createProjectHref: (id) => `/project-detail?projectId=${id}`,
    });
    expect(rows.map((r) => [r.name, r.clientName, r.activityCount])).toEqual([
      ['Site', 'Alpha', 1],
      ['Social Media', 'Alpha', 2],
      ['Interno da agência', 'Interno', 1],
    ]);
    expect(rows[0].href).toBe('/project-detail?projectId=p2');
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
