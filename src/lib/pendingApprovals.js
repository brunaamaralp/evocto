/**
 * Contagem e lista de aprovações pendentes da agência.
 * Fontes reais já usadas no produto: CyclePlan.pending_approval + ApprovalRequest.pending.
 */

import { CyclePlan } from '@/api/entities';
import { ApprovalRequest } from '@/api/entities';
import { createPageUrl } from '@/utils';
import { staffCycleApprovalHref } from '@/lib/cycleApprovalLegacy';

/**
 * @param {string} agencyId
 * @returns {Promise<{ count: number, cycles: object[], requests: object[], reliable: boolean }>}
 */
export async function fetchPendingApprovals(agencyId) {
  if (!agencyId) {
    return { count: 0, cycles: [], requests: [], reliable: false };
  }

  let cycles = [];
  let requests = [];
  let cyclesOk = false;
  let requestsOk = false;

  try {
    const rows = await CyclePlan.filter(
      { agencyId, status: 'pending_approval' },
      '-updated_date',
      50
    );
    cycles = Array.isArray(rows) ? rows : [];
    cyclesOk = true;
  } catch (err) {
    console.warn('[pendingApprovals] CyclePlan filter failed:', err?.message || err);
  }

  try {
    const rows = await ApprovalRequest.filter(
      { agencyId, status: 'pending' },
      '-updated_date',
      50
    );
    requests = Array.isArray(rows) ? rows : [];
    requestsOk = true;
  } catch (err) {
    console.warn('[pendingApprovals] ApprovalRequest filter failed:', err?.message || err);
  }

  return {
    count: cycles.length + requests.length,
    cycles,
    requests,
    /** Confiável se ao menos uma fonte respondeu com sucesso. */
    reliable: cyclesOk || requestsOk,
  };
}

/**
 * Normaliza itens para a UI do approval-dashboard.
 * @param {{ cycles: object[], requests: object[] }} data
 */
export function mapPendingApprovalsForDashboard({ cycles = [], requests = [] } = {}) {
  const fromCycles = cycles.map((cycle) => ({
    id: cycle.id,
    title:
      cycle.cyclePeriod ||
      cycle.title ||
      cycle.planData?.title ||
      'Plano aguardando aprovação',
    contentType: 'cycle_plan',
    status: 'pending',
    approverName: cycle.clientName || 'Cliente',
    approverEmail: cycle.approverEmail || '',
    created_date: cycle.created_date || cycle.$createdAt || cycle.updated_date,
    expiresAt: cycle.approval_due_at || cycle.expiresAt || null,
    href: staffCycleApprovalHref(cycle.id, createPageUrl),
    pdfUrl: cycle.approvalData?.pdfUrl || cycle.pdfUrl || null,
    source: 'cycle',
  }));

  const fromRequests = requests.map((req) => ({
    id: req.id,
    title: req.title || req.contentTitle || 'Solicitação de aprovação',
    contentType: req.contentType || 'approval',
    status: req.status === 'pending' ? 'pending' : req.status,
    approverName: req.approverName || req.approver_name || 'Aprovador',
    approverEmail: req.approverEmail || req.approver_email || '',
    created_date: req.created_date || req.$createdAt,
    expiresAt: req.expiresAt || req.expires_at || null,
    href: req.contentId
      ? createPageUrl(
          `approval-dashboard?approvalId=${encodeURIComponent(req.id)}`
        )
      : createPageUrl('approval-dashboard'),
    pdfUrl: req.pdfUrl || req.approvalData?.pdfUrl || null,
    source: 'request',
  }));

  return [...fromCycles, ...fromRequests].sort((a, b) => {
    const ta = a.created_date ? new Date(a.created_date).getTime() : 0;
    const tb = b.created_date ? new Date(b.created_date).getTime() : 0;
    return tb - ta;
  });
}
