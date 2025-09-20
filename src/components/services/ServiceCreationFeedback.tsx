/**
 * 🎨 Componente de Feedback Visual para Criação de Serviços
 * 
 * Fornece feedback visual melhorado durante o processo de criação
 */

import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { 
  CheckCircle, 
  AlertTriangle, 
  Info, 
  Loader2, 
  Clock,
  Users,
  FileText,
  Briefcase
} from 'lucide-react';

interface ServiceCreationProgressProps {
  currentStep: number;
  totalSteps: number;
  stepName: string;
  isCreating: boolean;
  progress: number;
  warnings?: string[];
  errors?: string[];
}

export function ServiceCreationProgress({
  currentStep,
  totalSteps,
  stepName,
  isCreating,
  progress,
  warnings = [],
  errors = []
}: ServiceCreationProgressProps) {
  const getStepIcon = (step: number) => {
    if (step < currentStep) return <CheckCircle className="w-4 h-4 text-green-600" />;
    if (step === currentStep) return <Loader2 className="w-4 h-4 animate-spin text-blue-600" />;
    return <Clock className="w-4 h-4 text-gray-400" />;
  };

  const getStepColor = (step: number) => {
    if (step < currentStep) return 'text-green-600';
    if (step === currentStep) return 'text-blue-600';
    return 'text-gray-400';
  };

  return (
    <Card className="w-full">
      <CardContent className="p-6">
        {/* Progresso Geral */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-lg font-semibold">Criando Serviço</h3>
            <Badge variant="outline">
              {currentStep} de {totalSteps}
            </Badge>
          </div>
          <Progress value={progress} className="w-full" />
        </div>

        {/* Etapas */}
        <div className="space-y-3 mb-6">
          <div className="flex items-center space-x-3">
            {getStepIcon(1)}
            <span className={`text-sm ${getStepColor(1)}`}>
              Validando dados
            </span>
          </div>
          <div className="flex items-center space-x-3">
            {getStepIcon(2)}
            <span className={`text-sm ${getStepColor(2)}`}>
              Verificando permissões
            </span>
          </div>
          <div className="flex items-center space-x-3">
            {getStepIcon(3)}
            <span className={`text-sm ${getStepColor(3)}`}>
              Criando instância
            </span>
          </div>
          <div className="flex items-center space-x-3">
            {getStepIcon(4)}
            <span className={`text-sm ${getStepColor(4)}`}>
              Atribuindo equipe
            </span>
          </div>
          <div className="flex items-center space-x-3">
            {getStepIcon(5)}
            <span className={`text-sm ${getStepColor(5)}`}>
              Gerando tarefas
            </span>
          </div>
          <div className="flex items-center space-x-3">
            {getStepIcon(6)}
            <span className={`text-sm ${getStepColor(6)}`}>
              Criando briefing
            </span>
          </div>
        </div>

        {/* Etapa Atual */}
        <div className="mb-4">
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              <strong>Etapa atual:</strong> {stepName}
            </AlertDescription>
          </Alert>
        </div>

        {/* Warnings */}
        {warnings.length > 0 && (
          <div className="mb-4">
            <Alert className="border-yellow-200 bg-yellow-50">
              <AlertTriangle className="h-4 w-4 text-yellow-600" />
              <AlertDescription>
                <strong>Atenção:</strong>
                <ul className="mt-2 list-disc list-inside">
                  {warnings.map((warning, index) => (
                    <li key={index} className="text-sm">{warning}</li>
                  ))}
                </ul>
              </AlertDescription>
            </Alert>
          </div>
        )}

        {/* Errors */}
        {errors.length > 0 && (
          <div className="mb-4">
            <Alert className="border-red-200 bg-red-50">
              <AlertTriangle className="h-4 w-4 text-red-600" />
              <AlertDescription>
                <strong>Erros encontrados:</strong>
                <ul className="mt-2 list-disc list-inside">
                  {errors.map((error, index) => (
                    <li key={index} className="text-sm">{error}</li>
                  ))}
                </ul>
              </AlertDescription>
            </Alert>
          </div>
        )}

        {/* Status */}
        {isCreating && (
          <div className="flex items-center space-x-2 text-sm text-gray-600">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span>Processando... Aguarde</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

interface ServiceCreationSummaryProps {
  serviceId: string;
  serviceName: string;
  clientName: string;
  warnings?: string[];
  onViewService?: () => void;
  onClose?: () => void;
}

export function ServiceCreationSummary({
  serviceId,
  serviceName,
  clientName,
  warnings = [],
  onViewService,
  onClose
}: ServiceCreationSummaryProps) {
  return (
    <Card className="w-full">
      <CardContent className="p-6">
        <div className="text-center mb-6">
          <CheckCircle className="w-16 h-16 text-green-600 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-green-600 mb-2">
            Serviço Criado com Sucesso!
          </h3>
          <p className="text-gray-600">
            O serviço foi criado e está pronto para uso
          </p>
        </div>

        {/* Detalhes do Serviço */}
        <div className="space-y-4 mb-6">
          <div className="flex items-center space-x-3">
            <Briefcase className="w-5 h-5 text-blue-600" />
            <div>
              <p className="font-medium">{serviceName}</p>
              <p className="text-sm text-gray-600">Nome do serviço</p>
            </div>
          </div>
          
          <div className="flex items-center space-x-3">
            <Users className="w-5 h-5 text-blue-600" />
            <div>
              <p className="font-medium">{clientName}</p>
              <p className="text-sm text-gray-600">Cliente</p>
            </div>
          </div>
          
          <div className="flex items-center space-x-3">
            <FileText className="w-5 h-5 text-blue-600" />
            <div>
              <p className="font-medium">ID: {serviceId}</p>
              <p className="text-sm text-gray-600">Identificador único</p>
            </div>
          </div>
        </div>

        {/* Warnings */}
        {warnings.length > 0 && (
          <div className="mb-6">
            <Alert className="border-yellow-200 bg-yellow-50">
              <AlertTriangle className="h-4 w-4 text-yellow-600" />
              <AlertDescription>
                <strong>Observações:</strong>
                <ul className="mt-2 list-disc list-inside">
                  {warnings.map((warning, index) => (
                    <li key={index} className="text-sm">{warning}</li>
                  ))}
                </ul>
              </AlertDescription>
            </Alert>
          </div>
        )}

        {/* Ações */}
        <div className="flex space-x-3">
          {onViewService && (
            <button
              onClick={onViewService}
              className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors"
            >
              Ver Serviço
            </button>
          )}
          {onClose && (
            <button
              onClick={onClose}
              className="flex-1 bg-gray-200 text-gray-800 px-4 py-2 rounded-md hover:bg-gray-300 transition-colors"
            >
              Fechar
            </button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

