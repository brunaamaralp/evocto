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

export async function listClientAccesses(clientId) {
  const params = new URLSearchParams({
    route: 'list',
    clientId: String(clientId),
  });
  const res = await authedFetch(`/api/client-accesses?${params}`, {
    headers: await authHeaders(),
  });
  return parseRes(res);
}

export async function revealClientAccessPassword(clientId, accessId) {
  const params = new URLSearchParams({
    route: 'reveal',
    clientId: String(clientId),
    accessId: String(accessId),
  });
  const res = await authedFetch(`/api/client-accesses?${params}`, {
    headers: await authHeaders(),
  });
  return parseRes(res);
}

export async function createClientAccess(payload) {
  const res = await authedFetch('/api/client-accesses?route=create', {
    method: 'POST',
    headers: await authHeaders(),
    body: JSON.stringify(payload),
  });
  return parseRes(res);
}

export async function updateClientAccess(payload) {
  const res = await authedFetch('/api/client-accesses?route=update', {
    method: 'POST',
    headers: await authHeaders(),
    body: JSON.stringify(payload),
  });
  return parseRes(res);
}

export async function deleteClientAccess({ clientId, accessId }) {
  const res = await authedFetch('/api/client-accesses?route=delete', {
    method: 'POST',
    headers: await authHeaders(),
    body: JSON.stringify({ clientId, accessId }),
  });
  return parseRes(res);
}

export async function updateClientAccessGeneralNotes({ clientId, generalNotes }) {
  const res = await authedFetch('/api/client-accesses?route=update-notes', {
    method: 'POST',
    headers: await authHeaders(),
    body: JSON.stringify({ clientId, generalNotes }),
  });
  return parseRes(res);
}
