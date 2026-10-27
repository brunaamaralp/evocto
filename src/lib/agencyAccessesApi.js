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

export async function listAgencyAccesses() {
  const params = new URLSearchParams({ route: 'list' });
  const res = await authedFetch(`/api/agency-accesses?${params}`, {
    headers: await authHeaders(),
  });
  return parseRes(res);
}

export async function revealAgencyAccessPassword(accessId) {
  const params = new URLSearchParams({
    route: 'reveal',
    accessId: String(accessId),
  });
  const res = await authedFetch(`/api/agency-accesses?${params}`, {
    headers: await authHeaders(),
  });
  return parseRes(res);
}

export async function createAgencyAccess(payload) {
  const res = await authedFetch('/api/agency-accesses?route=create', {
    method: 'POST',
    headers: await authHeaders(),
    body: JSON.stringify(payload),
  });
  return parseRes(res);
}

export async function updateAgencyAccess(payload) {
  const res = await authedFetch('/api/agency-accesses?route=update', {
    method: 'POST',
    headers: await authHeaders(),
    body: JSON.stringify(payload),
  });
  return parseRes(res);
}

export async function deleteAgencyAccess(accessId) {
  const res = await authedFetch('/api/agency-accesses?route=delete', {
    method: 'POST',
    headers: await authHeaders(),
    body: JSON.stringify({ accessId }),
  });
  return parseRes(res);
}
