/**
 * Ações do approval-dashboard reutilizando APIs já existentes.
 * Sem alteração de schema Appwrite.
 */

import { ApprovalRequest } from '@/api/entities';
import { approvalWorkflow } from '@/api/functions';

/**
 * Reenvia notificação de aprovação pendente.
 * @param {{ id: string }} approval
 */
export async function resendPendingApproval(approval) {
  if (!approval?.id) throw new Error('Aprovação inválida');

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
 * Revoga solicitação pendente (ApprovalRequest).
 * @param {{ id: string }} approval
 */
export async function revokePendingApproval(approval) {
  if (!approval?.id) throw new Error('Aprovação inválida');

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
