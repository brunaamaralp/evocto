/**
 * Rótulos consistentes por contexto de tarefas.
 * No shell do cliente o nome já está no breadcrumb — não repetir “do cliente”.
 */

export const TASK_SCOPE_LABELS = Object.freeze({
  agency: Object.freeze({
    nav: 'Tarefas',
    pageTitle: 'Tarefas',
    pageSubtitle: '',
    short: 'Agência',
  }),
  client: Object.freeze({
    nav: 'Tarefas',
    pageTitle: 'Tarefas',
    pageSubtitle: '',
    short: 'Cliente',
  }),
  campaign: Object.freeze({
    nav: 'Tarefas',
    pageTitle: 'Tarefas',
    pageSubtitle: '',
    short: 'Campanha',
  }),
});

export function taskScopeLabel(scope, field = 'nav') {
  const block = TASK_SCOPE_LABELS[scope] || TASK_SCOPE_LABELS.agency;
  return block[field] || block.nav;
}
