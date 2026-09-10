/**
 * Plano de contas padrão — agência de marketing (Evocto).
 * Códigos protegidos pelo espelho contábil (1.1.1, 4.1.1, 6.2.x, etc.) são preservados.
 */

function row(code, name, type, nature, extras = {}) {
  const parts = String(code).split('.');
  const parentCode =
    extras.parentCode !== undefined
      ? extras.parentCode
      : parts.length > 1
        ? parts.slice(0, -1).join('.')
        : '';
  return {
    code,
    name,
    type,
    nature,
    dreGrupo: extras.dreGrupo || '',
    dfcClasse: extras.dfcClasse || '',
    dfcSubclasse: extras.dfcSubclasse || '',
    cash: Boolean(extras.cash),
    parentCode,
  };
}

/** @type {Array<{code:string,name:string,type:string,nature:string,dreGrupo?:string,dfcClasse?:string,dfcSubclasse?:string,cash?:boolean,parentCode?:string}>} */
export const DEFAULT_AGENCY_CHART_OF_ACCOUNTS = [
  // ─── 1 ATIVO ───────────────────────────────────────────────
  row('1', 'Ativo', 'ativo', 'devedora'),
  row('1.1', 'Ativo circulante', 'ativo', 'devedora'),
  row('1.1.1', 'Caixa e equivalentes', 'ativo', 'devedora', {
    dfcClasse: 'Caixa',
    cash: true,
  }),
  row('1.1.2', 'Clientes a receber', 'ativo', 'devedora', {
    dfcClasse: 'Operacional',
    dfcSubclasse: 'clientes',
  }),
  row('1.1.3', 'Bancos conta corrente', 'ativo', 'devedora', {
    dfcClasse: 'Caixa',
    cash: true,
  }),
  row('1.1.4', 'Aplicações financeiras', 'ativo', 'devedora', {
    dfcClasse: 'Caixa',
    cash: true,
  }),
  row('1.1.5', 'Adiantamentos a fornecedores', 'ativo', 'devedora', {
    dfcClasse: 'Operacional',
    dfcSubclasse: 'fornecedores',
  }),
  row('1.1.6', 'Impostos a recuperar', 'ativo', 'devedora', {
    dfcClasse: 'Operacional',
  }),
  row('1.1.9', 'Transferências entre contas', 'ativo', 'devedora', {
    dfcClasse: 'Financiamento',
    dfcSubclasse: 'transferências',
  }),

  row('1.2', 'Ativo não circulante', 'ativo', 'devedora'),
  row('1.2.1', 'Imobilizado (móveis e equipamentos)', 'ativo', 'devedora', {
    dfcClasse: 'Investimento',
    dfcSubclasse: 'capex',
  }),
  row('1.2.2', 'Softwares e intangíveis', 'ativo', 'devedora', {
    dfcClasse: 'Investimento',
    dfcSubclasse: 'capex',
  }),
  row('1.2.3', '(-) Depreciação / amortização acumulada', 'ativo', 'credora', {
    dfcClasse: 'Investimento',
  }),

  // ─── 2 PASSIVO ─────────────────────────────────────────────
  row('2', 'Passivo', 'passivo', 'credora'),
  row('2.1', 'Passivo circulante', 'passivo', 'credora'),
  row('2.1.1', 'Fornecedores e freelancers a pagar', 'passivo', 'credora', {
    dfcClasse: 'Operacional',
    dfcSubclasse: 'fornecedores',
  }),
  row('2.1.2', 'Obrigações trabalhistas', 'passivo', 'credora', {
    dfcClasse: 'Operacional',
    dfcSubclasse: 'folha',
  }),
  row('2.1.3', 'Impostos a recolher', 'passivo', 'credora', {
    dfcClasse: 'Operacional',
  }),
  row('2.1.4', 'Adiantamentos de clientes', 'passivo', 'credora', {
    dfcClasse: 'Operacional',
    dfcSubclasse: 'clientes',
  }),

  row('2.2', 'Passivo não circulante', 'passivo', 'credora'),
  row('2.2.1', 'Empréstimos e financiamentos', 'passivo', 'credora', {
    dfcClasse: 'Financiamento',
    dfcSubclasse: 'empréstimos',
  }),
  row('2.2.2', 'Empréstimos de terceiros (passagem)', 'passivo', 'credora', {
    dfcClasse: 'Financiamento',
    dfcSubclasse: 'empréstimos',
  }),

  // ─── 3 PATRIMÔNIO LÍQUIDO ───────────────────────────────────
  row('3', 'Patrimônio líquido', 'pl', 'credora'),
  row('3.1', 'Capital e reservas', 'pl', 'credora'),
  row('3.1.1', 'Capital social / aportes', 'pl', 'credora', {
    dfcClasse: 'Financiamento',
    dfcSubclasse: 'capital',
  }),
  row('3.1.2', 'Retiradas de sócios / pró-labore', 'pl', 'devedora', {
    dfcClasse: 'Financiamento',
    dfcSubclasse: 'capital',
  }),
  row('3.1.3', 'Lucros / prejuízos acumulados', 'pl', 'credora', {
    dfcClasse: 'Financiamento',
  }),

  // ─── 4 RECEITAS ────────────────────────────────────────────
  row('4', 'Receitas', 'receita', 'credora'),
  row('4.1', 'Receita de serviços de marketing', 'receita', 'credora', {
    dreGrupo: 'Receita Bruta',
    dfcClasse: 'Operacional',
  }),
  row('4.1.1', 'Fee mensal / retainer', 'receita', 'credora', {
    dreGrupo: 'Receita Bruta',
    dfcClasse: 'Operacional',
    dfcSubclasse: 'clientes',
  }),
  row('4.1.2', 'Projetos e jobs avulsos', 'receita', 'credora', {
    dreGrupo: 'Receita Bruta',
    dfcClasse: 'Operacional',
    dfcSubclasse: 'clientes',
  }),
  row('4.1.3', 'Consultoria e workshops', 'receita', 'credora', {
    dreGrupo: 'Receita Bruta',
    dfcClasse: 'Operacional',
    dfcSubclasse: 'clientes',
  }),
  row('4.1.4', 'Gestão de mídia (fee)', 'receita', 'credora', {
    dreGrupo: 'Receita Bruta',
    dfcClasse: 'Operacional',
    dfcSubclasse: 'clientes',
  }),
  row('4.1.5', 'Produção de conteúdo', 'receita', 'credora', {
    dreGrupo: 'Receita Bruta',
    dfcClasse: 'Operacional',
    dfcSubclasse: 'clientes',
  }),
  row('4.1.6', 'Design, branding e identidade', 'receita', 'credora', {
    dreGrupo: 'Receita Bruta',
    dfcClasse: 'Operacional',
    dfcSubclasse: 'clientes',
  }),
  row('4.1.7', 'Performance / growth', 'receita', 'credora', {
    dreGrupo: 'Receita Bruta',
    dfcClasse: 'Operacional',
    dfcSubclasse: 'clientes',
  }),
  row('4.1.8', 'Outras receitas de serviços', 'receita', 'credora', {
    dreGrupo: 'Receita Bruta',
    dfcClasse: 'Operacional',
    dfcSubclasse: 'clientes',
  }),

  row('4.9', 'Deduções da receita', 'receita', 'devedora', {
    dreGrupo: 'Deduções',
    dfcClasse: 'Operacional',
  }),
  row('4.9.1', 'Cancelamentos e estornos', 'receita', 'devedora', {
    dreGrupo: 'Deduções',
    dfcClasse: 'Operacional',
  }),
  row('4.9.2', 'Descontos comerciais', 'receita', 'devedora', {
    dreGrupo: 'Deduções',
    dfcClasse: 'Operacional',
  }),
  row('4.9.3', 'Impostos sobre faturamento (ISS/PIS/COFINS)', 'receita', 'devedora', {
    dreGrupo: 'Deduções',
    dfcClasse: 'Operacional',
  }),

  // ─── 5 CUSTOS DOS SERVIÇOS ──────────────────────────────────
  row('5', 'Custos dos serviços', 'custo', 'devedora'),
  row('5.1', 'Custos diretos de entrega', 'custo', 'devedora', {
    dreGrupo: 'CMV/CPV',
    dfcClasse: 'Operacional',
  }),
  row('5.1.1', 'Freelancers e produção terceirizada', 'custo', 'devedora', {
    dreGrupo: 'CMV/CPV',
    dfcClasse: 'Operacional',
    dfcSubclasse: 'fornecedores',
  }),
  row('5.1.2', 'Verba de mídia (custo direto)', 'custo', 'devedora', {
    dreGrupo: 'CMV/CPV',
    dfcClasse: 'Operacional',
    dfcSubclasse: 'fornecedores',
  }),
  row('5.1.3', 'Licenças, stock e insumos de produção', 'custo', 'devedora', {
    dreGrupo: 'CMV/CPV',
    dfcClasse: 'Operacional',
    dfcSubclasse: 'fornecedores',
  }),
  row('5.1.4', 'Outros custos diretos de projeto', 'custo', 'devedora', {
    dreGrupo: 'CMV/CPV',
    dfcClasse: 'Operacional',
    dfcSubclasse: 'fornecedores',
  }),

  // ─── 6 DESPESAS OPERACIONAIS ───────────────────────────────
  row('6', 'Despesas operacionais', 'despesa', 'devedora'),
  row('6.1', 'Pessoal administrativo', 'despesa', 'devedora', {
    dreGrupo: 'Despesas Operacionais',
    dfcClasse: 'Operacional',
  }),
  row('6.1.1', 'Salários e encargos', 'despesa', 'devedora', {
    dreGrupo: 'Despesas Operacionais',
    dfcClasse: 'Operacional',
    dfcSubclasse: 'folha',
  }),
  row('6.1.2', 'Benefícios (VT, VR, plano de saúde)', 'despesa', 'devedora', {
    dreGrupo: 'Despesas Operacionais',
    dfcClasse: 'Operacional',
    dfcSubclasse: 'folha',
  }),
  row('6.1.3', 'Estagiários e prestadores administrativos', 'despesa', 'devedora', {
    dreGrupo: 'Despesas Operacionais',
    dfcClasse: 'Operacional',
    dfcSubclasse: 'folha',
  }),

  row('6.2', 'Despesas gerais e administrativas', 'despesa', 'devedora', {
    dreGrupo: 'Despesas Operacionais',
    dfcClasse: 'Operacional',
  }),
  row('6.2.1', 'Despesas operacionais diversas', 'despesa', 'devedora', {
    dreGrupo: 'Despesas Operacionais',
    dfcClasse: 'Operacional',
    dfcSubclasse: 'folha',
  }),
  row('6.2.3', 'Limpeza e facilities', 'despesa', 'devedora', {
    dreGrupo: 'Despesas Operacionais',
    dfcClasse: 'Operacional',
    dfcSubclasse: 'fornecedores',
  }),
  row('6.2.4', 'Produção e materiais de campanha (agência)', 'despesa', 'devedora', {
    dreGrupo: 'Despesas Operacionais',
    dfcClasse: 'Operacional',
    dfcSubclasse: 'fornecedores',
  }),
  row('6.2.5', 'Transporte e deslocamentos', 'despesa', 'devedora', {
    dreGrupo: 'Despesas Operacionais',
    dfcClasse: 'Operacional',
    dfcSubclasse: 'fornecedores',
  }),
  row('6.2.6', 'Seguros', 'despesa', 'devedora', {
    dreGrupo: 'Despesas Operacionais',
    dfcClasse: 'Operacional',
    dfcSubclasse: 'fornecedores',
  }),
  row('6.2.7', 'Contabilidade, jurídico e honorários', 'despesa', 'devedora', {
    dreGrupo: 'Despesas Operacionais',
    dfcClasse: 'Operacional',
    dfcSubclasse: 'fornecedores',
  }),
  row('6.2.8', 'Capacitação e treinamento da equipe', 'despesa', 'devedora', {
    dreGrupo: 'Despesas Operacionais',
    dfcClasse: 'Operacional',
    dfcSubclasse: 'fornecedores',
  }),
  row('6.2.9', 'Equipamentos e utensílios', 'despesa', 'devedora', {
    dreGrupo: 'Despesas Operacionais',
    dfcClasse: 'Operacional',
    dfcSubclasse: 'fornecedores',
  }),
  row('6.2.10', 'Aluguel e condomínio', 'despesa', 'devedora', {
    dreGrupo: 'Despesas Operacionais',
    dfcClasse: 'Operacional',
    dfcSubclasse: 'fornecedores',
  }),
  row('6.2.11', 'Água, luz e energia', 'despesa', 'devedora', {
    dreGrupo: 'Despesas Operacionais',
    dfcClasse: 'Operacional',
    dfcSubclasse: 'fornecedores',
  }),
  row('6.2.12', 'Internet e telefonia', 'despesa', 'devedora', {
    dreGrupo: 'Despesas Operacionais',
    dfcClasse: 'Operacional',
    dfcSubclasse: 'fornecedores',
  }),
  row('6.2.13', 'Ferramentas SaaS e softwares', 'despesa', 'devedora', {
    dreGrupo: 'Despesas Operacionais',
    dfcClasse: 'Operacional',
    dfcSubclasse: 'fornecedores',
  }),
  row('6.2.14', 'Marketing da própria agência', 'despesa', 'devedora', {
    dreGrupo: 'Despesas Operacionais',
    dfcClasse: 'Operacional',
    dfcSubclasse: 'fornecedores',
  }),
  row('6.2.15', 'Impostos e taxas operacionais', 'despesa', 'devedora', {
    dreGrupo: 'Despesas Operacionais',
    dfcClasse: 'Operacional',
  }),
  row('6.2.16', 'Material de escritório e café', 'despesa', 'devedora', {
    dreGrupo: 'Despesas Operacionais',
    dfcClasse: 'Operacional',
    dfcSubclasse: 'fornecedores',
  }),
  row('6.2.17', 'Reembolsos a colaboradores', 'despesa', 'devedora', {
    dreGrupo: 'Despesas Operacionais',
    dfcClasse: 'Operacional',
    dfcSubclasse: 'folha',
  }),

  row('6.3', 'Depreciação e amortização', 'despesa', 'devedora', {
    dreGrupo: 'Depreciação/Amortização',
    dfcClasse: 'Operacional',
  }),
  row('6.3.1', 'Depreciação e amortização do período', 'despesa', 'devedora', {
    dreGrupo: 'Depreciação/Amortização',
    dfcClasse: 'Operacional',
  }),

  // ─── 7 RESULTADO FINANCEIRO ────────────────────────────────
  row('7', 'Resultado financeiro', 'despesa', 'devedora'),
  row('7.1', 'Despesas e receitas financeiras', 'despesa', 'devedora', {
    dreGrupo: 'Resultado Financeiro',
    dfcClasse: 'Operacional',
  }),
  row('7.1.1', 'Despesas financeiras (juros, tarifas, cartão)', 'despesa', 'devedora', {
    dreGrupo: 'Resultado Financeiro',
    dfcClasse: 'Operacional',
    dfcSubclasse: 'juros',
    cash: true,
  }),
  row('7.1.2', 'Receitas financeiras (rendimentos)', 'receita', 'credora', {
    dreGrupo: 'Resultado Financeiro',
    dfcClasse: 'Operacional',
    dfcSubclasse: 'rendimentos',
  }),

  // ─── 8 IMPOSTOS SOBRE O LUCRO ───────────────────────────────
  row('8', 'Impostos sobre o lucro', 'despesa', 'devedora'),
  row('8.1', 'IR / CSLL', 'despesa', 'devedora', {
    dreGrupo: 'Imposto s/ Lucro',
    dfcClasse: 'Operacional',
  }),
  row('8.1.1', 'IRPJ e CSLL', 'despesa', 'devedora', {
    dreGrupo: 'Imposto s/ Lucro',
    dfcClasse: 'Operacional',
  }),
];

/** Contas analíticas usadas por categorias fixas / espelho (não excluir). */
export const AGENCY_PROTECTED_ACCOUNT_CODES = new Set([
  '1.1.1',
  '1.1.9',
  '2.2.1',
  '2.2.2',
  '3.1.1',
  '3.1.2',
  '4.1.1',
  '4.1.2',
  '4.1.3',
  '4.1.4',
  '4.9.1',
  '5.1.1',
  '6.2.1',
  '6.2.3',
  '6.2.4',
  '6.2.5',
  '6.2.6',
  '6.2.7',
  '6.2.8',
  '6.2.9',
  '6.3.1',
  '7.1.1',
  '7.1.2',
]);
