/**
 * Destino da unidade semântica (Task técnica com UI de conteúdo/sessão/vídeo/…).
 * Distinto de client-tasks (visão agregada / kanban).
 */

export function buildClientUnitHref({
  clientId,
  serviceId = null,
  taskId = null,
} = {}) {
  const params = new URLSearchParams();
  if (clientId) params.set('clientId', clientId);
  if (serviceId) params.set('serviceId', String(serviceId));
  if (taskId) params.set('taskId', String(taskId));
  const qs = params.toString();
  return qs ? `client-unit?${qs}` : 'client-unit';
}
