/**
 * Agent brainstorm de campanha — init / message / save-brief / get-conversations.
 * Rotas: ?route=init|message|save-brief|get-conversations
 */
import { randomUUID } from 'node:crypto';
import { Query } from 'node-appwrite';
import { databases, getDatabaseId } from './appwrite.js';
import { anthropic } from './anthropic.js';
import { callClaudeAgent, createAgentSystemPrompt } from './agentPrompt.js';
import { loadContext } from './loadContext.js';
import { loadPlanContext, updatePlanMonth } from './planContext.js';
import {
  inferCicloComercialFromText,
  resolveCicloComercial,
} from '../../src/lib/cicloComercialDetection.js';

const CONVERSATIONS_COL = 'agentConversations';
const BRIEFS_COL = 'briefs';
const EMPRESAS_COL = 'empresas';
const CYCLE_PLANS_COL = 'cycle_plans';

const MES_NOMES = [
  '',
  'Janeiro',
  'Fevereiro',
  'Março',
  'Abril',
  'Maio',
  'Junho',
  'Julho',
  'Agosto',
  'Setembro',
  'Outubro',
  'Novembro',
  'Dezembro',
];

function setCors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
}

function parseBody(req) {
  let body = req.body;
  if (typeof body === 'string') {
    try {
      body = JSON.parse(body || '{}');
    } catch {
      const err = new Error('invalid_json');
      err.status = 400;
      throw err;
    }
  }
  return body && typeof body === 'object' ? body : {};
}

function resolveRoute(req) {
  const q = String(req.query?.route || req.query?.action || '').trim();
  if (q) return q;
  const url = String(req.url || '');
  if (url.includes('/get-conversations') || url.includes('/conversations')) {
    return 'get-conversations';
  }
  if (url.includes('/clone-conversation') || url.includes('/clone')) {
    return 'clone-conversation';
  }
  if (url.includes('/archive-conversation') || url.includes('/archive')) {
    return 'archive-conversation';
  }
  if (url.includes('/delete-conversation') || url.includes('/delete')) {
    return 'delete-conversation';
  }
  if (url.includes('/save-feedback') || url.includes('/feedback')) return 'save-feedback';
  if (url.includes('/save-brief') || url.includes('/save_brief')) return 'save-brief';
  if (url.includes('/load-plan-context') || url.includes('/plan-context')) {
    return 'load-plan-context';
  }
  if (url.includes('/update-plan-month') || url.includes('/plan-month')) {
    return 'update-plan-month';
  }
  if (url.includes('/message')) return 'message';
  if (url.includes('/init')) return 'init';
  return '';
}

function parseJsonField(value, fallback) {
  if (value == null || value === '') return fallback;
  if (typeof value === 'object') return value;
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

function mergeDoc(doc) {
  if (!doc) return null;
  let extra = {};
  if (doc.payload) {
    try {
      extra = typeof doc.payload === 'string' ? JSON.parse(doc.payload) : doc.payload || {};
    } catch {
      extra = {};
    }
  }
  const { payload, $id, $createdAt, $updatedAt, ...rest } = doc;
  return {
    ...extra,
    ...rest,
    $id,
    id: $id,
    created_date: $createdAt,
    updated_date: $updatedAt,
  };
}

function extractJsonObject(text) {
  const t = String(text || '').trim();
  if (!t) return null;
  const clean = t.replace(/```json\s*/gi, '').replace(/```/g, '').trim();
  const firstBrace = clean.indexOf('{');
  const lastBrace = clean.lastIndexOf('}');
  if (firstBrace === -1 || lastBrace === -1 || lastBrace <= firstBrace) return null;
  try {
    return JSON.parse(clean.slice(firstBrace, lastBrace + 1));
  } catch {
    return null;
  }
}

function startDateForMonth(ano, mes) {
  const y = Number(ano) || new Date().getFullYear();
  const m = Number(mes) || new Date().getMonth() + 1;
  return `${y}-${String(m).padStart(2, '0')}-01`;
}

function endDateApprox(startYmd) {
  const d = new Date(`${String(startYmd).slice(0, 10)}T12:00:00`);
  d.setDate(d.getDate() + 20);
  return d.toISOString().slice(0, 10);
}

function getContexto(conversation) {
  return (
    parseJsonField(conversation.contexto_carregado, null) ||
    parseJsonField(conversation.contexto_enriquecido, null)
  );
}

/**
 * Resolve empresa por id ou nome (ex.: "MALU").
 */
async function resolveEmpresa(dbId, empresaInput) {
  const raw = String(empresaInput || '').trim();
  if (!raw) return null;

  // UUID-like → get by id
  if (/^[a-zA-Z0-9_]{15,36}$/.test(raw) && !/\s/.test(raw)) {
    try {
      return mergeDoc(await databases.getDocument(dbId, EMPRESAS_COL, raw));
    } catch {
      // fall through to name search
    }
  }

  const res = await databases.listDocuments(dbId, EMPRESAS_COL, [Query.limit(100)]);
  const docs = (res.documents || []).map(mergeDoc);
  const needle = raw.toLowerCase();
  const exact = docs.find((e) => String(e.nome || '').toLowerCase() === needle);
  if (exact) return exact;
  const partial = docs.find((e) => String(e.nome || '').toLowerCase().includes(needle));
  return partial || null;
}

function publicContexto(ctx) {
  if (!ctx) return null;
  return {
    empresa: ctx.empresa,
    campanhas_anteriores: ctx.campanhas_anteriores || [],
    padroes: ctx.padroes_performance || null,
    padroes_performance: ctx.padroes_performance || null,
    produtos: ctx.empresa?.produtos || [],
    ciclo_proximo: ctx.ciclo_proximo,
    mesAtual: ctx.mesAtual,
    anoAtual: ctx.anoAtual,
    ciclos_comerciais_planejados: ctx.ciclos_comerciais_planejados,
    ultima_campanha: ctx.ultima_campanha || null,
    plano_mes: ctx.plano_mes || null,
  };
}

export function gerarMensagemInicial(contexto) {
  const ciclo = contexto?.ciclo_proximo || 'vendas';
  const mesNome = MES_NOMES[contexto?.mesAtual] || String(contexto?.mesAtual || '');
  const ultima = contexto?.ultima_campanha?.nome_campanha || 'nenhuma';
  const plano = contexto?.plano_mes;
  const temaLinha = plano?.tema?.titulo
    ? `\nTema do plano anual: **${plano.tema.titulo}**${
        plano.tema.ideia_central ? ` — ${plano.tema.ideia_central}` : ''
      }\n`
    : '';
  const campanhaLinha = plano?.campanha?.nome_campanha
    ? `Campanha planejada: **${plano.campanha.nome_campanha}** (${plano.campanha.status_mes || 'gerado'})\n`
    : '';

  return `Ótimo! Vamos planejar ${mesNome}/${contexto?.anoAtual || ''} para ${contexto?.empresa?.nome || 'a empresa'}.

Meta de ciclo no plano: **${String(ciclo).toUpperCase()}** (orientação — a ideia pode puxar outro ciclo)
${temaLinha}${campanhaLinha}
Última campanha: ${ultima}

Preciso confirmar:
1. **Linha focal** (qual produto?)
2. **Restrições** (algo que o cliente quer/não quer?)

Depois segue a estratégia!`;
}

async function handleInit(req, res) {
  const body = parseBody(req);
  const empresaInput = body.empresa ?? body.empresaId ?? body.empresa_id;
  const mesNum = Number(body.mes);
  const anoNum = Number(body.ano) || new Date().getFullYear();
  const modo = String(body.modo || body.mode || '').toLowerCase() === 'plano' ? 'plano' : 'avulso';
  const planId = body.planId || body.plan_id || body.plano_anual_id || null;

  if (!empresaInput) {
    return res.status(400).json({ success: false, error: 'empresa_obrigatoria' });
  }
  if (!Number.isFinite(mesNum) || mesNum < 1 || mesNum > 12) {
    return res.status(400).json({ success: false, error: 'mes_invalido' });
  }

  const dbId = getDatabaseId();
  const empresaDoc = await resolveEmpresa(dbId, empresaInput);
  if (!empresaDoc?.id) {
    return res.status(404).json({ success: false, error: 'empresa_nao_encontrada' });
  }

  const contextoEnriquecido = await loadContext(empresaDoc.id, mesNum, {
    databases,
    anoAtual: anoNum,
  });

  if (modo === 'plano' && contextoEnriquecido.plano_mes) {
    contextoEnriquecido.modo = 'plano';
    if (planId) contextoEnriquecido.plano_mes.plan_id = planId;
  } else {
    contextoEnriquecido.modo = modo;
  }

  const conversationId = randomUUID();
  const now = new Date().toISOString();
  const titulo = `${empresaDoc.nome || empresaInput} - ${MES_NOMES[mesNum] || mesNum} Ideas`;

  await databases.createDocument(dbId, CONVERSATIONS_COL, conversationId, {
    empresa_id: empresaDoc.id,
    empresa_nome: empresaDoc.nome || String(empresaInput),
    mes: mesNum,
    ano: anoNum,
    status: 'explorando',
    titulo,
    ciclo_comercial: contextoEnriquecido.ciclo_proximo || null,
    historico_mensagens: JSON.stringify([]),
    contexto_carregado: JSON.stringify(contextoEnriquecido),
    criado_em: now,
    atualizado_em: now,
  });

  return res.status(200).json({
    success: true,
    conversationId,
    contextoEnriquecido: publicContexto(contextoEnriquecido),
    historicoMensagens: [],
    mensagem_inicial: gerarMensagemInicial(contextoEnriquecido),
    modo,
  });
}

async function handleMessage(req, res) {
  const { conversationId, message } = parseBody(req);
  if (!conversationId || !String(message || '').trim()) {
    return res.status(400).json({
      success: false,
      error: 'conversationId_e_message_obrigatorios',
    });
  }

  const dbId = getDatabaseId();
  let conversation;
  try {
    conversation = await databases.getDocument(dbId, CONVERSATIONS_COL, conversationId);
  } catch {
    return res.status(404).json({ success: false, error: 'conversation_nao_encontrada' });
  }

  const contextoEnriquecido = getContexto(conversation);
  if (!contextoEnriquecido?.empresa) {
    return res.status(500).json({ success: false, error: 'contexto_invalido' });
  }

  const historico = parseJsonField(conversation.historico_mensagens, []);

  const assistantMessage = await callClaudeAgent(
    conversationId,
    contextoEnriquecido,
    historico,
    message
  );

  historico.push({ role: 'user', content: String(message) });
  historico.push({ role: 'assistant', content: assistantMessage });

  const now = new Date().toISOString();
  const nextStatus =
    conversation.status === 'explorando' ? 'refinada' : conversation.status || 'refinada';

  await databases.updateDocument(dbId, CONVERSATIONS_COL, conversationId, {
    historico_mensagens: JSON.stringify(historico),
    status: nextStatus,
    atualizado_em: now,
  });

  return res.status(200).json({
    success: true,
    assistantMessage,
    messageCount: historico.length,
  });
}

async function extractBriefDimensions(contexto, historico) {
  const transcript = (Array.isArray(historico) ? historico : [])
    .map((m) => `${m.role.toUpperCase()}: ${m.content}`)
    .join('\n\n');

  const system = createAgentSystemPrompt(contexto);
  const userContent = `Extrai da conversa acima em JSON (responda APENAS com JSON válido):
{
  "tipo_campanha": "",
  "publico_alvo": "",
  "formato": "",
  "ciclo": "",
  "foco_principal": "",
  "tom": "",
  "produtos_focados": [],
  "oportunidades": "",
  "restricoes": "",
  "nome_campanha": "",
  "objetivo": ""
}

CONVERSA:
${transcript}`;

  const response = await anthropic.messages.create({
    model:
      process.env.ANTHROPIC_AGENT_MODEL ||
      process.env.ANTHROPIC_CAMPANHA_MODEL ||
      process.env.ANTHROPIC_MODEL ||
      'claude-opus-4-5',
    max_tokens: 2000,
    system,
    messages: [{ role: 'user', content: userContent }],
  });

  const text =
    typeof response?.content?.[0] === 'string'
      ? response.content[0]
      : response?.content?.[0]?.text || '';
  return extractJsonObject(text) || {};
}

async function handleSaveBrief(req, res) {
  const body = parseBody(req);
  const conversationId = body.conversationId;
  if (!conversationId) {
    return res.status(400).json({ success: false, error: 'conversationId_obrigatorio' });
  }

  const dbId = getDatabaseId();
  let conversation;
  try {
    conversation = await databases.getDocument(dbId, CONVERSATIONS_COL, conversationId);
  } catch {
    return res.status(404).json({ success: false, error: 'conversation_nao_encontrada' });
  }

  const contexto = getContexto(conversation);
  const historico = parseJsonField(conversation.historico_mensagens, []);
  if (!historico.length) {
    return res.status(400).json({ success: false, error: 'conversa_vazia' });
  }

  const dims = await extractBriefDimensions(contexto, historico);
  const mes = Number(conversation.mes) || contexto?.mesAtual || new Date().getMonth() + 1;
  const ano = Number(conversation.ano) || contexto?.anoAtual || new Date().getFullYear();
  const empresaId = conversation.empresa_id || contexto?.empresa?.id;
  const empresaNome = conversation.empresa_nome || contexto?.empresa?.nome || '';

  let agencyId = null;
  let clientId = null;
  if (empresaId) {
    try {
      const emp = mergeDoc(await databases.getDocument(dbId, EMPRESAS_COL, empresaId));
      agencyId = emp?.agencyId || null;
      clientId = emp?.clientId || null;
    } catch {
      // ignore
    }
  }

  const nome =
    dims.nome_campanha ||
    dims.foco_principal ||
    `${empresaNome || 'Campanha'} ${MES_NOMES[mes] || mes}`;

  const briefId = randomUUID();
  const now = new Date().toISOString();
  const start = startDateForMonth(ano, mes);
  const modo =
    contexto?.modo === 'plano' || Boolean(contexto?.plano_mes?.plan_id)
      ? 'plano'
      : 'avulso';

  const cicloPlano =
    contexto?.plano_mes?.tema?.ciclo ||
    contexto?.plano_mes?.tema?.ciclo_final ||
    conversation.ciclo_comercial ||
    contexto?.ciclo_proximo ||
    '';
  const inferred = inferCicloComercialFromText(
    nome,
    dims.objetivo,
    dims.foco_principal,
    dims.oportunidades,
    dims.tom,
    JSON.stringify(dims.produtos_focados || [])
  );
  const cicloResolved = resolveCicloComercial({
    ciclo_plano: cicloPlano,
    ciclo_detectado: inferred.ciclo || dims.ciclo || '',
    escolha: dims.ciclo || null,
    confianca: inferred.confianca,
  });

  // Brief only — ciclo do mês vem de launchCampanhaFromBrief (1 ciclo/cliente/mês)
  const briefPayload = {
    empresaId,
    empresa_id: empresaId,
    brief_kind: 'campanha_mensal',
    mes,
    ano,
    nome_campanha: nome,
    title: nome,
    tipo_campanha: dims.tipo_campanha || '5_videos',
    publico_alvo: dims.publico_alvo || '',
    formato: dims.formato || '',
    ciclo_comercial: cicloResolved.ciclo_final || 'vendas',
    ciclo_plano: cicloResolved.ciclo_plano || null,
    ciclo_detectado: cicloResolved.ciclo_detectado || null,
    ciclo_final: cicloResolved.ciclo_final || null,
    ciclo_override: Boolean(cicloResolved.ciclo_override),
    ciclo_confianca: cicloResolved.confianca || 0,
    linha_focal: dims.foco_principal || '',
    foco_principal: dims.foco_principal || '',
    tom_brand: dims.tom || '',
    tom: dims.tom || '',
    produtos_focados: dims.produtos_focados || [],
    oportunidades: dims.oportunidades || '',
    restricoes: dims.restricoes || '',
    objetivo: dims.objetivo || dims.foco_principal || '',
    data_gravacao_inicio: start,
    data_gravacao_fim: endDateApprox(start),
    gerado_por_agente: true,
    agentConversationId: conversationId,
    modo_criacao: 'agente',
    origem: modo === 'plano' ? 'brainstorm_plano' : 'brainstorm_avulso',
    plano_anual_id: contexto?.plano_mes?.plan_id || null,
    plano_anual_mes: mes,
    status_campanha: 'rascunho',
    criado_em: now,
    dimensoes_agente: dims,
  };

  const briefRow = {
    status: 'DRAFT',
    title: String(nome).slice(0, 255),
    payload: JSON.stringify(briefPayload),
  };
  if (agencyId) briefRow.agencyId = agencyId;
  if (clientId) {
    briefRow.clientId = clientId;
    briefRow.projectId = clientId;
  }
  if (empresaId) briefRow.empresaId = empresaId;

  await databases.createDocument(dbId, BRIEFS_COL, briefId, briefRow);

  await databases.updateDocument(dbId, CONVERSATIONS_COL, conversationId, {
    status: 'finalizada',
    brief_id: briefId,
    atualizado_em: now,
    finalizado_em: now,
  });

  // Vincula brief ao plano; ciclo_entrega_id vem depois do launch no client
  let planUpdate = null;
  if (modo === 'plano') {
    try {
      planUpdate = await updatePlanMonth({
        databases,
        planId: contexto?.plano_mes?.plan_id || null,
        empresaId,
        clientId,
        ano,
        mes,
        brief_mensal_id: briefId,
        status_mes: 'aprovado',
        nome_campanha: nome,
      });
    } catch (err) {
      console.warn('[campaignAgent] update-plan-month after save-brief:', err?.message || err);
      planUpdate = { success: false, reason: err?.message || 'update_failed' };
    }
  }

  return res.status(200).json({
    success: true,
    briefId,
    needsLaunch: true,
    agencyId,
    clientId,
    mes,
    ano,
    nome,
    modo,
    planId: contexto?.plano_mes?.plan_id || null,
    planUpdate,
    empresaNome,
  });
}

async function handleGetConversations(req, res) {
  const body = methodHasBody(req) ? parseBody(req) : {};
  const empresaInput =
    req.query?.empresa ||
    req.query?.empresaId ||
    body.empresa ||
    body.empresaId;

  const dbId = getDatabaseId();
  let docs = [];

  try {
    if (empresaInput) {
      const empresaDoc = await resolveEmpresa(dbId, empresaInput);
      if (empresaDoc?.id) {
        const resList = await databases.listDocuments(dbId, CONVERSATIONS_COL, [
          Query.equal('empresa_id', empresaDoc.id),
          Query.orderDesc('$updatedAt'),
          Query.limit(50),
        ]);
        docs = resList.documents || [];
      } else {
        const resList = await databases.listDocuments(dbId, CONVERSATIONS_COL, [
          Query.equal('empresa_nome', String(empresaInput)),
          Query.orderDesc('$updatedAt'),
          Query.limit(50),
        ]);
        docs = resList.documents || [];
      }
    } else {
      // Todas as conversas recentes
      const resList = await databases.listDocuments(dbId, CONVERSATIONS_COL, [
        Query.orderDesc('$updatedAt'),
        Query.limit(50),
      ]);
      docs = resList.documents || [];
    }
  } catch (err) {
    console.warn('[campaignAgent] list conversations fallback', err?.message);
    const queries = [Query.limit(50)];
    if (empresaInput) {
      const empresaDoc = await resolveEmpresa(dbId, empresaInput).catch(() => null);
      if (empresaDoc?.id) queries.unshift(Query.equal('empresa_id', empresaDoc.id));
    }
    const resList = await databases.listDocuments(dbId, CONVERSATIONS_COL, queries);
    docs = resList.documents || [];
  }

  const conversations = docs.map((raw) => {
    const c = mergeDoc(raw);
    const ctx = getContexto(c);
    const historico = parseJsonField(c.historico_mensagens, []);
    return {
      id: c.id || c.$id,
      titulo: c.titulo || `${c.empresa_nome || 'Empresa'} - ${MES_NOMES[c.mes] || c.mes} Ideas`,
      empresa: c.empresa_nome || ctx?.empresa?.nome || empresaInput || '',
      mes: c.mes,
      ano: c.ano,
      status: c.status,
      atualizado_em: c.atualizado_em || c.updated_date || null,
      contextoEnriquecido: publicContexto(ctx),
      historicoMensagens: Array.isArray(historico) ? historico : [],
    };
  });

  conversations.sort((a, b) =>
    String(b.atualizado_em || '').localeCompare(String(a.atualizado_em || ''))
  );

  const open = conversations.find(
    (c) => c.status === 'explorando' || c.status === 'refinada'
  );

  return res.status(200).json({
    success: true,
    conversations,
    lastOpenConversationId: open?.id || conversations[0]?.id || null,
  });
}

function methodHasBody(req) {
  const m = String(req.method || '').toUpperCase();
  return m === 'POST' || m === 'PUT' || m === 'PATCH';
}

async function handleCloneConversation(req, res) {
  const { conversationId } = parseBody(req);
  if (!conversationId) {
    return res.status(400).json({ success: false, error: 'conversationId_obrigatorio' });
  }

  const dbId = getDatabaseId();
  let source;
  try {
    source = await databases.getDocument(dbId, CONVERSATIONS_COL, conversationId);
  } catch {
    return res.status(404).json({ success: false, error: 'conversation_nao_encontrada' });
  }

  const newId = randomUUID();
  const now = new Date().toISOString();
  const tituloBase = source.titulo || `${source.empresa_nome || 'Conversa'}`;
  const titulo = `${tituloBase} (cópia)`.slice(0, 255);

  await databases.createDocument(dbId, CONVERSATIONS_COL, newId, {
    empresa_id: source.empresa_id,
    empresa_nome: source.empresa_nome || null,
    mes: source.mes,
    ano: source.ano,
    status: 'explorando',
    titulo,
    ciclo_comercial: source.ciclo_comercial || null,
    historico_mensagens: source.historico_mensagens || JSON.stringify([]),
    contexto_carregado: source.contexto_carregado || null,
    criado_em: now,
    atualizado_em: now,
  });

  return res.status(200).json({
    success: true,
    conversationId: newId,
    titulo,
  });
}

async function handleArchiveConversation(req, res) {
  const { conversationId } = parseBody(req);
  if (!conversationId) {
    return res.status(400).json({ success: false, error: 'conversationId_obrigatorio' });
  }
  const dbId = getDatabaseId();
  try {
    await databases.updateDocument(dbId, CONVERSATIONS_COL, conversationId, {
      status: 'arquivada',
      atualizado_em: new Date().toISOString(),
    });
  } catch {
    return res.status(404).json({ success: false, error: 'conversation_nao_encontrada' });
  }
  return res.status(200).json({ success: true, conversationId, status: 'arquivada' });
}

async function handleDeleteConversation(req, res) {
  const { conversationId } = parseBody(req);
  if (!conversationId) {
    return res.status(400).json({ success: false, error: 'conversationId_obrigatorio' });
  }
  const dbId = getDatabaseId();
  try {
    await databases.deleteDocument(dbId, CONVERSATIONS_COL, conversationId);
  } catch {
    return res.status(404).json({ success: false, error: 'conversation_nao_encontrada' });
  }
  return res.status(200).json({ success: true, conversationId });
}

const FEEDBACK_COL = 'feedback_ciclos';

async function handleSaveFeedback(req, res) {
  const body = parseBody(req);
  const cycleId = body.cycleId || body.cycle_id;
  if (!cycleId) {
    return res.status(400).json({ success: false, error: 'cycleId_obrigatorio' });
  }

  const dbId = getDatabaseId();

  let cycle = null;
  try {
    cycle = mergeDoc(await databases.getDocument(dbId, CYCLE_PLANS_COL, cycleId));
  } catch {
    return res.status(404).json({ success: false, error: 'cycle_nao_encontrado' });
  }

  let empresaId =
    body.empresa_id ||
    body.empresaId ||
    cycle.empresaId ||
    cycle.empresa_id ||
    null;

  if (!empresaId && cycle.briefId) {
    try {
      const brief = mergeDoc(await databases.getDocument(dbId, BRIEFS_COL, cycle.briefId));
      empresaId = brief?.empresaId || brief?.empresa_id || null;
    } catch {
      // ignore
    }
  }

  if (!empresaId) {
    return res.status(400).json({
      success: false,
      error: 'empresa_id_obrigatorio',
      message: 'Não foi possível resolver empresa_id a partir do ciclo',
    });
  }

  const mes =
    Number(body.mes) ||
    monthFromCycle(cycle) ||
    new Date().getMonth() + 1;
  const ano =
    Number(body.ano) ||
    Number(cycle.ano) ||
    new Date().getFullYear();

  const now = new Date().toISOString();
  const payload = {
    cycle_id: cycleId,
    empresa_id: empresaId,
    mes,
    ano,
    vendas_realizado: numOrNull(body.vendas_realizado),
    engajamento_realizado: numOrNull(body.engajamento_realizado),
    conversoes: numOrNull(body.conversoes),
    alcance: numOrNull(body.alcance),
    o_que_funcionou: String(body.o_que_funcionou || ''),
    o_que_nao_funcionou: String(body.o_que_nao_funcionou || ''),
    aprendizados: String(body.aprendizados || ''),
    nota_geral: numOrNull(body.nota_geral),
    notas_criativas: String(body.notas_criativas || ''),
    notas_producao: String(body.notas_producao || ''),
    recomendacoes_proxima: String(body.recomendacoes_proxima || ''),
    atualizado_em: now,
  };

  // Upsert por cycle_id (unique)
  let feedbackId = null;
  try {
    const existing = await databases.listDocuments(dbId, FEEDBACK_COL, [
      Query.equal('cycle_id', cycleId),
      Query.limit(1),
    ]);
    const row = existing.documents?.[0];
    if (row?.$id) {
      feedbackId = row.$id;
      await databases.updateDocument(dbId, FEEDBACK_COL, feedbackId, payload);
    }
  } catch (err) {
    console.warn('[campaignAgent] feedback lookup', err?.message);
  }

  if (!feedbackId) {
    feedbackId = randomUUID();
    await databases.createDocument(dbId, FEEDBACK_COL, feedbackId, {
      ...payload,
      criado_em: now,
    });
  }

  // Espelha no cycle plan (compat legado)
  try {
    const typedKeys = new Set([
      'agencyId',
      'clientId',
      'serviceId',
      'status',
      'title',
      '$id',
      'id',
      'created_date',
      'updated_date',
      'payload',
    ]);
    const extra = {};
    for (const [k, v] of Object.entries(cycle || {})) {
      if (!typedKeys.has(k)) extra[k] = v;
    }
    const planData = {
      ...(cycle.planData || {}),
      feedback: {
        vendas_realizado: payload.vendas_realizado,
        engajamento_realizado: payload.engajamento_realizado,
        engagement_realizado: payload.engajamento_realizado,
        conversoes: payload.conversoes,
        alcance: payload.alcance,
        o_que_funcionou: payload.o_que_funcionou,
        o_que_nao_funcionou: payload.o_que_nao_funcionou,
        aprendizados: payload.aprendizados,
        nota_geral: payload.nota_geral,
        notas_criativas: payload.notas_criativas,
        notas_producao: payload.notas_producao,
        recomendacoes_proxima: payload.recomendacoes_proxima,
        feedback_id: feedbackId,
        registrado_em: now,
      },
    };
    const cycleUpdate = {
      payload: JSON.stringify({
        ...extra,
        planData,
        feedback: planData.feedback,
      }),
    };
    if (cycle.agencyId) cycleUpdate.agencyId = cycle.agencyId;
    if (cycle.clientId) cycleUpdate.clientId = cycle.clientId;
    if (cycle.serviceId) cycleUpdate.serviceId = cycle.serviceId;
    if (cycle.status) cycleUpdate.status = cycle.status;
    if (cycle.title) cycleUpdate.title = cycle.title;

    await databases.updateDocument(dbId, CYCLE_PLANS_COL, cycleId, cycleUpdate);
  } catch (err) {
    console.warn('[campaignAgent] mirror feedback on cycle', err?.message);
  }

  return res.status(200).json({
    success: true,
    feedbackId,
    cycleId,
  });
}

function numOrNull(value) {
  if (value === '' || value == null) return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function monthFromCycle(cycle) {
  const direct = Number(cycle?.mes);
  if (Number.isFinite(direct) && direct >= 1 && direct <= 12) return direct;
  const fromPlan = Number(cycle?.planData?.mes);
  if (Number.isFinite(fromPlan) && fromPlan >= 1 && fromPlan <= 12) return fromPlan;
  const dateStr = cycle?.start_date || cycle?.startDate;
  if (dateStr) {
    const d = new Date(dateStr);
    if (!Number.isNaN(d.getTime())) return d.getMonth() + 1;
  }
  return null;
}

async function handleLoadPlanContext(req, res) {
  const body = methodHasBody(req) ? parseBody(req) : {};
  const empresaInput =
    req.query?.empresaId ||
    req.query?.empresa ||
    body.empresaId ||
    body.empresa ||
    null;
  const clientId = req.query?.clientId || body.clientId || null;
  const ano = Number(req.query?.ano || body.ano) || new Date().getFullYear();
  const mesRaw = req.query?.mes ?? body.mes;
  const mes = mesRaw != null && mesRaw !== '' ? Number(mesRaw) : new Date().getMonth() + 1;

  let empresaId = null;
  if (empresaInput) {
    const emp = await resolveEmpresa(getDatabaseId(), empresaInput);
    empresaId = emp?.id || (/^[a-zA-Z0-9_]{15,36}$/.test(String(empresaInput)) ? empresaInput : null);
  }

  const data = await loadPlanContext({
    databases,
    empresaId,
    clientId,
    ano,
    mes,
  });

  return res.status(200).json(data);
}

async function handleUpdatePlanMonth(req, res) {
  const body = parseBody(req);
  const mes = Number(body.mes);
  if (!Number.isFinite(mes) || mes < 1 || mes > 12) {
    return res.status(400).json({ success: false, error: 'mes_invalido' });
  }

  const result = await updatePlanMonth({
    databases,
    planId: body.planId || body.plan_id || body.plano_anual_id || null,
    empresaId: body.empresaId || body.empresa_id || null,
    clientId: body.clientId || null,
    ano: Number(body.ano) || new Date().getFullYear(),
    mes,
    brief_mensal_id: body.brief_mensal_id || body.briefId || null,
    ciclo_entrega_id: body.ciclo_entrega_id || body.cycleId || body.ciclo_id || null,
    status_mes: body.status_mes || 'materializado',
    nome_campanha: body.nome_campanha || null,
  });

  return res.status(result.success ? 200 : 404).json(result);
}

export default async function campaignAgentHandler(req, res) {
  setCors(res);
  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  const route = resolveRoute(req);
  const method = String(req.method || 'GET').toUpperCase();

  try {
    if (route === 'get-conversations') {
      if (method !== 'GET' && method !== 'POST') {
        return res.status(405).json({ success: false, error: 'method_not_allowed' });
      }
      return await handleGetConversations(req, res);
    }

    if (route === 'load-plan-context') {
      if (method !== 'GET' && method !== 'POST') {
        return res.status(405).json({ success: false, error: 'method_not_allowed' });
      }
      return await handleLoadPlanContext(req, res);
    }

    if (method !== 'POST') {
      return res.status(405).json({ success: false, error: 'method_not_allowed' });
    }

    if (route === 'init') return await handleInit(req, res);
    if (route === 'message') return await handleMessage(req, res);
    if (route === 'save-brief') return await handleSaveBrief(req, res);
    if (route === 'update-plan-month') return await handleUpdatePlanMonth(req, res);
    if (route === 'save-feedback') return await handleSaveFeedback(req, res);
    if (route === 'clone-conversation') return await handleCloneConversation(req, res);
    if (route === 'archive-conversation') return await handleArchiveConversation(req, res);
    if (route === 'delete-conversation') return await handleDeleteConversation(req, res);

    return res.status(400).json({ success: false, error: 'Unknown endpoint' });
  } catch (err) {
    console.error('[campaignAgent]', route, err);
    const status = err?.status || (err?.code === 404 ? 404 : 500);
    return res.status(typeof status === 'number' ? status : 500).json({
      success: false,
      error: err?.code || 'agent_error',
      message: err?.message || 'error',
    });
  }
}
