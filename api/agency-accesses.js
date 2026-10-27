/**
 * API — Acessos e credenciais da agência (agency staff only).
 *
 * GET/POST /api/agency-accesses?route=...
 * Auth: Authorization Bearer <Appwrite JWT>
 */
import agencyAccessesHandler from '../lib/server/agencyAccessesHandler.js';

export default async function handler(req, res) {
  return agencyAccessesHandler(req, res);
}
