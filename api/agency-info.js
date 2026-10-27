/**
 * API — Central de Informações da Agência (itens não-secretos).
 *
 * GET/POST /api/agency-info?route=...
 * Auth: Authorization Bearer <Appwrite JWT>
 */
import agencyInfoHandler from '../lib/server/agencyInfoHandler.js';

export default async function handler(req, res) {
  return agencyInfoHandler(req, res);
}
