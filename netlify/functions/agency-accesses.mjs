/**
 * Netlify Function — agency-accesses (credenciais criptografadas da agência).
 * Exposed as /api/agency-accesses
 */
import agencyAccessesHandler from '../../lib/server/agencyAccessesHandler.js';
import { createNetlifyHandler } from '../../lib/server/netlifyHttpBridge.js';

export const handler = createNetlifyHandler(agencyAccessesHandler, 'agency-accesses');
