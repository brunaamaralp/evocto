/**
 * 🚨 Componente de Validação de Briefing Obrigatório
 * 
 * Bloqueia o avanço do serviço até que o briefing seja completado
 */

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Lock, 
  CheckCircle, 
  AlertTriangle, 
  Clock, 
  User, 
  Calendar,
  FileText,
  ArrowRight,
  RefreshCw
} from 'lucide-react';
import { useMandatoryBriefing } from '@/hooks/useMandatoryBriefing';
import { Task } from '@/api/entities';
import { toast } from 'sonner';

interface BriefingValidationProps {
  serviceId: string;
  clientId: string;
  onBriefingComplete?: () => void;
  showDetails?: boolean;
}

export default function BriefingValidation({ 
  serviceId, 
  clientId, 
  onBriefingComplete,
  showDetails = true 
}: BriefingValidationProps) {
  const { 
    briefingTask, 
    loading, 
    error,
    getBriefingProgress,
    validateBriefingCompletion,
    updateBriefingProgress,
    canActivateService
  } = useMandatoryBriefing();

  const [progress, setProgress] = useState(getBriefingProgress());
  const [validation, setValidation] = useState(validateBriefingCompletion());
  const [refreshing, setRefreshing] = useState(false);

  // Carregar briefing task se não existir
  useEffect(() => {
    if (!briefingTask && serviceId && clientId) {
      // Briefing será criado automaticamente quando o serviço for criado
      // Aqui apenas verificamos se existe
      loadBriefingTask();
    }
  }, [serviceId, clientId, briefingTask]);

  // Atualizar progresso quando briefing task mudar
  useEffect(() => {
    if (briefingTask) {
      setProgress(getBriefingProgress());
      setValidation(validateBriefingCompletion());
      
      // Chamar callback se briefing estiver completo
      if (validation.canActivateService && onBriefingComplete) {
        onBriefingComplete();
      }
    }
  }, [briefingTask, getBriefingProgress, validateBriefingCompletion, validation.canActivateService, onBriefingComplete]);

  const loadBriefingTask = async () => {
    try {
      setRefreshing(true);
      
      // Buscar tarefa de briefing obrigatório
      const briefingTasks = await Task.filter({
        serviceId,
        type: 'mandatory_briefing'
      });

      if (briefingTasks.length > 0) {
        const task = briefingTasks[0];
        // Simular briefing task baseado na tarefa encontrada
        const mockBriefingTask = {
          id: task.id,
          serviceId,
          clientId,
          status: task.status,
          publicBriefingSent: task.checklist?.[0]?.completed || false,
          clientResponsesReceived: task.checklist?.[1]?.completed || false,
          internalReviewCompleted: task.checklist?.[3]?.completed || false,
          meetingScheduled: task.checklist?.[2]?.completed || false,
          completionScore: task.completion_score || 0,
          blocksProgress: task.blocks_progress || true,
          createdAt: task.created_date,
          updatedAt: task.updated_date
        };
        
        // Atualizar estado do hook (isso seria feito internamente no hook real)
        console.log('Briefing task encontrado:', mockBriefingTask);
      }
    } catch (error) {
      console.error('Erro ao carregar briefing task:', error);
    } finally {
      setRefreshing(false);
    }
  };

  const handleUpdateProgress = async (updates: any) => {
    if (!briefingTask) return;

    try {
      await updateBriefingProgress(briefingTask.id, updates);
      toast.success('Progresso do briefing atualizado');
    } catch (error) {
      toast.error('Erro ao atualizar briefing');
    }
  };

  const getStatusIcon = () => {
    if (validation.canActivateService) {
      return <CheckCircle className="w-6 h-6 text-green-600" />;
    } else if (progress.progress > 0) {
      return <Clock className="w-6 h-6 text-yellow-600" />;
    } else {
      return <Lock className="w-6 h-6 text-red-600" />;
    }
  };

  const getStatusColor = () => {
    if (validation.canActivateService) {
      return 'border-green-200 bg-green-50';
    } else if (progress.progress > 0) {
      return 'border-yellow-200 bg-yellow-50';
    } else {
      return 'border-red-200 bg-red-50';
    }
  };

  const getStatusText = () => {
    if (validation.canActivateService) {
      return 'Briefing Concluído';
    } else if (progress.progress > 0) {
      return 'Briefing em Andamento';
    } else {
      return 'Briefing Pendente';
    }
  };

  if (loading || refreshing) {
    return (
      <Card className="border-gray-200">
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <RefreshCw className="w-6 h-6 animate-spin mr-2" />
            <span>Carregando status do briefing...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Alert className="border-red-200 bg-red-50">
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          Erro ao carregar briefing: {error}
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <Card className={`${getStatusColor()}`}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {getStatusIcon()}
          <span>Briefing Estratégico Obrigatório</span>
          <Badge variant={validation.canActivateService ? "default" : "secondary"}>
            {getStatusText()}
          </Badge>
        </CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Progresso */}
        <div>
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm font-medium">Progresso</span>
            <span className="text-sm text-gray-600">{progress.progress}%</span>
          </div>
          <Progress value={progress.progress} className="h-2" />
        </div>

        {/* Status atual */}
        <div className="flex items-center gap-2 text-sm">
          <span className="font-medium">Status:</span>
          <span className="text-gray-600">{progress.nextAction}</span>
        </div>

        {/* Ação requerida */}
        {progress.clientActionRequired && (
          <Alert className="border-blue-200 bg-blue-50">
            <User className="h-4 w-4" />
            <AlertDescription>
              <strong>Ação do cliente necessária:</strong> O cliente precisa responder ao briefing público.
            </AlertDescription>
          </Alert>
        )}

        {/* Erros */}
        {validation.errors.length > 0 && (
          <Alert className="border-red-200 bg-red-50">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              <div className="space-y-1">
                <strong>Bloqueios:</strong>
                {validation.errors.map((error, index) => (
                  <div key={index} className="text-sm">• {error}</div>
                ))}
              </div>
            </AlertDescription>
          </Alert>
        )}

        {/* Avisos */}
        {validation.warnings.length > 0 && (
          <Alert className="border-yellow-200 bg-yellow-50">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              <div className="space-y-1">
                <strong>Avisos:</strong>
                {validation.warnings.map((warning, index) => (
                  <div key={index} className="text-sm">• {warning}</div>
                ))}
              </div>
            </AlertDescription>
          </Alert>
        )}

        {/* Detalhes do progresso */}
        {showDetails && briefingTask && (
          <div className="space-y-3">
            <h4 className="font-medium text-sm">Etapas do Briefing:</h4>
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm">
                <CheckCircle className={`w-4 h-4 ${briefingTask.publicBriefingSent ? 'text-green-600' : 'text-gray-400'}`} />
                <span className={briefingTask.publicBriefingSent ? 'text-green-700' : 'text-gray-600'}>
                  Briefing público enviado
                </span>
              </div>
              
              <div className="flex items-center gap-2 text-sm">
                <CheckCircle className={`w-4 h-4 ${briefingTask.clientResponsesReceived ? 'text-green-600' : 'text-gray-400'}`} />
                <span className={briefingTask.clientResponsesReceived ? 'text-green-700' : 'text-gray-600'}>
                  Respostas do cliente recebidas
                </span>
              </div>
              
              <div className="flex items-center gap-2 text-sm">
                <CheckCircle className={`w-4 h-4 ${briefingTask.meetingScheduled ? 'text-green-600' : 'text-gray-400'}`} />
                <span className={briefingTask.meetingScheduled ? 'text-green-700' : 'text-gray-600'}>
                  Reunião de alinhamento agendada
                </span>
              </div>
              
              <div className="flex items-center gap-2 text-sm">
                <CheckCircle className={`w-4 h-4 ${briefingTask.internalReviewCompleted ? 'text-green-600' : 'text-gray-400'}`} />
                <span className={briefingTask.internalReviewCompleted ? 'text-green-700' : 'text-gray-600'}>
                  Revisão interna completada
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Ações */}
        {!validation.canActivateService && (
          <div className="flex gap-2 pt-2">
            <Button 
              size="sm" 
              variant="outline"
              onClick={() => window.open(`/client/${clientId}/briefing`, '_blank')}
            >
              <FileText className="w-4 h-4 mr-2" />
              Ver Briefing
            </Button>
            
            <Button 
              size="sm" 
              variant="outline"
              onClick={() => window.open(`/client/${clientId}/tasks`, '_blank')}
            >
              <Calendar className="w-4 h-4 mr-2" />
              Ver Tarefas
            </Button>
          </div>
        )}

        {/* Mensagem de conclusão */}
        {validation.canActivateService && (
          <Alert className="border-green-200 bg-green-50">
            <CheckCircle className="h-4 w-4" />
            <AlertDescription>
              <strong>Briefing concluído!</strong> O serviço pode ser ativado normalmente.
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
}

