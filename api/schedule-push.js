/**
 * API agendamento externo (Buffer / Later / Metricool).
 * Rotas: ?route=status|push
 */
import schedulePushHandler from '../lib/server/schedulePushHandler.js';

export const config = {
  maxDuration: 60,
  api: {
    bodyParser: {
      sizeLimit: '1mb',
    },
  },
};

export default schedulePushHandler;
