// Mensagens de erro de autenticação bilíngues
export const AUTH_ERRORS = {
  USER_NOT_AUTHENTICATED: {
    en: 'User not authenticated',
    pt: 'Usuário não autenticado'
  },
  AUTH_SERVICE_UNAVAILABLE: {
    en: 'Auth service unavailable',
    pt: 'Serviço de autenticação indisponível'
  },
  TOKEN_EXPIRED: {
    en: 'Token expired',
    pt: 'Token expirado'
  },
  REFRESH_TOKEN_INVALID: {
    en: 'Refresh token invalid',
    pt: 'Token de renovação inválido'
  },
  SESSION_EXPIRED: {
    en: 'Session expired. Please log in again.',
    pt: 'Sessão expirada. Faça login novamente.'
  },
  INVALID_CREDENTIALS: {
    en: 'Invalid credentials',
    pt: 'Credenciais inválidas'
  },
  NETWORK_ERROR: {
    en: 'Network error. Please check your connection.',
    pt: 'Erro de rede. Verifique sua conexão.'
  },
  UNEXPECTED_ERROR: {
    en: 'An unexpected error occurred',
    pt: 'Ocorreu um erro inesperado'
  }
};

export function getAuthError(errorKey, language = 'en') {
  const error = AUTH_ERRORS[errorKey];
  if (!error) {
    return AUTH_ERRORS.UNEXPECTED_ERROR[language];
  }
  return error[language] || error.en;
}

// Tipos de erro para facilitar uso
export const AUTH_ERROR_TYPES = {
  USER_NOT_AUTHENTICATED: 'USER_NOT_AUTHENTICATED',
  AUTH_SERVICE_UNAVAILABLE: 'AUTH_SERVICE_UNAVAILABLE',
  TOKEN_EXPIRED: 'TOKEN_EXPIRED',
  REFRESH_TOKEN_INVALID: 'REFRESH_TOKEN_INVALID',
  SESSION_EXPIRED: 'SESSION_EXPIRED',
  INVALID_CREDENTIALS: 'INVALID_CREDENTIALS',
  NETWORK_ERROR: 'NETWORK_ERROR',
  UNEXPECTED_ERROR: 'UNEXPECTED_ERROR'
};