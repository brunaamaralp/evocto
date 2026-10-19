/**
 * Rótulos consistentes por contexto de tarefas (agência / cliente / campanha).
 * Não misturar os contextos de negócio — só a linguagem de UI.
 */

export const TASK_SCOPE_LABELS = Object.freeze({
  agency: Object.freeze({
    nav: 'Tarefas da agência',
    pageTitle: 'Tarefas da agência',
    pageSubtitle: 'Quadro da agência — arraste cards ou abra uma tarefa para editar',
    short: 'Agência',
  }),
  client: Object.freeze({
    nav: 'Tarefas do cliente',
    pageTitle: 'Tarefas do cliente',
    pageSubtitle: 'Inbox operacional deste cliente',
    short: 'Cliente',
  }),
  campaign: Object.freeze({
    nav: 'Tarefas da campanha',
    pageTitle: 'Tarefas da campanha',
    pageSubtitle: 'Trabalho da campanha no workspace',
    short: 'Campanha',
  }),
});

export function taskScopeLabel(scope, field = 'nav') {
  const block = TASK_SCOPE_LABELS[scope] || TASK_SCOPE_LABELS.agency;
  return block[field] || block.nav;
}
