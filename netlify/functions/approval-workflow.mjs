/**
 * Netlify Function — classic approval workflow (create staff / validate+process public).
 * Exposed as /api/approval-workflow via netlify.toml redirect.
 */
import approvalWorkflowHandler from '../../lib/server/approvalWorkflowHandler.js';
import { createNetlifyHandler } from '../../lib/server/netlifyHttpBridge.js';

export const handler = createNetlifyHandler(approvalWorkflowHandler, 'approval-workflow');
