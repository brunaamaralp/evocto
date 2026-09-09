export function addCalendarDaysYmd(ymd, days) {
  const d = new Date(`${String(ymd).slice(0, 10)}T12:00:00`);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

function parseYmdAsUtc(ymd) {
  return new Date(`${String(ymd).slice(0, 10)}T12:00:00.000Z`);
}

function ymdFromUtcDate(date) {
  return new Date(date).toISOString().slice(0, 10);
}

function getNextWeekdayUtc(ymd, weekdayIndex) {
  // weekdayIndex: 0=Domingo ... 1=Segunda ... 6=Sábado (JS)
  const base = parseYmdAsUtc(ymd);
  const current = base.getUTCDay();
  const diff = (weekdayIndex - current + 7) % 7;
  base.setUTCDate(base.getUTCDate() + diff);
  return ymdFromUtcDate(base);
}

/**
 * Due date ISO a partir do template + deliverable agendado.
 */
export function dueDateForTaskTemplate(taskTemplate, deliverable) {
  const end = deliverable?.planned_end;
  const start = deliverable?.planned_start || end;
  if (!end) return null;
  if (
    taskTemplate?.id === 'reuniao_mensal_relatorio' ||
    /reunião mensal|gerar relatório/i.test(taskTemplate?.title || '')
  ) {
    return `${addCalendarDaysYmd(end, -2)}T18:00:00.000Z`;
  }

  // Para tarefas do tipo "lembrete segunda", o sistema de lembretes atual dispara
  // próximo do `dueDate`. Então, garantimos que o dueDate caia numa segunda.
  const notificacao = String(taskTemplate?.notificacao || '').toLowerCase();
  const isReminderMonday =
    notificacao === 'segunda-feira' ||
    /lembrete segunda/i.test(String(taskTemplate?.title || taskTemplate?.id || ''));

  if (isReminderMonday) {
    // Segunda-feira = 1 no getUTCDay
    const mondayYmd = getNextWeekdayUtc(start, 1);
    return `${mondayYmd}T18:00:00.000Z`;
  }

  return `${end}T18:00:00.000Z`;
}
