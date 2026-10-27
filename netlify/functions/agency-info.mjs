/**
 * Netlify Function — agency-info (Central de Informações da Agência).
 * Exposed as /api/agency-info
 */
import agencyInfoHandler from '../../lib/server/agencyInfoHandler.js';
import { createNetlifyHandler } from '../../lib/server/netlifyHttpBridge.js';

export const handler = createNetlifyHandler(agencyInfoHandler, 'agency-info');
