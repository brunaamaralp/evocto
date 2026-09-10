/**
 * API do Financeiro Agência — Appwrite TablesDB (af_charges, af_payables, af_cash).
 */
import { getTablesDB, DATABASE_ID, ID, Query, Permission, Role } from '@/api/appwriteClient';
import { ymNow, todayYmd, monthBounds, buildPayableInstallments } from './constants.js';

export const AF_CHARGES =
  import.meta.env.VITE_APPWRITE_AF_CHARGES_COLLECTION_ID || 'af_charges';
export const AF_PAYABLES =
  import.meta.env.VITE_APPWRITE_AF_PAYABLES_COLLECTION_ID || 'af_payables';
export const AF_CASH =
  import.meta.env.VITE_APPWRITE_AF_CASH_COLLECTION_ID || 'af_cash';

function db() {
  return getTablesDB();
}

function perms() {
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
    createdAt: $createdAt,
    updatedAt: $updatedAt,
  };
}

function assertAgency(agencyId) {
  const id = String(agencyId || '').trim();
  if (!id) throw new Error('agencyId_obrigatorio');
  return id;
}

function knownSplit(data, keys) {
  const known = new Set(keys);
  const row = {};
  const extra = {};
  for (const [k, v] of Object.entries(data || {})) {
    if (v === undefined || ['id', '$id', 'createdAt', 'updatedAt', 'payload'].includes(k)) continue;
    if (known.has(k)) row[k] = v;
    else extra[k] = v;
  }
  if (Object.keys(extra).length) row.payload = JSON.stringify(extra);
  return row;
}

const CHARGE_KEYS = [
  'agencyId',
  'clientId',
  'clientName',
  'serviceId',
  'type',
  'description',
  'amount',
  'status',
  'dueDate',
  'competenceMonth',
  'paidAt',
  'method',
  'cashId',
  'note',
];

const PAYABLE_KEYS = [
  'agencyId',
  'vendorName',
  'category',
  'description',
  'amount',
  'status',
  'dueDate',
  'competenceMonth',
  'paidAt',
  'method',
  'cashId',
  'note',
];

const CASH_KEYS = [
  'agencyId',
  'direction',
  'amount',
  'date',
  'competenceMonth',
  'category',
  'description',
  'method',
  'account',
  'status',
  'refType',
  'refId',
  'clientId',
  'note',
];

/* ─── Cash ─────────────────────────────────────────────── */

export async function listCash({ agencyId, month, direction, limit = 200 } = {}) {
  const aid = assertAgency(agencyId);
  const queries = [Query.equal('agencyId', aid), Query.limit(Math.min(500, limit)), Query.orderDesc('date')];
  if (month) queries.push(Query.equal('competenceMonth', month));
  if (direction) queries.push(Query.equal('direction', direction));
  const res = await db().listRows({ databaseId: DATABASE_ID, tableId: AF_CASH, queries });
  return (res.rows || []).map(mapRow).filter((r) => r.status !== 'reversed');
}

export async function createCash({ agencyId, payload }) {
  const aid = assertAgency(agencyId);
  const amount = Number(payload.amount) || 0;
  if (amount <= 0) throw new Error('valor_invalido');
  const data = knownSplit(
    {
      agencyId: aid,
      direction: payload.direction === 'out' ? 'out' : 'in',
      amount,
      date: payload.date || todayYmd(),
      competenceMonth: payload.competenceMonth || ymNow(),
      category: payload.category || 'outro',
      description: payload.description || '',
      method: payload.method || 'pix',
      account: payload.account || 'caixa',
      status: payload.status || 'settled',
      refType: payload.refType || 'manual',
      refId: payload.refId || '',
      clientId: payload.clientId || '',
      note: payload.note || '',
    },
    CASH_KEYS
  );
  const row = await db().createRow({
    databaseId: DATABASE_ID,
    tableId: AF_CASH,
    rowId: ID.unique(),
    data,
    permissions: perms(),
  });
  return mapRow(row);
}

export async function reverseCash({ agencyId, id }) {
  assertAgency(agencyId);
  const existing = mapRow(
    await db().getRow({ databaseId: DATABASE_ID, tableId: AF_CASH, rowId: id })
  );
  await db().updateRow({
    databaseId: DATABASE_ID,
    tableId: AF_CASH,
    rowId: id,
    data: { status: 'reversed' },
  });
  return existing;
}

/* ─── Charges ──────────────────────────────────────────── */

export async function listCharges({ agencyId, month, status, clientId, limit = 200 } = {}) {
  const aid = assertAgency(agencyId);
  const queries = [
    Query.equal('agencyId', aid),
    Query.limit(Math.min(500, limit)),
    Query.orderDesc('dueDate'),
  ];
  if (clientId) queries.push(Query.equal('clientId', String(clientId)));
  if (month) queries.push(Query.equal('competenceMonth', month));
  if (status) queries.push(Query.equal('status', status));
  const res = await db().listRows({ databaseId: DATABASE_ID, tableId: AF_CHARGES, queries });
  return (res.rows || []).map(mapRow);
}

export async function createCharge({ agencyId, payload }) {
  const aid = assertAgency(agencyId);
  const amount = Number(payload.amount) || 0;
  if (amount <= 0) throw new Error('valor_invalido');
  if (!payload.clientId) throw new Error('cliente_obrigatorio');

  const data = knownSplit(
    {
      agencyId: aid,
      clientId: payload.clientId,
      clientName: payload.clientName || '',
      serviceId: payload.serviceId || '',
      type: payload.type === 'retainer' ? 'recorrente' : payload.type || 'recorrente',
      description: payload.description || '',
      amount,
      status: payload.status || 'open',
      dueDate: payload.dueDate || todayYmd(),
      competenceMonth: payload.competenceMonth || ymNow(),
      method: payload.method || '',
      note: payload.note || '',
    },
    CHARGE_KEYS
  );

  const row = await db().createRow({
    databaseId: DATABASE_ID,
    tableId: AF_CHARGES,
    rowId: ID.unique(),
    data,
    permissions: perms(),
  });
  return mapRow(row);
}

export async function markChargePaid({ agencyId, id, method = 'pix', date } = {}) {
  const aid = assertAgency(agencyId);
  const charge = mapRow(
    await db().getRow({ databaseId: DATABASE_ID, tableId: AF_CHARGES, rowId: id })
  );
  if (charge.status === 'paid') return charge;
  if (charge.status === 'cancelled') throw new Error('cobranca_cancelada');

  const cash = await createCash({
    agencyId: aid,
    payload: {
      direction: 'in',
      amount: charge.amount,
      date: date || todayYmd(),
      competenceMonth: charge.competenceMonth || ymNow(),
      category: 'servicos',
      description: charge.description || `Cobrança ${charge.clientName || ''}`.trim(),
      method,
      refType: 'charge',
      refId: charge.id,
      clientId: charge.clientId,
    },
  });

  const updated = await db().updateRow({
    databaseId: DATABASE_ID,
    tableId: AF_CHARGES,
    rowId: id,
    data: {
      status: 'paid',
      paidAt: new Date().toISOString(),
      method,
      cashId: cash.id,
    },
  });
  return mapRow(updated);
}

export async function cancelCharge({ agencyId, id }) {
  assertAgency(agencyId);
  const updated = await db().updateRow({
    databaseId: DATABASE_ID,
    tableId: AF_CHARGES,
    rowId: id,
    data: { status: 'cancelled' },
  });
  return mapRow(updated);
}

/* ─── Payables ─────────────────────────────────────────── */

export async function listPayables({ agencyId, month, status, limit = 200 } = {}) {
  const aid = assertAgency(agencyId);
  const queries = [
    Query.equal('agencyId', aid),
    Query.limit(Math.min(500, limit)),
    Query.orderDesc('dueDate'),
  ];
  if (month) queries.push(Query.equal('competenceMonth', month));
  if (status) queries.push(Query.equal('status', status));
  const res = await db().listRows({ databaseId: DATABASE_ID, tableId: AF_PAYABLES, queries });
  return (res.rows || []).map(mapRow);
}

export async function createPayable({ agencyId, payload }) {
  const aid = assertAgency(agencyId);
  const amount = Number(payload.amount) || 0;
  if (amount <= 0) throw new Error('valor_invalido');

  const firstDue = payload.dueDate || todayYmd();
  const schedule = buildPayableInstallments(amount, payload.installments, firstDue);
  if (!schedule.length) throw new Error('valor_invalido');

  const vendorName = payload.vendorName || 'Fornecedor';
  const category = payload.category || 'outro';
  const baseDescription = payload.description || '';
  const status = payload.status || 'open';
  const method = payload.method || '';
  const note = payload.note || '';
  const installmentTotal = schedule.length;
  const installmentGroupId = installmentTotal > 1 ? ID.unique() : '';

  const created = [];
  for (const item of schedule) {
    const desc =
      installmentTotal > 1
        ? `${baseDescription || vendorName} (${item.installmentNumber}/${installmentTotal})`.trim()
        : baseDescription;
    const data = knownSplit(
      {
        agencyId: aid,
        vendorName,
        category,
        description: desc,
        amount: item.amount,
        status,
        dueDate: item.dueDate,
        competenceMonth: item.competenceMonth,
        method,
        note,
        ...(installmentTotal > 1
          ? {
              installmentNumber: item.installmentNumber,
              installmentTotal,
              installmentGroupId,
            }
          : {}),
      },
      PAYABLE_KEYS
    );

    const row = await db().createRow({
      databaseId: DATABASE_ID,
      tableId: AF_PAYABLES,
      rowId: ID.unique(),
      data,
      permissions: perms(),
    });
    created.push(mapRow(row));
  }

  return installmentTotal > 1 ? created : created[0];
}

export async function updatePayable({ agencyId, id, payload }) {
  assertAgency(agencyId);
  const existing = mapRow(
    await db().getRow({ databaseId: DATABASE_ID, tableId: AF_PAYABLES, rowId: id })
  );
  if (!existing) throw new Error('conta_nao_encontrada');
  if (existing.status === 'paid') throw new Error('conta_paga');
  if (existing.status === 'cancelled') throw new Error('conta_cancelada');

  const amount =
    payload.amount != null ? Number(payload.amount) : Number(existing.amount) || 0;
  if (amount <= 0) throw new Error('valor_invalido');

  const dueDate = payload.dueDate || existing.dueDate || todayYmd();
  const competenceMonth = String(dueDate).slice(0, 7);

  const data = knownSplit(
    {
      vendorName: payload.vendorName ?? existing.vendorName ?? 'Fornecedor',
      category: payload.category ?? existing.category ?? 'outro',
      description: payload.description ?? existing.description ?? '',
      amount,
      dueDate,
      competenceMonth,
      note: payload.note ?? existing.note ?? '',
      ...(existing.installmentGroupId
        ? {
            installmentNumber: existing.installmentNumber,
            installmentTotal: existing.installmentTotal,
            installmentGroupId: existing.installmentGroupId,
          }
        : {}),
    },
    PAYABLE_KEYS
  );

  const updated = await db().updateRow({
    databaseId: DATABASE_ID,
    tableId: AF_PAYABLES,
    rowId: id,
    data,
  });
  return mapRow(updated);
}

export async function markPayablePaid({ agencyId, id, method = 'pix', date } = {}) {
  const aid = assertAgency(agencyId);
  const payable = mapRow(
    await db().getRow({ databaseId: DATABASE_ID, tableId: AF_PAYABLES, rowId: id })
  );
  if (payable.status === 'paid') return payable;
  if (payable.status === 'cancelled') throw new Error('conta_cancelada');

  const cash = await createCash({
    agencyId: aid,
    payload: {
      direction: 'out',
      amount: payable.amount,
      date: date || todayYmd(),
      competenceMonth: payable.competenceMonth || ymNow(),
      category: payable.category || 'outro',
      description: payable.description || payable.vendorName || 'Conta a pagar',
      method,
      refType: 'payable',
      refId: payable.id,
    },
  });

  const updated = await db().updateRow({
    databaseId: DATABASE_ID,
    tableId: AF_PAYABLES,
    rowId: id,
    data: {
      status: 'paid',
      paidAt: new Date().toISOString(),
      method,
      cashId: cash.id,
    },
  });
  return mapRow(updated);
}

export async function cancelPayable({ agencyId, id }) {
  assertAgency(agencyId);
  const existing = mapRow(
    await db().getRow({ databaseId: DATABASE_ID, tableId: AF_PAYABLES, rowId: id })
  );
  if (!existing) throw new Error('conta_nao_encontrada');
  if (existing.status === 'paid') throw new Error('conta_paga');
  if (existing.status === 'cancelled') return existing;

  const updated = await db().updateRow({
    databaseId: DATABASE_ID,
    tableId: AF_PAYABLES,
    rowId: id,
    data: { status: 'cancelled' },
  });
  return mapRow(updated);
}

/* ─── Overview / DRE ───────────────────────────────────── */

export async function getOverview({ agencyId, month } = {}) {
  const aid = assertAgency(agencyId);
  const ym = month || ymNow();
  const [charges, payables, cash] = await Promise.all([
    listCharges({ agencyId: aid, month: ym, limit: 500 }),
    listPayables({ agencyId: aid, month: ym, limit: 500 }),
    listCash({ agencyId: aid, month: ym, limit: 500 }),
  ]);

  const openCharges = charges.filter((c) => c.status === 'open');
  const paidCharges = charges.filter((c) => c.status === 'paid');
  const openPayables = payables.filter((p) => p.status === 'open');
  const paidPayables = payables.filter((p) => p.status === 'paid');

  let inflow = 0;
  let outflow = 0;
  for (const t of cash) {
    if (t.status !== 'settled') continue;
    if (t.direction === 'out') outflow += Number(t.amount) || 0;
    else inflow += Number(t.amount) || 0;
  }

  const sum = (rows) => rows.reduce((acc, r) => acc + (Number(r.amount) || 0), 0);

  return {
    month: ym,
    period: monthBounds(ym),
    cash: { inflow, outflow, balance: inflow - outflow, count: cash.length },
    charges: {
      openCount: openCharges.length,
      openAmount: sum(openCharges),
      paidCount: paidCharges.length,
      paidAmount: sum(paidCharges),
    },
    payables: {
      openCount: openPayables.length,
      openAmount: sum(openPayables),
      paidCount: paidPayables.length,
      paidAmount: sum(paidPayables),
    },
  };
}

export async function getDre({ agencyId, month } = {}) {
  const cash = await listCash({ agencyId, month, limit: 500 });
  const byCat = { in: {}, out: {} };
  for (const t of cash) {
    if (t.status !== 'settled') continue;
    const bucket = t.direction === 'out' ? byCat.out : byCat.in;
    const cat = t.category || 'outro';
    bucket[cat] = (bucket[cat] || 0) + (Number(t.amount) || 0);
  }
  const receita = Object.values(byCat.in).reduce((a, b) => a + b, 0);
  const despesa = Object.values(byCat.out).reduce((a, b) => a + b, 0);
  return {
    month,
    receita,
    despesa,
    resultado: receita - despesa,
    byCategory: byCat,
  };
}
