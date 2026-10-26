/**
 * Netlify Function — extract-briefing-inicial
 * Exposed as /api/extract-briefing-inicial via netlify.toml redirect.
 */
import extractBriefingInicialHandler from '../../lib/server/extractBriefingInicialHandler.js';
import { createNetlifyHandler } from '../../lib/server/netlifyHttpBridge.js';

export const handler = createNetlifyHandler(
  extractBriefingInicialHandler,
  'extract-briefing-inicial'
);
