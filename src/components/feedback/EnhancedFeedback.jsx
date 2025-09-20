import React from 'react';
import { toast } from 'sonner';
import { 
  CheckCircle, AlertTriangle, XCircle, Info, 
  Loader2, Upload, Download, Save, Send, 
  RefreshCw, Zap, Clock, Bell
} from 'lucide-react';

// Enhanced toast notifications with better visuals
export const showToast = {
  success: (message, options = {}) => {
    toast.success(message, {
      icon: <CheckCircle className="w-5 h-5 text-emerald-600" />,
      className: 'border-emerald-200 bg-emerald-50',
      duration: 4000,
      ...options
    });
  },

  error: (message, options = {}) => {
    toast.error(message, {
      icon: <XCircle className="w-5 h-5 text-red-600" />,
      className: 'border-red-200 bg-red-50',
      duration: 6000,
      ...options
    });
  },

  warning: (message, options = {}) => {
    toast.warning(message, {
      icon: <AlertTriangle className="w-5 h-5 text-amber-600" />,
      className: 'border-amber-200 bg-amber-50',
      duration: 5000,
      ...options
    });
  },

  info: (message, options = {}) => {
    toast.info(message, {
      icon: <Info className="w-5 h-5 text-blue-600" />,
      className: 'border-blue-200 bg-blue-50',
      duration: 4000,
      ...options
    });
  },

  loading: (message, options = {}) => {
    return toast.loading(message, {
      icon: <Loader2 className="w-5 h-5 text-slate-600 animate-spin" />,
      className: 'border-slate-200 bg-slate-50',
      ...options
    });
  },

  promise: (promise, messages) => {
    return toast.promise(promise, {
      loading: {
        title: messages.loading,
        icon: <Loader2 className="w-5 h-5 animate-spin" />
      },
      success: {
        title: messages.success,
        icon: <CheckCircle className="w-5 h-5 text-emerald-600" />
      },
      error: {
        title: messages.error,
        icon: <XCircle className="w-5 h-5 text-red-600" />
      }
    });
  },

  action: (message, actionLabel, actionFn) => {
    toast.success(message, {
      action: {
        label: actionLabel,
        onClick: actionFn
      },
      duration: 8000
    });
  },

  // Specific action toasts
  saved: (entity = 'Item') => {
    showToast.success(`${entity} salvo com sucesso!`, {
      icon: <Save className="w-5 h-5 text-emerald-600" />
    });
  },

  uploaded: (fileName) => {
    showToast.success(`${fileName} enviado com sucesso!`, {
      icon: <Upload className="w-5 h-5 text-emerald-600" />
    });
  },

  downloaded: (fileName) => {
    showToast.success(`${fileName} baixado com sucesso!`, {
      icon: <Download className="w-5 h-5 text-emerald-600" />
    });
  },

  sent: (entity = 'Mensagem') => {
    showToast.success(`${entity} enviada com sucesso!`, {
      icon: <Send className="w-5 h-5 text-emerald-600" />
    });
  },

  synced: () => {
    showToast.success('Dados sincronizados!', {
      icon: <RefreshCw className="w-5 h-5 text-emerald-600" />
    });
  },

  scheduled: (entity, time) => {
    showToast.info(`${entity} agendado para ${time}`, {
      icon: <Clock className="w-5 h-5 text-blue-600" />
    });
  },

  automated: (action) => {
    showToast.info(`${action} automatizado ativado`, {
      icon: <Zap className="w-5 h-5 text-purple-600" />
    });
  },

  notification: (message) => {
    showToast.info(message, {
      icon: <Bell className="w-5 h-5 text-blue-600" />
    });
  }
};

// Loading overlay component
export const LoadingOverlay = ({ isVisible, message = 'Carregando...' }) => {
  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 bg-black/20 backdrop-blur-sm z-50 flex items-center justify-center">
      <div className="bg-white rounded-xl shadow-xl p-6 flex items-center gap-4 max-w-sm mx-4">
        <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
        <span className="text-slate-700 font-medium">{message}</span>
      </div>
    </div>
  );
};

// Progress indicator
export const ProgressIndicator = ({ progress, message, showPercentage = true }) => {
  const clampedProgress = Math.max(0, Math.min(100, progress));

  return (
    <div className="w-full">
      {message && (
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm text-slate-600">{message}</span>
          {showPercentage && (
            <span className="text-sm font-medium text-slate-900">
              {Math.round(clampedProgress)}%
            </span>
          )}
        </div>
      )}
      <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
        <div 
          className="h-full bg-gradient-to-r from-blue-500 to-purple-600 transition-all duration-300 ease-out rounded-full"
          style={{ width: `${clampedProgress}%` }}
        />
      </div>
    </div>
  );
};

// Success animation
export const SuccessAnimation = ({ isVisible, onComplete }) => {
  React.useEffect(() => {
    if (isVisible && onComplete) {
      const timer = setTimeout(onComplete, 2000);
      return () => clearTimeout(timer);
    }
  }, [isVisible, onComplete]);

  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 bg-black/20 backdrop-blur-sm z-50 flex items-center justify-center">
      <div className="bg-white rounded-xl shadow-xl p-8 flex flex-col items-center max-w-sm mx-4">
        <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mb-4 animate-bounce">
          <CheckCircle className="w-8 h-8 text-emerald-600" />
        </div>
        <span className="text-lg font-semibold text-slate-900">Sucesso!</span>
        <span className="text-sm text-slate-600 text-center mt-1">
          Operação concluída com êxito
        </span>
      </div>
    </div>
  );
};

// Error boundary with better UX
export const ErrorFallback = ({ error, resetErrorBoundary }) => (
  <div className="min-h-64 flex items-center justify-center p-8">
    <div className="text-center">
      <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
        <XCircle className="w-8 h-8 text-red-600" />
      </div>
      <h3 className="text-lg font-semibold text-slate-900 mb-2">
        Algo deu errado
      </h3>
      <p className="text-slate-600 mb-4 max-w-md">
        Ocorreu um erro inesperado. Nossa equipe foi notificada automaticamente.
      </p>
      <button
        onClick={resetErrorBoundary}
        className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors"
      >
        Tentar novamente
      </button>
    </div>
  </div>
);