import { describe, expect, it } from 'vitest';
import { buildAgencyPortfolioRows } from '../buildAgencyPortfolioRows.js';

const today = new Date('2026-10-15T12:00:00');
today.setHours(0, 0, 0, 0);

describe('buildAgencyPortfolioRows', () => {
  it('prefers active clients and sorts finance/task overdue first', () => {
    const clients = [
      { id: 'c1', name: 'Zebra', status: 'ativo' },
      { id: 'c2', name: 'Alpha', status: 'ativo' },
      { id: 'c3', name: 'Paused Co', status: 'pausado' },
    ];
    const tasks = [
      {
        id: 't1',
        clientId: 'c1',
        status: 'todo',
        dueDate: '2026-10-01T12:00:00.000Z',
      },
      { id: 't2', clientId: 'c2', status: 'todo', dueDate: '2026-10-20T12:00:00.000Z' },
    ];
    const charges = [
      {
        id: 'ch1',
        clientId: 'c2',
        status: 'open',
        amount: 1500,
        dueDate: '2026-10-01',
      },
    ];
    const campaignGroups = [
      { clientId: 'c1', campaigns: [{ id: 'x' }, { id: 'y' }] },
      { clientId: 'c2', campaigns: [] },
    ];

    const { rows, totalClients, truncated } = buildAgencyPortfolioRows({
      clients,
      campaignGroups,
      tasks,
      charges,
      todayStart: today,
      maxRows: 12,
      createClientHref: (id) => `/client-detail?clientId=${id}`,
    });

    expect(totalClients).toBe(2);
    expect(truncated).toBe(false);
    expect(rows[0].id).toBe('c2'); // finance overdue first
    expect(rows[0].financeTone).toBe('danger');
    expect(rows[0].financeLabel).toMatch(/atraso/);
    expect(rows[1].id).toBe('c1');
    expect(rows[1].overdueTasks).toBe(1);
    expect(rows[1].campaignsActive).toBe(2);
    expect(rows[1].href).toContain('clientId=c1');
  });

  it('falls back to all clients when none are ativo', () => {
    const { rows, totalClients } = buildAgencyPortfolioRows({
      clients: [{ id: 'x', name: 'Only', status: 'pausado' }],
      campaignGroups: [],
      tasks: [],
      charges: [],
      todayStart: today,
      createClientHref: (id) => id,
    });
    expect(totalClients).toBe(1);
    expect(rows[0].name).toBe('Only');
    expect(rows[0].financeLabel).toBe('Sem cobrança');
  });
});
