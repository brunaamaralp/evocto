/** Constantes do Financeiro Agência (billing enxuto). */

export const CHARGE_TYPES = {
  recorrente: 'Recorrente',
  project: 'Projeto',
  one_off: 'Avulso',
};

/** Labels de exibição (inclui tipo legado `retainer`). */
export const CHARGE_TYPE_LABELS = {
  ...CHARGE_TYPES,
  retainer: 'Recorrente',
};

export const CHARGE_STATUSES = {
  open: 'Em aberto',
  paid: 'Paga',
  cancelled: 'Cancelada',
};

export const PAYABLE_STATUSES = {
  open: 'Em aberto',
  paid: 'Paga',
  cancelled: 'Cancelada',
};

export const PAYABLE_CATEGORIES = {
  freela: 'Freela',
  fornecedor: 'Fornecedor',
  ferramenta: 'Ferramenta / SaaS',
  imposto: 'Imposto',
  operacional: 'Operacional',
  outro: 'Outro',
};

export const CASH_CATEGORIES_IN = {
  servicos: 'Receita de serviços',
  outro: 'Outras receitas',
};

export const CASH_CATEGORIES_OUT = {
  freela: 'Freela',
  fornecedor: 'Fornecedor',
  ferramenta: 'Ferramenta / SaaS',
  imposto: 'Imposto',
  operacional: 'Operacional',
  outro: 'Outras despesas',
};

export const PAYMENT_METHODS = {
  pix: 'PIX',
  transferencia: 'Transferência',
  boleto: 'Boleto',
  cartao: 'Cartão',
  dinheiro: 'Dinheiro',
  outro: 'Outro',
};

export function ymNow(d = new Date()) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

export function todayYmd(d = new Date()) {
  return d.toISOString().slice(0, 10);
}

export function monthBounds(ym) {
  const [y, m] = String(ym || ymNow()).split('-').map(Number);
  const last = new Date(y, m, 0).getDate();
  return {
    from: `${ym}-01`,
    to: `${ym}-${String(last).padStart(2, '0')}`,
  };
}

export function formatBRL(value) {
  const n = Number(value) || 0;
  return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

export function formatMonthTitle(ym) {
  const [y, m] = String(ym || '').split('-').map(Number);
  if (!y || !m) return ym;
  const name = new Date(y, m - 1, 1).toLocaleDateString('pt-BR', {
    month: 'long',
    year: 'numeric',
  });
  return name.charAt(0).toUpperCase() + name.slice(1);
}

export function shiftMonth(ym, delta) {
  const [y, m] = String(ym).split('-').map(Number);
  const d = new Date(y, m - 1 + delta, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

export const MAX_PAYABLE_INSTALLMENTS = 48;

function roundMoney(n) {
  return Math.round(Number(n || 0) * 100) / 100;
}

/** Soma meses a uma data YYYY-MM-DD, preservando o dia quando possível. */
export function addMonthsYmd(ymd, months) {
  const s = String(ymd || '').slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  const [y, m, d] = s.split('-').map(Number);
  const base = new Date(y, m - 1 + (Number(months) || 0), 1);
  const last = new Date(base.getFullYear(), base.getMonth() + 1, 0).getDate();
  const day = Math.min(d, last);
  return `${base.getFullYear()}-${String(base.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

/**
 * Divide valor total em N parcelas mensais a partir do 1º vencimento.
 * @returns {Array<{ installmentNumber: number, dueDate: string, amount: number, competenceMonth: string }>}
 */
export function buildPayableInstallments(total, count, firstDueYmd) {
  const n = Math.min(
    MAX_PAYABLE_INSTALLMENTS,
    Math.max(1, Math.trunc(Number(count) || 1))
  );
  const firstDue = String(firstDueYmd || todayYmd()).slice(0, 10);
  const t = roundMoney(total);
  if (t < 0.01 || !/^\d{4}-\d{2}-\d{2}$/.test(firstDue)) return [];

  const base = roundMoney(t / n);
  const out = [];
  let allocated = 0;
  for (let i = 0; i < n; i += 1) {
    const amount = i === n - 1 ? roundMoney(t - allocated) : base;
    allocated += amount;
    const dueDate = addMonthsYmd(firstDue, i);
    out.push({
      installmentNumber: i + 1,
      dueDate,
      amount,
      competenceMonth: dueDate.slice(0, 7),
    });
  }
  return out;
}
