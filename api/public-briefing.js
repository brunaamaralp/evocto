/**
 * API pública de briefing.
 * Rotas: ?route=validate|save|apply-client
 * Usa APPWRITE_API_KEY — convidados não precisam de Role.any() nas tables.
 */
import publicBriefingHandler from '../lib/server/publicBriefingHandler.js';

export const config = {
  maxDuration: 30,
  api: {
    bodyParser: {
      sizeLimit: '512kb',
    },
  },
};

export default publicBriefingHandler;
