/**
 * API — Acessos e credenciais do cliente (agency staff only).
 *
 * GET/POST /api/client-accesses?route=...
 * Auth: Authorization Bearer <Appwrite JWT>
 */
import clientAccessesHandler from '../lib/server/clientAccessesHandler.js';

export default async function handler(req, res) {
  return clientAccessesHandler(req, res);
}
