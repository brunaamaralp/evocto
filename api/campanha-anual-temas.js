/**
 * API Vercel — Sugestão de temas do plano anual (legado PI-5).
 * POST /api/campanha-anual-temas
 * UI removida; endpoint mantido por compat.
 */
import gerarTemasAnualHandler from '../lib/server/gerarTemasAnualHandler.js';

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
  return gerarTemasAnualHandler(req, res);
}
