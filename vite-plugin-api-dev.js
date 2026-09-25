/**
 * Serve critical /api handlers during `npm run dev` (sem precisar de netlify/vercel dev).
 * Carrega .env / .env.local via Vite loadEnv (inclui APPWRITE_API_KEY).
 *
 * Importante: o middleware NÃO pode ser `async` — o Connect do Vite não espera
 * a Promise e o `server.proxy` captura /api antes do handler terminar.
 */
import { loadEnv } from 'vite';

const ROUTES = {
  '/api/invite-client': () => import('./lib/server/inviteClientHandler.js'),
  '/api/team-members': () => import('./lib/server/teamMembersHandler.js'),
};

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', (chunk) => chunks.push(chunk));
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    req.on('error', reject);
  });
}

function buildFakeRes() {
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
      finished = true;
      if (!headers['Content-Type'] && !headers['content-type']) {
        headers['Content-Type'] = 'application/json; charset=utf-8';
      }
      return res;
    },
    end() {
      finished = true;
      return res;
    },
    get finished() {
      return finished;
    },
    get statusCode() {
      return statusCode;
    },
    get headers() {
      return headers;
    },
    get jsonBody() {
      return jsonBody;
    },
  };

  return res;
}

function sendJson(res, statusCode, headers, body) {
  if (res.writableEnded || res.headersSent) return;
  res.statusCode = statusCode;
  for (const [key, value] of Object.entries(headers || {})) {
    res.setHeader(key, value);
  }
  if (!res.getHeader('Content-Type')) {
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
  }
  res.end(body != null ? JSON.stringify(body) : '');
}

function attachApiMiddleware(middlewares) {
  // Função sync: não devolver Promise ao Connect (senão o proxy/SPA rouba a rota).
  middlewares.use((req, res, next) => {
    const rawPath = String(req.url || '').split('?')[0];
    const pathname = rawPath.length > 1 && rawPath.endsWith('/') ? rawPath.slice(0, -1) : rawPath;
    const loader = ROUTES[pathname];
    if (!loader) {
      next();
      return;
    }
    if (req.method !== 'POST' && req.method !== 'OPTIONS') {
      next();
      return;
    }

    ;(async () => {
      try {
        const raw = req.method === 'POST' ? await readBody(req) : '';
        let body = raw;
        const ct = String(req.headers['content-type'] || '');
        if (raw && ct.includes('application/json')) {
          try {
            body = JSON.parse(raw);
          } catch {
            body = raw;
          }
        }

        const query = Object.fromEntries(
          new URL(req.url || '/', 'http://127.0.0.1').searchParams
        );

        const fakeReq = {
          method: req.method,
          headers: req.headers,
          query,
          body,
          url: req.url,
        };
        const fakeRes = buildFakeRes();

        const mod = await loader();
        await mod.default(fakeReq, fakeRes);

        if (!fakeRes.finished) {
          sendJson(res, 500, {}, { success: false, error: 'handler_no_response' });
          return;
        }

        sendJson(res, fakeRes.statusCode, fakeRes.headers, fakeRes.jsonBody);
      } catch (err) {
        console.error('[api-dev]', pathname, err);
        sendJson(res, 500, {}, {
          success: false,
          error: 'internal',
          message: err?.message || 'Erro na API local de desenvolvimento',
        });
      }
    })();
  });
}

function loadProcessEnv(mode) {
  const env = loadEnv(mode, process.cwd(), '');
  for (const [key, value] of Object.entries(env)) {
    if (process.env[key] === undefined) process.env[key] = value;
  }
}

export function apiDevPlugin() {
  return {
    name: 'evocto-api-dev',
    configureServer(server) {
      loadProcessEnv(server.config.mode);
      attachApiMiddleware(server.middlewares);
    },
    // `vite preview` também precisa da API (senão /api vira HTML 404 do SPA).
    configurePreviewServer(server) {
      loadProcessEnv(server.config.mode);
      attachApiMiddleware(server.middlewares);
    },
  };
}
