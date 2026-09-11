/**
 * Semana civil local (segunda → domingo).
 * @param {number} [weekOffset=0] 0 = semana atual; -1 = anterior; +1 = próxima
 * @param {boolean} [endInclusive=false]
 *   true  → endMs = domingo 23:59:59.999 (inclusivo)
 *   false → endMs = próxima segunda 00:00:00.000 (limite exclusivo)
 * @returns {{ startMs: number, endMs: number }}
 */
export function getCivilWeekBounds(weekOffset = 0, endInclusive = false) {
  const now = new Date();
  const day = now.getDay(); // 0 = domingo
  const toMonday = day === 0 ? -6 : 1 - day;
  const start = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate() + toMonday + Number(weekOffset || 0) * 7
  );
  start.setHours(0, 0, 0, 0);

  const end = new Date(start);
  if (endInclusive) {
    end.setDate(end.getDate() + 6);
    end.setHours(23, 59, 59, 999);
  } else {
    end.setDate(end.getDate() + 7);
    end.setHours(0, 0, 0, 0);
  }

  return { startMs: start.getTime(), endMs: end.getTime() };
}

function leadScheduledLocalMs(lead) {
  const ymd = String(lead?.scheduledDate || '')
    .trim()
    .split('T')[0];
  if (!/^\d{4}-\d{2}-\d{2}$/.test(ymd)) return null;
  const [y, m, d] = ymd.split('-').map(Number);
  if (!Number.isFinite(y) || !Number.isFinite(m) || !Number.isFinite(d)) return null;
  return new Date(y, m - 1, d, 12, 0, 0, 0).getTime();
}

/** Leads cuja data experimental cai na semana civil do offset. */
export function filterLeadsInCivilWeek(leads, weekOffset = 0) {
  const { startMs, endMs } = getCivilWeekBounds(weekOffset, true);
  return (leads || []).filter((lead) => {
    const t = leadScheduledLocalMs(lead);
    return t != null && t >= startMs && t <= endMs;
  });
}
