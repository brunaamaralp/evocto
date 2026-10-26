/**
 * Netlify Function — client-accesses (credenciais criptografadas por cliente).
 * Exposed as /api/client-accesses
 */
import clientAccessesHandler from '../../lib/server/clientAccessesHandler.js';
import { createNetlifyHandler } from '../../lib/server/netlifyHttpBridge.js';

export const handler = createNetlifyHandler(clientAccessesHandler, 'client-accesses');
