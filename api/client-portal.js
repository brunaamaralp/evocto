/**
 * API Portal do Cliente.
 * Rotas: ?route=bootstrap|overview|annual-plan|campaigns|campaign|client-actions|
 * complete-client-action|shared-tasks|documents|services|pending-actions|approvals|approval-detail|decide
 */
import clientPortalHandler from '../lib/server/clientPortalHandler.js';

export const config = {
  maxDuration: 30,
  api: {
    bodyParser: {
      sizeLimit: '256kb',
    },
  },
};

export default clientPortalHandler;
