/**
 * API do Financeiro Agência — Appwrite TablesDB (af_charges, af_payables, af_cash).
 */
import { getTablesDB, DATABASE_ID, ID, Query, Permission, Role } from '@/api/appwriteClient';
import {
  ymNow,
  todayYmd,
  monthBounds,
  buildPayableInstallments,
  shiftMonth,
  dueDateForMonth,
  recurringAppliesToMonth,
} from './constants.js';

export const AF_CHARGES =
  import.meta.env.VITE_APPWRITE_AF_CHARGES_COLLECTION_ID || 'af_charges';
export const AF_PAYABLES =
  import.meta.env.VITE_APPWRITE_AF_PAYABLES_COLLECTION_ID || 'af_payables';
export const AF_CASH =
  import.meta.env.VITE_APPWRITE_AF_CASH_COLLECTION_ID || 'af_cash';
export const AF_RECURRING =
  import.meta.env.VITE_APPWRITE_AF_RECURRING_COLLECTION_ID || 'af_recurring';

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

const RECURRING_KEYS = [
  'agencyId',
  'clientId',
  'clientName',
  'description',
  'amount',
  'dueDay',
  'startMonth',
  'endMonth',
  'status',
  'type',
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
      ...(payload.recurringId ? { recurringId: String(payload.recurringId) } : {}),
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

/* ─── Recurring (contratos mensais) ────────────────────── */

export async function listRecurring({ agencyId, status, clientId, limit = 200 } = {}) {
  const aid = assertAgency(agencyId);
  const queries = [
    Query.equal('agencyId', aid),
    Query.limit(Math.min(500, limit)),
    Query.orderDesc('$createdAt'),
  ];
  if (status) queries.push(Query.equal('status', status));
  if (clientId) queries.push(Query.equal('clientId', String(clientId)));
  const res = await db().listRows({ databaseId: DATABASE_ID, tableId: AF_RECURRING, queries });
  return (res.rows || []).map(mapRow);
}

export async function createRecurring({ agencyId, payload }) {
  const aid = assertAgency(agencyId);
  const amount = Number(payload.amount) || 0;
  if (amount <= 0) throw new Error('valor_invalido');
  if (!payload.clientId) throw new Error('cliente_obrigatorio');

  const dueDay = Math.min(28, Math.max(1, Math.trunc(Number(payload.dueDay) || 1)));
  const data = knownSplit(
    {
      agencyId: aid,
      clientId: payload.clientId,
      clientName: payload.clientName || '',
      description: payload.description || '',
      amount,
      dueDay,
      startMonth: payload.startMonth || ymNow(),
      endMonth: payload.endMonth || '',
      status: payload.status || 'active',
      type: 'recorrente',
      note: payload.note || '',
    },
    RECURRING_KEYS
  );

  const row = await db().createRow({
    databaseId: DATABASE_ID,
    tableId: AF_RECURRING,
    rowId: ID.unique(),
    data,
    permissions: perms(),
  });
  return mapRow(row);
}

export async function updateRecurring({ agencyId, id, payload }) {
  assertAgency(agencyId);
  const existing = mapRow(
    await db().getRow({ databaseId: DATABASE_ID, tableId: AF_RECURRING, rowId: id })
  );
  if (!existing) throw new Error('recorrencia_nao_encontrada');

  const amount =
    payload.amount != null ? Number(payload.amount) : Number(existing.amount) || 0;
  if (amount <= 0) throw new Error('valor_invalido');

  const dueDay = Math.min(
    28,
    Math.max(1, Math.trunc(Number(payload.dueDay ?? existing.dueDay) || 1))
  );

  const data = knownSplit(
    {
      clientId: payload.clientId ?? existing.clientId,
      clientName: payload.clientName ?? existing.clientName ?? '',
      description: payload.description ?? existing.description ?? '',
      amount,
      dueDay,
      startMonth: payload.startMonth ?? existing.startMonth ?? ymNow(),
      endMonth: payload.endMonth !== undefined ? payload.endMonth : existing.endMonth || '',
      status: payload.status ?? existing.status ?? 'active',
      type: 'recorrente',
      note: payload.note ?? existing.note ?? '',
    },
    RECURRING_KEYS
  );

  const updated = await db().updateRow({
    databaseId: DATABASE_ID,
    tableId: AF_RECURRING,
    rowId: id,
    data,
  });
  return mapRow(updated);
}

export async function setRecurringStatus({ agencyId, id, status }) {
  assertAgency(agencyId);
  if (!['active', 'paused', 'ended'].includes(status)) throw new Error('status_invalido');
  const updated = await db().updateRow({
    databaseId: DATABASE_ID,
    tableId: AF_RECURRING,
    rowId: id,
    data: { status },
  });
  return mapRow(updated);
}

/**
 * Gera cobranças do mês a partir das recorrências ativas (idempotente).
 * @returns {{ created: object[], skipped: number }}
 */
export async function materializeRecurringCharges({ agencyId, month } = {}) {
  const aid = assertAgency(agencyId);
  const ym = month || ymNow();
  const [recurring, charges] = await Promise.all([
    listRecurring({ agencyId: aid, limit: 500 }),
    listCharges({ agencyId: aid, month: ym, limit: 500 }),
  ]);

  const existingByRecurring = new Set(
    charges
      .filter((c) => c.recurringId && c.status !== 'cancelled')
      .map((c) => String(c.recurringId))
  );

  const created = [];
  let skipped = 0;
  for (const rec of recurring) {
    if (!recurringAppliesToMonth(rec, ym)) continue;
    if (existingByRecurring.has(String(rec.id))) {
      skipped += 1;
      continue;
    }
    const charge = await createCharge({
      agencyId: aid,
      payload: {
        clientId: rec.clientId,
        clientName: rec.clientName,
        type: 'recorrente',
        description: rec.description || `Fee mensal — ${rec.clientName || 'cliente'}`,
        amount: rec.amount,
        dueDate: dueDateForMonth(ym, rec.dueDay),
        competenceMonth: ym,
        recurringId: rec.id,
      },
    });
    created.push(charge);
  }
  return { created, skipped };
}

/**
 * Espelha cobrança de serviço do cadastro do cliente → contrato em af_recurring.
 * Ativa/atualiza a recorrência principal; pausa se billing for desligado.
 */
export async function syncClientRecurringFromBilling({ agencyId, client, billing } = {}) {
  const aid = assertAgency(agencyId);
  const clientId = String(client?.id || client?.$id || '').trim();
  if (!clientId) throw new Error('cliente_obrigatorio');

  const clientName = client?.name || client?.company_name || '';
  const enabled = Boolean(billing?.billing_enabled);
  const price = Number(billing?.plan_price) || 0;
  const discount = Number(billing?.discount_amount) || 0;
  const amount = Math.max(0, price - discount);
  const dueDay = Math.min(28, Math.max(1, Math.trunc(Number(billing?.due_day) || 10)));
  const planName = String(billing?.plan || '').trim();
  const description = planName ? `Fee — ${planName}` : 'Fee mensal';

  const existing = await listRecurring({ agencyId: aid, clientId, limit: 50 });
  const live = existing.filter((r) => r.status === 'active' || r.status === 'paused');

  if (!enabled || amount < 0.01) {
    for (const r of live.filter((x) => x.status === 'active')) {
      await setRecurringStatus({ agencyId: aid, id: r.id, status: 'paused' });
    }
    return { action: 'paused', count: live.length };
  }

  const primary = live[0];
  if (primary) {
    const updated = await updateRecurring({
      agencyId: aid,
      id: primary.id,
      payload: {
        clientId,
        clientName,
        description,
        amount,
        dueDay,
        status: 'active',
        startMonth: primary.startMonth || ymNow(),
        endMonth: primary.endMonth || '',
      },
    });
    return { action: 'updated', recurring: updated };
  }

  const created = await createRecurring({
    agencyId: aid,
    payload: {
      clientId,
      clientName,
      description,
      amount,
      dueDay,
      startMonth: ymNow(),
      status: 'active',
    },
  });
  return { action: 'created', recurring: created };
}

/**
 * Projeção de recebimentos (meses à frente a partir de `fromMonth`).
 * Combina recorrências ativas + cobranças já existentes no mês.
 */
export async function getReceivablesForecast({ agencyId, fromMonth, months = 6 } = {}) {
  const aid = assertAgency(agencyId);
  const start = fromMonth || ymNow();
  const horizon = Math.min(24, Math.max(1, Math.trunc(Number(months) || 6)));
  const recurring = await listRecurring({ agencyId: aid, limit: 500 });
  const active = recurring.filter((r) => r.status === 'active');

  const monthList = Array.from({ length: horizon }, (_, i) => shiftMonth(start, i));
  const chargeLists = await Promise.all(
    monthList.map((ym) => listCharges({ agencyId: aid, month: ym, limit: 500 }))
  );

  const monthsOut = monthList.map((ym, idx) => {
    const charges = chargeLists[idx] || [];
    const byRecurring = new Map();
    for (const c of charges) {
      if (c.recurringId) byRecurring.set(String(c.recurringId), c);
    }

    let projected = 0;
    let open = 0;
    let paid = 0;
    let count = 0;

    for (const rec of active) {
      if (!recurringAppliesToMonth(rec, ym)) continue;
      const existing = byRecurring.get(String(rec.id));
      if (existing) {
        if (existing.status === 'cancelled') continue;
        count += 1;
        const amt = Number(existing.amount) || 0;
        if (existing.status === 'paid') paid += amt;
        else open += amt;
      } else {
        count += 1;
        projected += Number(rec.amount) || 0;
      }
    }

    // Cobranças avulsas (sem recorrência) no mês
    for (const c of charges) {
      if (c.recurringId) continue;
      if (c.status === 'cancelled') continue;
      count += 1;
      const amt = Number(c.amount) || 0;
      if (c.status === 'paid') paid += amt;
      else open += amt;
    }

    const expected = projected + open;
    return {
      month: ym,
      projected,
      open,
      paid,
      expected,
      total: expected + paid,
      count,
    };
  });

  const sum = (key) => monthsOut.reduce((acc, m) => acc + (Number(m[key]) || 0), 0);
  return {
    fromMonth: start,
    months: monthsOut,
    totals: {
      projected: sum('projected'),
      open: sum('open'),
      paid: sum('paid'),
      expected: sum('expected'),
      total: sum('total'),
    },
    activeRecurringCount: active.length,
    monthlyRunRate: active.reduce((acc, r) => acc + (Number(r.amount) || 0), 0),
  };
}

/* ─── Overview / DRE ───────────────────────────────────── */

export async function getOverview({ agencyId, month } = {}) {
  const aid = assertAgency(agencyId);
  const ym = month || ymNow();
  const [charges, payables, cash, forecast] = await Promise.all([
    listCharges({ agencyId: aid, month: ym, limit: 500 }),
    listPayables({ agencyId: aid, month: ym, limit: 500 }),
    listCash({ agencyId: aid, month: ym, limit: 500 }),
    getReceivablesForecast({ agencyId: aid, fromMonth: ym, months: 6 }),
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
  const thisMonth = forecast.months[0] || { expected: 0, projected: 0 };

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
    forecast: {
      monthlyRunRate: forecast.monthlyRunRate,
      activeRecurringCount: forecast.activeRecurringCount,
      thisMonthExpected: thisMonth.expected,
      next6Expected: forecast.totals.expected,
      months: forecast.months,
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
