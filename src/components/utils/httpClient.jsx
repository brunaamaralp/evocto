import { User } from '@/api/entities';

// Configurações do cliente HTTP
const HTTP_CONFIG = {
  baseURL: process.env.REACT_APP_API_URL || '',
  timeout: 30000,
  retries: 3,
  retryDelay: 1000,
  retryDelayMultiplier: 2
};

// Códigos de status que devem ser retentados
const RETRYABLE_STATUS_CODES = [408, 429, 500, 502, 503, 504];

// Códigos de status para diferentes tipos de erro
const STATUS_CODES = {
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  UNPROCESSABLE_ENTITY: 422,
  TOO_MANY_REQUESTS: 429,
  INTERNAL_SERVER_ERROR: 500
};

class HttpClient {
  constructor(config = {}) {
    this.config = { ...HTTP_CONFIG, ...config };
    this.requestInterceptors = [];
    this.responseInterceptors = [];
    this.setupDefaultInterceptors();
  }

  setupDefaultInterceptors() {
    // Request interceptor para adicionar auth headers
    this.requestInterceptors.push(async (config) => {
      try {
        const user = await User.me();
        if (user?.token) {
          config.headers = {
            ...config.headers,
            'Authorization': `Bearer ${user.token}`
          };
        }
      } catch (error) {
        // Silently fail - request pode ser público
      }
      return config;
    });

    // Response interceptor para lidar com erros de auth
    this.responseInterceptors.push(
      (response) => response,
      async (error) => {
        const originalRequest = error.config;

        if (error.response?.status === STATUS_CODES.UNAUTHORIZED && !originalRequest._retry) {
          originalRequest._retry = true;

          try {
            // Tentar refresh do token
            await User.refreshToken?.();
            return this.request(originalRequest);
          } catch (refreshError) {
            // Refresh falhou, redirecionar para login
            await User.logout();
            window.location.href = '/login';
            return Promise.reject(refreshError);
          }
        }

        return Promise.reject(error);
      }
    );
  }

  async request(config) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.config.timeout);

    try {
      // Aplicar interceptors de request
      let requestConfig = {
        ...config,
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json',
          ...config.headers
        }
      };

      for (const interceptor of this.requestInterceptors) {
        requestConfig = await interceptor(requestConfig);
      }

      // Fazer a requisição
      const response = await this.makeRequest(requestConfig);
      
      // Aplicar interceptors de response
      let finalResponse = response;
      for (const interceptor of this.responseInterceptors) {
        try {
          finalResponse = await interceptor[0](finalResponse);
        } catch (error) {
          if (interceptor[1]) {
            finalResponse = await interceptor[1](error);
          } else {
            throw error;
          }
        }
      }

      return finalResponse;
    } finally {
      clearTimeout(timeoutId);
    }
  }

  async makeRequest(config, attempt = 1) {
    try {
      const url = `${this.config.baseURL}${config.url || ''}`;
      
      const response = await fetch(url, {
        method: config.method || 'GET',
        headers: config.headers,
        body: config.data ? JSON.stringify(config.data) : undefined,
        signal: config.signal
      });

      if (!response.ok) {
        throw new HttpError(
          `HTTP Error: ${response.status}`,
          response.status,
          response.statusText,
          config
        );
      }

      const data = await response.json().catch(() => null);
      
      return {
        data,
        status: response.status,
        statusText: response.statusText,
        headers: response.headers,
        config
      };

    } catch (error) {
      if (attempt < this.config.retries && this.shouldRetry(error)) {
        const delay = this.config.retryDelay * Math.pow(this.config.retryDelayMultiplier, attempt - 1);
        await this.sleep(delay);
        return this.makeRequest(config, attempt + 1);
      }
      throw error;
    }
  }

  shouldRetry(error) {
    if (error.name === 'AbortError') return false;
    if (error instanceof HttpError) {
      return RETRYABLE_STATUS_CODES.includes(error.status);
    }
    return true; // Retry network errors
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Métodos convenientes
  get(url, config = {}) {
    return this.request({ ...config, method: 'GET', url });
  }

  post(url, data, config = {}) {
    return this.request({ ...config, method: 'POST', url, data });
  }

  put(url, data, config = {}) {
    return this.request({ ...config, method: 'PUT', url, data });
  }

  patch(url, data, config = {}) {
    return this.request({ ...config, method: 'PATCH', url, data });
  }

  delete(url, config = {}) {
    return this.request({ ...config, method: 'DELETE', url });
  }
}

// Classe de erro HTTP customizada
class HttpError extends Error {
  constructor(message, status, statusText, config) {
    super(message);
    this.name = 'HttpError';
    this.status = status;
    this.statusText = statusText;
    this.config = config;
  }

  // Helper methods para tipos de erro
  isUnauthorized() {
    return this.status === STATUS_CODES.UNAUTHORIZED;
  }

  isForbidden() {
    return this.status === STATUS_CODES.FORBIDDEN;
  }

  isNotFound() {
    return this.status === STATUS_CODES.NOT_FOUND;
  }

  isValidationError() {
    return this.status === STATUS_CODES.UNPROCESSABLE_ENTITY;
  }

  isServerError() {
    return this.status >= 500;
  }

  isRetryable() {
    return RETRYABLE_STATUS_CODES.includes(this.status);
  }
}

// Instância global do cliente HTTP
const httpClient = new HttpClient();

export { HttpClient, HttpError, httpClient };
export default httpClient;