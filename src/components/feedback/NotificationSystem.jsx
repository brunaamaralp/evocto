import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  CheckCircle2, 
  AlertTriangle, 
  Info, 
  Clock,
  RefreshCw,
  FileText,
  TrendingUp,
  Upload
} from 'lucide-react';

const NotificationContext = createContext();

const NOTIFICATION_TYPES = {
  SUCCESS: 'success',
  ERROR: 'error', 
  WARNING: 'warning',
  INFO: 'info',
  PROCESSING: 'processing'
};

const PROCESS_TYPES = {
  FILE_UPLOAD: 'file_upload',
  KPI_CALCULATION: 'kpi_calculation', 
  LEARNING_EXTRACTION: 'learning_extraction',
  REPORT_GENERATION: 'report_generation',
  DATA_PROCESSING: 'data_processing'
};

export function NotificationProvider({ children }) {
  const [activeProcesses, setActiveProcesses] = useState(new Map());
  const [notifications, setNotifications] = useState([]);

  // Registrar processo em background
  const registerProcess = useCallback((processId, type, description, estimatedDuration) => {
    setActiveProcesses(prev => {
      const newMap = new Map(prev);
      newMap.set(processId, {
        id: processId,
        type,
        description,
        startTime: Date.now(),
        estimatedDuration,
        status: 'processing',
        progress: 0
      });
      return newMap;
    });

    // Notificação inicial
    toast.info(`Iniciado: ${description}`, {
      duration: 3000,
      icon: <Clock className="w-4 h-4" />,
      position: 'bottom-right'
    });
  }, []);

  // Atualizar progresso do processo
  const updateProcess = useCallback((processId, progress, message) => {
    setActiveProcesses(prev => {
      const newMap = new Map(prev);
      const process = newMap.get(processId);
      if (process) {
        newMap.set(processId, {
          ...process,
          progress,
          lastUpdate: Date.now(),
          message
        });
      }
      return newMap;
    });
  }, []);

  // Completar processo
  const completeProcess = useCallback((processId, result, resultMessage) => {
    const process = activeProcesses.get(processId);
    if (!process) return;

    setActiveProcesses(prev => {
      const newMap = new Map(prev);
      newMap.delete(processId);
      return newMap;
    });

    // Notificação de conclusão
    toast.success(resultMessage || `Concluído: ${process.description}`, {
      duration: 4000,
      icon: <CheckCircle2 className="w-4 h-4" />,
      position: 'bottom-right',
      action: result?.actionLabel && result?.actionUrl ? {
        label: result.actionLabel,
        onClick: () => window.location.href = result.actionUrl
      } : undefined
    });
  }, [activeProcesses]);

  // Falhar processo
  const failProcess = useCallback((processId, error, retryCallback) => {
    const process = activeProcesses.get(processId);
    if (!process) return;

    setActiveProcesses(prev => {
      const newMap = new Map(prev);
      newMap.delete(processId);
      return newMap;
    });

    // Notificação de erro
    toast.error(`Erro em: ${process.description}`, {
      duration: 6000,
      description: error,
      icon: <AlertTriangle className="w-4 h-4" />,
      position: 'bottom-right',
      action: retryCallback ? {
        label: 'Tentar novamente',
        onClick: retryCallback
      } : undefined
    });
  }, [activeProcesses]);

  // Notificações específicas por tipo de processo
  const notifyFileUpload = useCallback((fileName, processId) => {
    registerProcess(
      processId, 
      PROCESS_TYPES.FILE_UPLOAD,
      `Upload: ${fileName}`,
      5000 // 5 segundos estimado
    );
  }, [registerProcess]);

  const notifyKPICalculation = useCallback((kpiName, processId) => {
    registerProcess(
      processId,
      PROCESS_TYPES.KPI_CALCULATION,
      `Calculando KPI: ${kpiName}`,
      3000 // 3 segundos estimado
    );
  }, [registerProcess]);

  const notifyLearningExtraction = useCallback ((clientName, processId) => {
    registerProcess(
      processId,
      PROCESS_TYPES.LEARNING_EXTRACTION, 
      `Extraindo aprendizados: ${clientName}`,
      15000 // 15 segundos estimado
    );
  }, [registerProcess]);

  const notifyDataProcessing = useCallback((fileName, processId) => {
    registerProcess(
      processId,
      PROCESS_TYPES.DATA_PROCESSING,
      `Processando dados: ${fileName}`,
      10000 // 10 segundos estimado
    );
  }, [registerProcess]);

  // Notificação simples (não de processo)
  const notify = useCallback((type, message, options = {}) => {
    const toastOptions = {
      duration: options.duration || 3000,
      position: options.position || 'bottom-right',
      ...options
    };

    switch (type) {
      case NOTIFICATION_TYPES.SUCCESS:
        toast.success(message, { 
          ...toastOptions, 
          icon: <CheckCircle2 className="w-4 h-4" />
        });
        break;
      case NOTIFICATION_TYPES.ERROR:
        toast.error(message, { 
          ...toastOptions, 
          icon: <AlertTriangle className="w-4 h-4" />
        });
        break;
      case NOTIFICATION_TYPES.WARNING:
        toast.warning(message, toastOptions);
        break;
      case NOTIFICATION_TYPES.INFO:
        toast.info(message, { 
          ...toastOptions, 
          icon: <Info className="w-4 h-4" />
        });
        break;
    }
  }, []);

  const contextValue = {
    // Processos em background
    activeProcesses: Array.from(activeProcesses.values()),
    registerProcess,
    updateProcess,
    completeProcess,
    failProcess,
    
    // Notificações específicas
    notifyFileUpload,
    notifyKPICalculation,
    notifyLearningExtraction,
    notifyDataProcessing,
    
    // Notificação simples
    notify,
    
    // Constantes
    NOTIFICATION_TYPES,
    PROCESS_TYPES
  };

  return (
    <NotificationContext.Provider value={contextValue}>
      {children}
      <ProcessIndicator />
    </NotificationContext.Provider>
  );
}

// Componente para mostrar processos ativos
function ProcessIndicator() {
  const { activeProcesses } = useNotification();
  
  if (activeProcesses.length === 0) return null;

  return (
    <div className="fixed bottom-4 left-4 z-50">
      <div className="bg-white rounded-lg shadow-lg border p-3 min-w-[300px]">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-gray-700">
            Processando ({activeProcesses.length})
          </span>
          <RefreshCw className="w-4 h-4 text-blue-500 animate-spin" />
        </div>
        
        {activeProcesses.slice(0, 3).map((process) => (
          <div key={process.id} className="mb-2 last:mb-0">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-gray-600 truncate">
                {process.description}
              </span>
              <Badge variant="secondary" className="text-xs">
                {process.progress}%
              </Badge>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-1.5">
              <div 
                className="bg-blue-500 h-1.5 rounded-full transition-all duration-300"
                style={{ width: `${process.progress}%` }}
              />
            </div>
          </div>
        ))}
        
        {activeProcesses.length > 3 && (
          <div className="text-xs text-gray-500 mt-2">
            +{activeProcesses.length - 3} mais processos
          </div>
        )}
      </div>
    </div>
  );
}

export function useNotification() {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotification must be used within NotificationProvider');
  }
  return context;
}