/**
 * Schedule push API — Buffer / Later / Metricool + status.
 * Routes: ?route=status | push
 */
import { requireAgencyStaff } from './materialAppwrite.js';
import { getBufferConfig, pushBufferPosts } from './schedulers/bufferClient.js';
import { getMetricoolConfig, pushMetricoolPosts } from './schedulers/metricoolClient.js';
import { getLaterConfig, pushLaterPosts } from './schedulers/laterClient.js';

function json(res, status, body) {
  res.status(status).json(body);
}

function readBody(req) {
  if (!req.body) return {};
  if (typeof req.body === 'string') {
    try {
      return JSON.parse(req.body || '{}');
    } catch {
      return {};
    }
  }
  return req.body;
}

function providerStatusList() {
  const buffer = getBufferConfig();
  const later = getLaterConfig();
  const metricool = getMetricoolConfig();

  return [
    {
      id: 'buffer',
      label: 'Buffer',
      status: buffer.configured ? 'ready' : 'needs_credentials',
      configured: buffer.configured,
      docsUrl: buffer.docsUrl,
      description: 'Fila multi-canal (IG, FB, LinkedIn, X)',
    },
    {
      id: 'later',
      label: 'Later',
      status: later.configured ? 'ready' : 'needs_credentials',
      configured: later.configured,
      docsUrl: later.docsUrl,
      description: 'Visual planner (API experimental)',
      note: later.note,
    },
    {
      id: 'metricool',
      label: 'Metricool',
      status: metricool.configured ? 'ready' : 'needs_credentials',
      configured: metricool.configured,
      docsUrl: metricool.docsUrl,
      description: 'Agendamento + analytics',
    },
    {
      id: 'manual',
      label: 'Manual / export CSV',
      status: 'ready',
      configured: true,
      docsUrl: null,
      description: 'Exporta CSV para colar no scheduler',
    },
  ];
}

async function handleStatus(req, res) {
  const auth = await requireAgencyStaff(req, res);
  if (!auth) return;
  json(res, 200, { providers: providerStatusList() });
}

async function handlePush(req, res) {
  const auth = await requireAgencyStaff(req, res);
  if (!auth) return;

  const body = readBody(req);
  const providerId = String(body.provider || body.providerId || '').toLowerCase();
  const payload = body.payload || body;
  const dryRun = Boolean(body.dryRun);

  if (!providerId) {
    json(res, 400, { error: 'missing_provider', message: 'Informe provider' });
    return;
  }

  if (providerId === 'manual') {
    json(res, 400, {
      error: 'use_client_csv',
      message: 'Export CSV é feito no cliente; escolha buffer, later ou metricool.',
    });
    return;
  }

  let result;
  if (providerId === 'buffer') {
    result = await pushBufferPosts(payload, { dryRun });
  } else if (providerId === 'later') {
    result = await pushLaterPosts(payload, { dryRun });
  } else if (providerId === 'metricool') {
    result = await pushMetricoolPosts(payload, { dryRun });
  } else {
    json(res, 400, {
      error: 'unknown_provider',
      message: `Provedor desconhecido: ${providerId}`,
    });
    return;
  }

  json(res, result.success ? 200 : 422, {
    ...result,
    agencyId: auth.agencyId,
  });
}

export default async function schedulePushHandler(req, res) {
  try {
    const route = String(
      req.query?.route ||
        (typeof req.url === 'string'
          ? new URL(req.url, 'http://localhost').searchParams.get('route')
          : '') ||
        ''
    ).toLowerCase();

    const method = String(req.method || 'GET').toUpperCase();

    if (route === 'status' || (method === 'GET' && !route)) {
      await handleStatus(req, res);
      return;
    }

    if (route === 'push' || method === 'POST') {
      if (method !== 'POST') {
        json(res, 405, { error: 'method_not_allowed' });
        return;
      }
      await handlePush(req, res);
      return;
    }

    json(res, 404, { error: 'unknown_route', message: `Rota desconhecida: ${route || '(vazia)'}` });
  } catch (err) {
    console.error('[schedule-push]', err);
    json(res, 500, {
      error: 'internal',
      message: err?.message || 'Erro interno',
    });
  }
}
