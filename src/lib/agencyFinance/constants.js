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
