import { describe, it, expect } from 'vitest';
import {
  buildOverviewCounts,
  buildOverviewActionCards,
  buildAgendaBuckets,
  collectCampaignBlockers,
  defaultWorkLensForRole,
} from '../dashboardActionMetrics.js';
import { startOfLocalDay } from '../taskFilterPresets.js';

describe('buildOverviewCounts', () => {
  const today = startOfLocalDay(new Date('2026-10-19T12:00:00'));

  it('counts agency and personal queues from real task fields', () => {
    // Datas com horário local explícito evitam drift UTC de YYYY-MM-DD.
    const tasks = [
      {
        id: '1',
        status: 'todo',
        assigneeId: 'u1',
        dueDate: '2026-10-18T15:00:00',
      },
      {
        id: '2',
        status: 'in_progress',
        assigneeId: 'u1',
        dueDate: '2026-10-19T15:00:00',
      },
      {
        id: '3',
        status: 'blocked',
        assigneeId: 'u2',
        dueDate: '2026-10-20T15:00:00',
      },
      {
        id: '4',
        status: 'waiting_client',
        assigneeId: 'u1',
        dueDate: '2026-10-25T15:00:00',
      },
      {
        id: '5',
        status: 'completed',
        assigneeId: 'u1',
        dueDate: '2026-10-10T15:00:00',
      },
    ];

    const counts = buildOverviewCounts({
      tasks,
      userId: 'u1',
      todayStart: today,
      pendingApprovalCount: 2,
      activeCampaignCount: 3,
    });

    expect(counts.agencyOverdue).toBe(1);
    expect(counts.agencyBlocked).toBe(1);
    expect(counts.waitingClient).toBe(1);
    expect(counts.myAssigned).toBe(3); // 1 overdue + 1 today + 1 waiting_client
    expect(counts.myOverdue).toBe(1);
    expect(counts.myToday).toBe(1);
    expect(counts.pendingApprovals).toBe(2);
    expect(counts.activeCampaigns).toBe(3);
  });
});

describe('buildOverviewActionCards', () => {
  it('prioritizes overdue and my action in me lens', () => {
    const cards = buildOverviewActionCards(
      {
        myOverdue: 2,
        myAction: 1,
        myToday: 0,
        waitingOthers: 0,
        myAssigned: 5,
        agencyOverdue: 9,
        pendingApprovals: 4,
        agencyBlocked: 0,
        waitingClient: 0,
        agencyUpcoming48h: 0,
        activeCampaigns: 0,
      },
      { userId: 'u1', lens: 'me' }
    );
    expect(cards[0].id).toBe('my_overdue');
    expect(cards[0].count).toBe(2);
    expect(cards[0].href).toContain('preset=my_overdue');
    expect(cards.some((c) => c.id === 'agency_overdue')).toBe(false);
  });

  it('links approvals to approval-dashboard in agency lens', () => {
    const cards = buildOverviewActionCards(
      {
        myOverdue: 0,
        myAction: 0,
        myToday: 0,
        waitingOthers: 0,
        myAssigned: 0,
        agencyOverdue: 0,
        pendingApprovals: 3,
        agencyBlocked: 0,
        waitingClient: 0,
        agencyUpcoming48h: 5,
        activeCampaigns: 2,
      },
      { lens: 'agency' }
    );
    expect(cards[0].id).toBe('approvals');
    expect(cards[0].href).toContain('approval-dashboard');
    expect(cards.some((c) => c.id === 'upcoming' || c.id === 'campaigns')).toBe(
      false
    );
  });
});

describe('buildAgendaBuckets', () => {
  it('splits today vs upcoming without overdue', () => {
    const today = startOfLocalDay(new Date('2026-10-19T08:00:00'));
    const { today: todayItems, upcoming, todayTotal } = buildAgendaBuckets(
      [
        {
          id: 'a',
          status: 'todo',
          dueDate: '2026-10-19T15:00:00',
          title: 'Hoje',
          clientId: null,
        },
        {
          id: 'b',
          status: 'todo',
          dueDate: '2026-10-20T15:00:00',
          title: 'Amanhã',
          clientId: null,
        },
        {
          id: 'c',
          status: 'todo',
          dueDate: '2026-10-18T15:00:00',
          title: 'Atrasada',
          clientId: null,
        },
      ],
      [],
      today
    );
    expect(todayTotal).toBe(1);
    expect(todayItems[0].dueLabel).toBe('Hoje');
    expect(upcoming[0].dueLabel).toBe('Amanhã');
  });
});

describe('collectCampaignBlockers', () => {
  it('surfaces campaigns with overdue task progress', () => {
    const blockers = collectCampaignBlockers([
      {
        clientId: 'c1',
        clientName: 'Acme',
        campaigns: [
          {
            id: 'br1',
            name: 'Campanha Out',
            href: '/ws',
            progress: { overdue: 2, completed: 1, total: 5 },
          },
        ],
      },
    ]);
    expect(blockers).toHaveLength(1);
    expect(blockers[0].overdue).toBe(2);
  });
});

describe('defaultWorkLensForRole', () => {
  it('defaults team to me and admins to agency', () => {
    expect(defaultWorkLensForRole('team')).toBe('me');
    expect(defaultWorkLensForRole('admin')).toBe('agency');
    expect(defaultWorkLensForRole('owner')).toBe('agency');
  });
});
