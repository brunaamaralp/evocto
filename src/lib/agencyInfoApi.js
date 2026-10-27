import { createSessionJwt } from '@/lib/appwrite';
import { authedFetch } from '@/lib/authInterceptor';
import { friendlyError } from '@/lib/errorMessages';

async function authHeaders(extra = {}) {
  const jwt = await createSessionJwt();
  if (!jwt) throw new Error('session_required');
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${jwt}`,
    ...extra,
  };
}

async function parseRes(res) {
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(friendlyError(body, 'action'));
    err.code = body.error;
    err.status = res.status;
    err.body = body;
    throw err;
  }
  return body;
}

/**
 * @param {object} [filters]
 * @param {string} [filters.type]
 * @param {string} [filters.category]
 * @param {string} [filters.status]
 * @param {string} [filters.q]
 * @param {boolean} [filters.pinned]
 * @param {boolean} [filters.favorite]
 * @param {number} [filters.limit]
 */
export async function listAgencyInfoItems(filters = {}) {
  const params = new URLSearchParams({ route: 'list' });
  for (const key of ['type', 'category', 'status', 'q', 'limit']) {
    if (filters[key] != null && filters[key] !== '') {
      params.set(key, String(filters[key]));
    }
  }
  if (filters.pinned === true) params.set('pinned', 'true');
  if (filters.favorite === true) params.set('favorite', 'true');

  const res = await authedFetch(`/api/agency-info?${params}`, {
    headers: await authHeaders(),
  });
  return parseRes(res);
}

export async function getAgencyInfoItem(itemId) {
  const params = new URLSearchParams({
    route: 'get',
    itemId: String(itemId),
  });
  const res = await authedFetch(`/api/agency-info?${params}`, {
    headers: await authHeaders(),
  });
  return parseRes(res);
}

export async function createAgencyInfoItem(payload) {
  const res = await authedFetch('/api/agency-info?route=create', {
    method: 'POST',
    headers: await authHeaders(),
    body: JSON.stringify(payload),
  });
  return parseRes(res);
}

export async function updateAgencyInfoItem(payload) {
  const res = await authedFetch('/api/agency-info?route=update', {
    method: 'POST',
    headers: await authHeaders(),
    body: JSON.stringify(payload),
  });
  return parseRes(res);
}

/** Soft-delete: status → archived */
export async function archiveAgencyInfoItem(itemId) {
  const res = await authedFetch('/api/agency-info?route=delete', {
    method: 'POST',
    headers: await authHeaders(),
    body: JSON.stringify({ itemId }),
  });
  return parseRes(res);
}
