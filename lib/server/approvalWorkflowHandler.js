/**
 * Approval workflow API (staff create/notify + public validate/process).
 * Portal authenticated decide stays on /api/client-portal?route=decide.
 *
 * POST/GET ?action=create|notify|validate|process
 */
import {
  requireAgencyStaff,
  getAdminTables,
  parsePayload,
  splitTyped,
  writeAudit,
  notifyAgencyUsers,
  APPROVAL_REQUEST_COLUMNS,
  ID,
  Query,
  Permission,
  Role,
  getEnvConfig,
} from './materialAppwrite.js';
import { generatePublicToken, hashToken, encryptSecret } from './materialCrypto.js';

function json(res, status, body) {
  res.status(status).json(body);
}

function setCors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
}

function readBody(req) {
  if (!req.body) return {};
  if (typeof req.body === 'string') {
    try {
      return JSON.parse(req.body || '{}');
    } catch {
      return {};
    }
  }
  return req.body;
}

function publicOrigin(req) {
  const cfg = getEnvConfig();
  if (cfg.publicAppUrl) return cfg.publicAppUrl;
  const proto = String(req.headers['x-forwarded-proto'] || 'https');
  const host = String(req.headers['x-forwarded-host'] || req.headers.host || '');
  return host ? `${proto}://${host}` : '';
}

function buildPublicApprovalUrl(req, rawToken) {
  return `${publicOrigin(req)}/public-approval?token=${encodeURIComponent(rawToken)}`;
}

function actionOf(req) {
  const body = readBody(req);
  return String(req.query?.action || body.action || '').trim().toLowerCase();
}

async function getRowSafe(tables, databaseId, tableId, rowId) {
  if (!rowId) return null;
  try {
    return parsePayload(await tables.getRow({ databaseId, tableId, rowId }));
  } catch {
    return null;
  }
}

async function findApprovalByTokenHash(tables, databaseId, tokenHash) {
  const result = await tables.listRows({
    databaseId,
    tableId: 'approval_requests',
    queries: [Query.equal('token', tokenHash), Query.limit(1)],
  });
  const row = (result.rows || [])[0];
  return row ? parsePayload(row) : null;
}

function rowTeamPerms(agencyId) {
  return [
    Permission.read(Role.team(agencyId)),
    Permission.update(Role.team(agencyId)),
    Permission.delete(Role.team(agencyId)),
  ];
}

function isExpired(approval) {
  if (!approval?.expiresAt) return false;
  const t = new Date(approval.expiresAt).getTime();
  return Number.isFinite(t) && t < Date.now();
}

function publicApprovalDto(approval) {
  if (!approval) return null;
  return {
    id: approval.id,
    status: isExpired(approval) && approval.status === 'pending' ? 'expired' : approval.status,
    title: approval.title || 'Aprovação',
    description: approval.description || approval.customMessage || null,
    contentType: approval.contentType || null,
    contentId: approval.contentId || null,
    expiresAt: approval.expiresAt || null,
    requiresSignature: Boolean(approval.requiresSignature),
    approverName: approval.approverName || null,
  };
}

async function resolveContentContext(tables, databaseId, agencyId, contentType, contentId) {
  const type = String(contentType || '').trim();
  const id = String(contentId || '').trim();
  if (!type || !id) return { error: 'content_required' };

  if (type === 'cycle_plan') {
    const plan = await getRowSafe(tables, databaseId, 'cycle_plans', id);
    if (!plan || plan.agencyId !== agencyId) return { error: 'content_not_found' };
    return {
      clientId: plan.clientId,
      serviceId: plan.serviceId || null,
      title: plan.title || 'Aprovação do plano',
      description: plan.description || null,
      content: plan,
    };
  }

  if (type === 'briefing' || type === 'brief') {
    const brief = await getRowSafe(tables, databaseId, 'briefs', id);
    if (!brief || brief.agencyId !== agencyId) return { error: 'content_not_found' };
    return {
      clientId: brief.clientId,
      serviceId: brief.serviceId || null,
      title: brief.title || 'Aprovação de briefing',
      description: null,
      content: brief,
    };
  }

  // Generic: require clientId in body later
  return {
    clientId: null,
    serviceId: null,
    title: `Aprovação (${type})`,
    description: null,
    content: null,
    generic: true,
  };
}

async function handleCreate(req, res) {
  const ctx = await requireAgencyStaff(req, res);
  if (!ctx) return;
  const body = readBody(req);
  const contentType = String(body.contentType || '').trim();
  const contentId = String(body.contentId || '').trim();
  const resolved = await resolveContentContext(
    ctx.tables,
    ctx.databaseId,
    ctx.agencyId,
    contentType,
    contentId
  );
  if (resolved.error) {
    return json(res, 400, { success: false, error: resolved.error });
  }

  const clientId = String(body.clientId || resolved.clientId || '').trim();
  if (!clientId) {
    return json(res, 400, {
      success: false,
      error: 'clientId_required',
      message: 'Não foi possível determinar o cliente deste conteúdo',
    });
  }

  const client = await getRowSafe(ctx.tables, ctx.databaseId, 'clients', clientId);
  if (!client || client.agencyId !== ctx.agencyId) {
    return json(res, 404, { success: false, error: 'client_not_found' });
  }

  const expiryDays = Math.min(Math.max(Number(body.expiryDays) || 7, 1), 90);
  const expiresAt = new Date(Date.now() + expiryDays * 24 * 60 * 60 * 1000).toISOString();
  const rawToken = generatePublicToken();
  const tokenHash = hashToken(rawToken);
  const approvalId = ID.unique();
  const title =
    String(body.title || '').trim() ||
    resolved.title ||
    'Aprovação pendente';
  const customMessage = String(body.message || body.customMessage || '').trim();
  const approverEmail = String(body.approverEmail || client.email || '').trim();
  const approverName = String(body.approverName || client.name || '').trim();

  await ctx.tables.createRow({
    databaseId: ctx.databaseId,
    tableId: 'approval_requests',
    rowId: approvalId,
    data: splitTyped(APPROVAL_REQUEST_COLUMNS, {
      agencyId: ctx.agencyId,
      clientId,
      status: 'pending',
      token: tokenHash,
      contentType,
      contentId,
      serviceId: body.serviceId || resolved.serviceId || null,
      expiresAt,
      title,
      description: resolved.description || customMessage || null,
      customMessage: customMessage || null,
      approverEmail,
      approverName,
      requiresSignature: Boolean(body.requiresSignature),
      createdBy: ctx.user.$id,
      encryptedToken: encryptSecret(rawToken),
      approvalUrl: buildPublicApprovalUrl(req, rawToken),
    }),
    permissions: rowTeamPerms(ctx.agencyId),
  });

  await writeAudit(ctx.tables, ctx.databaseId, {
    agencyId: ctx.agencyId,
    entityType: 'approval_requests',
    entityId: approvalId,
    action: 'APPROVAL_CREATED',
    actorId: ctx.user.$id,
    meta: { contentType, contentId, clientId },
  });

  try {
    await notifyAgencyUsers(ctx.tables, ctx.databaseId, {
      agencyId: ctx.agencyId,
      type: 'approval_pending',
      title: `Aprovação enviada: ${title}`,
      subject: title,
      meta: { approvalId, clientId, contentType },
    });
  } catch {
    // non-blocking
  }

  const approvalUrl = buildPublicApprovalUrl(req, rawToken);
  return json(res, 200, {
    success: true,
    approval: {
      id: approvalId,
      status: 'pending',
      contentType,
      contentId,
      clientId,
      expiresAt,
      approvalUrl,
      token: rawToken,
    },
  });
}

async function handleNotify(req, res) {
  const ctx = await requireAgencyStaff(req, res);
  if (!ctx) return;
  const body = readBody(req);
  const approvalId = String(body.approvalId || '').trim();
  if (!approvalId) {
    return json(res, 400, { success: false, error: 'approvalId_required' });
  }
  const approval = await getRowSafe(ctx.tables, ctx.databaseId, 'approval_requests', approvalId);
  if (!approval || approval.agencyId !== ctx.agencyId) {
    return json(res, 404, { success: false, error: 'not_found' });
  }
  if (approval.status !== 'pending') {
    return json(res, 409, { success: false, error: 'not_pending' });
  }

  await writeAudit(ctx.tables, ctx.databaseId, {
    agencyId: ctx.agencyId,
    entityType: 'approval_requests',
    entityId: approvalId,
    action: 'APPROVAL_NOTIFY',
    actorId: ctx.user.$id,
    meta: { customMessage: body.customMessage || null },
  });

  return json(res, 200, {
    success: true,
    message: 'Lembrete registrado. Envio de e-mail pode ser configurado depois.',
  });
}

async function handleValidate(req, res) {
  const body = readBody(req);
  const rawToken = String(req.query?.token || body.token || '').trim();
  if (!rawToken) {
    return json(res, 400, { success: false, error: 'token_required' });
  }
  const { tables, databaseId } = getAdminTables();
  const approval = await findApprovalByTokenHash(tables, databaseId, hashToken(rawToken));
  if (!approval) {
    return json(res, 404, { success: false, error: 'Link inválido ou não encontrado.' });
  }
  if (approval.status === 'revoked') {
    return json(res, 200, { success: true, approval: publicApprovalDto({ ...approval, status: 'revoked' }) });
  }
  if (isExpired(approval) && approval.status === 'pending') {
    return json(res, 200, { success: true, approval: publicApprovalDto({ ...approval, status: 'expired' }) });
  }

  let contentPreview = null;
  try {
    if (approval.contentType === 'cycle_plan' && approval.contentId) {
      const plan = await getRowSafe(tables, databaseId, 'cycle_plans', approval.contentId);
      if (plan && plan.clientId === approval.clientId) {
        contentPreview = {
          type: 'cycle_plan',
          title: plan.title || 'Plano do ciclo',
          status: plan.status || null,
          summary: plan.summary || plan.description || null,
          cyclePeriod: plan.cyclePeriod || plan.period || null,
        };
      }
    }
  } catch {
    contentPreview = null;
  }

  return json(res, 200, {
    success: true,
    approval: publicApprovalDto(approval),
    contentPreview,
  });
}

async function applyDecision(tables, databaseId, {
  approval,
  action,
  comment,
  actorId,
  signatureName,
}) {
  const nextStatus = action === 'approve' ? 'approved' : 'rejected';
  const now = new Date().toISOString();

  await tables.updateRow({
    databaseId,
    tableId: 'approval_requests',
    rowId: approval.id,
    data: splitTyped(APPROVAL_REQUEST_COLUMNS, {
      ...approval,
      status: nextStatus,
      approverComment: comment || null,
      processedAt: now,
      processedBy: actorId,
      signatureName: signatureName || null,
      decision: nextStatus,
    }),
  });

  if (approval.contentType === 'cycle_plan' && approval.contentId) {
    try {
      const plan = await getRowSafe(tables, databaseId, 'cycle_plans', approval.contentId);
      if (plan && plan.agencyId === approval.agencyId) {
        await tables.updateRow({
          databaseId,
          tableId: 'cycle_plans',
          rowId: plan.id,
          data: splitTyped(['agencyId', 'clientId', 'serviceId', 'status', 'title'], {
            ...plan,
            status: nextStatus === 'approved' ? 'approved' : 'rejected',
          }),
        });
      }
    } catch (err) {
      console.warn('[approvalWorkflow] cycle_plan update:', err?.message || err);
    }
  }

  await writeAudit(tables, databaseId, {
    agencyId: approval.agencyId,
    entityType: 'approval_requests',
    entityId: approval.id,
    action: nextStatus === 'approved' ? 'APPROVAL_APPROVED' : 'APPROVAL_REJECTED',
    actorId,
    meta: { contentType: approval.contentType, contentId: approval.contentId, comment: comment || null },
  });

  return nextStatus;
}

async function handleProcess(req, res) {
  const body = readBody(req);
  const rawToken = String(body.token || '').trim();
  const actionType = String(body.actionType || body.action || '').trim().toLowerCase();
  const action =
    actionType === 'approve' || actionType === 'approved'
      ? 'approve'
      : actionType === 'reject' || actionType === 'rejected'
        ? 'reject'
        : null;

  if (!rawToken || !action) {
    return json(res, 400, {
      success: false,
      error: 'invalid',
      message: 'token e actionType (approve|reject) obrigatórios',
    });
  }

  const { tables, databaseId } = getAdminTables();
  const approval = await findApprovalByTokenHash(tables, databaseId, hashToken(rawToken));
  if (!approval) {
    return json(res, 404, { success: false, error: 'Link inválido ou não encontrado.' });
  }
  if (approval.status !== 'pending') {
    return json(res, 409, {
      success: false,
      error: 'already_processed',
      message: `Esta aprovação já está ${approval.status}`,
    });
  }
  if (isExpired(approval)) {
    return json(res, 410, { success: false, error: 'expired', message: 'Link expirado' });
  }
  if (approval.requiresSignature && String(body.signatureName || '').trim().length < 3) {
    return json(res, 400, {
      success: false,
      error: 'signature_required',
      message: 'Assinatura obrigatória',
    });
  }

  const nextStatus = await applyDecision(tables, databaseId, {
    approval,
    action,
    comment: String(body.comment || '').trim(),
    actorId: `public:${body.signatureName || body.approverEmail || 'token'}`,
    signatureName: String(body.signatureName || '').trim() || null,
  });

  return json(res, 200, {
    success: true,
    approval: publicApprovalDto({ ...approval, status: nextStatus }),
  });
}

export { applyDecision, isExpired, getRowSafe };

export default async function approvalWorkflowHandler(req, res) {
  setCors(res);
  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return;
  }

  const action = actionOf(req);
  try {
    if (action === 'create' && req.method === 'POST') return await handleCreate(req, res);
    if (action === 'notify' && req.method === 'POST') return await handleNotify(req, res);
    if (action === 'validate' && (req.method === 'GET' || req.method === 'POST')) {
      return await handleValidate(req, res);
    }
    if (action === 'process' && req.method === 'POST') return await handleProcess(req, res);
    return json(res, 400, {
      success: false,
      error: 'unknown_action',
      message: 'action deve ser create|notify|validate|process',
    });
  } catch (err) {
    console.error('[approval-workflow]', action, err);
    return json(res, 500, {
      success: false,
      error: 'internal_error',
      message: err?.message || 'Erro no fluxo de aprovação',
    });
  }
}
