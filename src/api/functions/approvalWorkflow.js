/**
 * Client-side wrappers for approval workflow API.
 * Returns { data, status } for compatibility with legacy callers.
 */
import { createSessionJwt } from '@/lib/appwrite';
import { authedFetch } from '@/lib/authInterceptor';

async function authHeaders() {
  const jwt = await createSessionJwt();
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${jwt}`,
  };
}

async function callApprovalWorkflow(payload = {}) {
  const action = String(payload.action || '').trim();
  const params = new URLSearchParams();
  if (action) params.set('action', action);

  const isPublic = action === 'validate' || action === 'process';
  const method = action === 'validate' && !payload.token ? 'GET' : 'POST';

  if (action === 'validate' && payload.token && method === 'GET') {
    params.set('token', payload.token);
  }

  const url = `/api/approval-workflow?${params}`;
  const options = isPublic
    ? {
        method: method === 'GET' ? 'GET' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        ...(method === 'POST' ? { body: JSON.stringify(payload) } : {}),
      }
    : {
        method: 'POST',
        headers: await authHeaders(),
        body: JSON.stringify(payload),
      };

  const res = await (isPublic ? fetch(url, options) : authedFetch(url, options));
  const data = await res.json().catch(() => ({}));
  return { data, status: res.status };
}

export async function approvalWorkflow(payload = {}) {
  return callApprovalWorkflow(payload);
}

/**
 * Authenticated portal decide (requireClient on server).
 */
export async function processClientApproval({ approvalId, action, comment } = {}) {
  const jwt = await createSessionJwt();
  const res = await authedFetch('/api/client-portal?route=decide', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${jwt}`,
    },
    body: JSON.stringify({ approvalId, action, comment }),
  });
  const data = await res.json().catch(() => ({}));
  return { data, status: res.status };
}
