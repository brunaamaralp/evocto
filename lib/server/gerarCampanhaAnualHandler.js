/**
 * POST handler — gera campanhas anuais via Anthropic (um lote de meses por request).
 * Auth: Bearer JWT Appwrite.
 * Recomendado: client chama 3x com meses [1-4], [5-8], [9-12].
 */
import { Client, Account } from 'node-appwrite';
import {
  CAMPANHA_ANUAL_SYSTEM_PROMPT,
  buildCampanhaAnualUserPrompt,
} from '../../src/lib/campanhaAnualPrompt.js';
import {
  buildInputIaFromAnual,
  validateGeracaoIaOutput,
  validateInputIa,
} from '../../src/lib/campanhaAnualSchema.js';

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY || '';
const MODEL =
  process.env.ANTHROPIC_CAMPANHA_MODEL ||
  process.env.ANTHROPIC_MODEL ||
  'claude-sonnet-4-20250514';

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

async function ensureAppwriteUser(req, res) {
  const header = String(req.headers.authorization || '');
  const jwt = header.startsWith('Bearer ') ? header.slice(7).trim() : '';
  if (!jwt) {
    res.status(401).json({ error: 'unauthorized', message: 'Faça login novamente' });
    return null;
  }
  const endpoint = process.env.VITE_APPWRITE_ENDPOINT || process.env.APPWRITE_ENDPOINT;
  const projectId = process.env.VITE_APPWRITE_PROJECT_ID || process.env.APPWRITE_PROJECT_ID;
  if (!endpoint || !projectId) {
    res.status(500).json({ error: 'appwrite_not_configured' });
    return null;
  }
  try {
    const client = new Client().setEndpoint(endpoint).setProject(projectId).setJWT(jwt);
    const account = new Account(client);
    return await account.get();
  } catch (err) {
    console.warn('[gerarCampanhaAnual] JWT inválido:', err?.message || err);
    res.status(401).json({ error: 'invalid_session', message: 'Sessão inválida' });
    return null;
  }
}

async function callAnthropic(system, userContent) {
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 8192,
      temperature: 1,
      system,
      messages: [{ role: 'user', content: userContent }],
    }),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const msg = data?.error?.message || data?.error || `anthropic_http_${response.status}`;
    const err = new Error(typeof msg === 'string' ? msg : 'anthropic_error');
    err.status = response.status;
    err.details = data;
    throw err;
  }
  return {
    text: data.content?.[0]?.text || '',
    usage: data.usage || {},
  };
}

export default async function gerarCampanhaAnualHandler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'method_not_allowed' });
  }

  const user = await ensureAppwriteUser(req, res);
  if (!user) return;

  let body = req.body;
  if (typeof body === 'string') {
    try {
      body = JSON.parse(body);
    } catch {
      return res.status(400).json({ error: 'invalid_json' });
    }
  }

  const empresa = body?.empresa;
  const ciclos_comerciais = body?.ciclos_comerciais;
  const briefings_mes = body?.briefings_mes;
  const ano = body?.ano;
  const mesesFiltro = Array.isArray(body?.meses)
    ? body.meses.map(Number).filter((m) => m >= 1 && m <= 12)
    : [1, 2, 3, 4];

  const inputIa =
    body?.input ||
    buildInputIaFromAnual({
      empresa,
      ciclos_comerciais,
      briefings_mes,
      ano,
    });

  const inputVal = validateInputIa(inputIa);
  if (!inputVal.valid) {
    return res.status(400).json({
      error: 'input_invalido',
      errors: inputVal.errors,
    });
  }

  if (!ANTHROPIC_API_KEY) {
    return res.status(503).json({
      error: 'anthropic_not_configured',
      message: 'ANTHROPIC_API_KEY não configurada no servidor',
    });
  }

  try {
    const userPrompt = buildCampanhaAnualUserPrompt(inputIa, { meses: mesesFiltro });
    const { text, usage } = await callAnthropic(
      CAMPANHA_ANUAL_SYSTEM_PROMPT,
      userPrompt
    );

    const parsed = extractJsonObject(text);
    if (!parsed) {
      console.error('[gerarCampanhaAnual] JSON parse fail', {
        meses: mesesFiltro,
        preview: text.slice(0, 400),
      });
      return res.status(502).json({
        error: 'ia_parse_failed',
        message: `A IA não retornou JSON válido para os meses ${mesesFiltro.join(', ')}.`,
        meses: mesesFiltro,
      });
    }

    const loteCampanhas = (parsed.campanhas || []).filter((c) =>
      mesesFiltro.includes(Number(c?.mes))
    );

    const ciclosSubset = {};
    for (const ciclo of Object.keys(inputIa.ciclos_comerciais || {})) {
      ciclosSubset[ciclo] = (inputIa.ciclos_comerciais[ciclo] || []).filter((m) =>
        mesesFiltro.includes(m)
      );
    }

    const { valid, errors, value } = validateGeracaoIaOutput(
      {
        status: 'sucesso',
        campanhas: mesesFiltro.map(
          (mes) => loteCampanhas.find((c) => Number(c.mes) === mes) || { mes }
        ),
        avisos: parsed.avisos || [],
        sugestoes: parsed.sugestoes || [],
      },
      ciclosSubset
    );

    return res.status(200).json({
      sucesso: true,
      model: MODEL,
      meses: mesesFiltro,
      usage: {
        input_tokens: Number(usage.input_tokens || 0),
        output_tokens: Number(usage.output_tokens || 0),
      },
      geracao_valid: valid,
      geracao_errors: valid ? null : errors,
      campanhas: value.campanhas.filter((c) => mesesFiltro.includes(c.mes)),
      avisos: value.avisos,
      sugestoes: value.sugestoes,
      validacoes: value.validacoes,
    });
  } catch (err) {
    console.error('[gerarCampanhaAnual]', err?.message || err);
    return res.status(502).json({
      error: 'ia_failed',
      message: err?.message || 'Falha ao gerar campanhas',
    });
  }
}
