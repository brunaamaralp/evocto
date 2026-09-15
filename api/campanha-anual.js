/**
 * API Vercel — Gerador de Campanhas Anuais (legado PI-5).
 * POST /api/campanha-anual
 * UI de plano anual removida; endpoint mantido por compat/ops.
 * Auth: Authorization Bearer <Appwrite JWT>
 */
import gerarCampanhaAnualHandler from '../lib/server/gerarCampanhaAnualHandler.js';

export const config = {
  maxDuration: 60,
};

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }
  return gerarCampanhaAnualHandler(req, res);
}
