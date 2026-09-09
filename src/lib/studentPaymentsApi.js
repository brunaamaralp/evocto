/**
 * API de cobranças de serviço — exclusivamente Appwrite TablesDB.
 */
import {
  listAppwriteClientBillings,
  createAppwriteClientBilling,
  updateAppwriteClientBilling,
  deleteAppwriteClientBilling,
  isFinanceAppwriteConfigured,
} from './financeAppwriteBackend.js';
import { notifyPaymentSettlementAfterCreate } from './financeTxSettlementDisplay.js';

export class StudentPaymentsApiError extends Error {
  constructor(message, { status } = {}) {
    super(message);
    this.name = 'StudentPaymentsApiError';
    this.status = status;
  }
}

function requireAppwrite() {
  if (!isFinanceAppwriteConfigured()) {
    throw new StudentPaymentsApiError(
      'Appwrite financeiro não configurado. Rode npm run appwrite:setup-finance e reinicie o dev server.',
      { status: 503 }
    );
  }
}

function dispatchPaymentUpdated(payload) {
  if (typeof window === 'undefined') return;
  const leadId = String(payload?.lead_id || '').trim();
  const referenceMonth = String(payload?.reference_month || '').trim();
  window.dispatchEvent(
    new CustomEvent('navi-student-payment-updated', {
      detail: { leadId, referenceMonth },
    })
  );
  window.dispatchEvent(new CustomEvent('navi-financial-tx-settled'));
}

export async function apiListStudentPayments({
  referenceMonth,
  month,
  page = 1,
  limit = 100,
  academyId,
} = {}) {
  requireAppwrite();
  const aid = String(academyId || '').trim();
  if (!aid) throw new StudentPaymentsApiError('academy_required', { status: 400 });
  const ym = String(referenceMonth || month || '').trim();

  const { payments } = await listAppwriteClientBillings({
    academyId: aid,
    month: ym || undefined,
  });
  const size = Math.min(500, Math.max(1, Number(limit) || 100));
  const p = Math.max(1, Number(page) || 1);
  const start = (p - 1) * size;
  const slice = (payments || []).slice(start, start + size);
  return {
    payments: slice,
    next_cursor: start + size < (payments || []).length ? String(p + 1) : null,
  };
}

export async function apiCreateStudentPayment(payload, opts = {}) {
  requireAppwrite();
  const aid = String(payload?.academy_id || opts.academyId || '').trim();
  if (!aid) throw new StudentPaymentsApiError('academy_required', { status: 400 });
  if (!payload?.lead_id) throw new StudentPaymentsApiError('lead_id_required', { status: 400 });

  const payment = await createAppwriteClientBilling({
    academyId: aid,
    payload: {
      ...payload,
      academy_id: aid,
      client_id: payload.lead_id,
    },
  });
  dispatchPaymentUpdated(payload);
  try {
    notifyPaymentSettlementAfterCreate(payment, payload, opts);
  } catch {
    /* optional */
  }
  return payment;
}

export async function apiUpdateStudentPayment(paymentId, patch, opts = {}) {
  requireAppwrite();
  const id = String(paymentId || '').trim();
  const aid = String(patch?.academy_id || opts.academyId || '').trim();
  if (!id || !aid) throw new StudentPaymentsApiError('id_and_academy_required', { status: 400 });

  const payment = await updateAppwriteClientBilling({
    academyId: aid,
    id,
    payload: patch,
  });
  dispatchPaymentUpdated(patch);
  return payment;
}

export async function apiDeleteStudentPayment(paymentId, academyId) {
  requireAppwrite();
  const id = String(paymentId || '').trim();
  const aid = String(academyId || '').trim();
  if (!id || !aid) throw new StudentPaymentsApiError('id_and_academy_required', { status: 400 });
  return deleteAppwriteClientBilling({ academyId: aid, id });
}

export async function apiCreateHistoricalCoverage(payload) {
  const payment = await apiCreateStudentPayment({
    ...payload,
    payment_category: 'bundle',
    amount: 0,
    status: 'covered',
    covered_reason: 'historical',
  });
  return { payment, monthsCreated: 1, monthsSkipped: 0 };
}

export async function apiSnoozeCollectionRegua() {
  return { ok: true };
}

export const createStudentPayment = apiCreateStudentPayment;
export const listStudentPayments = apiListStudentPayments;
export const updateStudentPayment = apiUpdateStudentPayment;
export const createPayment = apiCreateStudentPayment;
export const listPayments = apiListStudentPayments;
