export function addCalendarDaysYmd(ymd, days) {
  const d = new Date(`${String(ymd).slice(0, 10)}T12:00:00`);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

/**
 * Due date ISO a partir do template + deliverable agendado.
 */
export function dueDateForTaskTemplate(taskTemplate, deliverable) {
  const end = deliverable?.planned_end;
  if (!end) return null;
  if (
    taskTemplate?.id === 'reuniao_mensal_relatorio' ||
    /reunião mensal|gerar relatório/i.test(taskTemplate?.title || '')
  ) {
    return `${addCalendarDaysYmd(end, -2)}T18:00:00.000Z`;
  }
  return `${end}T18:00:00.000Z`;
}
