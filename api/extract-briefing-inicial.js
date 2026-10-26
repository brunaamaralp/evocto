/**
 * API — Extrai DNA do briefing inicial a partir de PDF / DOCX / TXT.
 *
 * POST /api/extract-briefing-inicial
 * Auth: Authorization Bearer <Appwrite JWT>
 */
import extractBriefingInicialHandler from '../lib/server/extractBriefingInicialHandler.js';

export const config = {
  maxDuration: 120,
};

export default async function handler(req, res) {
  return extractBriefingInicialHandler(req, res);
}
