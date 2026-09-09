import {
  addBusinessDaysInclusive,
  countBusinessDaysInclusive,
  nextBusinessDay,
  snapToBusinessDay,
  todayYmd,
} from './businessDaysCore.js';

export const DEFAULT_DELIVERABLE_DURATION_BUSINESS_DAYS = 7;

export function normalizeDurationBusinessDays(raw, fallback = DEFAULT_DELIVERABLE_DURATION_BUSINESS_DAYS) {
  const n = Math.trunc(Number(raw));
  if (!Number.isFinite(n) || n < 1) return fallback;
  return Math.min(3650, n);
}

function isYmd(value) {
  return /^\d{4}-\d{2}-\d{2}$/.test(String(value || '').trim().slice(0, 10));
}

function deliverableDuration(row) {
  return normalizeDurationBusinessDays(
    row?.duration_business_days ?? row?.duration_days ?? row?.estimated_days
  );
}

/**
 * Agenda etapas em sequência FS (finish-to-start) com dias úteis.
 * @param {{ startDate?: string, deliverables: object[] }} args
 */
export function scheduleDeliverablesFs({ startDate, deliverables }) {
  const list = [...(Array.isArray(deliverables) ? deliverables : [])];
  let cursorStart = snapToBusinessDay(startDate || todayYmd());
  return list.map((row, index) => {
    const duration = deliverableDuration(row);
    const planned_start = cursorStart;
    const planned_end = addBusinessDaysInclusive(planned_start, duration);
    cursorStart = nextBusinessDay(planned_end);
    return {
      ...row,
      sort_order: row.sort_order ?? index,
      duration_business_days: duration,
      planned_start,
      planned_end,
    };
  });
}

/**
 * Garante planned_* em todos os deliverables; se faltar em algum, recalcula a cadeia.
 */
export function ensureDeliverableSchedule(deliverables, startDate) {
  const list = Array.isArray(deliverables) ? deliverables : [];
  if (list.length === 0) return list;
  const allHaveDates = list.every((d) => isYmd(d.planned_start) && isYmd(d.planned_end));
  if (allHaveDates) {
    return list.map((row, index) => ({
      ...row,
      sort_order: row.sort_order ?? index,
      duration_business_days: deliverableDuration(row),
    }));
  }
  return scheduleDeliverablesFs({ startDate, deliverables: list });
}

/**
 * Recalcula etapa `index` e reencadeia FS as seguintes (forward-only).
 * @returns {{ deliverables: object[], cascaded_ids: string[], warnings: string[] }}
 */
export function rescheduleDeliverableFromIndex({ deliverablesSorted, index, patch = {} } = {}) {
  const list = (Array.isArray(deliverablesSorted) ? deliverablesSorted : []).map((row) => ({
    ...row,
  }));
  const warnings = [];
  if (!Number.isInteger(index) || index < 0 || index >= list.length) {
    return { deliverables: list, cascaded_ids: [], warnings };
  }

  const row = list[index];
  const patchStart = patch.planned_start != null ? String(patch.planned_start).slice(0, 10) : null;
  const patchEnd = patch.planned_end != null ? String(patch.planned_end).slice(0, 10) : null;
  const hasDurationPatch = patch.duration_business_days != null && patch.duration_business_days !== '';

  let start = isYmd(patchStart) ? patchStart : String(row.planned_start || '').slice(0, 10);
  let duration = hasDurationPatch
    ? normalizeDurationBusinessDays(patch.duration_business_days)
    : deliverableDuration(row);

  if (isYmd(patchEnd) && !hasDurationPatch) {
    const startForDerive = isYmd(start) ? start : String(row.planned_start || '').slice(0, 10);
    if (isYmd(startForDerive)) {
      duration = countBusinessDaysInclusive(startForDerive, patchEnd);
    }
  }

  if (index > 0) {
    const predEnd = String(list[index - 1].planned_end || '').slice(0, 10);
    if (isYmd(predEnd)) {
      const minStart = nextBusinessDay(predEnd);
      if (!isYmd(start) || start < minStart) {
        if (isYmd(start) && start < minStart) warnings.push('clamped_to_predecessor');
        start = minStart;
      }
    }
  }

  if (!isYmd(start)) {
    start = snapToBusinessDay(todayYmd());
  } else {
    start = snapToBusinessDay(start);
  }

  const end = addBusinessDaysInclusive(start, duration);
  list[index] = {
    ...row,
    planned_start: start,
    planned_end: end,
    duration_business_days: duration,
  };

  const cascaded_ids = [];
  let cursor = nextBusinessDay(end);
  for (let i = index + 1; i < list.length; i += 1) {
    const d = deliverableDuration(list[i]);
    const s = cursor;
    const e = addBusinessDaysInclusive(s, d);
    const before = list[i];
    list[i] = {
      ...before,
      planned_start: s,
      planned_end: e,
      duration_business_days: d,
    };
    if (
      String(before.planned_start || '') !== s ||
      String(before.planned_end || '') !== e ||
      Number(before.duration_business_days) !== d
    ) {
      const id = String(list[i].id || '').trim();
      if (id) cascaded_ids.push(id);
    }
    cursor = nextBusinessDay(e);
  }

  return { deliverables: list, cascaded_ids, warnings };
}

/**
 * Aplica patch em uma etapa. cascade=true (default) reencadeia seguintes;
 * cascade=false só atualiza a etapa (Gantt drag).
 */
export function patchDeliverableSchedule(deliverables, deliverableId, patch, { cascade = true } = {}) {
  const list = ensureDeliverableSchedule(deliverables, patch?.anchorStart || todayYmd());
  const index = list.findIndex((d) => String(d.id) === String(deliverableId));
  if (index < 0) return { deliverables: list, cascaded_ids: [], warnings: ['not_found'] };

  if (!cascade) {
    const row = list[index];
    let start = isYmd(patch.planned_start) ? snapToBusinessDay(patch.planned_start) : row.planned_start;
    let end = isYmd(patch.planned_end) ? String(patch.planned_end).slice(0, 10) : row.planned_end;
    let duration =
      patch.duration_business_days != null
        ? normalizeDurationBusinessDays(patch.duration_business_days)
        : countBusinessDaysInclusive(start, end);
    if (!isYmd(end) || end < start) {
      end = addBusinessDaysInclusive(start, duration);
    } else {
      duration = countBusinessDaysInclusive(start, end);
      end = addBusinessDaysInclusive(start, duration);
    }
    const next = [...list];
    next[index] = {
      ...row,
      planned_start: start,
      planned_end: end,
      duration_business_days: duration,
    };
    return { deliverables: next, cascaded_ids: [], warnings: [] };
  }

  return rescheduleDeliverableFromIndex({
    deliverablesSorted: list,
    index,
    patch,
  });
}
