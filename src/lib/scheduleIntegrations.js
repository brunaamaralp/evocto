/**
 * Adapter de agendamento externo (Buffer / Later / Metricool).
 * CSV no cliente; APIs via /api/schedule-push (credenciais no servidor).
 */

import { createSessionJwt } from '@/lib/appwrite';
import { authedFetch } from '@/lib/authInterceptor';

export const SCHEDULER_PROVIDERS = Object.freeze([
  {
    id: 'buffer',
    label: 'Buffer',
    status: 'available',
    description: 'Fila multi-canal (IG, FB, LinkedIn, X)',
    docsUrl: 'https://developers.buffer.com/guides/posts-and-scheduling.html',
  },
  {
    id: 'later',
    label: 'Later',
    status: 'available',
    description: 'Visual planner (API experimental)',
    docsUrl: 'https://www.later.com/',
  },
  {
    id: 'metricool',
    label: 'Metricool',
    status: 'available',
    description: 'Agendamento + analytics em um painel',
    docsUrl:
      'https://help.metricool.com/wli-scheduler-endpoint-example-on-a-custom-backend-proxy-frko7',
  },
  {
    id: 'manual',
    label: 'Manual / export CSV',
    status: 'available',
    description: 'Exporta posts da fase AGENDAMENTO para colar no scheduler',
  },
]);

/**
 * Monta payload canônico de posts a partir de tarefas da fase agendamento.
 */
export function buildSchedulePayloadFromTasks(tasks = [], meta = {}) {
  const posts = (Array.isArray(tasks) ? tasks : [])
    .filter((t) => {
      const title = String(t.title || '').toLowerCase();
      const type = String(t.type || '').toLowerCase();
      return (
        type === 'midia' ||
        /agendar|publicar|post|stories|feed/.test(title)
      );
    })
    .map((t, idx) => ({
      id: t.id || `post_${idx + 1}`,
      title: t.title,
      caption: t.description || '',
      scheduled_for: t.dueDate || meta.defaultDate || null,
      channels: meta.channels || ['instagram'],
      status: t.status === 'completed' ? 'published' : 'draft',
      serviceId: t.serviceId || meta.serviceId || null,
      mediaUrl: t.mediaUrl || t.fileUrl || meta.mediaUrl || null,
    }));

  return {
    provider: meta.provider || 'manual',
    generated_at: new Date().toISOString(),
    campaign: {
      name: meta.campaignName || null,
      tipo_campanha: meta.tipo_campanha || null,
      ciclo_comercial: meta.ciclo_comercial || null,
      linha_focal: meta.linha_focal || null,
    },
    posts,
  };
}

/**
 * Export CSV simples para import manual em Buffer/Later/Metricool.
 */
export function schedulePayloadToCsv(payload) {
  const header = ['title', 'caption', 'scheduled_for', 'channels', 'status'];
  const lines = [header.join(',')];
  for (const p of payload.posts || []) {
    const row = [
      csvEscape(p.title),
      csvEscape(p.caption),
      csvEscape(p.scheduled_for || ''),
      csvEscape((p.channels || []).join('|')),
      csvEscape(p.status || 'draft'),
    ];
    lines.push(row.join(','));
  }
  return lines.join('\n');
}

function csvEscape(value) {
  const s = String(value ?? '');
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

async function authHeaders() {
  const jwt = await createSessionJwt();
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${jwt}`,
  };
}

/**
 * Status dos provedores no servidor (credenciais configuradas ou não).
 */
export async function fetchSchedulerProviderStatus() {
  try {
    const res = await authedFetch('/api/schedule-push?route=status', {
      headers: await authHeaders(),
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) {
      return getSchedulerProviderStatus();
    }
    return Array.isArray(body.providers) ? body.providers : getSchedulerProviderStatus();
  } catch {
    return getSchedulerProviderStatus();
  }
}

/**
 * Envia para provedor. `manual` = CSV local; demais via API Netlify.
 */
export async function pushToScheduler(providerId, payload, options = {}) {
  const provider = SCHEDULER_PROVIDERS.find((p) => p.id === providerId);
  if (!provider) throw new Error(`Provedor desconhecido: ${providerId}`);

  if (providerId === 'manual') {
    return {
      success: true,
      provider: 'manual',
      mode: 'csv_export',
      csv: schedulePayloadToCsv(payload),
      postCount: (payload.posts || []).length,
      message: 'CSV pronto para importar no seu scheduler',
    };
  }

  const res = await authedFetch('/api/schedule-push?route=push', {
    method: 'POST',
    headers: await authHeaders(),
    body: JSON.stringify({
      provider: providerId,
      payload,
      dryRun: Boolean(options.dryRun),
    }),
  });

  const body = await res.json().catch(() => ({}));
  if (!res.ok && body.success !== true) {
    return {
      success: false,
      provider: providerId,
      error: body.error || 'push_failed',
      message: body.message || `Falha ao enviar para ${provider.label}`,
      docsUrl: body.docsUrl || provider.docsUrl,
      errors: body.errors,
      created: body.created,
    };
  }

  return {
    success: Boolean(body.success),
    provider: providerId,
    mode: body.mode || 'api',
    postCount: body.postCount ?? 0,
    message: body.message,
    docsUrl: body.docsUrl || provider.docsUrl,
    created: body.created,
    errors: body.errors,
    note: body.note,
  };
}

export function getSchedulerProviderStatus() {
  return SCHEDULER_PROVIDERS.map((p) => ({
    ...p,
    configured: p.id === 'manual',
    status: p.id === 'manual' ? 'ready' : 'needs_credentials',
  }));
}

export default {
  SCHEDULER_PROVIDERS,
  buildSchedulePayloadFromTasks,
  schedulePayloadToCsv,
  pushToScheduler,
  getSchedulerProviderStatus,
  fetchSchedulerProviderStatus,
};
