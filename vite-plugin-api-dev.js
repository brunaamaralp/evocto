/**
 * Serve critical /api handlers during `npm run dev` (sem precisar de netlify/vercel dev).
 * Carrega .env / .env.local via Vite loadEnv (inclui APPWRITE_API_KEY).
 *
 * Importante: o middleware NÃO pode ser `async` — o Connect do Vite não espera
 * a Promise e o `server.proxy` captura /api antes do handler terminar.
 *
 * Handlers são carregados em runtime via file URL dinâmica — NÃO use
 * `import('./lib/server/...')` estático aqui. O bundler do vite.config segue
 * esses imports, puxa o grafo de `src/` e quebra em aliases `@/api` (não
 * resolvidos na avaliação do config).
 */
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { loadEnv } from 'vite';

/** route → filename under lib/server/ */
const ROUTE_FILES = {
  '/api/invite-client': 'inviteClientHandler.js',
  '/api/team-members': 'teamMembersHandler.js',
  '/api/generate-material': 'generateMaterialHandler.js',
  '/api/material-deliveries': 'materialDeliveriesHandler.js',
  '/api/client-portal': 'clientPortalHandler.js',
  '/api/client-accesses': 'clientAccessesHandler.js',
  '/api/agency-info': 'agencyInfoHandler.js',
  '/api/agency-accesses': 'agencyAccessesHandler.js',
  '/api/approval-workflow': 'approvalWorkflowHandler.js',
  '/api/public-briefing': 'publicBriefingHandler.js',
  '/api/extract-briefing-inicial': 'extractBriefingInicialHandler.js',
};

async function loadRouteHandler(pathname) {
  const file = ROUTE_FILES[pathname];
  if (!file) return null;
  const abs = path.resolve(process.cwd(), 'lib', 'server', file);
  // Variable URL prevents esbuild from bundling handlers into vite.config.
  const href = pathToFileURL(abs).href;
  return import(href);
}

/** Handlers that accept GET (besides POST/OPTIONS). */
const GET_ALLOWED = new Set([
  '/api/generate-material',
  '/api/material-deliveries',
  '/api/client-portal',
  '/api/client-accesses',
  '/api/agency-info',
  '/api/agency-accesses',
  '/api/approval-workflow',
  '/api/public-briefing',
]);

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
    if (!ROUTE_FILES[pathname]) {
      next();
      return;
    }
    if (
      req.method !== 'POST' &&
      req.method !== 'OPTIONS' &&
      !(GET_ALLOWED.has(pathname) && req.method === 'GET')
    ) {
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

        const mod = await loadRouteHandler(pathname);
        if (!mod?.default) {
          sendJson(res, 500, {}, { success: false, error: 'handler_missing' });
          return;
        }
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
