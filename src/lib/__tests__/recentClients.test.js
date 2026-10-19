import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  readRecentClients,
  recordRecentClient,
  listRecentClientsForSwitcher,
  RECENT_CLIENTS_MAX,
} from '../recentClients';

describe('recentClients', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('records and dedupes by most recent', () => {
    recordRecentClient('ag1', { id: 'c1', name: 'Alpha' });
    recordRecentClient('ag1', { id: 'c2', name: 'Beta', sector: 'Tech' });
    recordRecentClient('ag1', { id: 'c1', name: 'Alpha Atualizado' });

    const list = readRecentClients('ag1');
    expect(list).toHaveLength(2);
    expect(list[0].id).toBe('c1');
    expect(list[0].name).toBe('Alpha Atualizado');
    expect(list[1].id).toBe('c2');
    expect(list[1].sector).toBe('Tech');
  });

  it('caps at RECENT_CLIENTS_MAX', () => {
    for (let i = 0; i < RECENT_CLIENTS_MAX + 3; i += 1) {
      recordRecentClient('ag1', { id: `c${i}`, name: `Cliente ${i}` });
    }
    expect(readRecentClients('ag1')).toHaveLength(RECENT_CLIENTS_MAX);
  });

  it('scopes by agency and excludes current in switcher list', () => {
    recordRecentClient('ag1', { id: 'c1', name: 'A' });
    recordRecentClient('ag2', { id: 'c9', name: 'Other' });
    expect(readRecentClients('ag2')).toHaveLength(1);
    expect(listRecentClientsForSwitcher('ag1', 'c1')).toHaveLength(0);
    recordRecentClient('ag1', { id: 'c2', name: 'B' });
    expect(listRecentClientsForSwitcher('ag1', 'c1').map((c) => c.id)).toEqual([
      'c2',
    ]);
  });
});
