import { createClient } from '@base44/sdk';
// import { getAccessToken } from '@base44/sdk/utils/auth-utils';

// Configuração usando variáveis de ambiente
const baseURL = import.meta.env.VITE_API_URL || 'http://localhost:3000';
const useMocks = import.meta.env.VITE_USE_MOCKS === 'true';

// Create a client with authentication required
export const base44 = createClient({
  appId: "68b6fbf84ee31efada179fdf", 
  requiresAuth: true, // Ensure authentication is required for all operations
  baseURL, // Usar URL da variável de ambiente
  useMocks // Usar mocks se configurado
});

// Exportar configurações para uso em outros arquivos
export const BASE44_CONFIG = {
  appId: "68b6fbf84ee31efada179fdf",
  baseURL,
  useMocks,
  requiresAuth: true
};
