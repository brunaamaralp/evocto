import { describe, it, expect, vi } from 'vitest';
import { mapPendingApprovalsForDashboard } from '../pendingApprovals.js';
import {
  getGlobalSearchShortcuts,
  fetchGlobalSearchEntities,
  openGlobalSearchResult,
} from '../globalSearchSources.js';

describe('mapPendingApprovalsForDashboard', () => {
  it('maps cycles and requests into dashboard rows', () => {
    const rows = mapPendingApprovalsForDashboard({
      cycles: [
        {
          id: 'c1',
          cyclePeriod: 'Jan/2026',
          clientName: 'Acme',
          created_date: '2026-01-02T00:00:00.000Z',
        },
      ],
      requests: [
        {
          id: 'r1',
          title: 'Criativo X',
          status: 'pending',
          contentType: 'creative',
          created_date: '2026-01-03T00:00:00.000Z',
        },
      ],
    });
    expect(rows).toHaveLength(2);
    expect(rows[0].id).toBe('r1');
    expect(rows.find((r) => r.id === 'c1').href).toContain('cycle-approval');
    expect(rows.every((r) => r.status === 'pending')).toBe(true);
  });
});

describe('getGlobalSearchShortcuts', () => {
  it('includes approvals nav without filter-preset chips', () => {
    const { nav, presets } = getGlobalSearchShortcuts({ userId: 'u1' });
    expect(nav.some((n) => n.id === 'nav-approvals')).toBe(true);
    expect(presets).toEqual([]);
  });
});

describe('fetchGlobalSearchEntities', () => {
  it('returns empty groups without agencyId (permission boundary)', async () => {
    const data = await fetchGlobalSearchEntities(null);
    expect(data.clients).toEqual([]);
    expect(data.tasks).toEqual([]);
    expect(data.campaigns).toEqual([]);
    expect(data.partialFailure).toBe(false);
    expect(data.failedSources).toEqual([]);
  });
});

describe('openGlobalSearchResult', () => {
  it('navigates to href for non-task results', () => {
    const navigate = vi.fn();
    openGlobalSearchResult({ href: '/clients', title: 'Clientes' }, navigate);
    expect(navigate).toHaveBeenCalledWith('/clients');
  });
});
