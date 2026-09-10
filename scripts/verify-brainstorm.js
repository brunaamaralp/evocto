/**
 * Verificação completa do Workspace Brainstorm.
 *
 * Uso: node scripts/verify-brainstorm.js
 * Opcional: VERIFY_EMPRESA=MALU VERIFY_API_BASE=http://127.0.0.1:8888
 *
 * Requer .env.local com VITE_APPWRITE_* + APPWRITE_API_KEY
 * (ANTHROPIC_API_KEY só para testes live de /message)
 */
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { Client, TablesDB } from 'node-appwrite';

const ROOT = process.cwd();
const results = [];
let failed = 0;
let warned = 0;

function loadEnv() {
  for (const file of ['.env.local', '.env', '.env.server']) {
    const path = resolve(ROOT, file);
    if (!existsSync(path)) continue;
    for (const line of readFileSync(path, 'utf8').split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const eq = trimmed.indexOf('=');
      if (eq === -1) continue;
      const key = trimmed.slice(0, eq).trim();
      let val = trimmed.slice(eq + 1).trim();
      if (
        (val.startsWith('"') && val.endsWith('"')) ||
        (val.startsWith("'") && val.endsWith("'"))
      ) {
        val = val.slice(1, -1);
      }
      if (!process.env[key]) process.env[key] = val;
    }
  }
}

loadEnv();

function ok(msg) {
  results.push({ ok: true, msg });
  console.log(`✓ ${msg}`);
}

function fail(msg) {
  failed += 1;
  results.push({ ok: false, msg });
  console.log(`❌ ${msg}`);
}

function warn(msg) {
  warned += 1;
  results.push({ ok: null, msg });
  console.log(`⚠ ${msg}`);
}

function section(title) {
  console.log(`\n── ${title} ──`);
}

function fileExists(rel) {
  return existsSync(resolve(ROOT, rel));
}

function read(rel) {
  return readFileSync(resolve(ROOT, rel), 'utf8');
}

function mockRes() {
  return {
    headers: {},
    statusCode: 200,
    body: null,
    finished: false,
    setHeader(k, v) {
      this.headers[k] = v;
      return this;
    },
    status(c) {
      this.statusCode = c;
      return this;
    },
    json(o) {
      this.body = o;
      this.finished = true;
      return this;
    },
    end() {
      this.finished = true;
      return this;
    },
  };
}

async function callHandler(handler, { method = 'GET', route, query = {}, body } = {}) {
  const res = mockRes();
  const req = {
    method,
    query: { route, ...query },
    url: `/api/campaigns-agent?route=${route}`,
    body: body || {},
    headers: {},
  };
  await handler(req, res);
  return res;
}

// ─────────────────────────────────────────────
section('1. BACKEND — Environment');

const ENDPOINT = process.env.VITE_APPWRITE_ENDPOINT || process.env.APPWRITE_ENDPOINT;
const PROJECT_ID =
  process.env.VITE_APPWRITE_PROJECT_ID || process.env.APPWRITE_PROJECT_ID;
const API_KEY = process.env.APPWRITE_API_KEY;
const DATABASE_ID =
  process.env.VITE_APPWRITE_DATABASE_ID || process.env.APPWRITE_DATABASE_ID;
const ANTHROPIC_KEY = process.env.ANTHROPIC_API_KEY;

ENDPOINT ? ok('APPWRITE_ENDPOINT / VITE_APPWRITE_ENDPOINT configurada') : fail('APPWRITE_ENDPOINT ausente');
PROJECT_ID ? ok('APPWRITE_PROJECT_ID configurado') : fail('APPWRITE_PROJECT_ID ausente');
API_KEY ? ok('APPWRITE_API_KEY configurada (backend)') : fail('APPWRITE_API_KEY ausente');
DATABASE_ID ? ok(`DATABASE_ID = ${DATABASE_ID}`) : fail('DATABASE_ID ausente');

if (ANTHROPIC_KEY) {
  ok('ANTHROPIC_API_KEY configurada (backend/.env.local)');
} else {
  warn('ANTHROPIC_API_KEY ausente — /message e save-brief com Claude vão falhar');
}

// Garantir que chave Anthropic não está exposta no bundle Vite de forma óbvia
const envLocal = fileExists('.env.local') ? read('.env.local') : '';
if (/^VITE_ANTHROPIC_API_KEY=/m.test(envLocal)) {
  fail('ANTHROPIC_API_KEY NÃO deve estar como VITE_* (vazaria no frontend)');
} else {
  ok('ANTHROPIC_API_KEY não está prefixada com VITE_ (OK — não vaza no frontend)');
}

// ─────────────────────────────────────────────
section('1. BACKEND — Database feedback_ciclos');

const REQUIRED_COLS = [
  'cycle_id',
  'empresa_id',
  'mes',
  'ano',
  'vendas_realizado',
  'engajamento_realizado',
  'conversoes',
  'alcance',
  'o_que_funcionou',
  'o_que_nao_funcionou',
  'aprendizados',
  'nota_geral',
  'notas_criativas',
  'notas_producao',
  'recomendacoes_proxima',
  'criado_em',
  'atualizado_em',
];

if (ENDPOINT && PROJECT_ID && API_KEY && DATABASE_ID) {
  try {
    const tables = new TablesDB(
      new Client().setEndpoint(ENDPOINT).setProject(PROJECT_ID).setKey(API_KEY)
    );
    const table = await tables.getTable({
      databaseId: DATABASE_ID,
      tableId: 'feedback_ciclos',
    });
    ok('Collection feedback_ciclos existe');

    const keys = new Set((table.columns || []).map((c) => c.key));
    const missing = REQUIRED_COLS.filter((k) => !keys.has(k));
    if (missing.length) {
      fail(`Atributos faltando em feedback_ciclos: ${missing.join(', ')}`);
    } else {
      ok('Atributos feedback_ciclos OK');
    }

    const indexes = table.indexes || [];
    const idxCols = indexes.map((i) => (i.columns || []).join('+'));
    const hasCycle = indexes.some(
      (i) => (i.columns || []).includes('cycle_id') || i.key?.includes('cycle')
    );
    const hasEmpresa = indexes.some(
      (i) => (i.columns || []).includes('empresa_id') || i.key?.includes('empresa')
    );
    hasCycle ? ok('Índice cycle_id OK') : fail('Índice cycle_id ausente');
    hasEmpresa ? ok('Índice empresa_id OK') : fail('Índice empresa_id ausente');
    if (idxCols.length) ok(`Índices: ${idxCols.join(' | ')}`);

    // agentConversations
    try {
      await tables.getTable({ databaseId: DATABASE_ID, tableId: 'agentConversations' });
      ok('Collection agentConversations existe');
    } catch {
      fail('Collection agentConversations ausente — rode scripts/create-agent-conversations-collection.js');
    }
  } catch (err) {
    fail(`Database check falhou: ${err?.message || err}`);
  }
} else {
  warn('Pulando checks de Database (env incompleto)');
}

// ─────────────────────────────────────────────
section('1. BACKEND — loadContext.js / agentPrompt.js');

const loadContextPath = 'lib/server/loadContext.js';
const agentPromptPath = 'lib/server/agentPrompt.js';
const apiEntryPath = 'api/campaigns-agent.js';
const handlerPath = 'lib/server/campaignAgentHandler.js';

fileExists(loadContextPath) ? ok('loadContext.js existe') : fail('loadContext.js ausente');
fileExists(agentPromptPath) ? ok('agentPrompt.js existe') : fail('agentPrompt.js ausente');
fileExists(apiEntryPath) ? ok('api/campaigns-agent.js existe') : fail('api/campaigns-agent.js ausente');
fileExists(handlerPath) ? ok('campaignAgentHandler.js existe') : fail('campaignAgentHandler.js ausente');

let loadContext;
let createAgentSystemPrompt;
let extrairPadroes;
let handler;

try {
  const mod = await import(pathToFileURL(resolve(ROOT, loadContextPath)).href);
  loadContext = mod.loadContext;
  extrairPadroes = mod.extrairPadroes;
  typeof loadContext === 'function'
    ? ok('Função loadContext exportada')
    : fail('loadContext não exportada');
} catch (err) {
  fail(`Import loadContext: ${err?.message || err}`);
}

try {
  const mod = await import(pathToFileURL(resolve(ROOT, agentPromptPath)).href);
  createAgentSystemPrompt = mod.createAgentSystemPrompt;
  typeof createAgentSystemPrompt === 'function'
    ? ok('Função createAgentSystemPrompt exportada')
    : fail('createAgentSystemPrompt não exportada');

  if (createAgentSystemPrompt) {
    const prompt = createAgentSystemPrompt({
      empresa: { nome: 'TESTE', produtos: [{ nome: 'Linha A' }] },
      ciclo_proximo: 'vendas',
      mesAtual: 2,
      anoAtual: 2026,
      campanhas_anteriores: [],
      padroes_performance: { melhor_ciclo_vendas: 'vendas' },
    });
    typeof prompt === 'string' && prompt.length > 50
      ? ok('createAgentSystemPrompt retorna string prompt')
      : fail('createAgentSystemPrompt não retornou prompt válido');
  }
} catch (err) {
  fail(`Import agentPrompt: ${err?.message || err}`);
}

if (typeof extrairPadroes === 'function') {
  const p = extrairPadroes([
    {
      ciclo_comercial: 'vendas',
      resultado: { vendas_realizado: 10, engajamento_realizado: 5, aprendizados: 'x' },
    },
  ]);
  p?.melhor_ciclo_vendas
    ? ok('extrairPadroes OK')
    : fail('extrairPadroes não retornou padrões');
}

// loadContext com empresa real (se possível)
if (loadContext && ENDPOINT && API_KEY && DATABASE_ID) {
  try {
    const { databases } = await import(
      pathToFileURL(resolve(ROOT, 'lib/server/appwrite.js')).href
    );
    const list = await databases.listDocuments(DATABASE_ID, 'empresas', []);
    const docs = list.documents || [];
    const wanted = process.env.VERIFY_EMPRESA;
    let empresa = docs[0];
    if (wanted) {
      const needle = String(wanted).toLowerCase();
      empresa =
        docs.find((d) => {
          let nome = d.nome;
          if (!nome && d.payload) {
            try {
              nome = JSON.parse(d.payload)?.nome;
            } catch {
              /* ignore */
            }
          }
          return String(nome || '').toLowerCase().includes(needle) || d.$id === wanted;
        }) || docs[0];
    }

    if (!empresa?.$id) {
      warn('Nenhuma empresa no Appwrite — pulando loadContext live');
    } else {
      const ctx = await loadContext(empresa.$id, 2, { databases, anoAtual: 2026 });
      const shapeOk =
        ctx?.empresa &&
        Array.isArray(ctx.campanhas_anteriores) &&
        ('padroes_performance' in ctx || 'padroes' in ctx) &&
        (ctx.empresa.produtos != null || true);
      if (shapeOk) {
        ok(
          `loadContext(${empresa.$id}) OK — empresa="${ctx.empresa.nome}", campanhas=${ctx.campanhas_anteriores.length}`
        );
        // shape público esperado
        const publicShape = {
          empresa: ctx.empresa,
          campanhas_anteriores: ctx.campanhas_anteriores,
          padroes: ctx.padroes_performance,
          produtos: ctx.empresa.produtos,
        };
        publicShape.empresa && publicShape.campanhas_anteriores
          ? ok('Shape { empresa, campanhas_anteriores, padroes, produtos } OK')
          : fail('Shape loadContext incompleto');
      } else {
        fail('loadContext não retornou shape esperado');
      }
    }
  } catch (err) {
    fail(`loadContext live: ${err?.message || err}`);
  }
}

// ─────────────────────────────────────────────
section('1. BACKEND — API Endpoints (handler direto)');

try {
  const mod = await import(pathToFileURL(resolve(ROOT, handlerPath)).href);
  handler = mod.default;
  typeof handler === 'function'
    ? ok('campaignAgentHandler exportado')
    : fail('campaignAgentHandler inválido');
} catch (err) {
  fail(`Import handler: ${err?.message || err}`);
}

if (handler) {
  // get-conversations
  {
    const res = await callHandler(handler, {
      method: 'GET',
      route: 'get-conversations',
    });
    if (
      res.statusCode === 200 &&
      res.body?.success &&
      Array.isArray(res.body.conversations) &&
      ('lastOpenConversationId' in res.body)
    ) {
      ok(
        `GET get-conversations OK (${res.body.conversations.length} conversas, lastOpen=${res.body.lastOpenConversationId || 'null'})`
      );
    } else {
      fail(
        `GET get-conversations falhou: status=${res.statusCode} body=${JSON.stringify(res.body)}`
      );
    }
  }

  // init / message / save-brief / save-feedback — só se houver empresa
  let conversationId = null;
  let cycleId = null;

  try {
    const { databases } = await import(
      pathToFileURL(resolve(ROOT, 'lib/server/appwrite.js')).href
    );
    const list = await databases.listDocuments(DATABASE_ID, 'empresas', []);
    const empresaDoc = list.documents?.[0];
    const empresaNome =
      process.env.VERIFY_EMPRESA ||
      empresaDoc?.nome ||
      (() => {
        try {
          return JSON.parse(empresaDoc?.payload || '{}').nome;
        } catch {
          return empresaDoc?.$id;
        }
      })();

    if (!empresaNome && !empresaDoc?.$id) {
      warn('Sem empresa — pulando init/message/save-brief/save-feedback live');
    } else {
      const empresaInput = empresaNome || empresaDoc.$id;

      // init
      const initRes = await callHandler(handler, {
        method: 'POST',
        route: 'init',
        body: { empresa: empresaInput, mes: 2, ano: 2026 },
      });
      if (
        initRes.statusCode === 200 &&
        initRes.body?.success &&
        initRes.body?.conversationId &&
        initRes.body?.contextoEnriquecido
      ) {
        conversationId = initRes.body.conversationId;
        ok(`POST init OK (conversationId=${conversationId})`);
      } else {
        fail(`POST init falhou: ${JSON.stringify(initRes.body)}`);
      }

      // message (precisa Anthropic)
      if (conversationId && ANTHROPIC_KEY) {
        const msgRes = await callHandler(handler, {
          method: 'POST',
          route: 'message',
          body: {
            conversationId,
            message: 'Quero fazer urgência e exclusividade (teste verify)',
          },
        });
        if (
          msgRes.statusCode === 200 &&
          msgRes.body?.success &&
          msgRes.body?.assistantMessage
        ) {
          ok('POST message OK (Claude respondeu)');
        } else {
          fail(`POST message falhou: ${JSON.stringify(msgRes.body)}`);
        }
      } else if (conversationId) {
        warn('POST message pulado (sem ANTHROPIC_API_KEY)');
      }

      // save-brief
      if (conversationId && ANTHROPIC_KEY) {
        const saveRes = await callHandler(handler, {
          method: 'POST',
          route: 'save-brief',
          body: { conversationId },
        });
        if (
          saveRes.statusCode === 200 &&
          saveRes.body?.success &&
          saveRes.body?.briefId &&
          saveRes.body?.cycleId
        ) {
          cycleId = saveRes.body.cycleId;
          ok(
            `POST save-brief OK (briefId=${saveRes.body.briefId}, cycleId=${cycleId})`
          );
        } else {
          fail(`POST save-brief falhou: ${JSON.stringify(saveRes.body)}`);
        }
      } else if (conversationId) {
        warn('POST save-brief pulado (sem ANTHROPIC_API_KEY)');
      }

      // save-feedback
      if (cycleId) {
        const fbRes = await callHandler(handler, {
          method: 'POST',
          route: 'save-feedback',
          body: {
            cycleId,
            vendas_realizado: 15,
            engajamento_realizado: 8,
            conversoes: 45,
            alcance: 5000,
            o_que_funcionou: 'verify script',
            o_que_nao_funcionou: 'n/a',
            aprendizados: 'ok',
            nota_geral: 8,
            notas_criativas: 'teste',
            notas_producao: 'teste',
            recomendacoes_proxima: 'seguir',
          },
        });
        if (fbRes.statusCode === 200 && fbRes.body?.success && fbRes.body?.feedbackId) {
          ok(`POST save-feedback OK (feedbackId=${fbRes.body.feedbackId})`);
        } else {
          fail(`POST save-feedback falhou: ${JSON.stringify(fbRes.body)}`);
        }
      } else {
        warn('POST save-feedback pulado (sem cycleId — rode save-brief antes)');
      }
    }
  } catch (err) {
    fail(`API live checks: ${err?.message || err}`);
  }
}

// ─────────────────────────────────────────────
section('2. FRONTEND — Componentes');

const comps = [
  'src/components/campaigns/agent/ConversationList.jsx',
  'src/components/campaigns/agent/ChatInterface.jsx',
  'src/components/campaigns/agent/ContextSidebar.jsx',
  'src/components/campaigns/agent/FeedbackForm.jsx',
];
for (const c of comps) {
  fileExists(c) ? ok(`${c.replace('src/components/campaigns/agent/', '')} OK`) : fail(`${c} ausente`);
}

// ─────────────────────────────────────────────
section('2. FRONTEND — Página Brainstorm + Rota');

const pageCandidates = [
  'src/pages/brainstorm.jsx',
  'src/pages/campaigns/Brainstorm.jsx',
  'src/pages/campaigns/brainstorm.jsx',
];
const pagePath = pageCandidates.find((p) => fileExists(p));
if (pagePath) {
  ok(`Página Brainstorm existe (${pagePath})`);
  const src = read(pagePath);
  src.includes('ConversationList')
    ? ok('Brainstorm importa ConversationList')
    : fail('Brainstorm não importa ConversationList');
  src.includes('ChatInterface')
    ? ok('Brainstorm importa ChatInterface')
    : fail('Brainstorm não importa ChatInterface');
  src.includes('ContextSidebar')
    ? ok('Brainstorm importa ContextSidebar')
    : fail('Brainstorm não importa ContextSidebar');

  // Props wiring
  /onSelectConversation/.test(src)
    ? ok('ConversationList: onSelectConversation passado')
    : fail('ConversationList: onSelectConversation ausente');
  /onNewConversation/.test(src)
    ? ok('ConversationList: onNewConversation passado')
    : fail('ConversationList: onNewConversation ausente');
  /contextData|contextoEnriquecido/.test(src)
    ? ok('ConversationList/Context: contextData/contexto passado')
    : warn('contextData/contextoEnriquecido não encontrado no JSX');
  /onSaveAsBrief/.test(src)
    ? ok('ChatInterface/ContextSidebar: onSaveAsBrief passado')
    : fail('onSaveAsBrief ausente no Brainstorm');
  /conversationId/.test(src)
    ? ok('ChatInterface: conversationId passado')
    : fail('conversationId ausente');
  /initialMessages/.test(src)
    ? ok('ChatInterface: initialMessages passado')
    : warn('initialMessages não encontrado');

  // CSS grid 3 colunas
  /300px 1fr 300px|gridTemplateColumns:\s*['"]300px 1fr 300px['"]/.test(src)
    ? ok('CSS grid 3 colunas (300px 1fr 300px) OK')
    : fail('Grid 3 colunas não encontrado no Brainstorm');
} else {
  fail('Página Brainstorm ausente (esperado src/pages/brainstorm.jsx)');
}

const routerPath = 'src/pages/index.jsx';
if (fileExists(routerPath)) {
  const router = read(routerPath);
  const hasBrainstormImport = /import\s+brainstorm\s+from\s+["'].*brainstorm["']/.test(
    router
  );
  const hasRoute =
    /path=["']\/brainstorm["']/.test(router) ||
    /path=["']\/campaigns\/brainstorm["']/.test(router);

  hasBrainstormImport ? ok('Router importa brainstorm') : fail('Router sem import brainstorm');
  if (/path=["']\/brainstorm["']/.test(router)) {
    ok('Rota /brainstorm configurada em src/pages/index.jsx');
  } else if (/path=["']\/campaigns\/brainstorm["']/.test(router)) {
    ok('Rota /campaigns/brainstorm configurada');
  } else {
    fail('Rota /brainstorm ou /campaigns/brainstorm ausente no router');
  }

  /campaigns\/cycles\/:planId/.test(router)
    ? ok('Rota /campaigns/cycles/:planId OK (pós save-brief)')
    : warn('Rota /campaigns/cycles/:planId não encontrada');

  void hasRoute;
} else {
  fail('src/pages/index.jsx ausente');
}

// Chat UI markers
if (fileExists('src/components/campaigns/agent/ChatInterface.jsx')) {
  const chat = read('src/components/campaigns/agent/ChatInterface.jsx');
  /#007bff/.test(chat) ? ok('Chat: bolha user #007bff') : warn('Chat: cor user #007bff não encontrada');
  /#f0f0f0/.test(chat) ? ok('Chat: bolha assistant #f0f0f0') : warn('Chat: cor assistant #f0f0f0 não encontrada');
  /Salvar como Brief|Salvar Brief/.test(chat)
    ? ok('Chat: botão Salvar Brief visível no código')
    : fail('Chat: botão Salvar Brief ausente');
  /Enviar/.test(chat) ? ok('Chat: botão Enviar OK') : fail('Chat: botão Enviar ausente');
  /overflowY:\s*['"]auto['"]|overflow-y:\s*auto/.test(chat)
    ? ok('Chat: scroll (overflow-y) OK')
    : warn('Chat: overflow scroll não detectado');
}

if (fileExists('src/components/campaigns/agent/ConversationList.jsx')) {
  const list = read('src/components/campaigns/agent/ConversationList.jsx');
  /overflowY:\s*['"]auto['"]|overflow-y:\s*auto/.test(list)
    ? ok('ConversationList: scrollable OK')
    : warn('ConversationList: overflow scroll não detectado');
  /width:\s*300|maxWidth:\s*300/.test(list)
    ? ok('ConversationList: width ~300px OK')
    : warn('ConversationList: width 300px não detectado');
}

// ─────────────────────────────────────────────
section('3. FLUXO E2E (checklist manual)');

console.log(`
Abra o app e valide manualmente:

  1. http://localhost:5173/brainstorm  (ou /campaigns/brainstorm se remapear)
  2. 3 colunas visíveis (desktop)
  3. Sidebar esquerda com conversas ou vazia
  4. [+ Nova Conversa] → modal empresa/mês
  5. Criar (ex.: MALU, mês 2)
  6. Digitar mensagem e [Enviar]
  7. Spinner + resposta Claude (~3–5s)
  8. Bolhas user (#007bff) / assistant (#f0f0f0)
  9. [Salvar como Brief] → brief + ciclo + redirect /campaigns/cycles/{id}
 10. Voltar /brainstorm → conversa na lista → histórico persiste
 11. Menu ⋮ → Clonar

⚠ Checks E2E manuais não são automatizados neste script.
`);

warn('E2E browser: execute manualmente (lista acima)');

// HTTP opcional se VERIFY_API_BASE estiver setado
const API_BASE = process.env.VERIFY_API_BASE;
if (API_BASE) {
  section('1b. HTTP live (VERIFY_API_BASE)');
  try {
    const r = await fetch(
      `${API_BASE.replace(/\/$/, '')}/api/campaigns-agent?route=get-conversations`
    );
    const data = await r.json().catch(() => ({}));
    r.ok && Array.isArray(data.conversations)
      ? ok(`HTTP get-conversations → ${r.status}`)
      : fail(`HTTP get-conversations → ${r.status} ${JSON.stringify(data)}`);
  } catch (err) {
    fail(`HTTP VERIFY_API_BASE falhou: ${err?.message || err}`);
  }
}

// ─────────────────────────────────────────────
section('4. ERROS COMUNS (referência)');
console.log(`
❌ /brainstorm 404 → confira src/pages/index.jsx (rota /brainstorm)
❌ Chat sem resposta → ANTHROPIC_API_KEY no .env.local (NÃO VITE_*)
❌ ConversationList vazio → GET get-conversations + agentConversations no Appwrite
❌ Brief não salva → save-brief + collections briefs / cycle_plans
❌ feedback não entra no histórico → feedback_ciclos + loadContext
`);

// ─────────────────────────────────────────────
console.log('\n===========================');
if (failed === 0) {
  console.log('✅ TUDO OK! Pronto pra usar!');
  if (warned) console.log(`   (${warned} avisos — veja ⚠ acima)`);
} else {
  console.log(`❌ ${failed} check(s) falharam · ${warned} aviso(s)`);
  console.log('Corrija os itens ❌ e rode de novo: node scripts/verify-brainstorm.js');
}
console.log('===========================\n');

process.exit(failed > 0 ? 1 : 0);
