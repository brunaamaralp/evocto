/**
 * Ações do approval-dashboard reutilizando APIs já existentes (Fase C restante).
 * Sem alteração de schema Appwrite.
 */

import { ApprovalRequest, CyclePlan } from '@/api/entities';
import { approvalWorkflow } from '@/api/functions';

/**
 * Reenvia notificação de aprovação pendente.
 * @param {{ id: string, source?: string }} approval
 */
export async function resendPendingApproval(approval) {
  if (!approval?.id) throw new Error('Aprovação inválida');

  if (approval.source === 'cycle') {
    // Ciclos: tenta achar ApprovalRequest vinculada; senão o fluxo canônico é o ciclo.
    try {
      const linked = await ApprovalRequest.filter(
        { status: 'pending' },
        '-updated_date',
        30
      );
      const match = (Array.isArray(linked) ? linked : []).find(
        (r) =>
          r.contentId === approval.id ||
          r.cyclePlanId === approval.id ||
          r.cycleId === approval.id
      );
      if (match?.id) {
        const { data, status } = await approvalWorkflow({
          action: 'notify',
          approvalId: match.id,
        });
        if (status !== 200 || data?.success === false) {
          throw new Error(data?.error || 'Falha ao reenviar notificação');
        }
        return { mode: 'notify', approvalId: match.id };
      }
    } catch (err) {
      if (err?.message?.includes('Falha')) throw err;
    }
    return { mode: 'open_cycle', href: approval.href };
  }

  const { data, status } = await approvalWorkflow({
    action: 'notify',
    approvalId: approval.id,
  });
  if (status !== 200 || data?.success === false) {
    throw new Error(data?.error || 'Falha ao reenviar notificação');
  }
  return { mode: 'notify', approvalId: approval.id };
}

/**
 * Revoga solicitação pendente (ApprovalRequest) ou devolve ciclo a draft.
 * @param {{ id: string, source?: string }} approval
 */
export async function revokePendingApproval(approval) {
  if (!approval?.id) throw new Error('Aprovação inválida');

  if (approval.source === 'cycle') {
    await CyclePlan.update(approval.id, { status: 'draft' });
    return { mode: 'cycle_draft' };
  }

  await ApprovalRequest.update(approval.id, { status: 'revoked' });
  return { mode: 'request_revoked' };
}

/**
 * Abre PDF se a linha tiver url conhecida.
 * @param {{ pdfUrl?: string|null }} approval
 * @returns {'opened'|'missing'}
 */
export function downloadApprovalPdf(approval) {
  const url = approval?.pdfUrl;
  if (url && typeof url === 'string') {
    window.open(url, '_blank', 'noopener,noreferrer');
    return 'opened';
  }
  return 'missing';
}
