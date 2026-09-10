import { createSessionJwt } from '@/lib/appwrite';
import { authedFetch } from '@/lib/authInterceptor';

async function authHeaders(extra = {}) {
  const jwt = await createSessionJwt();
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${jwt}`,
    ...extra,
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

export async function materialGetReviewLink(deliveryId) {
  const params = new URLSearchParams({ route: 'review-link', deliveryId });
  const res = await authedFetch(`/api/material-deliveries?${params}`, {
    headers: await authHeaders(),
  });
  return parseRes(res);
}

export async function materialCreateDelivery({
  title,
  description,
  serviceId,
  deliverableId,
  taskId,
}) {
  const res = await authedFetch('/api/material-deliveries?route=create', {
    method: 'POST',
    headers: await authHeaders(),
    body: JSON.stringify({ title, description, serviceId, deliverableId, taskId }),
  });
  return parseRes(res);
}

export async function materialUploadInit({
  deliveryId,
  fileName,
  mimeType,
  fileSize,
  idempotencyKey,
}) {
  const res = await authedFetch('/api/material-deliveries?route=upload-init', {
    method: 'POST',
    headers: await authHeaders(),
    body: JSON.stringify({ deliveryId, fileName, mimeType, fileSize, idempotencyKey }),
  });
  return parseRes(res);
}

export async function materialUploadChunk({ versionId, offset, total, chunk }) {
  const jwt = await createSessionJwt();
  const params = new URLSearchParams({
    route: 'upload-chunk',
    versionId,
    offset: String(offset),
    total: String(total),
  });
  const res = await authedFetch(`/api/material-deliveries?${params}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${jwt}`,
      'Content-Type': 'application/octet-stream',
    },
    body: chunk,
  });
  return parseRes(res);
}

export async function materialUploadComplete({ versionId, submit = true, driveFileId }) {
  const res = await authedFetch('/api/material-deliveries?route=upload-complete', {
    method: 'POST',
    headers: await authHeaders(),
    body: JSON.stringify({ versionId, submit, driveFileId }),
  });
  return parseRes(res);
}

/** @deprecated prefer materialUploadResumable */
export async function materialUploadFromStorage(payload) {
  const res = await authedFetch('/api/material-deliveries?route=upload-from-storage', {
    method: 'POST',
    headers: await authHeaders(),
    body: JSON.stringify(payload),
  });
  return parseRes(res);
}

/**
 * Upload direto ao Drive via sessão resumable + proxy de chunks (anti-CORS).
 */
export async function materialUploadResumable({
  deliveryId,
  file,
  submit = true,
  onProgress,
}) {
  const idempotencyKey =
    typeof crypto !== 'undefined' && crypto.randomUUID
      ? crypto.randomUUID()
      : `up_${Date.now()}`;

  const init = await materialUploadInit({
    deliveryId,
    fileName: file.name,
    mimeType: file.type || 'application/octet-stream',
    fileSize: file.size,
    idempotencyKey,
  });

  const chunkSize = Number(init.chunkSize || 4 * 1024 * 1024);
  let offset = 0;
  let driveFileId = null;

  // Try direct PUT to Google first (single request for small files)
  if (init.uploadUrl && file.size <= chunkSize) {
    try {
      const putRes = await fetch(init.uploadUrl, {
        method: 'PUT',
        headers: {
          'Content-Type': file.type || 'application/octet-stream',
          'Content-Length': String(file.size),
          'Content-Range': `bytes 0-${file.size - 1}/${file.size}`,
        },
        body: file,
      });
      if (putRes.status === 200 || putRes.status === 201) {
        const data = await putRes.json().catch(() => ({}));
        driveFileId = data.id || null;
        onProgress?.(1);
      }
    } catch {
      // fall through to chunk proxy
    }
  }

  if (!driveFileId) {
    while (offset < file.size) {
      const end = Math.min(offset + chunkSize, file.size);
      const blob = file.slice(offset, end);
      const chunk = await blob.arrayBuffer();
      const result = await materialUploadChunk({
        versionId: init.versionId,
        offset,
        total: file.size,
        chunk,
      });
      offset = end;
      onProgress?.(offset / file.size);
      if (result.done) {
        driveFileId = result.driveFileId || driveFileId;
        break;
      }
    }
  }

  return materialUploadComplete({
    versionId: init.versionId,
    submit,
    driveFileId,
  });
}

export async function materialSubmitVersion(versionId) {
  const res = await authedFetch('/api/material-deliveries?route=submit', {
    method: 'POST',
    headers: await authHeaders(),
    body: JSON.stringify({ versionId }),
  });
  return parseRes(res);
}

export async function materialSendLink({ deliveryId, channel = 'both', email, phone }) {
  const res = await authedFetch('/api/material-deliveries?route=send-link', {
    method: 'POST',
    headers: await authHeaders(),
    body: JSON.stringify({ deliveryId, channel, email, phone }),
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
