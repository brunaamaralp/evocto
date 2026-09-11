/**
 * Smoke checks — helpers do plano anual (lógica espelhada, sem alias Vite).
 * Run: node scripts/smoke-plano-anual-hub.js
 */

function deriveAnnualPlanFromBriefs(briefs = [], ano = new Date().getFullYear()) {
  const anuais = (briefs || [])
    .filter((b) => b?.brief_kind === 'campanha_anual')
    .filter((b) => !b.ano || Number(b.ano) === Number(ano))
    .sort((a, b) =>
      String(b.updated_date || '').localeCompare(String(a.updated_date || ''))
    );
  return anuais[0] || null;
}

function getPlanMonth(plan, mes = 1) {
  if (!plan) return null;
  const mesNum = Number(mes);
  const campanha = (plan.campanhas || []).find((c) => Number(c?.mes) === mesNum) || null;
  const tema = (plan.temas_sugeridos || []).find((t) => Number(t?.mes) === mesNum) || null;
  if (!campanha && !tema) return null;
  const status = campanha?.status_mes || (tema?.titulo ? 'tema' : 'vazio');
  return {
    mes: mesNum,
    campanha,
    tema,
    status_mes: status,
    actionable:
      Boolean(campanha) &&
      campanha.status_mes !== 'materializado' &&
      campanha.status_mes !== 'rejeitado',
    materializado: campanha?.status_mes === 'materializado',
  };
}

function listPlanMonths(plan) {
  return Array.from({ length: 12 }, (_, i) => getPlanMonth(plan, i + 1) || { mes: i + 1, status_mes: 'vazio' });
}

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

const briefs = [
  {
    id: 'anual-1',
    brief_kind: 'campanha_anual',
    ano: 2026,
    updated_date: '2026-03-01',
    campanhas: [
      { mes: 3, nome_campanha: 'Março Vendas', status_mes: 'gerado' },
      {
        mes: 4,
        nome_campanha: 'Abril',
        status_mes: 'materializado',
        brief_mensal_id: 'brief-4',
      },
    ],
    temas_sugeridos: [
      { mes: 3, titulo: 'Tema Março', selecionado: true },
      { mes: 5, titulo: 'Tema Maio', selecionado: true },
    ],
  },
];

const plan = deriveAnnualPlanFromBriefs(briefs, 2026);
assert(plan?.id === 'anual-1', 'derive plan');

const mar = getPlanMonth(plan, 3);
assert(mar?.actionable === true, 'mar actionable');
assert(mar?.tema?.titulo === 'Tema Março', 'tema março');

const abr = getPlanMonth(plan, 4);
assert(abr?.materializado === true, 'abr materializado');
assert(abr?.actionable === false, 'abr not actionable');

const months = listPlanMonths(plan);
assert(months.length === 12, '12 months');

console.log('smoke-plano-anual-hub: OK');
