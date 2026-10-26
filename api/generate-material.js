/**
 * API — Geração de propostas / apresentações via Claude Agent Skills.
 *
 * POST /api/generate-material?route=create
 * GET  /api/generate-material?route=status&jobId=
 * GET  /api/generate-material?route=skills
 *
 * Auth: Authorization Bearer <Appwrite JWT>
 */
import generateMaterialHandler from '../lib/server/generateMaterialHandler.js';

export const config = {
  maxDuration: 300,
};

export default async function handler(req, res) {
  return generateMaterialHandler(req, res);
}
