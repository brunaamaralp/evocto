/**
 * Gera proposta (docx) ou apresentação (pptx) via Claude Agent Skills.
 *
 * POST /api/generate-material?route=create
 * GET  /api/generate-material?route=status&jobId=
 *
 * Auth: Bearer JWT Appwrite.
 */
import { Client, Account, Query, ID, Permission, Role } from 'node-appwrite';
import { InputFile } from 'node-appwrite/file';
import {
  getAdminTables,
  getAdminStorage,
  getEnvConfig,
  parsePayload,
  splitTyped,
} from './materialAppwrite.js';
import {
  generateMaterialFile,
  mimeAndExtForTipo,
  resolveSkillForTipo,
  resolveBrandSkill,
  resolveSkillsForTipo,
} from './anthropicSkills.js';
import {
  buildGenerateMaterialUserPrompt,
  systemPromptForTipo,
} from '../../src/lib/generateMaterialPrompt.js';
import {
  GENERATE_MATERIAL_SCHEMA_VERSION,
  validateGenerateMaterialRequest,
} from '../../src/lib/generateMaterialSchema.js';

const BRIEF_KIND_INICIAL = 'briefing_inicial';
const BRIEF_KIND_ANUAL = 'campanha_anual';

export const JOBS_TABLE = 'generate_material_jobs';
export const CLIENT_DOCUMENTS_TABLE = 'client_documents';
export const CLIENTS_TABLE = 'clients';
export const BRIEFS_TABLE = 'briefs';
export const EMPRESAS_TABLE = 'empresas';
export const AGENCY_LEADS_TABLE = 'agency_leads';

export const JOB_COLUMNS = [
  'agencyId',
  'clientId',
  'status',
  'tipo',
  'createdBy',
  'documentId',
  'error',
];

export const CLIENT_DOCUMENT_COLUMNS = [
  'agencyId',
  'clientId',
  'serviceId',
  'title',
  'group',
  'status',
  'visibility',
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
  return String(req.query?.route || req.query?.action || '').trim() || 'create';
}

async function ensureAppwriteUser(req, res) {
  const header = String(req.headers.authorization || req.headers.Authorization || '');
  const jwt = header.startsWith('Bearer ') ? header.slice(7).trim() : '';
  if (!jwt) {
    res.status(401).json({ error: 'unauthorized', message: 'Faça login novamente' });
    return null;
  }
  const { endpoint, projectId } = getEnvConfig();
  if (!endpoint || !projectId) {
    res.status(500).json({ error: 'appwrite_not_configured' });
    return null;
  }
  try {
    const client = new Client().setEndpoint(endpoint).setProject(projectId).setJWT(jwt);
    const account = new Account(client);
    const user = await account.get();
    return { user, jwt };
  } catch (err) {
    console.warn('[generateMaterial] JWT inválido:', err?.message || err);
    res.status(401).json({ error: 'invalid_session', message: 'Sessão inválida' });
    return null;
  }
}

async function getRow(tables, databaseId, tableId, rowId) {
  const row = await tables.getRow({ databaseId, tableId, rowId });
  return parsePayload(row);
}

async function listFirst(tables, databaseId, tableId, queries) {
  const result = await tables.listRows({ databaseId, tableId, queries });
  const rows = result.rows || result.documents || [];
  return rows.length ? parsePayload(rows[0]) : null;
}

async function createJob(tables, databaseId, data) {
  const rowId = ID.unique();
  await tables.createRow({
    databaseId,
    tableId: JOBS_TABLE,
    rowId,
    data: splitTyped(JOB_COLUMNS, data),
    permissions: [
      Permission.read(Role.users()),
      Permission.update(Role.users()),
    ],
  });
  return rowId;
}

async function updateJob(tables, databaseId, jobId, patch) {
  const existing = await getRow(tables, databaseId, JOBS_TABLE, jobId);
  const merged = { ...existing, ...patch };
  await tables.updateRow({
    databaseId,
    tableId: JOBS_TABLE,
    rowId: jobId,
    data: splitTyped(JOB_COLUMNS, merged),
  });
  return { ...merged, id: jobId };
}

async function countActiveJobs(tables, databaseId, { agencyId, clientId, createdBy }) {
  try {
    const result = await tables.listRows({
      databaseId,
      tableId: JOBS_TABLE,
      queries: [
        Query.equal('agencyId', agencyId),
        Query.equal('clientId', clientId),
        Query.equal('createdBy', createdBy),
        Query.equal('status', ['queued', 'running']),
        Query.limit(5),
      ],
    });
    return (result.rows || result.documents || []).length;
  } catch (err) {
    console.warn('[generateMaterial] countActiveJobs:', err?.message || err);
    return 0;
  }
}

async function loadClientContext(tables, databaseId, { agencyId, clientId }) {
  let client = null;
  try {
    client = await getRow(tables, databaseId, CLIENTS_TABLE, clientId);
  } catch {
    client = await listFirst(tables, databaseId, CLIENTS_TABLE, [
      Query.equal('$id', clientId),
      Query.limit(1),
    ]);
  }
  if (!client || String(client.agencyId || '') !== String(agencyId)) {
    const err = new Error('Cliente não encontrado');
    err.status = 404;
    err.code = 'client_not_found';
    throw err;
  }

  let empresa = null;
  try {
    empresa = await listFirst(tables, databaseId, EMPRESAS_TABLE, [
      Query.equal('agencyId', agencyId),
      Query.equal('clientId', clientId),
      Query.limit(1),
    ]);
  } catch {
    empresa = null;
  }

  let briefing = null;
  try {
    const result = await tables.listRows({
      databaseId,
      tableId: BRIEFS_TABLE,
      queries: [
        Query.equal('agencyId', agencyId),
        Query.equal('clientId', clientId),
        Query.limit(50),
      ],
    });
    const briefs = (result.rows || result.documents || []).map(parsePayload);
    briefing =
      briefs.find((b) => b?.brief_kind === BRIEF_KIND_INICIAL) ||
      briefs.find(
        (b) =>
          (b?.brief_kind === BRIEF_KIND_ANUAL || b?.brief_kind === 'campanha_anual') &&
          b?.origem_briefing_inicial
      ) ||
      briefs.find((b) => b?.origem_briefing_inicial) ||
      null;
  } catch {
    briefing = null;
  }

  return { client, empresa, briefing };
}

async function loadLeadContext(tables, databaseId, { agencyId, leadId }) {
  const id = String(leadId || '').trim();
  if (!id) return null;
  try {
    const lead = await getRow(tables, databaseId, AGENCY_LEADS_TABLE, id);
    if (!lead || String(lead.agencyId || '') !== String(agencyId)) {
      console.warn('[generateMaterial] lead agency mismatch or missing', id);
      return null;
    }
    return lead;
  } catch (err) {
    console.warn('[generateMaterial] lead load failed:', err?.message || err);
    return null;
  }
}

function safeFileBase(name) {
  return String(name || 'material')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9-_]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 60) || 'material';
}

async function uploadGeneratedFile({ buffer, fileName, mime }) {
  const { storage, bucketId } = getAdminStorage();
  const fileId = ID.unique();
  const input = InputFile.fromBuffer(buffer, fileName);
  await storage.createFile({
    bucketId,
    fileId,
    file: input,
    permissions: [
      Permission.read(Role.users()),
      Permission.update(Role.users()),
      Permission.delete(Role.users()),
    ],
  });
  const view = storage.getFileView({ bucketId, fileId });
  const fileUrl = typeof view === 'string' ? view : view?.href || String(view);
  return { fileId, fileUrl, fileName, mime, size: buffer.length };
}

async function createClientDocument(tables, databaseId, doc) {
  const rowId = ID.unique();
  await tables.createRow({
    databaseId,
    tableId: CLIENT_DOCUMENTS_TABLE,
    rowId,
    data: splitTyped(CLIENT_DOCUMENT_COLUMNS, doc),
    permissions: [
      Permission.read(Role.users()),
      Permission.update(Role.users()),
      Permission.delete(Role.users()),
    ],
  });
  return rowId;
}

async function scheduleBackground(fn) {
  const run = Promise.resolve()
    .then(fn)
    .catch((err) => {
      console.error('[generateMaterial] background:', err?.message || err);
    });
  try {
    const mod = await import('@vercel/functions');
    if (typeof mod.waitUntil === 'function') {
      mod.waitUntil(run);
      return true;
    }
  } catch {
    /* Netlify / local: sem waitUntil */
  }
  await run;
  return false;
}

/**
 * Processa job: Claude Skills → Appwrite Storage → ClientDocument.
 */
export async function processJob(jobId) {
  const { tables, databaseId } = getAdminTables();
  let job;
  try {
    job = await getRow(tables, databaseId, JOBS_TABLE, jobId);
  } catch (err) {
    console.error('[generateMaterial] job não encontrado', jobId, err?.message || err);
    return;
  }
  if (!job || job.status === 'ready' || job.status === 'failed') return;

  await updateJob(tables, databaseId, jobId, {
    status: 'running',
    error: null,
    startedAt: new Date().toISOString(),
  });

  try {
    if (!process.env.ANTHROPIC_API_KEY) {
      const err = new Error('ANTHROPIC_API_KEY não configurada');
      err.code = 'anthropic_not_configured';
      throw err;
    }

    const tipo = job.tipo === 'apresentacao' ? 'apresentacao' : 'proposta';
    const overrides = job.overrides && typeof job.overrides === 'object' ? job.overrides : {};
    const { client, empresa, briefing } = await loadClientContext(tables, databaseId, {
      agencyId: job.agencyId,
      clientId: job.clientId,
    });
    const lead = await loadLeadContext(tables, databaseId, {
      agencyId: job.agencyId,
      leadId: job.leadId,
    });

    const system = systemPromptForTipo(tipo);
    const { userContent, canonical, validation } = buildGenerateMaterialUserPrompt(tipo, {
      client,
      empresa,
      briefing,
      lead,
      leadId: job.leadId || lead?.id || null,
      overrides,
      agencyName: job.agencyName || null,
      clientId: job.clientId,
    });
    if (!validation.valid) {
      const err = new Error(
        Object.values(validation.errors)[0] || 'Contexto de geração incompleto'
      );
      err.code = 'invalid_context';
      err.details = validation.errors;
      throw err;
    }

    const generated = await generateMaterialFile({ tipo, system, userContent });
    const clientName = canonical.cliente?.nome || client.name || client.nome || 'cliente';
    const label = tipo === 'apresentacao' ? 'Apresentacao' : 'Proposta';
    const fileName = `${safeFileBase(label)}-${safeFileBase(clientName)}-${Date.now()}.${generated.ext}`;
    const uploaded = await uploadGeneratedFile({
      buffer: generated.buffer,
      fileName,
      mime: generated.mime,
    });

    const group = tipo === 'apresentacao' ? 'presentation' : 'deliverable';
    const title =
      canonical.overrides?.titulo ||
      overrides.titulo ||
      `${tipo === 'apresentacao' ? 'Apresentação' : 'Proposta'} — ${clientName}`;

    const sourceLeadId = job.leadId || lead?.id || null;
    const documentId = await createClientDocument(tables, databaseId, {
      agencyId: job.agencyId,
      clientId: job.clientId,
      title,
      group,
      status: 'approved',
      visibility: 'client',
      fileName: uploaded.fileName,
      fileSize: uploaded.size,
      fileType: uploaded.mime,
      fileUrl: uploaded.fileUrl,
      fileId: uploaded.fileId,
      category: tipo === 'apresentacao' ? 'presentation' : 'proposta',
      description: `Gerado por IA (${resolveSkillForTipo(tipo).skill_id})`,
      tags: ['ia', 'claude-skills', tipo, ...(sourceLeadId ? ['crm', 'lead'] : [])],
      uploadedBy: job.createdByEmail || job.createdBy,
      uploadedAt: new Date().toISOString(),
      source: sourceLeadId ? 'generate_material_crm' : 'generate_material',
      generateMaterialJobId: jobId,
      sourceLeadId,
      schemaVersion: canonical.schema_version,
      qualityScore: canonical.qualidade?.score ?? null,
    });

    if (sourceLeadId) {
      try {
        const leadRow =
          lead ||
          (await loadLeadContext(tables, databaseId, {
            agencyId: job.agencyId,
            leadId: sourceLeadId,
          }));
        if (leadRow) {
          const stage = String(leadRow.status || '').toLowerCase();
          const leadPatch = {
            agencyId: leadRow.agencyId,
            name: leadRow.name,
            email: leadRow.email ?? null,
            phone: leadRow.phone ?? null,
            convertedClientId: leadRow.convertedClientId || job.clientId,
            companyName: leadRow.companyName ?? null,
            estimatedValue: leadRow.estimatedValue ?? null,
            notes: leadRow.notes ?? null,
            lastProposalDocumentId: documentId,
            lastProposalJobId: jobId,
            lastProposalAt: new Date().toISOString(),
            status:
              stage === 'fechado' || stage === 'perdido' ? leadRow.status : 'proposta',
          };
          await tables.updateRow({
            databaseId,
            tableId: AGENCY_LEADS_TABLE,
            rowId: sourceLeadId,
            data: splitTyped(
              ['agencyId', 'name', 'email', 'phone', 'status', 'convertedClientId'],
              leadPatch
            ),
          });
        }
      } catch (err) {
        console.warn('[generateMaterial] lead update after ready:', err?.message || err);
      }
    }

    await updateJob(tables, databaseId, jobId, {
      status: 'ready',
      documentId,
      fileUrl: uploaded.fileUrl,
      fileName: uploaded.fileName,
      fileId: uploaded.fileId,
      skillId: generated.skill?.skill_id || null,
      schemaVersion: canonical.schema_version,
      qualityScore: canonical.qualidade?.score ?? null,
      leadId: sourceLeadId,
      finishedAt: new Date().toISOString(),
      error: null,
    });
  } catch (err) {
    console.error('[generateMaterial] processJob fail', jobId, err?.message || err);
    await updateJob(tables, databaseId, jobId, {
      status: 'failed',
      error: err?.code || err?.message || 'generate_failed',
      errorMessage: err?.message || 'Falha ao gerar material',
      finishedAt: new Date().toISOString(),
    }).catch(() => {});
  }
}

function publicJob(job) {
  if (!job) return null;
  return {
    jobId: job.id || job.$id,
    status: job.status,
    tipo: job.tipo,
    clientId: job.clientId,
    leadId: job.leadId || null,
    documentId: job.documentId || null,
    fileUrl: job.fileUrl || null,
    fileName: job.fileName || null,
    error: job.error || null,
    errorMessage: job.errorMessage || null,
    created_date: job.created_date || job.$createdAt || null,
    finishedAt: job.finishedAt || null,
  };
}

async function handleCreate(req, res, auth) {
  const body = parseBody(req);
  const checked = validateGenerateMaterialRequest(body);
  if (!checked.valid) {
    return res.status(400).json({
      error: 'invalid_payload',
      message: Object.values(checked.errors)[0] || 'Payload inválido',
      errors: checked.errors,
    });
  }

  const { agencyId, clientId, leadId, tipo, agencyName, overrides } = checked.value;
  const { tables, databaseId } = getAdminTables();

  // Valida cliente antes de criar job
  await loadClientContext(tables, databaseId, { agencyId, clientId });

  let resolvedLeadId = leadId;
  if (resolvedLeadId) {
    const lead = await loadLeadContext(tables, databaseId, {
      agencyId,
      leadId: resolvedLeadId,
    });
    if (!lead) {
      return res.status(400).json({
        error: 'lead_not_found',
        message: 'Lead do CRM não encontrado nesta agência',
      });
    }
    resolvedLeadId = lead.id || resolvedLeadId;
  }

  const active = await countActiveJobs(tables, databaseId, {
    agencyId,
    clientId,
    createdBy: auth.user.$id,
  });
  if (active > 0) {
    return res.status(429).json({
      error: 'job_in_progress',
      message: 'Já existe uma geração em andamento para este cliente. Aguarde.',
    });
  }

  const jobId = await createJob(tables, databaseId, {
    agencyId,
    clientId,
    leadId: resolvedLeadId,
    status: 'queued',
    tipo,
    createdBy: auth.user.$id,
    createdByEmail: auth.user.email || null,
    agencyName,
    overrides,
    schemaVersion: GENERATE_MATERIAL_SCHEMA_VERSION,
    documentId: null,
    error: null,
  });

  const deferred = await scheduleBackground(() => processJob(jobId));

  let job = await getRow(tables, databaseId, JOBS_TABLE, jobId).catch(() => ({
    id: jobId,
    status: deferred ? 'queued' : 'ready',
    tipo,
    clientId,
  }));

  return res.status(202).json({
    success: true,
    jobId,
    deferred,
    job: publicJob({ ...job, id: jobId }),
    skill: resolveSkillForTipo(tipo),
    expected: mimeAndExtForTipo(tipo),
  });
}

async function handleStatus(req, res, auth) {
  const jobId = String(req.query?.jobId || parseBody(req).jobId || '').trim();
  if (!jobId) {
    return res.status(400).json({ error: 'jobId_required', message: 'jobId obrigatório' });
  }

  const { tables, databaseId } = getAdminTables();
  let job;
  try {
    job = await getRow(tables, databaseId, JOBS_TABLE, jobId);
  } catch {
    return res.status(404).json({ error: 'job_not_found', message: 'Job não encontrado' });
  }

  if (String(job.createdBy || '') !== String(auth.user.$id)) {
    // Permite quem da mesma agência consultar (equipe)
    if (!job.agencyId) {
      return res.status(403).json({ error: 'forbidden', message: 'Sem permissão' });
    }
  }

  // Lazy kick: se ficou queued sem worker, processa agora
  if (job.status === 'queued') {
    await scheduleBackground(() => processJob(jobId));
  }

  job = await getRow(tables, databaseId, JOBS_TABLE, jobId);
  return res.status(200).json({ success: true, job: publicJob({ ...job, id: jobId }) });
}

export default async function generateMaterialHandler(req, res) {
  setCors(res);
  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  const auth = await ensureAppwriteUser(req, res);
  if (!auth) return undefined;

  const route = resolveRoute(req);

  try {
    if (route === 'status' && (req.method === 'GET' || req.method === 'POST')) {
      return await handleStatus(req, res, auth);
    }
    if (route === 'create' && req.method === 'POST') {
      return await handleCreate(req, res, auth);
    }
    if (route === 'skills' && req.method === 'GET') {
      return res.status(200).json({
        proposta: resolveSkillForTipo('proposta'),
        apresentacao: resolveSkillForTipo('apresentacao'),
        marca: resolveBrandSkill(),
        container: {
          proposta: resolveSkillsForTipo('proposta'),
          apresentacao: resolveSkillsForTipo('apresentacao'),
        },
      });
    }
    return res.status(404).json({ error: 'unknown_route', message: `Rota desconhecida: ${route}` });
  } catch (err) {
    const status = err?.status || 500;
    console.error('[generateMaterial]', err?.message || err);
    return res.status(status).json({
      error: err?.code || 'internal',
      message: err?.message || 'Erro ao gerar material',
      details: err?.details || undefined,
    });
  }
}
