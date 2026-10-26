/**
 * Netlify Function — public briefing (validate/save/apply-client via API key).
 * Exposed as /api/public-briefing via netlify.toml redirect.
 */
import publicBriefingHandler from '../../lib/server/publicBriefingHandler.js';
import { createNetlifyHandler } from '../../lib/server/netlifyHttpBridge.js';

export const handler = createNetlifyHandler(publicBriefingHandler, 'public-briefing');
