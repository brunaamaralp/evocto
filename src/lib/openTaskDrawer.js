/**
 * Contrato único para abrir o TaskDrawer (Sheet canônico + deep link ?taskId=).
 * Preferir isto a TaskModal (deprecated).
 */

export function readTaskIdFromSearch(search = '') {
  const raw = String(search || '');
  const qs = raw.startsWith('?') ? raw.slice(1) : raw;
  const params = new URLSearchParams(qs);
  return params.get('taskId') || params.get('task') || null;
}

export function openTaskDrawer(taskId) {
  const id = taskId != null ? String(taskId).trim() : '';
  if (!id || typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent('task:open', { detail: { taskId: id } }));
}

/** Monta href canônico com taskId (aceita path com ou sem query existente). */
export function buildTaskDeepLink(taskId, basePath = '/tasks-manager') {
  const id = taskId != null ? String(taskId).trim() : '';
  if (!id) return basePath;
  try {
    const url = new URL(basePath, 'http://local.invalid');
    url.searchParams.set('taskId', id);
    url.searchParams.delete('task');
    return `${url.pathname}${url.search}`;
  } catch {
    const sep = basePath.includes('?') ? '&' : '?';
    return `${basePath}${sep}taskId=${encodeURIComponent(id)}`;
  }
}

/** Atualiza a query da URL atual preservando demais params. */
export function applyTaskIdToSearch(search, taskId) {
  const params = new URLSearchParams(
    String(search || '').startsWith('?') ? String(search).slice(1) : String(search || '')
  );
  if (taskId) {
    params.set('taskId', String(taskId));
    params.delete('task');
  } else {
    params.delete('taskId');
    params.delete('task');
  }
  const qs = params.toString();
  return qs ? `?${qs}` : '';
}
