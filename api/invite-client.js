/**
 * API Convite de cliente ao portal.
 * POST /api/invite-client
 */
import inviteClientHandler from '../lib/server/inviteClientHandler.js';

export const config = {
  maxDuration: 30,
};

export default async function handler(req, res) {
  return inviteClientHandler(req, res);
}
