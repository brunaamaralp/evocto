/**
 * Client Portal API — isolation via requireClient + admin queries.
 * Entry: api/client-portal.js?route=...
 *
 * Identity: profile.clientId only (never trust query/body clientId).
 */
import {
  requireClient,
  parsePayload,
  splitTyped,
  Query,
} from './materialAppwrite.js';
import {
  toPortalTaskDto,
  toPortalDocumentDto,
  toPortalServiceDto,
  toPortalClientDto,
  toPortalAgencyDto,
  toPortalApprovalDto,
  toPortalApprovalContentPreview,
} from './clientPortalDto.js';
import {
  isClientVisibleFlag,
  isClientActionTask,
  portalActionStatus,
  campaignIdOfTask,
  toClientActionDto,
  toCampaignDto,
  toAnnualPlanDto,
  sortCampaignsForPortal,
  sortActionsByDue,
} from './clientPortalMvpDto.js';
import { applyDecision, isExpired } from './approvalWorkflowHandler.js';

const TASK_COLUMNS = [
  'agencyId',
  'clientId',
  'serviceId',
  'title',
  'status',
  'priority',
  'dueDate',
  'assigneeId',
  'clientVisible',
];

function json(res, status, body) {
  res.status(status).json(body);
}

function setCors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
}

function routeOf(req) {
  return String(req.query?.route || '').trim().toLowerCase();
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

function isClientVisible(row) {
  return isClientVisibleFlag(row);
}

async function listRows(tables, databaseId, tableId, queries) {
  const result = await tables.listRows({
    databaseId,
    tableId,
    queries,
  });
  return (result.rows || result.documents || []).map(parsePayload);
}

async function getRowSafe(tables, databaseId, tableId, rowId) {
  if (!rowId) return null;
  try {
    const row = await tables.getRow({ databaseId, tableId, rowId });
    return parsePayload(row);
  } catch {
    return null;
  }
}

async function listClientVisibleRows(ctx, tableId, limit = 100) {
  const { tables, databaseId, clientId, agencyId } = ctx;
  let rows = [];
  try {
    rows = await listRows(tables, databaseId, tableId, [
      Query.equal('agencyId', agencyId),
      Query.equal('clientId', clientId),
      Query.equal('clientVisible', true),
      Query.limit(limit),
    ]);
  } catch {
    const all = await listRows(tables, databaseId, tableId, [
      Query.equal('agencyId', agencyId),
      Query.equal('clientId', clientId),
      Query.limit(limit),
    ]);
    rows = all.filter(isClientVisible);
  }
  return rows.filter(
    (r) => r.clientId === clientId && r.agencyId === agencyId && isClientVisible(r)
  );
}

async function loadServiceNameMap(tables, databaseId, agencyId, clientId, serviceIds) {
  const map = new Map();
  const ids = [...new Set((serviceIds || []).filter(Boolean))];
  if (ids.length === 0) {
    const services = await listRows(tables, databaseId, 'services', [
      Query.equal('agencyId', agencyId),
      Query.equal('clientId', clientId),
      Query.limit(100),
    ]);
    for (const s of services) map.set(s.id, s.name || 'Serviço');
    return map;
  }
  for (const id of ids.slice(0, 50)) {
    const s = await getRowSafe(tables, databaseId, 'services', id);
    if (s && s.clientId === clientId && s.agencyId === agencyId) {
      map.set(s.id, s.name || 'Serviço');
    }
  }
  return map;
}

async function handleBootstrap(ctx, res) {
  const { tables, databaseId, clientId, agencyId, profile, user } = ctx;
  const [client, agency] = await Promise.all([
    getRowSafe(tables, databaseId, 'clients', clientId),
    getRowSafe(tables, databaseId, 'agencies', agencyId),
  ]);

  if (!client || client.agencyId !== agencyId) {
    return json(res, 404, { error: 'client_not_found', message: 'Cliente não encontrado' });
  }

  return json(res, 200, {
    ok: true,
    client: toPortalClientDto(client),
    agency: toPortalAgencyDto(agency) || { id: agencyId, name: 'Agência', logoUrl: null },
    user: {
      id: user.$id,
      email: user.email || profile.email || null,
      name: profile.full_name || profile.name || user.name || null,
    },
  });
}

async function listSharedTasks(ctx) {
  const tasks = await listClientVisibleRows(ctx, 'tasks', 100);
  const serviceMap = await loadServiceNameMap(
    ctx.tables,
    ctx.databaseId,
    ctx.agencyId,
    ctx.clientId,
    tasks.map((t) => t.serviceId)
  );

  return tasks
    .map((t) => toPortalTaskDto(t, { serviceName: serviceMap.get(t.serviceId) || null }))
    .filter(Boolean);
}

async function listVisibleDocuments(ctx) {
  const { tables, databaseId, clientId, agencyId } = ctx;
  let docs = [];
  try {
    docs = await listRows(tables, databaseId, 'client_documents', [
      Query.equal('agencyId', agencyId),
      Query.equal('clientId', clientId),
      Query.limit(100),
    ]);
  } catch {
    return [];
  }

  return docs
    .filter((d) => d.clientId === clientId && d.agencyId === agencyId)
    .map(toPortalDocumentDto)
    .filter(Boolean);
}

async function listPendingApprovals(ctx) {
  const { tables, databaseId, clientId, agencyId } = ctx;
  const rows = await listRows(tables, databaseId, 'approval_requests', [
    Query.equal('agencyId', agencyId),
    Query.equal('clientId', clientId),
    Query.equal('status', 'pending'),
    Query.limit(50),
  ]);
  return rows
    .filter((a) => a.clientId === clientId && a.agencyId === agencyId)
    .map(toPortalApprovalDto)
    .filter(Boolean);
}

async function listPortalServices(ctx, { sharedTasks, documents, approvals }) {
  const { tables, databaseId, clientId, agencyId } = ctx;
  const sharedIds = new Set([
    ...sharedTasks.map((t) => t.serviceId).filter(Boolean),
    ...documents.map((d) => d.serviceId).filter(Boolean),
    ...approvals.map((a) => a.serviceId).filter(Boolean),
  ]);

  const services = await listRows(tables, databaseId, 'services', [
    Query.equal('agencyId', agencyId),
    Query.equal('clientId', clientId),
    Query.limit(100),
  ]);

  return services
    .filter((s) => s.clientId === clientId && s.agencyId === agencyId)
    .filter((s) => sharedIds.has(s.id))
    .map(toPortalServiceDto)
    .filter(Boolean);
}

async function listVisibleBriefs(ctx) {
  return listClientVisibleRows(ctx, 'briefs', 100);
}

async function listClientActionRows(ctx) {
  const tasks = await listClientVisibleRows(ctx, 'tasks', 100);
  return tasks.filter(isClientActionTask);
}

async function campaignNameMap(ctx, campaignIds) {
  const map = new Map();
  const ids = [...new Set((campaignIds || []).filter(Boolean))];
  for (const id of ids.slice(0, 50)) {
    const brief = await getRowSafe(ctx.tables, ctx.databaseId, 'briefs', id);
    if (
      brief &&
      brief.clientId === ctx.clientId &&
      brief.agencyId === ctx.agencyId &&
      isClientVisible(brief)
    ) {
      map.set(
        String(id),
        brief.nome_campanha || brief.title || 'Campanha'
      );
    }
  }
  return map;
}

function buildClientActionDtos(tasks, nameMap) {
  return sortActionsByDue(
    tasks
      .map((t) =>
        toClientActionDto(t, {
          campaignName: nameMap.get(String(campaignIdOfTask(t) || '')) || null,
        })
      )
      .filter(Boolean)
  );
}

async function loadMvpOverviewParts(ctx) {
  const briefs = await listVisibleBriefs(ctx);
  const actionRows = await listClientActionRows(ctx);

  const campaigns = sortCampaignsForPortal(
    briefs
      .filter((b) => String(b.brief_kind || '') === 'campanha_mensal' || b.nome_campanha)
      .filter((b) => String(b.brief_kind || '') !== 'campanha_anual')
      .map((b) => toCampaignDto(b))
      .filter(Boolean)
  );

  const sharedById = new Map(
    briefs
      .filter((b) => String(b.brief_kind || '') !== 'campanha_anual')
      .map((b) => [String(b.id), b])
  );

  const year = new Date().getFullYear();
  const annualRaw = briefs
    .filter((b) => String(b.brief_kind || '') === 'campanha_anual')
    .filter((b) => !b.ano || Number(b.ano) === year)
    .sort((a, b) =>
      String(b.updated_date || '').localeCompare(String(a.updated_date || ''))
    )[0];

  const annualPlan = annualRaw ? toAnnualPlanDto(annualRaw, sharedById) : null;

  const nameMap = await campaignNameMap(
    ctx,
    actionRows.map((t) => campaignIdOfTask(t))
  );
  const clientActions = buildClientActionDtos(actionRows, nameMap);
  const openActions = clientActions.filter((a) => a.status === 'pending');

  return {
    upcomingCampaigns: campaigns.slice(0, 8),
    needsFromYou: openActions.slice(0, 10),
    annualPlan,
    campaigns,
    clientActions,
    openActions,
  };
}

async function handleOverview(ctx, res) {
  const [sharedTasks, documents, approvals, mvp] = await Promise.all([
    listSharedTasks(ctx),
    listVisibleDocuments(ctx),
    listPendingApprovals(ctx),
    loadMvpOverviewParts(ctx),
  ]);
  const services = await listPortalServices(ctx, { sharedTasks, documents, approvals });

  const client = await getRowSafe(ctx.tables, ctx.databaseId, 'clients', ctx.clientId);
  const agency = await getRowSafe(ctx.tables, ctx.databaseId, 'agencies', ctx.agencyId);
  if (!client || client.agencyId !== ctx.agencyId) {
    return json(res, 404, { error: 'client_not_found', message: 'Cliente não encontrado' });
  }

  return json(res, 200, {
    ok: true,
    client: toPortalClientDto(client),
    agency: toPortalAgencyDto(agency),
    stats: {
      sharedTasks: sharedTasks.length,
      documents: documents.length,
      pendingApprovals: approvals.length,
      services: services.length,
      openClientActions: mvp.openActions.length,
      sharedCampaigns: mvp.campaigns.length,
    },
    services,
    sharedTasks: sharedTasks.slice(0, 10),
    pendingApprovals: approvals.slice(0, 10),
    documents: documents.slice(0, 10),
    upcomingCampaigns: mvp.upcomingCampaigns,
    needsFromYou: mvp.needsFromYou,
    annualPlan: mvp.annualPlan
      ? { id: mvp.annualPlan.id, year: mvp.annualPlan.year, title: mvp.annualPlan.title }
      : null,
  });
}

async function handleAnnualPlan(ctx, res, req) {
  const year = Number(req.query?.year) || new Date().getFullYear();
  const briefs = await listVisibleBriefs(ctx);
  const sharedById = new Map(
    briefs
      .filter((b) => String(b.brief_kind || '') !== 'campanha_anual')
      .map((b) => [String(b.id), b])
  );
  const annualRaw = briefs
    .filter((b) => String(b.brief_kind || '') === 'campanha_anual')
    .filter((b) => Number(b.ano) === year)
    .sort((a, b) =>
      String(b.updated_date || '').localeCompare(String(a.updated_date || ''))
    )[0];

  if (!annualRaw) {
    return json(res, 200, { ok: true, plan: null });
  }

  return json(res, 200, {
    ok: true,
    plan: toAnnualPlanDto(annualRaw, sharedById),
  });
}

async function handleCampaigns(ctx, res) {
  const briefs = await listVisibleBriefs(ctx);
  const campaigns = sortCampaignsForPortal(
    briefs
      .filter((b) => String(b.brief_kind || '') !== 'campanha_anual')
      .filter(
        (b) =>
          String(b.brief_kind || '') === 'campanha_mensal' || Boolean(b.nome_campanha)
      )
      .map((b) => toCampaignDto(b))
      .filter(Boolean)
  );
  return json(res, 200, { ok: true, campaigns });
}

async function handleCampaign(ctx, res, req) {
  const id = String(req.query?.id || '').trim();
  if (!id) {
    return json(res, 400, { error: 'id_required', message: 'Informe ?id=' });
  }
  const brief = await getRowSafe(ctx.tables, ctx.databaseId, 'briefs', id);
  if (!brief || brief.clientId !== ctx.clientId || brief.agencyId !== ctx.agencyId) {
    return json(res, 404, { error: 'not_found', message: 'Campanha não encontrada' });
  }
  if (!isClientVisible(brief) || String(brief.brief_kind || '') === 'campanha_anual') {
    return json(res, 404, { error: 'not_found', message: 'Campanha não disponível' });
  }

  const dto = toCampaignDto(brief);
  if (!dto) {
    return json(res, 404, { error: 'not_found', message: 'Campanha não disponível' });
  }

  const actionRows = (await listClientActionRows(ctx)).filter(
    (t) => String(campaignIdOfTask(t) || '') === String(id)
  );
  const nameMap = new Map([[String(id), dto.name]]);
  dto.clientActions = buildClientActionDtos(actionRows, nameMap);

  return json(res, 200, { ok: true, campaign: dto });
}

async function handleClientActions(ctx, res, req) {
  const statusFilter = String(req.query?.status || '').trim().toLowerCase();
  const actionRows = await listClientActionRows(ctx);
  const nameMap = await campaignNameMap(
    ctx,
    actionRows.map((t) => campaignIdOfTask(t))
  );
  let actions = buildClientActionDtos(actionRows, nameMap);
  if (statusFilter === 'pending' || statusFilter === 'completed') {
    actions = actions.filter((a) => a.status === statusFilter);
  }
  return json(res, 200, { ok: true, actions });
}

async function handleCompleteClientAction(ctx, res, req) {
  const body = readBody(req);
  const actionId = String(body.actionId || body.id || '').trim();
  if (!actionId) {
    return json(res, 400, {
      error: 'invalid',
      message: 'actionId é obrigatório',
    });
  }

  const task = await getRowSafe(ctx.tables, ctx.databaseId, 'tasks', actionId);
  if (!task) {
    return json(res, 404, { error: 'not_found', message: 'Pendência não encontrada' });
  }
  if (task.clientId !== ctx.clientId || task.agencyId !== ctx.agencyId) {
    return json(res, 403, { error: 'forbidden', message: 'Pendência de outro cliente' });
  }
  if (!isClientActionTask(task)) {
    return json(res, 403, {
      error: 'forbidden',
      message: 'Esta tarefa não é uma pendência do cliente',
    });
  }
  if (portalActionStatus(task) === 'completed') {
    const nameMap = await campaignNameMap(ctx, [campaignIdOfTask(task)]);
    return json(res, 200, {
      ok: true,
      action: toClientActionDto(task, {
        campaignName: nameMap.get(String(campaignIdOfTask(task) || '')) || null,
        completedByName: ctx.profile.full_name || ctx.profile.name || null,
      }),
    });
  }

  const now = new Date().toISOString();
  const merged = {
    ...task,
    status: 'completed',
    completedAt: now,
    completedBy: ctx.user.$id,
    completedByRole: 'client',
  };
  // Avoid writing read-only/system fields via splitTyped
  delete merged.id;
  delete merged.created_date;
  delete merged.updated_date;

  await ctx.tables.updateRow({
    databaseId: ctx.databaseId,
    tableId: 'tasks',
    rowId: actionId,
    data: splitTyped(TASK_COLUMNS, merged),
  });

  const updated = await getRowSafe(ctx.tables, ctx.databaseId, 'tasks', actionId);
  const nameMap = await campaignNameMap(ctx, [campaignIdOfTask(updated || task)]);
  return json(res, 200, {
    ok: true,
    action: toClientActionDto(updated || merged, {
      campaignName:
        nameMap.get(String(campaignIdOfTask(updated || task) || '')) || null,
      completedByName: ctx.profile.full_name || ctx.profile.name || null,
    }),
  });
}

async function handleSharedTasks(ctx, res) {
  const sharedTasks = await listSharedTasks(ctx);
  const byService = {};
  for (const task of sharedTasks) {
    const key = task.serviceId || '_none';
    if (!byService[key]) {
      byService[key] = {
        serviceId: task.serviceId,
        serviceName: task.serviceName || 'Geral',
        stages: {},
      };
    }
    const stageKey = task.stageName || 'Geral';
    if (!byService[key].stages[stageKey]) {
      byService[key].stages[stageKey] = [];
    }
    byService[key].stages[stageKey].push(task);
  }

  return json(res, 200, {
    ok: true,
    tasks: sharedTasks,
    byService: Object.values(byService).map((svc) => ({
      serviceId: svc.serviceId,
      serviceName: svc.serviceName,
      stages: Object.entries(svc.stages).map(([stageName, tasks]) => ({
        stageName,
        tasks,
      })),
    })),
  });
}

async function handleDocuments(ctx, res) {
  const documents = await listVisibleDocuments(ctx);
  return json(res, 200, { ok: true, documents });
}

async function handleServices(ctx, res) {
  const [sharedTasks, documents, approvals] = await Promise.all([
    listSharedTasks(ctx),
    listVisibleDocuments(ctx),
    listPendingApprovals(ctx),
  ]);
  const services = await listPortalServices(ctx, { sharedTasks, documents, approvals });
  return json(res, 200, { ok: true, services });
}

async function handlePendingActions(ctx, res) {
  const [approvals, mvp] = await Promise.all([
    listPendingApprovals(ctx),
    loadMvpOverviewParts(ctx),
  ]);
  return json(res, 200, {
    ok: true,
    approvals,
    clientActions: mvp.openActions,
    sharedTasksNeedingAttention: mvp.openActions,
  });
}

async function handleApprovals(ctx, res) {
  const approvals = await listPendingApprovals(ctx);
  return json(res, 200, { ok: true, approvals });
}

async function handleApprovalDetail(ctx, res, req) {
  const approvalId = String(req.query?.approvalId || '').trim();
  if (!approvalId) {
    return json(res, 400, { error: 'approvalId_required' });
  }

  const approval = await getRowSafe(ctx.tables, ctx.databaseId, 'approval_requests', approvalId);
  if (!approval) {
    return json(res, 404, { error: 'not_found', message: 'Aprovação não encontrada' });
  }
  if (approval.agencyId !== ctx.agencyId || approval.clientId !== ctx.clientId) {
    return json(res, 403, { error: 'forbidden', message: 'Aprovação de outro cliente' });
  }

  let contentPreview = null;
  const contentType = String(approval.contentType || '').trim();
  const contentId = String(approval.contentId || '').trim();

  if (contentType === 'cycle_plan' && contentId) {
    const plan = await getRowSafe(ctx.tables, ctx.databaseId, 'cycle_plans', contentId);
    if (plan && plan.agencyId === ctx.agencyId && plan.clientId === ctx.clientId) {
      contentPreview = toPortalApprovalContentPreview('cycle_plan', plan);
    }
  } else if ((contentType === 'briefing' || contentType === 'brief') && contentId) {
    const brief = await getRowSafe(ctx.tables, ctx.databaseId, 'briefs', contentId);
    if (brief && brief.agencyId === ctx.agencyId && brief.clientId === ctx.clientId) {
      contentPreview = toPortalApprovalContentPreview('briefing', brief);
    }
  }

  return json(res, 200, {
    ok: true,
    approval: toPortalApprovalDto(approval),
    contentPreview,
  });
}

export default async function clientPortalHandler(req, res) {
  setCors(res);
  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return;
  }

  const ctx = await requireClient(req, res);
  if (!ctx) return;

  const route = routeOf(req);

  try {
    if (req.method === 'GET') {
      switch (route) {
        case 'bootstrap':
          return await handleBootstrap(ctx, res);
        case 'overview':
          return await handleOverview(ctx, res);
        case 'annual-plan':
          return await handleAnnualPlan(ctx, res, req);
        case 'campaigns':
          return await handleCampaigns(ctx, res);
        case 'campaign':
          return await handleCampaign(ctx, res, req);
        case 'client-actions':
          return await handleClientActions(ctx, res, req);
        case 'shared-tasks':
          return await handleSharedTasks(ctx, res);
        case 'documents':
          return await handleDocuments(ctx, res);
        case 'services':
          return await handleServices(ctx, res);
        case 'pending-actions':
          return await handlePendingActions(ctx, res);
        case 'approvals':
          return await handleApprovals(ctx, res);
        case 'approval-detail':
          return await handleApprovalDetail(ctx, res, req);
        default:
          return json(res, 400, {
            error: 'unknown_route',
            message:
              'Informe ?route=bootstrap|overview|annual-plan|campaigns|campaign|client-actions|complete-client-action|shared-tasks|documents|services|pending-actions|approvals|approval-detail|decide',
          });
      }
    }

    if (req.method === 'POST' && route === 'complete-client-action') {
      return await handleCompleteClientAction(ctx, res, req);
    }

    if (req.method === 'POST' && route === 'decide') {
      const body = readBody(req);
      const approvalId = String(body.approvalId || '').trim();
      const actionRaw = String(body.action || '').trim().toLowerCase();
      const action =
        actionRaw === 'approve' || actionRaw === 'approved'
          ? 'approve'
          : actionRaw === 'reject' || actionRaw === 'rejected'
            ? 'reject'
            : null;
      const comment = String(body.comment || '').trim();

      if (!approvalId || !action) {
        return json(res, 400, {
          error: 'invalid',
          message: 'approvalId e action (approve|reject) são obrigatórios',
        });
      }
      if (action === 'reject' && !comment) {
        return json(res, 400, {
          error: 'comment_required',
          message: 'Informe um comentário ao solicitar ajustes',
        });
      }

      const approval = await getRowSafe(ctx.tables, ctx.databaseId, 'approval_requests', approvalId);
      if (!approval) {
        return json(res, 404, { error: 'not_found', message: 'Aprovação não encontrada' });
      }
      if (approval.agencyId !== ctx.agencyId || approval.clientId !== ctx.clientId) {
        return json(res, 403, { error: 'forbidden', message: 'Aprovação de outro cliente' });
      }
      if (approval.status !== 'pending') {
        return json(res, 409, {
          error: 'not_pending',
          message: `Esta aprovação já está ${approval.status}`,
        });
      }
      if (isExpired(approval)) {
        return json(res, 410, { error: 'expired', message: 'Esta aprovação expirou' });
      }

      const nextStatus = await applyDecision(ctx.tables, ctx.databaseId, {
        approval,
        action,
        comment,
        actorId: ctx.user.$id,
        signatureName: ctx.profile.full_name || ctx.profile.name || null,
      });

      const updated = {
        ...approval,
        status: nextStatus,
        approverComment: comment || null,
      };

      return json(res, 200, {
        ok: true,
        success: true,
        approval: toPortalApprovalDto(updated),
      });
    }

    return json(res, 405, { error: 'method_not_allowed' });
  } catch (err) {
    console.error('[client-portal]', route, err);
    return json(res, 500, {
      error: 'internal_error',
      message: err?.message || 'Erro no portal do cliente',
    });
  }
}
