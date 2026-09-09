/**
 * Backend financeiro Appwrite (TablesDB) — mesma superfície do financeLocalBackend.
 */
import { getTablesDB, DATABASE_ID, ID, Query, Permission, Role } from '@/api/appwriteClient';
import {
  FINANCIAL_TX_COL,
  STUDENT_PAYMENTS_COL,
  FINANCIAL_AUDIT_LOG_COL,
} from '@/lib/appwrite';

function tables() {
  return getTablesDB();
}

function uid(prefix = 'tx') {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

function ymNow() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function rowPerms() {
  return [
    Permission.read(Role.users()),
    Permission.update(Role.users()),
    Permission.delete(Role.users()),
  ];
}

function mapRow(row) {
  if (!row) return null;
  let extra = {};
  if (row.payload) {
    try {
      extra = JSON.parse(row.payload);
    } catch {
      extra = {};
    }
  }
  const { payload, $id, $createdAt, $updatedAt, ...rest } = row;
  return {
    ...extra,
    ...rest,
    id: $id,
    $id,
    created_at: $createdAt,
    updated_at: $updatedAt,
  };
}

function pickKnown(data, keys) {
  const out = {};
  for (const key of keys) {
    if (data[key] !== undefined && data[key] !== null) out[key] = data[key];
  }
  return out;
}

const TX_KEYS = [
  'academyId',
  'agencyId',
  'saleId',
  'lead_id',
  'client_id',
  'method',
  'installments',
  'type',
  'planName',
  'gross',
  'fee',
  'net',
  'amount',
  'status',
  'settledAt',
  'date',
  'competence_month',
  'direction',
  'category',
  'account',
  'bank_account',
  'description',
  'note',
  'origin',
  'origin_type',
  'origin_id',
  'reverses_id',
  'billing_id',
  'created_by',
  'updated_by',
  'recurrence_origin_id',
  'recurrence_type',
  'recurrence_day',
  'recurrence_end',
  'is_recurrence_template',
  'reconciled',
  'reconciled_by',
  'bank_statement_id',
  'due_date',
  'ledger_regime',
  'gateway_provider',
  'gateway_charge_id',
];

const BILL_KEYS = [
  'academy_id',
  'agencyId',
  'lead_id',
  'client_id',
  'amount',
  'paid_amount',
  'expected_amount',
  'method',
  'account',
  'plan_name',
  'status',
  'reference_month',
  'due_date',
  'registered_by',
  'registered_by_name',
  'note',
  'payment_category',
  'bundle_months',
  'bundle_origin_id',
  'financial_tx_id',
  'financial_tx_sync_pending',
  'installments',
  'troco',
  'forma_troco',
  'troco_account',
  'covered_reason',
  'billing_reference_id',
  'capture_method_id',
  'description',
];

function splitData(data, knownKeys) {
  const known = new Set(knownKeys);
  const row = {};
  const extra = {};
  for (const [k, v] of Object.entries(data || {})) {
    if (v === undefined || ['id', '$id', 'created_at', 'updated_at', 'payload'].includes(k)) continue;
    if (known.has(k)) row[k] = v;
    else extra[k] = v;
  }
  if (Object.keys(extra).length) row.payload = JSON.stringify(extra);
  return row;
}

export async function listAppwriteFinanceTx({
  academyId,
  from,
  to,
  direction,
  status,
  limit = 200,
} = {}) {
  const queries = [Query.limit(Math.min(500, Math.max(1, limit)))];
  if (academyId) {
    queries.push(Query.equal('academyId', academyId));
  }
  if (direction) queries.push(Query.equal('direction', direction));
  if (status) queries.push(Query.equal('status', status));
  if (from) queries.push(Query.greaterThanEqual('date', from));
  if (to) queries.push(Query.lessThanEqual('date', to));
  queries.push(Query.orderDesc('date'));

  const res = await tables().listRows({
    databaseId: DATABASE_ID,
    tableId: FINANCIAL_TX_COL,
    queries,
  });
  return {
    transactions: (res.rows || res.documents || []).map(mapRow),
    nextCursor: null,
  };
}

export async function getAppwriteFinanceTx({ academyId, id }) {
  void academyId;
  const row = await tables().getRow({
    databaseId: DATABASE_ID,
    tableId: FINANCIAL_TX_COL,
    rowId: id,
  });
  return mapRow(row);
}

export async function createAppwriteFinanceTx({ academyId, payload }) {
  const amount = Number(payload.amount ?? payload.gross ?? payload.net ?? 0) || 0;
  const data = {
    academyId,
    agencyId: academyId,
    created_at: undefined,
    date: payload.date || new Date().toISOString().slice(0, 10),
    competence_month: payload.competence_month || ymNow(),
    direction: payload.direction || 'in',
    status: payload.status || 'settled',
    description: payload.description || '',
    category: payload.category || '',
    account: payload.account || payload.bank_account_id || 'caixa',
    bank_account: payload.bank_account || payload.account || 'caixa',
    method: payload.method || payload.payment_method || '',
    lead_id: payload.lead_id || payload.client_id || '',
    client_id: payload.client_id || payload.lead_id || '',
    gross: amount,
    fee: Number(payload.fee || 0) || 0,
    net: Number(payload.net ?? amount - (Number(payload.fee || 0) || 0)) || amount,
    amount,
    origin: payload.origin || 'manual',
    ...payload,
  };
  data.academyId = academyId;
  data.agencyId = academyId;

  const rowData = splitData(pickKnown(data, TX_KEYS.concat(Object.keys(payload || {}))), TX_KEYS);
  // ensure core fields present
  Object.assign(rowData, pickKnown(data, TX_KEYS));

  const created = await tables().createRow({
    databaseId: DATABASE_ID,
    tableId: FINANCIAL_TX_COL,
    rowId: ID.unique(),
    data: rowData,
    permissions: rowPerms(),
  });
  return mapRow(created);
}

export async function patchAppwriteFinanceTx({ academyId, id, payload }) {
  void academyId;
  const rowData = splitData(payload, TX_KEYS);
  const updated = await tables().updateRow({
    databaseId: DATABASE_ID,
    tableId: FINANCIAL_TX_COL,
    rowId: id,
    data: rowData,
  });
  return mapRow(updated);
}

export async function reverseAppwriteFinanceTx({ academyId, id, reason }) {
  const original = await patchAppwriteFinanceTx({
    academyId,
    id,
    payload: { status: 'reversed', note: reason || '' },
  });
  const mirror = await createAppwriteFinanceTx({
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

export async function summarizeAppwriteFinance(args) {
  const { transactions } = await listAppwriteFinanceTx({ ...args, limit: 5000 });
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

export async function bankBalancesAppwrite(args) {
  const { transactions } = await listAppwriteFinanceTx({ ...args, limit: 5000 });
  const byAccount = {};
  for (const t of transactions) {
    if (t.status === 'cancelled' || t.status === 'reversed') continue;
    const acc = t.account || t.bank_account || 'caixa';
    if (!byAccount[acc]) byAccount[acc] = { id: acc, name: acc, balance: 0 };
    const net = Number(t.net ?? t.gross ?? 0) || 0;
    byAccount[acc].balance += t.direction === 'out' ? -net : net;
  }
  return { accounts: Object.values(byAccount) };
}

export async function listAppwriteClientBillings({ academyId, month } = {}) {
  const queries = [Query.limit(500)];
  if (academyId) queries.push(Query.equal('academy_id', academyId));
  if (month) queries.push(Query.equal('reference_month', month));
  queries.push(Query.orderDesc('$createdAt'));

  const res = await tables().listRows({
    databaseId: DATABASE_ID,
    tableId: STUDENT_PAYMENTS_COL,
    queries,
  });
  const payments = (res.rows || res.documents || []).map(mapRow);
  return { payments, items: payments };
}

export async function createAppwriteClientBilling({ academyId, payload }) {
  const data = {
    academy_id: academyId,
    agencyId: academyId,
    status: payload.status || 'paid',
    reference_month: payload.reference_month || ymNow(),
    amount: Number(payload.amount || 0) || 0,
    lead_id: payload.lead_id || payload.client_id || '',
    client_id: payload.client_id || payload.lead_id || '',
    plan_name: payload.plan_name || '',
    method: payload.method || 'pix',
    ...payload,
  };
  data.academy_id = academyId;
  data.agencyId = academyId;

  const rowData = splitData(data, BILL_KEYS);
  Object.assign(rowData, pickKnown(data, BILL_KEYS));

  const created = await tables().createRow({
    databaseId: DATABASE_ID,
    tableId: STUDENT_PAYMENTS_COL,
    rowId: ID.unique(),
    data: rowData,
    permissions: rowPerms(),
  });
  let payment = mapRow(created);

  if (payment.status === 'paid' || payment.status === 'settled') {
    const tx = await createAppwriteFinanceTx({
      academyId,
      payload: {
        direction: 'in',
        status: 'settled',
        description: payload.description || `Cobrança ${payment.plan_name || ''}`.trim(),
        amount: payment.amount,
        gross: payment.amount,
        lead_id: payment.lead_id,
        client_id: payment.client_id || payment.lead_id,
        origin: 'client_billing',
        origin_type: 'client_service_payment',
        billing_id: payment.id,
        method: payment.method,
        competence_month: payment.reference_month,
      },
    });
    payment = await updateAppwriteClientBilling({
      academyId,
      id: payment.id,
      payload: { financial_tx_id: tx.id },
    });
  }

  return payment;
}

export async function updateAppwriteClientBilling({ academyId, id, payload }) {
  void academyId;
  const rowData = splitData(payload, BILL_KEYS);
  const updated = await tables().updateRow({
    databaseId: DATABASE_ID,
    tableId: STUDENT_PAYMENTS_COL,
    rowId: id,
    data: rowData,
  });
  return mapRow(updated);
}

export async function deleteAppwriteClientBilling({ academyId, id }) {
  void academyId;
  await tables().deleteRow({
    databaseId: DATABASE_ID,
    tableId: STUDENT_PAYMENTS_COL,
    rowId: id,
  });
  return { ok: true };
}

export async function getAppwriteClosing({ academyId, month }) {
  const queries = [
    Query.equal('academy_id', academyId),
    Query.equal('entity_type', 'cash_closing'),
    Query.equal('entity_id', String(month || '')),
    Query.limit(1),
  ];
  const res = await tables().listRows({
    databaseId: DATABASE_ID,
    tableId: FINANCIAL_AUDIT_LOG_COL,
    queries,
  });
  const row = (res.rows || res.documents || [])[0];
  if (!row) return { month, status: 'open', closed: false };
  const mapped = mapRow(row);
  return {
    month,
    status: mapped.status || (mapped.closed ? 'closed' : 'open'),
    closed: Boolean(mapped.closed),
    ...mapped,
  };
}

export async function setAppwriteClosing({ academyId, month, payload }) {
  const queries = [
    Query.equal('academy_id', academyId),
    Query.equal('entity_type', 'cash_closing'),
    Query.equal('entity_id', String(month || '')),
    Query.limit(1),
  ];
  const res = await tables().listRows({
    databaseId: DATABASE_ID,
    tableId: FINANCIAL_AUDIT_LOG_COL,
    queries,
  });
  const existing = (res.rows || res.documents || [])[0];
  const data = {
    academy_id: academyId,
    agencyId: academyId,
    action: 'cash_closing',
    entity_type: 'cash_closing',
    entity_id: String(month || ''),
    payload: JSON.stringify({
      month,
      status: payload?.status || (payload?.closed ? 'closed' : 'open'),
      closed: Boolean(payload?.closed ?? payload?.status === 'closed'),
      ...(payload || {}),
      updated_at: new Date().toISOString(),
    }),
  };

  if (existing?.$id) {
    const updated = await tables().updateRow({
      databaseId: DATABASE_ID,
      tableId: FINANCIAL_AUDIT_LOG_COL,
      rowId: existing.$id,
      data,
    });
    return mapRow(updated);
  }

  const created = await tables().createRow({
    databaseId: DATABASE_ID,
    tableId: FINANCIAL_AUDIT_LOG_COL,
    rowId: ID.unique(),
    data,
    permissions: rowPerms(),
  });
  return mapRow(created);
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

export async function overviewAppwrite({ academyId, month }) {
  const from = `${month}-01`;
  const to = `${month}-31`;
  const summary = await summarizeAppwriteFinance({ academyId, from, to });
  const billings = await listAppwriteClientBillings({ academyId, month });
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

export async function dreAppwrite(args) {
  const rangeFrom = args.from || (args.month ? `${args.month}-01` : undefined);
  const rangeTo = args.to || (args.month ? `${args.month}-31` : undefined);
  const summary = await summarizeAppwriteFinance({
    academyId: args.academyId,
    from: rangeFrom,
    to: rangeTo,
  });
  return {
    month: args.month || null,
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

export async function dfcAppwrite(args) {
  const dre = await dreAppwrite(args);
  return { ...dre, operacional: dre.resultado, investimento: 0, financiamento: 0 };
}

/** Detecta se Appwrite financeiro está configurado no client. */
export function isFinanceAppwriteConfigured() {
  try {
    return Boolean(
      import.meta.env.VITE_APPWRITE_ENDPOINT &&
        import.meta.env.VITE_APPWRITE_PROJECT_ID &&
        import.meta.env.VITE_APPWRITE_DATABASE_ID &&
        FINANCIAL_TX_COL &&
        STUDENT_PAYMENTS_COL
    );
  } catch {
    return false;
  }
}

export { uid };
