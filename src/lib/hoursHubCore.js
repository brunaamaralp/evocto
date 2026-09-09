import {
  addDaysYmd,
  businessYmdsInRange,
  isBusinessDay,
  todayYmd,
} from './businessDaysCore.js';

export function remainingTaskHours(task) {
  const status = String(task?.status || '').trim().toLowerCase();
  if (['completed', 'done', 'cancelled'].includes(status)) return 0;
  const estimated = Math.max(0, Number(task?.estimatedHours ?? task?.estimated_hours) || 0);
  const logged = Math.max(0, Number(task?.actualHours ?? task?.actual_hours) || 0);
  return Math.max(0, estimated - logged);
}

/**
 * Aloca horas restantes por pessoa/dia no intervalo.
 * @returns {Map<string, number>} key `${userId}|${ymd}` → hours
 */
export function allocatePlannedHoursByDay(tasks, { fromYmd, toYmd } = {}) {
  const map = new Map();
  const from = String(fromYmd || '').slice(0, 10);
  const to = String(toYmd || '').slice(0, 10);

  for (const task of tasks || []) {
    const userId = String(task?.assignedTo || task?.assigned_to || '').trim();
    if (!userId) continue;
    const remaining = remainingTaskHours(task);
    if (remaining <= 0) continue;

    const due = String(task?.dueDate || task?.due_date || '').trim().slice(0, 10);
    if (due && due >= from && due <= to) {
      const key = `${userId}|${due}`;
      map.set(key, (map.get(key) || 0) + remaining);
      continue;
    }

    const stageStart = String(task?.planned_start || task?.stagePlannedStart || '').slice(0, 10);
    const stageEnd = String(task?.planned_end || task?.stagePlannedEnd || '').slice(0, 10);
    const days = businessYmdsInRange(
      stageStart && stageStart > from ? stageStart : from,
      stageEnd && stageEnd < to ? stageEnd : to
    );
    if (days.length === 0) continue;
    const perDay = remaining / days.length;
    for (const ymd of days) {
      const key = `${userId}|${ymd}`;
      map.set(key, (map.get(key) || 0) + perDay);
    }
  }
  return map;
}

export function resolveHoursHubPeriod(periodId = 'week') {
  const today = todayYmd();
  if (periodId === 'month') {
    const d = new Date(`${today}T12:00:00`);
    const from = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
    const last = new Date(d.getFullYear(), d.getMonth() + 1, 0);
    const to = `${last.getFullYear()}-${String(last.getMonth() + 1).padStart(2, '0')}-${String(last.getDate()).padStart(2, '0')}`;
    return { fromYmd: from, toYmd: to, label: 'Este mês' };
  }
  // week: today + 6 days
  return {
    fromYmd: today,
    toYmd: addDaysYmd(today, 6),
    label: 'Próximos 7 dias',
  };
}

/**
 * Agrupa tarefas por serviço para o hub de atividades.
 */
export function buildHoursByService(tasks, serviceNameById = {}) {
  const map = new Map();
  for (const t of tasks || []) {
    const sid = String(t.serviceId || t.service_id || '_none');
    if (!map.has(sid)) {
      map.set(sid, {
        serviceId: sid,
        label: serviceNameById[sid] || (sid === '_none' ? 'Sem serviço' : sid),
        estimated: 0,
        actual: 0,
        remaining: 0,
        openCount: 0,
      });
    }
    const row = map.get(sid);
    const est = Number(t.estimatedHours ?? t.estimated_hours) || 0;
    const act = Number(t.actualHours ?? t.actual_hours) || 0;
    row.estimated += est;
    row.actual += act;
    row.remaining += remainingTaskHours(t);
    if (!['completed', 'cancelled', 'done'].includes(String(t.status || '').toLowerCase())) {
      row.openCount += 1;
    }
  }
  return [...map.values()].sort((a, b) => b.remaining - a.remaining);
}

/**
 * Linhas de ocupação por membro nos próximos dias úteis.
 */
export function buildMemberOccupancyRows({
  memberIds,
  memberLabelById = {},
  fromYmd,
  toYmd,
  plannedByUserDay,
  capacityHoursPerDay = 8,
}) {
  const days = businessYmdsInRange(fromYmd, toYmd);
  return (memberIds || []).map((userId) => {
    const dayHours = days.map((ymd) => {
      const planned = plannedByUserDay.get(`${userId}|${ymd}`) || 0;
      return {
        ymd,
        planned,
        capacity: capacityHoursPerDay,
        load: capacityHoursPerDay > 0 ? planned / capacityHoursPerDay : 0,
      };
    });
    const totalPlanned = dayHours.reduce((s, d) => s + d.planned, 0);
    const totalCapacity = days.length * capacityHoursPerDay;
    return {
      userId,
      label: memberLabelById[userId] || userId,
      dayHours,
      totalPlanned,
      totalCapacity,
      load: totalCapacity > 0 ? totalPlanned / totalCapacity : 0,
    };
  });
}

export function enrichTasksWithStageDates(tasks, services = []) {
  const stageMap = new Map();
  for (const s of services) {
    for (const d of s.deliverables || []) {
      if (d?.id) {
        stageMap.set(String(d.id), {
          planned_start: d.planned_start,
          planned_end: d.planned_end,
          name: d.name,
        });
      }
    }
  }
  return (tasks || []).map((t) => {
    const stage = stageMap.get(String(t.deliverableId || ''));
    if (!stage) return t;
    return {
      ...t,
      stagePlannedStart: stage.planned_start,
      stagePlannedEnd: stage.planned_end,
      deliverableName: t.deliverableName || stage.name,
    };
  });
}

export { isBusinessDay, todayYmd };
