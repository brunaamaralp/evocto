/**
 * Backend financeiro local (localStorage) — substitui as serverless APIs do Nave no Evocto.
 * Mesmo contrato de dados (financial_tx + client_billings) para a UI copiada funcionar.
 */

const TX_KEY = (agencyId) => `evocto.financial_tx.${agencyId}`;
const PAY_KEY = (agencyId) => `evocto.client_billings.${agencyId}`;
const CLOSING_KEY = (agencyId) => `evocto.cash_closing.${agencyId}`;

function read(key, fallback = []) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw);
    return parsed ?? fallback;
  } catch {
    return fallback;
  }
}

function write(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

function uid(prefix = 'tx') {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

function ymNow() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function inRange(ymd, from, to) {
  if (!ymd) return true;
  if (from && ymd < from) return false;
  if (to && ymd > to) return false;
  return true;
}

export function listLocalFinanceTx({ agencyId, from, to, direction, status, limit = 200 }) {
  let rows = read(TX_KEY(agencyId), []);
  if (direction) rows = rows.filter((r) => r.direction === direction);
  if (status) rows = rows.filter((r) => r.status === status);
  if (from || to) {
    rows = rows.filter((r) => inRange(r.date || r.competence_date || r.created_at?.slice?.(0, 10), from, to));
  }
  rows = [...rows].sort((a, b) => String(b.date || '').localeCompare(String(a.date || '')));
  if (limit) rows = rows.slice(0, limit);
  return { transactions: rows, nextCursor: null };
}

export function getLocalFinanceTx({ academyId, id }) {
  const rows = read(TX_KEY(agencyId), []);
  return rows.find((r) => r.id === id) || null;
}

export function createLocalFinanceTx({ academyId, payload }) {
  const rows = read(TX_KEY(academyId), []);
  const amount = Number(payload.amount ?? payload.gross ?? payload.net ?? 0) || 0;
  const tx = {
    id: uid('tx'),
    academyId,
    agencyId: academyId,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    date: payload.date || new Date().toISOString().slice(0, 10),
    competence_month: payload.competence_month || ymNow(),
    direction: payload.direction || 'in',
    status: payload.status || 'settled',
    description: payload.description || '',
    category: payload.category || '',
    account: payload.account || payload.bank_account_id || 'caixa',
    method: payload.method || payload.payment_method || '',
    lead_id: payload.lead_id || payload.client_id || '',
    gross: amount,
    fee: Number(payload.fee || 0) || 0,
    net: Number(payload.net ?? amount - (Number(payload.fee || 0) || 0)) || amount,
    origin: payload.origin || 'manual',
    ...payload,
  };
  rows.unshift(tx);
  write(TX_KEY(academyId), rows);
  return tx;
}

export function patchLocalFinanceTx({ academyId, id, payload }) {
  const rows = read(TX_KEY(academyId), []);
  const idx = rows.findIndex((r) => r.id === id);
  if (idx < 0) throw new Error('Lançamento não encontrado');
  const next = {
    ...rows[idx],
    ...payload,
    updated_at: new Date().toISOString(),
  };
  rows[idx] = next;
  write(TX_KEY(academyId), rows);
  return next;
}

export function reverseLocalFinanceTx({ academyId, id, reason }) {
  const original = patchLocalFinanceTx({
    academyId,
    id,
    payload: { status: 'reversed', reverse_reason: reason || '' },
  });
  const mirror = createLocalFinanceTx({
    academyId,
    payload: {
      ...original,
      id: undefined,
      direction: original.direction === 'in' ? 'out' : 'in',
      status: 'settled',
      description: `Estorno: ${original.description || id}`,
      origin: 'reversal',
      reverses_id: id,
    },
  });
  return { original, mirror };
}

export function summarizeLocalFinance({ academyId, from, to }) {
  const { transactions } = listLocalFinanceTx({ academyId, from, to, limit: 5000 });
  let inflow = 0;
  let outflow = 0;
  for (const t of transactions) {
    if (t.status === 'cancelled' || t.status === 'reversed') continue;
    const net = Number(t.net ?? t.gross ?? t.amount ?? 0) || 0;
    if (t.direction === 'out') outflow += net;
    else inflow += net;
  }
  return {
    inflow,
    outflow,
    balance: inflow - outflow,
    count: transactions.length,
    transactions,
  };
}

export function bankBalancesLocal({ academyId }) {
  const { transactions } = listLocalFinanceTx({ academyId, limit: 5000 });
  const byAccount = {};
  for (const t of transactions) {
    if (t.status === 'cancelled' || t.status === 'reversed') continue;
    const acc = t.account || 'caixa';
    if (!byAccount[acc]) byAccount[acc] = { id: acc, name: acc, balance: 0 };
    const net = Number(t.net ?? t.gross ?? 0) || 0;
    byAccount[acc].balance += t.direction === 'out' ? -net : net;
  }
  return { accounts: Object.values(byAccount) };
}

export function listLocalClientBillings({ academyId, month }) {
  let rows = read(PAY_KEY(academyId), []);
  if (month) rows = rows.filter((r) => r.reference_month === month);
  return { payments: rows, items: rows };
}

export function createLocalClientBilling({ academyId, payload }) {
  const rows = read(PAY_KEY(academyId), []);
  const payment = {
    id: uid('bill'),
    academy_id: academyId,
    agencyId: academyId,
    created_at: new Date().toISOString(),
    status: payload.status || 'paid',
    reference_month: payload.reference_month || ymNow(),
    amount: Number(payload.amount || 0) || 0,
    lead_id: payload.lead_id || payload.client_id || '',
    plan_name: payload.plan_name || '',
    method: payload.method || 'pix',
    ...payload,
  };
  rows.unshift(payment);
  write(PAY_KEY(academyId), rows);

  // Mirror to caixa when paid
  if (payment.status === 'paid' || payment.status === 'settled') {
    const tx = createLocalFinanceTx({
      academyId,
      payload: {
        direction: 'in',
        status: 'settled',
        description: payload.description || `Cobrança ${payment.plan_name || ''}`.trim(),
        amount: payment.amount,
        gross: payment.amount,
        lead_id: payment.lead_id,
        origin: 'client_billing',
        billing_id: payment.id,
        method: payment.method,
        competence_month: payment.reference_month,
      },
    });
    payment.financial_tx_id = tx.id;
    write(PAY_KEY(academyId), rows);
  }
  return payment;
}

export function overviewLocal({ academyId, month }) {
  const from = `${month}-01`;
  const to = `${month}-31`;
  const summary = summarizeLocalFinance({ academyId, from, to });
  const billings = listLocalClientBillings({ academyId, month });
  return {
    month,
    summary,
    receivables: {
      open: billings.payments.filter((p) => p.status === 'open' || p.status === 'pending').length,
      paid: billings.payments.filter((p) => p.status === 'paid').length,
    },
    payables: { open: 0, overdue: 0 },
  };
}

export function dreLocal({ academyId, month, from, to }) {
  const rangeFrom = from || (month ? `${month}-01` : undefined);
  const rangeTo = to || (month ? `${month}-31` : undefined);
  const summary = summarizeLocalFinance({ academyId, from: rangeFrom, to: rangeTo });
  return {
    month: month || null,
    receita: summary.inflow,
    despesa: summary.outflow,
    resultado: summary.balance,
    lines: [
      { key: 'receita', label: 'Receitas', amount: summary.inflow },
      { key: 'despesa', label: 'Despesas', amount: summary.outflow },
      { key: 'resultado', label: 'Resultado', amount: summary.balance },
    ],
  };
}

export function dfcLocal(args) {
  const dre = dreLocal(args);
  return {
    ...dre,
    operacional: dre.resultado,
    investimento: 0,
    financiamento: 0,
  };
}

export function getLocalClosing({ academyId, month }) {
  const all = read(CLOSING_KEY(academyId), {});
  return all[month] || { month, status: 'open', closed: false };
}

export function setLocalClosing({ academyId, month, payload }) {
  const all = read(CLOSING_KEY(academyId), {});
  all[month] = { month, ...payload, updated_at: new Date().toISOString() };
  write(CLOSING_KEY(academyId), all);
  return all[month];
}

export function emptyPayables() {
  return { items: [], payables: [], overdueCount: 0, totalOpen: 0 };
}

export function emptyForecast() {
  return { months: [], items: [], contracts: [] };
}

export function emptyReconciliation() {
  return { statements: [], items: [], pairs: [], orphans: [] };
}
