/**
 * API Entregas / Google Drive / Review público.
 * Rotas: ?route=drive-status|drive-connect|drive-callback|drive-disconnect|
 *   create|list|get|upload-from-storage|submit|regenerate-token|reopen|
 *   review|review-file|approve|request-changes
 */
import materialDeliveriesHandler from '../lib/server/materialDeliveriesHandler.js';

export const config = {
  maxDuration: 60,
  api: {
    bodyParser: {
      sizeLimit: '1mb',
    },
  },
};

export default materialDeliveriesHandler;
