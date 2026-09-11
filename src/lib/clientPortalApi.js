import { createSessionJwt } from '@/lib/appwrite';
import { authedFetch } from '@/lib/authInterceptor';

async function authHeaders() {
  const jwt = await createSessionJwt();
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${jwt}`,
  };
}

async function parseRes(res) {
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(body.message || body.error || 'Erro na API do portal');
    err.code = body.error;
    err.status = res.status;
    err.body = body;
    throw err;
  }
  return body;
}

async function portalGet(route) {
  const params = new URLSearchParams({ route });
  const res = await authedFetch(`/api/client-portal?${params}`, {
    headers: await authHeaders(),
  });
  return parseRes(res);
}

export function getClientPortalBootstrap() {
  return portalGet('bootstrap');
}

export function getClientPortalOverview() {
  return portalGet('overview');
}

export function listClientSharedTasks() {
  return portalGet('shared-tasks');
}

export function listClientPortalDocuments() {
  return portalGet('documents');
}

export function listClientPortalServices() {
  return portalGet('services');
}

export function getClientPendingActions() {
  return portalGet('pending-actions');
}

export function getClientAnnualPlan(year) {
  const params = new URLSearchParams({ route: 'annual-plan' });
  if (year) params.set('year', String(year));
  return portalGetWithParams(params);
}

export function listClientCampaigns() {
  return portalGet('campaigns');
}

export async function getClientCampaign(campaignId) {
  const params = new URLSearchParams({
    route: 'campaign',
    id: String(campaignId || ''),
  });
  return portalGetWithParams(params);
}

export function listClientActions(status) {
  const params = new URLSearchParams({ route: 'client-actions' });
  if (status) params.set('status', String(status));
  return portalGetWithParams(params);
}

export async function completeClientAction(actionId) {
  const params = new URLSearchParams({ route: 'complete-client-action' });
  const res = await authedFetch(`/api/client-portal?${params}`, {
    method: 'POST',
    headers: await authHeaders(),
    body: JSON.stringify({ actionId }),
  });
  return parseRes(res);
}

export function listClientApprovals() {
  return portalGet('approvals');
}

export async function getClientApprovalDetail(approvalId) {
  const params = new URLSearchParams({
    route: 'approval-detail',
    approvalId: String(approvalId || ''),
  });
  return portalGetWithParams(params);
}

export async function decideClientApproval({ approvalId, action, comment } = {}) {
  const params = new URLSearchParams({ route: 'decide' });
  const res = await authedFetch(`/api/client-portal?${params}`, {
    method: 'POST',
    headers: await authHeaders(),
    body: JSON.stringify({ approvalId, action, comment }),
  });
  return parseRes(res);
}

async function portalGetWithParams(params) {
  const res = await authedFetch(`/api/client-portal?${params}`, {
    headers: await authHeaders(),
  });
  return parseRes(res);
}
