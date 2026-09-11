import { describe, expect, it, vi, afterEach } from 'vitest';
import { getCivilWeekBounds, filterLeadsInCivilWeek } from '../civilWeekBounds.js';

afterEach(() => {
  vi.useRealTimers();
});

describe('getCivilWeekBounds', () => {
  it('usa segunda–domingo local na semana atual', () => {
    // Quarta 2026-09-09
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 8, 9, 15, 0, 0, 0));

    const { startMs, endMs } = getCivilWeekBounds(0, true);
    expect(new Date(startMs)).toEqual(new Date(2026, 8, 7, 0, 0, 0, 0));
    expect(new Date(endMs)).toEqual(new Date(2026, 8, 13, 23, 59, 59, 999));
  });

  it('com endInclusive=false termina na próxima segunda 00:00', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 8, 9, 15, 0, 0, 0));

    const { startMs, endMs } = getCivilWeekBounds(0, false);
    expect(new Date(startMs)).toEqual(new Date(2026, 8, 7, 0, 0, 0, 0));
    expect(new Date(endMs)).toEqual(new Date(2026, 8, 14, 0, 0, 0, 0));
  });
});

describe('filterLeadsInCivilWeek', () => {
  it('filtra por scheduledDate na semana do offset', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 8, 9, 12, 0, 0, 0));

    const leads = [
      { id: '1', scheduledDate: '2026-09-08' },
      { id: '2', scheduledDate: '2026-09-14' },
      { id: '3', scheduledDate: '2026-09-01' },
    ];
    expect(filterLeadsInCivilWeek(leads, 0).map((l) => l.id)).toEqual(['1']);
    expect(filterLeadsInCivilWeek(leads, 1).map((l) => l.id)).toEqual(['2']);
  });
});
