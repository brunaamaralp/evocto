import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  CheckCircle, XCircle, AlertTriangle, Info,
  Loader2, Wifi, WifiOff, Clock, Zap
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';

// Sistema de Toast aprimorado para feedback consistente
export const FeedbackToast = {
  success: (message, options = {}) => {
    toast.success(message, {
      icon: <CheckCircle className="w-5 h-5 text-green-600" />,
      duration: 4000,
      className: 'border-green-200 bg-green-50',
      ...options
    });
  },
  
  error: (message, options = {}) => {
    toast.error(message, {
      icon: <XCircle className="w-5 h-5 text-red-600" />,
      duration: 6000,
      className: 'border-red-200 bg-red-50',
      action: options.retry ? {
        label: 'Tentar Novamente',
        onClick: options.retry
      } : undefined,
      ...options
    });
  },
  
  warning: (message, options = {}) => {
    toast.warning(message, {
      icon: <AlertTriangle className="w-5 h-5 text-yellow-600" />,
      duration: 5000,
      className: 'border-yellow-200 bg-yellow-50',
      ...options
    });
  },
  
  info: (message, options = {}) => {
    toast.info(message, {
      icon: <Info className="w-5 h-5 text-blue-600" />,
      duration: 4000,
      className: 'border-blue-200 bg-blue-50',
      ...options
    });
  },
  
  loading: (message, promise, options = {}) => {
    return toast.promise(promise, {
      loading: (
        <div className="flex items-center">
          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          {message}
        </div>
      ),
      success: options.success || 'Concluído com sucesso!',
      error: options.error || 'Algo deu errado. Tente novamente.',
      ...options
    });
  }
};

// Componente de loading state aprimorado
export function SmartLoadingState({ 
  loading, 
  message = 'Carregando...', 
  progress = null,
  estimatedTime = null,
  children 
}) {
  const [dots, setDots] = useState('');

  useEffect(() => {
    if (!loading) return;
    
    const interval = setInterval(() => {
      setDots(prev => prev.length >= 3 ? '' : prev + '.');
    }, 500);

    return () => clearInterval(interval);
  }, [loading]);

  if (!loading) return children;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="flex flex-col items-center justify-center p-8 space-y-4"
    >
      <div className="relative">
        <div className="w-16 h-16 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
        <div className="absolute inset-0 flex items-center justify-center">
          <Loader2 className="w-6 h-6 text-blue-600" />
        </div>
      </div>
      
      <div className="text-center space-y-2">
        <p className="text-lg font-medium text-gray-900">
          {message}{dots}
        </p>
        
        {estimatedTime && (
          <p className="text-sm text-gray-500 flex items-center justify-center">
            <Clock className="w-4 h-4 mr-1" />
            Tempo estimado: {estimatedTime}
          </p>
        )}
        
        {progress !== null && (
          <div className="w-64 space-y-2">
            <Progress value={progress} className="h-2" />
            <p className="text-xs text-gray-500">{progress}% concluído</p>
          </div>
        )}
      </div>
    </motion.div>
  );
}

// Status de conexão em tempo real
export function ConnectionStatus() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [showStatus, setShowStatus] = useState(false);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      setShowStatus(true);
      FeedbackToast.success('Conexão restaurada!');
      setTimeout(() => setShowStatus(false), 3000);
    };

    const handleOffline = () => {
      setIsOnline(false);
      setShowStatus(true);
      FeedbackToast.warning('Sem conexão com a internet', {
        duration: Infinity,
        action: {
          label: 'Tentar Reconectar',
          onClick: () => window.location.reload()
        }
      });
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return (
    <AnimatePresence>
      {showStatus && (
        <motion.div
          initial={{ opacity: 0, y: -50 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -50 }}
          className={`fixed top-4 right-4 z-50 px-4 py-2 rounded-lg shadow-lg flex items-center space-x-2 ${
            isOnline 
              ? 'bg-green-50 border border-green-200 text-green-800' 
              : 'bg-red-50 border border-red-200 text-red-800'
          }`}
        >
          {isOnline ? (
            <Wifi className="w-4 h-4" />
          ) : (
            <WifiOff className="w-4 h-4" />
          )}
          <span className="text-sm font-medium">
            {isOnline ? 'Online' : 'Offline'}
          </span>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// Botão com estados de loading aprimorados
export function SmartButton({
  children,
  loading = false,
  success = false,
  error = false,
  loadingText = 'Carregando...',
  successText = 'Sucesso!',
  errorText = 'Erro',
  resetDelay = 2000,
  onClick,
  disabled,
  ...props
}) {
  const [currentState, setCurrentState] = useState('idle');

  useEffect(() => {
    if (loading) {
      setCurrentState('loading');
    } else if (success) {
      setCurrentState('success');
      setTimeout(() => setCurrentState('idle'), resetDelay);
    } else if (error) {
      setCurrentState('error');
      setTimeout(() => setCurrentState('idle'), resetDelay);
    }
  }, [loading, success, error, resetDelay]);

  const getButtonContent = () => {
    switch (currentState) {
      case 'loading':
        return (
          <>
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            {loadingText}
          </>
        );
      case 'success':
        return (
          <>
            <CheckCircle className="w-4 h-4 mr-2" />
            {successText}
          </>
        );
      case 'error':
        return (
          <>
            <XCircle className="w-4 h-4 mr-2" />
            {errorText}
          </>
        );
      default:
        return children;
    }
  };

  const getButtonClass = () => {
    switch (currentState) {
      case 'success':
        return 'bg-green-600 hover:bg-green-700 border-green-600';
      case 'error':
        return 'bg-red-600 hover:bg-red-700 border-red-600';
      default:
        return '';
    }
  };

  return (
    <Button
      {...props}
      onClick={onClick}
      disabled={disabled || loading}
      className={`transition-all duration-300 ${getButtonClass()} ${props.className || ''}`}
    >
      <motion.div
        key={currentState}
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        className="flex items-center"
      >
        {getButtonContent()}
      </motion.div>
    </Button>
  );
}

// Sistema de progresso para operações multi-step
export function StepProgress({ 
  steps, 
  currentStep, 
  completedSteps = [], 
  className = '' 
}) {
  return (
    <div className={`w-full ${className}`}>
      <div className="flex justify-between mb-4">
        {steps.map((step, index) => {
          const isCompleted = completedSteps.includes(index);
          const isCurrent = index === currentStep;
          const isUpcoming = index > currentStep;

          return (
            <div
              key={step.id}
              className={`flex items-center ${
                index < steps.length - 1 ? 'flex-1' : ''
              }`}
            >
              <div className="relative flex flex-col items-center">
                <div
                  className={`
                    w-10 h-10 rounded-full border-2 flex items-center justify-center transition-all duration-300
                    ${isCompleted 
                      ? 'bg-green-600 border-green-600 text-white' 
                      : isCurrent 
                        ? 'bg-blue-600 border-blue-600 text-white' 
                        : 'bg-white border-gray-300 text-gray-400'
                    }
                  `}
                >
                  {isCompleted ? (
                    <CheckCircle className="w-5 h-5" />
                  ) : (
                    <span className="text-sm font-medium">{index + 1}</span>
                  )}
                </div>
                
                <span className={`
                  text-xs mt-2 text-center max-w-20 leading-tight
                  ${isCurrent ? 'text-blue-600 font-medium' : 'text-gray-500'}
                `}>
                  {step.label}
                </span>
              </div>
              
              {index < steps.length - 1 && (
                <div className={`
                  flex-1 h-0.5 mx-4 mt-5 transition-all duration-300
                  ${isCompleted ? 'bg-green-600' : 'bg-gray-300'}
                `} />
              )}
            </div>
          );
        })}
      </div>
      
      <div className="text-center">
        <p className="text-sm text-gray-600">
          Passo {currentStep + 1} de {steps.length}: <span className="font-medium">{steps[currentStep]?.label}</span>
        </p>
      </div>
    </div>
  );
}

// Indicador de auto-save
export function AutoSaveIndicator({ 
  lastSaved, 
  saving = false, 
  error = false 
}) {
  const [showIndicator, setShowIndicator] = useState(false);

  useEffect(() => {
    if (saving || error) {
      setShowIndicator(true);
    } else if (lastSaved) {
      setShowIndicator(true);
      const timer = setTimeout(() => setShowIndicator(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [saving, error, lastSaved]);

  if (!showIndicator) return null;

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      className={`
        fixed bottom-4 right-4 px-3 py-2 rounded-lg shadow-lg flex items-center space-x-2 text-sm
        ${saving 
          ? 'bg-blue-50 border border-blue-200 text-blue-800' 
          : error 
            ? 'bg-red-50 border border-red-200 text-red-800' 
            : 'bg-green-50 border border-green-200 text-green-800'
        }
      `}
    >
      {saving ? (
        <>
          <Loader2 className="w-4 h-4 animate-spin" />
          <span>Salvando...</span>
        </>
      ) : error ? (
        <>
          <XCircle className="w-4 h-4" />
          <span>Erro ao salvar</span>
        </>
      ) : (
        <>
          <CheckCircle className="w-4 h-4" />
          <span>Salvo automaticamente</span>
        </>
      )}
    </motion.div>
  );
}