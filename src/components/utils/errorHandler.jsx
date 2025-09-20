import { toast } from 'sonner';

// Safe development detection
const isDevelopment = typeof window !== 'undefined' && window.location.hostname === 'localhost';

/**
 * Sistema centralizado de tratamento de erros com códigos padronizados
 */
export class ErrorHandler {
  constructor(t) {
    this.t = t; // função de tradução
  }

  /**
   * Trata erros de API e mostra mensagens apropriadas
   */
  handleApiError(error, context = {}) {
    // Log detalhado apenas em desenvolvimento
    if (isDevelopment) {
      console.error('[ErrorHandler] API Error:', error, 'Context:', context);
    }

    let message = '';
    let code = '';

    // Extrair código de erro se disponível
    if (error?.response?.data?.code) {
      code = error.response.data.code;
    } else if (error?.code) {
      code = error.code;
    } else if (error?.message) {
      // Tentar extrair código da mensagem
      const codeMatch = error.message.match(/code:\s*(\w+)/i);
      if (codeMatch) {
        code = codeMatch[1];
      }
    }

    // Obter mensagem traduzida usando o código
    if (code && this.t(`errors.${code}`)) {
      message = this.t(`errors.${code}`);
    } else {
      // Fallback para mensagens baseadas no status HTTP
      const status = error?.response?.status || error?.status;
      
      switch (status) {
        case 401:
          message = this.t('errors.unauthorized');
          break;
        case 403:
          message = this.t('errors.unauthorized');
          break;
        case 404:
          message = this.t('errors.notFound');
          break;
        case 409:
          message = this.t('errors.AGENCY_NAME_ALREADY_EXISTS') || 'Conflict occurred';
          break;
        case 500:
          message = this.t('errors.INTERNAL_SERVER_ERROR');
          break;
        default:
          message = this.t('errors.general');
      }
    }

    // Mostrar toast com mensagem traduzida
    toast.error(message, {
      duration: 5000,
      action: context.retry ? {
        label: this.t('cta.tryAgain'),
        onClick: context.retry
      } : undefined
    });

    return {
      code,
      message,
      originalError: error
    };
  }

  /**
   * Trata erros de validação de formulário
   */
  handleValidationError(fields, errors) {
    const firstError = Object.values(errors)[0];
    if (firstError) {
      toast.error(firstError.message || this.t('errors.MISSING_REQUIRED_FIELDS'));
    }
  }

  /**
   * Trata erros de rede
   */
  handleNetworkError(error, context = {}) {
    if (isDevelopment) {
      console.error('[ErrorHandler] Network Error:', error);
    }

    let message = this.t('errors.network');
    
    if (!navigator.onLine) {
      message = this.t('errors.offline');
    }

    toast.error(message, {
      duration: 8000,
      action: context.retry ? {
        label: this.t('cta.tryAgain'),
        onClick: context.retry
      } : undefined
    });

    return { message, originalError: error };
  }
}

/**
 * Hook para usar o ErrorHandler com tradução
 */
export function useErrorHandler() {
  // Se não tiver acesso ao hook de tradução, usar uma versão simplificada
  const t = (key, defaultValue = key) => {
    // Traduções básicas como fallback
    const basicTranslations = {
      'errors.general': 'Algo deu errado. Tente novamente.',
      'errors.network': 'Falha na conexão. Verifique sua internet.',
      'errors.unauthorized': 'Você não tem acesso a esta área.',
      'errors.ONLY_PLATFORM_ADMINS_UPDATE_ROLES': 'Apenas administradores da plataforma podem atualizar papéis de usuário',
      'errors.AGENCY_CREATION_FAILED': 'Falha ao criar agência',
      'cta.tryAgain': 'Tentar Novamente'
    };
    
    return basicTranslations[key] || defaultValue;
  };

  return new ErrorHandler(t);
}

/**
 * Utility para extrair código de erro de diferentes formatos
 */
export function extractErrorCode(error) {
  if (error?.response?.data?.code) return error.response.data.code;
  if (error?.code) return error.code;
  if (error?.message?.includes('platform admin')) return 'ONLY_PLATFORM_ADMINS_UPDATE_ROLES';
  return null;
}

/**
 * Utility para determinar se um erro é relacionado a permissões
 */
export function isPermissionError(error) {
  const code = extractErrorCode(error);
  const status = error?.response?.status || error?.status;
  
  return code === 'ONLY_PLATFORM_ADMINS_UPDATE_ROLES' || 
         status === 403 || 
         status === 401;
}

export default ErrorHandler;