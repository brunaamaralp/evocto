/**
 * Extrai campos do briefing inicial a partir de PDF / DOCX / TXT.
 *
 * POST /api/extract-briefing-inicial
 * Body: { filename, mimeType, contentBase64, clientName? }
 * Auth: Bearer JWT Appwrite
 *
 * Não grava no banco — retorna empresa normalizada para o formulário revisar.
 */
import { Client, Account } from 'node-appwrite';
import mammoth from 'mammoth';
import {
  EXTRACT_BRIEFING_SCHEMA_VERSION,
  normalizeExtractedBriefingEmpresa,
  normalizeNarrativaAnalise,
  formatNarrativaAnaliseMarkdown,
  validateExtractBriefingRequest,
  detectFilledKeysFromRaw,
  countExtractedFields,
} from '../../src/lib/extractBriefingInicialSchema.js';
import {
  EXTRACT_BRIEFING_INICIAL_SYSTEM_PROMPT,
  buildExtractBriefingInicialUserPrompt,
} from '../../src/lib/extractBriefingInicialPrompt.js';

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY || '';
const MODEL =
  process.env.ANTHROPIC_BRIEFING_MODEL ||
  process.env.ANTHROPIC_MODEL ||
  'claude-sonnet-4-20250514';

const MIN_TEXT_CHARS = 40;
const MIN_PDF_TEXT_CHARS = 80;

function setCors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
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
  const header = String(req.headers.authorization || req.headers.Authorization || '');
  const jwt = header.startsWith('Bearer ') ? header.slice(7).trim() : '';
  if (!jwt) {
    res.status(401).json({ error: 'unauthorized', message: 'Faça login novamente' });
    return null;
  }
  const endpoint =
    process.env.VITE_APPWRITE_ENDPOINT || process.env.APPWRITE_ENDPOINT;
  const projectId =
    process.env.VITE_APPWRITE_PROJECT_ID || process.env.APPWRITE_PROJECT_ID;
  if (!endpoint || !projectId) {
    res.status(500).json({ error: 'appwrite_not_configured' });
    return null;
  }
  try {
    const client = new Client().setEndpoint(endpoint).setProject(projectId).setJWT(jwt);
    const account = new Account(client);
    return await account.get();
  } catch (err) {
    console.warn('[extractBriefingInicial] JWT inválido:', err?.message || err);
    res.status(401).json({ error: 'invalid_session', message: 'Sessão inválida' });
    return null;
  }
}

function decodeBase64(contentBase64) {
  const cleaned = String(contentBase64 || '').replace(/\s/g, '');
  const buf = Buffer.from(cleaned, 'base64');
  if (!buf.length) {
    const err = new Error('empty_file');
    err.status = 400;
    throw err;
  }
  return buf;
}

async function extractTextFromDocx(buffer) {
  const result = await mammoth.extractRawText({ buffer });
  return String(result?.value || '').trim();
}

function extractTextFromTxt(buffer) {
  let text = buffer.toString('utf8');
  if (text.charCodeAt(0) === 0xfeff) text = text.slice(1);
  return text.trim();
}

async function extractTextFromPdf(buffer) {
  try {
    const { extractText } = await import('unpdf');
    const result = await extractText(new Uint8Array(buffer), {
      mergePages: true,
    });
    if (typeof result === 'string') return result.trim();
    if (typeof result?.text === 'string') return result.text.trim();
    if (Array.isArray(result?.text)) return result.text.join('\n').trim();
    return '';
  } catch (err) {
    console.warn('[extractBriefingInicial] unpdf failed:', err?.message || err);
    return '';
  }
}

async function callAnthropic({ system, userContent, forPdfDocument = false }) {
  const headers = {
    'Content-Type': 'application/json',
    'x-api-key': ANTHROPIC_API_KEY,
    'anthropic-version': '2023-06-01',
  };
  if (forPdfDocument) {
    headers['anthropic-beta'] = 'pdfs-2024-09-25';
  }

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers,
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 4096,
      temperature: 0.2,
      system,
      messages: [{ role: 'user', content: userContent }],
    }),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const msg =
      data?.error?.message || data?.error || `anthropic_http_${response.status}`;
    const err = new Error(typeof msg === 'string' ? msg : 'anthropic_error');
    err.status = response.status >= 500 ? 502 : 400;
    err.details = data;
    throw err;
  }
  return {
    text:
      data.content?.find?.((c) => c.type === 'text')?.text ||
      data.content?.[0]?.text ||
      '',
    usage: data.usage || {},
  };
}

export default async function extractBriefingInicialHandler(req, res) {
  setCors(res);
  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'method_not_allowed' });
  }

  const user = await ensureAppwriteUser(req, res);
  if (!user) return;

  let body;
  try {
    body = parseBody(req);
  } catch {
    return res.status(400).json({ error: 'invalid_json' });
  }

  const validated = validateExtractBriefingRequest(body);
  if (!validated.valid) {
    return res.status(400).json({
      error: 'invalid_payload',
      errors: validated.errors,
      message: Object.values(validated.errors)[0] || 'Arquivo inválido',
    });
  }

  if (!ANTHROPIC_API_KEY) {
    return res.status(503).json({
      error: 'anthropic_not_configured',
      message:
        'A chave de IA (ANTHROPIC_API_KEY) não está configurada no servidor. Peça ao admin para configurar.',
    });
  }

  const { filename, contentBase64, mimeType, kind, clientName } = validated.value;

  try {
    const buffer = decodeBase64(contentBase64);
    let userContent;
    let textLen = 0;
    let forPdfDocument = false;
    let sourceMode = 'text';

    if (kind === 'txt') {
      const text = extractTextFromTxt(buffer);
      textLen = text.length;
      if (textLen < MIN_TEXT_CHARS) {
        return res.status(422).json({
          error: 'empty_document',
          message:
            'O arquivo de texto está vazio ou muito curto para extrair um briefing.',
        });
      }
      userContent = buildExtractBriefingInicialUserPrompt({
        filename,
        clientName,
        textExcerpt: text,
      });
    } else if (kind === 'docx') {
      const text = await extractTextFromDocx(buffer);
      textLen = text.length;
      if (textLen < MIN_TEXT_CHARS) {
        return res.status(422).json({
          error: 'empty_document',
          message:
            'Não foi possível ler texto neste DOCX. Salve novamente ou envie em PDF/TXT.',
        });
      }
      userContent = buildExtractBriefingInicialUserPrompt({
        filename,
        clientName,
        textExcerpt: text,
      });
    } else {
      // PDF: tenta texto embutido primeiro (mais rápido/estável); senão envia o PDF ao Claude.
      const pdfText = await extractTextFromPdf(buffer);
      textLen = pdfText.length;
      if (textLen >= MIN_PDF_TEXT_CHARS) {
        sourceMode = 'pdf_text';
        userContent = buildExtractBriefingInicialUserPrompt({
          filename,
          clientName,
          textExcerpt: pdfText,
        });
      } else {
        sourceMode = 'pdf_document';
        forPdfDocument = true;
        const prompt = buildExtractBriefingInicialUserPrompt({
          filename,
          clientName,
        });
        userContent = [
          {
            type: 'document',
            source: {
              type: 'base64',
              media_type: 'application/pdf',
              data: contentBase64.replace(/\s/g, ''),
            },
          },
          { type: 'text', text: prompt },
        ];
      }
    }

    const { text: aiText, usage } = await callAnthropic({
      system: EXTRACT_BRIEFING_INICIAL_SYSTEM_PROMPT,
      userContent,
      forPdfDocument,
    });

    const parsed = extractJsonObject(aiText);
    if (!parsed) {
      return res.status(502).json({
        error: 'ia_parse_failed',
        message:
          'A IA leu o arquivo, mas não retornou dados estruturados. Tente novamente ou use outro formato.',
      });
    }

    const analise = normalizeNarrativaAnalise(parsed);
    const form = normalizeExtractedBriefingEmpresa(
      { ...parsed, analise },
      clientName,
      { allowClientNameFallback: false }
    );
    // Gate do formulário = valores reais em empresa.* (já mapeados de analise).
    // Não usar só campos_preenchidos da IA — causa formulário vazio com análise cheia.
    const effectiveKeys = detectFilledKeysFromRaw({ empresa: form.empresa });

    if (effectiveKeys.length === 0) {
      return res.status(422).json({
        error: 'no_fields_extracted',
        message:
          'Lemos o arquivo, mas não encontramos base suficiente para montar o DNA da marca. Confira se o documento fala da empresa.',
        avisos: Array.isArray(parsed.avisos) ? parsed.avisos : [],
        analise,
        analise_markdown: formatNarrativaAnaliseMarkdown(analise),
      });
    }

    const stats = countExtractedFields(form, effectiveKeys);

    return res.status(200).json({
      sucesso: true,
      schema_version: EXTRACT_BRIEFING_SCHEMA_VERSION,
      model: MODEL,
      usage: {
        input_tokens: Number(usage.input_tokens || 0),
        output_tokens: Number(usage.output_tokens || 0),
      },
      source: {
        filename,
        mimeType,
        kind,
        mode: sourceMode,
        text_chars: textLen || null,
      },
      filled: stats.filled,
      filled_keys: stats.keys,
      avisos: Array.isArray(parsed.avisos) ? parsed.avisos.map(String) : [],
      analise,
      analise_markdown: formatNarrativaAnaliseMarkdown(analise),
      form,
      empresa: form.empresa,
    });
  } catch (err) {
    console.error('[extractBriefingInicial]', err?.message || err);
    const msg = String(err?.message || '');
    if (/timeout|timed out|DeadlineExceeded/i.test(msg)) {
      return res.status(504).json({
        error: 'claude_timeout',
        message:
          'A leitura demorou demais. Tente um arquivo menor ou em TXT/DOCX.',
      });
    }
    const status = err?.status && Number.isFinite(err.status) ? err.status : 502;
    return res.status(status >= 400 && status < 600 ? status : 502).json({
      error: status === 400 ? 'invalid_payload' : 'ia_failed',
      message:
        msg && msg.length < 180
          ? msg
          : 'Falha ao ler o briefing. Tente novamente em instantes.',
    });
  }
}
