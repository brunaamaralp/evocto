/**
 * API — Agent de campanha / brainstorm.
 *
 * POST /api/campaigns-agent?route=
 *   init | message | save-brief | save-feedback |
 *   clone-conversation | archive-conversation | delete-conversation
 * GET  /api/campaigns-agent?route=get-conversations&empresa=...
 *
 * Paths /api/campaigns/agent/* (via Netlify redirect)
 *
 * save-feedback — body:
 *   { cycleId, vendas_realizado, engajamento_realizado, conversoes, alcance,
 *     o_que_funcionou, o_que_nao_funcionou, aprendizados, nota_geral,
 *     notas_criativas, notas_producao, recomendacoes_proxima }
 * response: { success: true, feedbackId }
 */
import campaignAgentHandler from '../lib/server/campaignAgentHandler.js';

export const config = {
  maxDuration: 60,
};

export default async function handler(req, res) {
  return campaignAgentHandler(req, res);
}
