/**
 * Linhas do painel Carteira na home (SPEC_CONTROLE_AGENCIA P1.1).
 * Função pura — fácil de testar; sem I/O.
 */

const OPEN_TASK_STATUSES = new Set([
  'todo',
  'in_progress',
  'pending',
  'blocked',
  'in_review',
]);

function startOfLocalDay(date = new Date()) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function parseDueDate(value) {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

function isOpenTask(task) {
  const status = String(task?.status || '').toLowerCase();
  return OPEN_TASK_STATUSES.has(status);
}

function formatCompactBRL(value) {
  const n = Number(value) || 0;
  if (n <= 0) return null;
  try {
    return n.toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      maximumFractionDigits: 0,
    });
  } catch {
    return `R$ ${Math.round(n)}`;
  }
}

/**
 * @param {object} opts
 * @param {Array} opts.clients
 * @param {Array} opts.campaignGroups — saída de groupCampaignsByClient (clientId + campaigns[])
 * @param {Array} opts.tasks
 * @param {Array} [opts.charges] — af_charges do mês (falha → [])
 * @param {Date} [opts.todayStart]
 * @param {number} [opts.maxRows=12]
 * @param {(clientId: string) => string} opts.createClientHref
 */
export function buildAgencyPortfolioRows({
  clients = [],
  campaignGroups = [],
  tasks = [],
  charges = [],
  todayStart = startOfLocalDay(),
  maxRows = 12,
  createClientHref,
} = {}) {
  const list = Array.isArray(clients) ? clients : [];
  const active = list.filter((c) => String(c?.status || '').toLowerCase() === 'ativo');
  const pool = active.length > 0 ? active : list;

  const campaignsByClient = new Map();
  for (const group of campaignGroups || []) {
    const id = String(group?.clientId || '');
    if (!id) continue;
    campaignsByClient.set(id, Array.isArray(group.campaigns) ? group.campaigns.length : 0);
  }

  const openTasksByClient = new Map();
  const overdueTasksByClient = new Map();
  for (const task of tasks || []) {
    if (!isOpenTask(task)) continue;
    const clientId = String(task?.clientId || '');
    if (!clientId) continue;
    openTasksByClient.set(clientId, (openTasksByClient.get(clientId) || 0) + 1);
    const due = parseDueDate(task.dueDate);
    if (due && startOfLocalDay(due) < todayStart) {
      overdueTasksByClient.set(clientId, (overdueTasksByClient.get(clientId) || 0) + 1);
    }
  }

  const openAmountByClient = new Map();
  const overdueAmountByClient = new Map();
  for (const charge of charges || []) {
    if (String(charge?.status || '').toLowerCase() !== 'open') continue;
    const clientId = String(charge?.clientId || '');
    if (!clientId) continue;
    const amount = Number(charge?.amount) || 0;
    if (amount <= 0) continue;
    openAmountByClient.set(clientId, (openAmountByClient.get(clientId) || 0) + amount);
    const due = parseDueDate(charge.dueDate);
    if (due && startOfLocalDay(due) < todayStart) {
      overdueAmountByClient.set(clientId, (overdueAmountByClient.get(clientId) || 0) + amount);
    }
  }

  const rows = pool.map((client) => {
    const id = String(client.id);
    const openTasks = openTasksByClient.get(id) || 0;
    const overdueTasks = overdueTasksByClient.get(id) || 0;
    const campaignsActive = campaignsByClient.get(id) || 0;
    const openAmount = openAmountByClient.get(id) || 0;
    const overdueAmount = overdueAmountByClient.get(id) || 0;

    const hasAnyChargeForClient = (charges || []).some(
      (c) => String(c?.clientId || '') === id
    );

    let financeLabel = '—';
    let financeTone = 'neutral';
    if (overdueAmount > 0) {
      financeLabel = `${formatCompactBRL(overdueAmount)} em atraso`;
      financeTone = 'danger';
    } else if (openAmount > 0) {
      financeLabel = `${formatCompactBRL(openAmount)} em aberto`;
      financeTone = 'warning';
    } else if (hasAnyChargeForClient) {
      financeLabel = 'Em dia';
      financeTone = 'ok';
    }

    return {
      id,
      name: client.name || client.company_name || 'Cliente',
      status: client.status || '—',
      campaignsActive,
      openTasks,
      overdueTasks,
      openAmount,
      overdueAmount,
      financeLabel,
      financeTone,
      href: typeof createClientHref === 'function' ? createClientHref(id) : `#`,
      sortFinanceOverdue: overdueAmount > 0 ? 0 : 1,
      sortTaskOverdue: overdueTasks > 0 ? 0 : 1,
    };
  });

  rows.sort((a, b) => {
    if (a.sortFinanceOverdue !== b.sortFinanceOverdue) {
      return a.sortFinanceOverdue - b.sortFinanceOverdue;
    }
    if (a.sortTaskOverdue !== b.sortTaskOverdue) {
      return a.sortTaskOverdue - b.sortTaskOverdue;
    }
    return String(a.name).localeCompare(String(b.name), 'pt-BR');
  });

  const limited = rows.slice(0, Math.max(1, maxRows));
  return {
    rows: limited,
    totalClients: rows.length,
    truncated: rows.length > limited.length,
  };
}

export { OPEN_TASK_STATUSES as PORTFOLIO_OPEN_TASK_STATUSES };
