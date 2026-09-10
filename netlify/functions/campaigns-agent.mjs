/**
 * Netlify Function — campaign agent (init / message / save-brief).
 * Exposed as /api/campaigns-agent and /api/campaigns/agent/*
 */
import campaignAgentHandler from '../../lib/server/campaignAgentHandler.js';

function buildReq(event) {
  const headers = Object.fromEntries(
    Object.entries(event.headers || {}).map(([k, v]) => [String(k).toLowerCase(), v])
  );

  let body = event.body;
  if (event.isBase64Encoded && typeof body === 'string') {
    body = Buffer.from(body, 'base64').toString('utf8');
  }

  let parsed = body;
  const ct = String(headers['content-type'] || '');
  if (typeof body === 'string' && ct.includes('application/json') && body.trim()) {
    try {
      parsed = JSON.parse(body);
    } catch {
      parsed = body;
    }
  }

  const query = event.queryStringParameters || {};
  return {
    method: event.httpMethod || 'GET',
    headers,
    query,
    body: parsed,
    url: event.rawUrl || event.path || '',
  };
}

function buildRes() {
  let statusCode = 200;
  const headers = {};
  let jsonBody = null;
  let finished = false;

  const res = {
    status(code) {
      statusCode = code;
      return res;
    },
    setHeader(key, value) {
      headers[key] = value;
      return res;
    },
    json(obj) {
      jsonBody = obj;
      if (!headers['Content-Type'] && !headers['content-type']) {
        headers['Content-Type'] = 'application/json; charset=utf-8';
      }
      finished = true;
      return res;
    },
    end() {
      finished = true;
      return res;
    },
    result() {
      return {
        statusCode,
        headers,
        body: jsonBody !== null ? JSON.stringify(jsonBody) : '',
      };
    },
    get finished() {
      return finished;
    },
  };

  return res;
}

export async function handler(event) {
  try {
    const req = buildReq(event);
    const res = buildRes();
    await campaignAgentHandler(req, res);
    if (!res.finished) {
      return {
        statusCode: 500,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'handler_no_response' }),
      };
    }
    return res.result();
  } catch (err) {
    console.error('[netlify campaigns-agent]', err);
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'internal', message: err?.message || 'error' }),
    };
  }
}
