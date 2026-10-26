/**
 * Estado de URL do /tasks-manager (filtros, view, create, taskId).
 * Fonte única para hidratar/persistir contexto sem perder filtros na navegação.
 */

import { createPageUrl } from '@/utils';
import { resolvePresetFromQuery } from '@/lib/taskFilterPresets';
import { readTaskIdFromSearch } from '@/lib/openTaskDrawer';

const EMPTY = '';

/**
 * @param {string|URLSearchParams} search
 */
export function readTaskManagerUrlState(search = '') {
  const params =
    search instanceof URLSearchParams
      ? search
      : new URLSearchParams(
          String(search || '').startsWith('?')
            ? String(search).slice(1)
            : String(search || '')
        );

  const dueRangeRaw = params.get('dueRange') || 'all';
  const dueRange = ['overdue', 'this_week', 'next_48h'].includes(dueRangeRaw)
    ? dueRangeRaw
    : 'all';

  return {
    q: params.get('q') || EMPTY,
    client: params.get('client') || 'all',
    assignee: params.get('assignee') || 'all',
    status: params.get('status') || 'all',
    dueRange,
    preset: params.get('preset') || null,
    view: params.get('view') === 'week' ? 'week' : 'kanban',
    create: params.get('create') === '1',
    taskId: readTaskIdFromSearch(
      search instanceof URLSearchParams ? `?${params.toString()}` : search
    ),
  };
}

/**
 * Aplica patch de filtros sobre URLSearchParams (imutável).
 * @param {string|URLSearchParams} search
 * @param {Record<string, string|null|undefined>} patch
 * @param {{ clearPreset?: boolean }} [opts]
 * @returns {URLSearchParams}
 */
export function writeTaskManagerFilterParams(search, patch = {}, opts = {}) {
  const next =
    search instanceof URLSearchParams
      ? new URLSearchParams(search)
      : new URLSearchParams(
          String(search || '').startsWith('?')
            ? String(search).slice(1)
            : String(search || '')
        );

  const apply = (key, value) => {
    if (value == null || value === '' || value === 'all') next.delete(key);
    else next.set(key, String(value));
  };

  if ('q' in patch) apply('q', patch.q);
  if ('client' in patch) apply('client', patch.client);
  if ('assignee' in patch) apply('assignee', patch.assignee);
  if ('status' in patch) apply('status', patch.status);
  if ('dueRange' in patch) apply('dueRange', patch.dueRange);
  if ('view' in patch) {
    if (patch.view === 'week') next.set('view', 'week');
    else next.delete('view');
  }
  if (opts.clearPreset) next.delete('preset');
  if ('preset' in patch) {
    const resolved = resolvePresetFromQuery(patch.preset);
    if (resolved) next.set('preset', resolved.id);
    else next.delete('preset');
  }

  return next;
}

/**
 * Remove filtros livres e preset (mantém view/taskId).
 * @param {string|URLSearchParams} search
 */
export function clearTaskManagerFilterParams(search) {
  const next =
    search instanceof URLSearchParams
      ? new URLSearchParams(search)
      : new URLSearchParams(
          String(search || '').startsWith('?')
            ? String(search).slice(1)
            : String(search || '')
        );
  next.delete('q');
  next.delete('client');
  next.delete('assignee');
  next.delete('status');
  next.delete('dueRange');
  next.delete('preset');
  return next;
}

/**
 * Filtro por cliente no board da agência (inclui internas).
 */
export function taskMatchesClientFilter(task, clientFilter) {
  if (!clientFilter || clientFilter === 'all') return true;
  if (clientFilter === 'internal') return !task?.clientId;
  return String(task?.clientId || '') === String(clientFilter);
}

/**
 * Href canônico com filtros livres + preset + view.
 * @param {{
 *   preset?: string,
 *   view?: string,
 *   q?: string,
 *   client?: string,
 *   assignee?: string,
 *   status?: string,
 *   dueRange?: string,
 * }} opts
 */
export function buildTasksManagerFilterHref(opts = {}) {
  const params = writeTaskManagerFilterParams('', {
    q: opts.q,
    client: opts.client,
    assignee: opts.assignee,
    status: opts.status,
    dueRange: opts.dueRange,
    view: opts.view,
    preset: opts.preset,
  });
  const qs = params.toString();
  return createPageUrl(qs ? `tasks-manager?${qs}` : 'tasks-manager');
}
