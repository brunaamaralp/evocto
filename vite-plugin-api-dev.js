/**
 * Serve critical /api handlers during `npm run dev` (sem precisar de netlify/vercel dev).
 * Carrega .env / .env.local via Vite loadEnv (inclui APPWRITE_API_KEY).
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

export function apiDevPlugin() {
  return {
    name: 'evocto-api-dev',
    configureServer(server) {
      const env = loadEnv(server.config.mode, process.cwd(), '');
      for (const [key, value] of Object.entries(env)) {
        if (process.env[key] === undefined) process.env[key] = value;
      }

      server.middlewares.use(async (req, res, next) => {
        const pathname = String(req.url || '').split('?')[0];
        const loader = ROUTES[pathname];
        if (!loader) return next();
        if (req.method !== 'POST' && req.method !== 'OPTIONS') return next();

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
            res.statusCode = 500;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ success: false, error: 'handler_no_response' }));
            return;
          }

          res.statusCode = fakeRes.statusCode;
          for (const [key, value] of Object.entries(fakeRes.headers)) {
            res.setHeader(key, value);
          }
          res.end(fakeRes.jsonBody != null ? JSON.stringify(fakeRes.jsonBody) : '');
        } catch (err) {
          console.error('[api-dev]', pathname, err);
          res.statusCode = 500;
          res.setHeader('Content-Type', 'application/json');
          res.end(
            JSON.stringify({
              success: false,
              error: 'internal',
              message: err?.message || 'Erro na API local de desenvolvimento',
            })
          );
        }
      });
    },
  };
}
