/**
 * Bridge shared by Netlify Functions that wrap Express-style (req, res) handlers.
 * Keeps request/response shaping consistent across published APIs.
 */

export function buildNetlifyReq(event) {
  const headers = Object.fromEntries(
    Object.entries(event.headers || {}).map(([k, v]) => [String(k).toLowerCase(), v])
  );

  const isBinary =
    String(headers['content-type'] || '').includes('application/octet-stream') ||
    String(event.queryStringParameters?.route || '') === 'upload-chunk';

  let rawBody = null;
  let body = event.body;
  if (event.isBase64Encoded && typeof body === 'string') {
    rawBody = Buffer.from(body, 'base64');
    body = isBinary ? rawBody : rawBody.toString('utf8');
  } else if (typeof body === 'string' && isBinary) {
    rawBody = Buffer.from(body, 'binary');
    body = rawBody;
  }

  let parsed = body;
  const ct = String(headers['content-type'] || '');
  if (
    !isBinary &&
    typeof body === 'string' &&
    ct.includes('application/json') &&
    body.trim()
  ) {
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
    rawBody,
    isBase64Encoded: Boolean(event.isBase64Encoded),
    url: event.rawUrl || event.path || '',
  };
}

export function buildNetlifyRes() {
  let statusCode = 200;
  const headers = {};
  /** @type {Buffer[]} */
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
      const contentType = String(headers['Content-Type'] || headers['content-type'] || '');
      const isBinary =
        contentType.startsWith('image/') ||
        contentType.startsWith('video/') ||
        contentType === 'application/pdf' ||
        contentType === 'application/octet-stream' ||
        Boolean(headers['Content-Range'] || headers['content-range']);

      if (isBinary) {
        return {
          statusCode,
          headers,
          body: buf.toString('base64'),
          isBase64Encoded: true,
        };
      }
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

/**
 * @param {(req: object, res: object) => Promise<unknown>} routeHandler
 * @param {string} label
 */
export function createNetlifyHandler(routeHandler, label) {
  return async function handler(event) {
    try {
      const req = buildNetlifyReq(event);
      const res = buildNetlifyRes();
      await routeHandler(req, res);
      if (!res.finished) {
        return {
          statusCode: 500,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ error: 'handler_no_response' }),
        };
      }
      return res.result();
    } catch (err) {
      console.error(`[netlify ${label}]`, err?.message || err);
      return {
        statusCode: 500,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'internal', message: 'Erro interno' }),
      };
    }
  };
}
