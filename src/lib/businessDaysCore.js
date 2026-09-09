/** Dias úteis v0: segunda–sexta. Parsing YMD em noon local-safe (T12:00:00). */

function parseYmd(ymd) {
  const base = String(ymd || '').trim().slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(base)) return null;
  const d = new Date(`${base}T12:00:00`);
  return Number.isNaN(d.getTime()) ? null : d;
}

function formatYmd(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function todayYmd() {
  return formatYmd(new Date());
}

export function addDaysYmd(ymd, days) {
  const d = parseYmd(ymd);
  if (!d) return todayYmd();
  d.setDate(d.getDate() + Number(days || 0));
  return formatYmd(d);
}

export function isBusinessDay(ymd) {
  const d = parseYmd(ymd);
  if (!d) return false;
  const dow = d.getDay();
  return dow >= 1 && dow <= 5;
}

/** Próximo dia útil estritamente após ymd. */
export function nextBusinessDay(ymd) {
  const d = parseYmd(ymd) || new Date();
  d.setDate(d.getDate() + 1);
  while (d.getDay() === 0 || d.getDay() === 6) {
    d.setDate(d.getDate() + 1);
  }
  return formatYmd(d);
}

/** Primeiro dia útil ≥ ymd. */
export function snapToBusinessDay(ymd) {
  const d = parseYmd(ymd);
  if (!d) return formatYmd(new Date());
  while (d.getDay() === 0 || d.getDay() === 6) {
    d.setDate(d.getDate() + 1);
  }
  return formatYmd(d);
}

function previousBusinessDayInclusive(ymd) {
  const d = parseYmd(ymd);
  if (!d) return snapToBusinessDay(ymd);
  while (d.getDay() === 0 || d.getDay() === 6) {
    d.setDate(d.getDate() - 1);
  }
  return formatYmd(d);
}

/**
 * Duração inclusiva em dias úteis.
 * @param {string} startYmd
 * @param {number} durationBusinessDays inteiro ≥ 1
 */
export function addBusinessDaysInclusive(startYmd, durationBusinessDays) {
  const duration = Math.max(1, Math.trunc(Number(durationBusinessDays) || 1));
  let cursor = snapToBusinessDay(startYmd);
  for (let i = 1; i < duration; i += 1) {
    cursor = nextBusinessDay(cursor);
  }
  return cursor;
}

export function countBusinessDaysInclusive(startYmd, endYmd) {
  if (!parseYmd(startYmd) || !parseYmd(endYmd)) return 1;
  let start = snapToBusinessDay(startYmd);
  let end = String(endYmd).trim().slice(0, 10);
  if (!isBusinessDay(end)) {
    end = previousBusinessDayInclusive(end);
  }
  if (end < start) return 1;
  let count = 1;
  let cursor = start;
  while (cursor < end) {
    cursor = nextBusinessDay(cursor);
    count += 1;
    if (count > 3650) break;
  }
  return count;
}

export function listYmdsInclusive(fromYmd, toYmd) {
  const out = [];
  let cur = String(fromYmd || '').slice(0, 10);
  const end = String(toYmd || '').slice(0, 10);
  if (!cur || !end || cur > end) return out;
  for (let i = 0; i < 400; i += 1) {
    out.push(cur);
    if (cur === end) break;
    cur = addDaysYmd(cur, 1);
  }
  return out;
}

export function businessYmdsInRange(fromYmd, toYmd) {
  return listYmdsInclusive(fromYmd, toYmd).filter((ymd) => isBusinessDay(ymd));
}

export function formatYmdBr(ymd) {
  const d = parseYmd(ymd);
  if (!d) return '—';
  return d.toLocaleDateString('pt-BR');
}
