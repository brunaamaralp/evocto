/**
 * Clientes recentes por agência (localStorage) — switcher do header.
 */

import { createPageUrl } from '@/utils';

export const RECENT_CLIENTS_MAX = 8;
export const RECENT_CLIENTS_CHANGED_EVENT = 'evocto:recent-clients-changed';
const STORAGE_PREFIX = 'evocto:recent-clients:';

export function notifyRecentClientsChanged() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(RECENT_CLIENTS_CHANGED_EVENT));
  }
}

function storageKey(agencyId) {
  return `${STORAGE_PREFIX}${agencyId || 'default'}`;
}

function safeParse(raw) {
  try {
    const data = JSON.parse(raw);
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

/**
 * @returns {{ id: string, name: string, sector?: string|null, visitedAt: number }[]}
 */
export function readRecentClients(agencyId) {
  if (typeof window === 'undefined' || !agencyId) return [];
  try {
    const rows = safeParse(localStorage.getItem(storageKey(agencyId)));
    return rows
      .filter((r) => r && r.id)
      .map((r) => ({
        id: String(r.id),
        name: String(r.name || 'Cliente'),
        sector: r.sector || null,
        visitedAt: Number(r.visitedAt) || 0,
      }))
      .sort((a, b) => b.visitedAt - a.visitedAt)
      .slice(0, RECENT_CLIENTS_MAX);
  } catch {
    return [];
  }
}

/**
 * Registra visita ao hub/contexto do cliente.
 * @param {string} agencyId
 * @param {{ id: string, name?: string, sector?: string|null }} client
 */
export function recordRecentClient(agencyId, client) {
  if (typeof window === 'undefined' || !agencyId || !client?.id) return [];
  const id = String(client.id);
  const entry = {
    id,
    name: String(client.name || 'Cliente'),
    sector: client.sector || null,
    visitedAt: Date.now(),
  };
  const prev = readRecentClients(agencyId).filter((r) => r.id !== id);
  const next = [entry, ...prev].slice(0, RECENT_CLIENTS_MAX);
  try {
    localStorage.setItem(storageKey(agencyId), JSON.stringify(next));
    notifyRecentClientsChanged();
  } catch {
    /* quota / private mode */
  }
  return next;
}

export function buildRecentClientHref(clientId) {
  return createPageUrl(`client-detail?clientId=${clientId}`);
}

/** Lista recentes excluindo o cliente atual (útil no dropdown). */
export function listRecentClientsForSwitcher(agencyId, currentClientId = null) {
  const all = readRecentClients(agencyId);
  if (!currentClientId) return all;
  const cur = String(currentClientId);
  return all.filter((r) => r.id !== cur);
}
