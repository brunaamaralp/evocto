/**
 * Netlify Function — client portal (requireClient + admin queries).
 * Exposed as /api/client-portal via netlify.toml redirect.
 */
import clientPortalHandler from '../../lib/server/clientPortalHandler.js';
import { createNetlifyHandler } from '../../lib/server/netlifyHttpBridge.js';

export const handler = createNetlifyHandler(clientPortalHandler, 'client-portal');
