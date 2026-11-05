/**
 * Contagem e lista de aprovações pendentes da agência (ApprovalRequest.pending).
 */

import { ApprovalRequest } from '@/api/entities';
import { createPageUrl } from '@/utils';

/**
 * @param {string} agencyId
 * @returns {Promise<{ count: number, requests: object[], reliable: boolean }>}
 */
export async function fetchPendingApprovals(agencyId) {
  if (!agencyId) {
    return { count: 0, requests: [], reliable: false };
  }

  try {
    const rows = await ApprovalRequest.filter(
      { agencyId, status: 'pending' },
      '-updated_date',
      50
    );
    const requests = Array.isArray(rows) ? rows : [];
    return { count: requests.length, requests, reliable: true };
  } catch (err) {
    console.warn('[pendingApprovals] ApprovalRequest filter failed:', err?.message || err);
    return { count: 0, requests: [], reliable: false };
  }
}

/**
 * Normaliza itens para a UI do approval-dashboard.
 * @param {{ requests: object[] }} data
 */
export function mapPendingApprovalsForDashboard({ requests = [] } = {}) {
  return requests
    .map((req) => ({
      id: req.id,
      title: req.title || req.contentTitle || 'Solicitação de aprovação',
      contentType: req.contentType || 'approval',
      status: req.status === 'pending' ? 'pending' : req.status,
      approverName: req.approverName || req.approver_name || 'Aprovador',
      approverEmail: req.approverEmail || req.approver_email || '',
      created_date: req.created_date || req.$createdAt,
      expiresAt: req.expiresAt || req.expires_at || null,
      href: req.contentId
        ? createPageUrl(`approval-dashboard?approvalId=${encodeURIComponent(req.id)}`)
        : createPageUrl('approval-dashboard'),
      pdfUrl: req.pdfUrl || req.approvalData?.pdfUrl || null,
      source: 'request',
    }))
    .sort((a, b) => {
      const ta = a.created_date ? new Date(a.created_date).getTime() : 0;
      const tb = b.created_date ? new Date(b.created_date).getTime() : 0;
      return tb - ta;
    });
}
