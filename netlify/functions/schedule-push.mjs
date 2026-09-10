/**
 * Netlify Function — schedule push (Buffer / Later / Metricool).
 * Exposed as /api/schedule-push via netlify.toml redirect.
 */
import schedulePushHandler from '../../lib/server/schedulePushHandler.js';

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

  return {
    method: event.httpMethod || 'GET',
    headers,
    query: event.queryStringParameters || {},
    body: parsed,
    url: event.rawUrl || event.path || '',
  };
}

function buildRes() {
  let statusCode = 200;
  const headers = {};
  const chunks = [];
  let jsonBody = null;
  let finished = false;

  const mark = () => {
    finished = true;
  };

  const res = {
    status(code) {
      statusCode = code;
      return res;
    },
    setHeader(key, value) {
      headers[key] = value;
      return res;
    },
    writeHead(code, hdrs = {}) {
      statusCode = code;
      Object.assign(headers, hdrs || {});
      return res;
    },
    json(obj) {
      jsonBody = obj;
      if (!headers['Content-Type'] && !headers['content-type']) {
        headers['Content-Type'] = 'application/json; charset=utf-8';
      }
      mark();
      return res;
    },
    end(chunk) {
      if (chunk !== undefined && chunk !== null) {
        chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
      }
      mark();
      return res;
    },
    result() {
      if (jsonBody !== null) {
        return {
          statusCode,
          headers,
          body: JSON.stringify(jsonBody),
        };
      }
      const buf = chunks.length ? Buffer.concat(chunks) : Buffer.alloc(0);
      return {
        statusCode,
        headers,
        body: buf.toString('utf8'),
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
    await schedulePushHandler(req, res);
    if (!res.finished) {
      return {
        statusCode: 500,
        body: JSON.stringify({ error: 'handler_no_response' }),
        headers: { 'Content-Type': 'application/json' },
      };
    }
    return res.result();
  } catch (err) {
    console.error('[netlify schedule-push]', err);
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'internal', message: err?.message || 'error' }),
    };
  }
}
