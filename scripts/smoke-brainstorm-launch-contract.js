/**
 * Documenta o contrato do save-brief unificado (sem Appwrite).
 * Run: node scripts/smoke-brainstorm-launch-contract.js
 */

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

/** Contrato esperado do save-brief após unificação */
const saveBriefResponse = {
  success: true,
  briefId: 'brief-uuid',
  needsLaunch: true,
  agencyId: 'agency-1',
  clientId: 'client-1',
  mes: 3,
  ano: 2026,
  nome: 'Campanha Teste',
  modo: 'plano',
  planId: 'anual-1',
  empresaNome: 'Empresa',
};

assert(saveBriefResponse.needsLaunch === true, 'needsLaunch');
assert(Boolean(saveBriefResponse.briefId), 'briefId');
assert(saveBriefResponse.cycleId == null, 'não cria cycle no agent');

/** Frontend deve chamar launchCampanhaFromBrief e depois update-plan-month */
const launchResult = {
  success: true,
  cycleReused: true,
  cyclePlan: { id: 'cycle-month' },
  briefing: { id: 'brief-uuid', ciclo_id: 'cycle-month' },
};

assert(launchResult.briefing.ciclo_id === launchResult.cyclePlan.id, 'vínculo brief↔ciclo');

const planPatch = {
  brief_mensal_id: saveBriefResponse.briefId,
  ciclo_entrega_id: launchResult.cyclePlan.id,
  status_mes: 'materializado',
};

assert(planPatch.status_mes === 'materializado', 'plano materializado');
assert(planPatch.ciclo_entrega_id === 'cycle-month', 'ciclo do mês no plano');

console.log('smoke-brainstorm-launch-contract: OK');
