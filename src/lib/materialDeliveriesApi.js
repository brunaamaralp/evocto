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
    const err = new Error(body.message || body.error || 'Erro na API de entregas');
    err.code = body.error;
    err.status = res.status;
    err.body = body;
    throw err;
  }
  return body;
}

export async function materialDriveStatus() {
  const res = await authedFetch('/api/material-deliveries?route=drive-status', {
    headers: await authHeaders(),
  });
  return parseRes(res);
}

export async function materialDriveConnect() {
  const res = await authedFetch('/api/material-deliveries?route=drive-connect', {
    method: 'POST',
    headers: await authHeaders(),
  });
  return parseRes(res);
}

export async function materialDriveDisconnect() {
  const res = await authedFetch('/api/material-deliveries?route=drive-disconnect', {
    method: 'POST',
    headers: await authHeaders(),
  });
  return parseRes(res);
}

export async function materialListDeliveries(serviceId) {
  const params = new URLSearchParams({ route: 'list', serviceId });
  const res = await authedFetch(`/api/material-deliveries?${params}`, {
    headers: await authHeaders(),
  });
  return parseRes(res);
}

export async function materialGetDelivery(deliveryId) {
  const params = new URLSearchParams({ route: 'get', deliveryId });
  const res = await authedFetch(`/api/material-deliveries?${params}`, {
    headers: await authHeaders(),
  });
  return parseRes(res);
}

export async function materialCreateDelivery({ title, description, serviceId, deliverableId, taskId }) {
  const res = await authedFetch('/api/material-deliveries?route=create', {
    method: 'POST',
    headers: await authHeaders(),
    body: JSON.stringify({ title, description, serviceId, deliverableId, taskId }),
  });
  return parseRes(res);
}

export async function materialUploadFromStorage({
  deliveryId,
  storageFileId,
  fileName,
  mimeType,
  idempotencyKey,
  submit = true,
}) {
  const res = await authedFetch('/api/material-deliveries?route=upload-from-storage', {
    method: 'POST',
    headers: await authHeaders(),
    body: JSON.stringify({
      deliveryId,
      storageFileId,
      fileName,
      mimeType,
      idempotencyKey,
      submit,
    }),
  });
  return parseRes(res);
}

export async function materialSubmitVersion(versionId) {
  const res = await authedFetch('/api/material-deliveries?route=submit', {
    method: 'POST',
    headers: await authHeaders(),
    body: JSON.stringify({ versionId }),
  });
  return parseRes(res);
}

export async function materialRegenerateToken(deliveryId) {
  const res = await authedFetch('/api/material-deliveries?route=regenerate-token', {
    method: 'POST',
    headers: await authHeaders(),
    body: JSON.stringify({ deliveryId }),
  });
  return parseRes(res);
}

export async function materialReopen(deliveryId) {
  const res = await authedFetch('/api/material-deliveries?route=reopen', {
    method: 'POST',
    headers: await authHeaders(),
    body: JSON.stringify({ deliveryId }),
  });
  return parseRes(res);
}

export async function publicReviewGet(token) {
  const params = new URLSearchParams({ route: 'review', token });
  const res = await fetch(`/api/material-deliveries?${params}`);
  return parseRes(res);
}

export function publicReviewFileUrl(token) {
  return `/api/material-deliveries?route=review-file&token=${encodeURIComponent(token)}`;
}

export async function publicReviewApprove({ token, reviewerName, reviewerEmail }) {
  const res = await fetch('/api/material-deliveries?route=approve', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token, reviewerName, reviewerEmail }),
  });
  return parseRes(res);
}

export async function publicReviewRequestChanges({ token, reviewerName, reviewerEmail, feedback }) {
  const res = await fetch('/api/material-deliveries?route=request-changes', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token, reviewerName, reviewerEmail, feedback }),
  });
  return parseRes(res);
}
