/**
 * Client API do hub financeiro — exclusivamente Appwrite TablesDB (API real).
 */
import * as remote from './financeAppwriteBackend.js';
import { fetchFinanceHubCached, financeHubCacheKey } from './financeHubCache.js';

function requireAppwrite() {
  if (!remote.isFinanceAppwriteConfigured()) {
    throw new Error(
      'Appwrite financeiro não configurado. Defina VITE_APPWRITE_ENDPOINT, VITE_APPWRITE_PROJECT_ID, VITE_APPWRITE_DATABASE_ID e rode npm run appwrite:setup-finance.'
    );
  }
}

export async function listFinanceTx(args) {
  requireAppwrite();
  return remote.listAppwriteFinanceTx(args);
}

export async function getFinanceTx(args) {
  requireAppwrite();
  return remote.getAppwriteFinanceTx(args);
}

export async function createFinanceTx(args) {
  requireAppwrite();
  return remote.createAppwriteFinanceTx(args);
}

export async function patchFinanceTx(args) {
  requireAppwrite();
  return remote.patchAppwriteFinanceTx(args);
}

export async function reverseFinanceTx(args) {
  requireAppwrite();
  return remote.reverseAppwriteFinanceTx(args);
}

export async function fetchBankBalances(args) {
  requireAppwrite();
  return remote.bankBalancesAppwrite(args);
}

export async function fetchFinanceDre(args) {
  requireAppwrite();
  return remote.dreAppwrite(args);
}

export async function fetchFinanceDfc(args) {
  requireAppwrite();
  return remote.dfcAppwrite(args);
}

export async function fetchFinanceCascade(args) {
  const dfc = await fetchFinanceDfc(args);
  return { ...dfc, cascade: [] };
}

export async function fetchFinanceSummary(args) {
  requireAppwrite();
  return remote.summarizeAppwriteFinance(args);
}

export async function fetchMonthlyClosing({ academyId, month }) {
  requireAppwrite();
  return remote.getAppwriteClosing({ academyId, month });
}

export async function saveMonthlyClosing(args) {
  requireAppwrite();
  return remote.setAppwriteClosing(args);
}

export async function fetchFinanceOverview(args) {
  requireAppwrite();
  return remote.overviewAppwrite(args);
}

export async function fetchPayables() {
  return remote.emptyPayables();
}

export async function fetchPayablesCached(args) {
  const key = financeHubCacheKey(['payables', args?.academyId]);
  return fetchFinanceHubCached(key, async () => remote.emptyPayables());
}

export async function fetchForecast() {
  return remote.emptyForecast();
}

export async function fetchReceivables({ academyId, month }) {
  requireAppwrite();
  const billings = await remote.listAppwriteClientBillings({ academyId, month });
  return {
    items: (billings.payments || []).map((p) => ({
      id: p.id,
      source: 'mensalidade',
      status: p.status,
      amount: p.amount,
      lead_id: p.lead_id,
      client_id: p.lead_id || p.client_id,
      reference_month: p.reference_month,
      description: p.description || p.plan_name || 'Cobrança de serviço',
      ...p,
    })),
  };
}

export async function fetchCollectionQueue() {
  return { items: [] };
}

export async function listBankReconciliation() {
  return remote.emptyReconciliation();
}

export async function createStudentPayment(args) {
  requireAppwrite();
  return remote.createAppwriteClientBilling(args);
}

export async function listStudentPayments(args) {
  requireAppwrite();
  return remote.listAppwriteClientBillings(args);
}

export async function fetchFinanceOverviewCached(args) {
  const key = financeHubCacheKey(['overview', args?.academyId, args?.month]);
  return fetchFinanceHubCached(key, () => fetchFinanceOverview(args));
}

export async function fetchReceivablesCached(args) {
  const key = financeHubCacheKey(['receivables', args?.academyId, args?.month]);
  return fetchFinanceHubCached(key, () => fetchReceivables(args));
}

export async function fetchFinanceForecast() {
  return remote.emptyForecast();
}

export async function recordCashClosing(args) {
  requireAppwrite();
  return remote.setAppwriteClosing({
    academyId: args?.academyId,
    month: args?.month,
    payload: { ...(args || {}), status: 'closed', closed: true },
  });
}

export async function reconcileStudentPaymentMirrors() {
  return { ok: true, fixed: 0, checked: 0 };
}

export async function anticipateFinanceTx({ academyId, id, payload } = {}) {
  return patchFinanceTx({
    academyId,
    id,
    payload: { ...(payload || {}), anticipated: true, status: 'settled' },
  });
}

export const fetchFinanceTx = listFinanceTx;
export const createFinanceTransaction = createFinanceTx;
export const updateFinanceTransaction = patchFinanceTx;
