import axios from 'axios';

// Configuração da API usando variáveis de ambiente
const baseURL = import.meta.env.VITE_API_URL || 'http://localhost:3000';
const useMocks = import.meta.env.VITE_USE_MOCKS === 'true';

// Instância do axios configurada
export const api = axios.create({
  baseURL,
  withCredentials: true,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  }
});

// Interceptor para requests
api.interceptors.request.use(
  (config) => {
    // Adicionar token de autenticação se disponível
    const token = localStorage.getItem('auth_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    
    // Log em desenvolvimento
    if (import.meta.env.DEV) {
      console.log(`🚀 API Request: ${config.method?.toUpperCase()} ${config.url}`);
    }
    
    return config;
  },
  (error) => {
    console.error('❌ API Request Error:', error);
    return Promise.reject(error);
  }
);

// Interceptor para responses
api.interceptors.response.use(
  (response) => {
    // Log em desenvolvimento
    if (import.meta.env.DEV) {
      console.log(`✅ API Response: ${response.status} ${response.config.url}`);
    }
    return response;
  },
  (error) => {
    console.error('❌ API Response Error:', error);
    
    // Tratar erros específicos
    if (error.response?.status === 401) {
      // Token expirado ou inválido
      localStorage.removeItem('auth_token');
      window.location.href = '/login';
    }
    
    return Promise.reject(error);
  }
);

// Funções utilitárias para chamadas da API
export const apiClient = {
  // GET request
  get: (url, config = {}) => api.get(url, config),
  
  // POST request
  post: (url, data = {}, config = {}) => api.post(url, data, config),
  
  // PUT request
  put: (url, data = {}, config = {}) => api.put(url, data, config),
  
  // PATCH request
  patch: (url, data = {}, config = {}) => api.patch(url, data, config),
  
  // DELETE request
  delete: (url, config = {}) => api.delete(url, config),
};

// Configuração para usar mocks
export const useMockAPI = useMocks;

// URLs da API (sem hostname)
export const API_ENDPOINTS = {
  // Autenticação
  AUTH: {
    LOGIN: '/api/auth/login',
    LOGOUT: '/api/auth/logout',
    REFRESH: '/api/auth/refresh',
    ME: '/api/auth/me',
  },
  
  // Clientes
  CLIENTS: {
    LIST: '/api/clients',
    CREATE: '/api/clients',
    GET: (id) => `/api/clients/${id}`,
    UPDATE: (id) => `/api/clients/${id}`,
    DELETE: (id) => `/api/clients/${id}`,
  },
  
  // Serviços
  SERVICES: {
    LIST: '/api/services',
    CREATE: '/api/services',
    GET: (id) => `/api/services/${id}`,
    UPDATE: (id) => `/api/services/${id}`,
    DELETE: (id) => `/api/services/${id}`,
  },
  
  // Tarefas
  TASKS: {
    LIST: '/api/tasks',
    CREATE: '/api/tasks',
    GET: (id) => `/api/tasks/${id}`,
    UPDATE: (id) => `/api/tasks/${id}`,
    DELETE: (id) => `/api/tasks/${id}`,
  },
  
  // Logs
  LOGS: {
    LIST: '/api/logs',
    CREATE: '/api/logs',
    GET: (id) => `/api/logs/${id}`,
  },
  
  // Health check
  HEALTH: '/api/health',
};

// Exportar configurações para uso em outros arquivos
export const API_CONFIG = {
  baseURL,
  useMocks,
  timeout: 10000,
};

export default api;
