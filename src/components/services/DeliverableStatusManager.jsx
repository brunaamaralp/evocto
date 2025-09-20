import React, { useState, useEffect } from 'react';
import { useSession } from '@/components/auth/SessionManager';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  CheckCircle, AlertTriangle, Clock, FileText, 
  Shield, Play, Pause, Eye, ChevronDown, 
  ChevronUp, Lock, Unlock, Info, Loader2
} from 'lucide-react';
import { toast } from 'sonner';
import DeliverableStateMachine from './DeliverableStateMachine';

const STATUS_CONFIGS = {
  not_started: {
    label: 'Não Iniciada',
    color: 'bg-gray-100 text-gray-800',
    icon: Pause,
    description: 'Aguardando início'
  },
  in_progress: {
    label: 'Em Progresso',
    color: 'bg-blue-100 text-blue-800',
    icon: Play,
    description: 'Trabalho em andamento'
  },
  ready_for_review: {
    label: 'Pronta para Revisão',
    color: 'bg-yellow-100 text-yellow-800',
    icon: Eye,
    description: 'Aguardando revisão interna'
  },
  ready_for_approval: {
    label: 'Aguardando Aprovação',
    color: 'bg-orange-100 text-orange-800',
    icon: Clock,
    description: 'Enviada para aprovação do cliente'
  },
  approved: {
    label: 'Aprovado',
    color: 'bg-green-100 text-green-800',
    icon: CheckCircle,
    description: 'Aprovado pelo cliente'
  },
  rejected: {
    label: 'Rejeitado',
    color: 'bg-red-100 text-red-800',
    icon: AlertTriangle,
    description: 'Rejeitado - necessita correção'
  },
  completed: {
    label: 'Concluída',
    color: 'bg-emerald-100 text-emerald-800',
    icon: CheckCircle,
    description: 'Fase finalizada'
  }
};

const CRITERIA_ICONS = {
  all_tasks_completed: CheckCircle,
  required_documents_present: FileText,
  no_blockers: Shield
};

export default function DeliverableStatusManager({ 
  service, 
  deliverable, 
  onDeliverableUpdate 
}) {
  const { user } = useSession();
  const [loading, setLoading] = useState(false);
  const [showCriteriaDetails, setShowCriteriaDetails] = useState(false);
  const [criteriaValidation, setCriteriaValidation] = useState(null);
  const [showValidationDialog, setShowValidationDialog] = useState(false);

  const stateMachine = new DeliverableStateMachine(service, deliverable, user);
  const currentStatus = deliverable.status || 'not_started';
  const statusConfig = STATUS_CONFIGS[currentStatus];
  const availableTransitions = stateMachine.getAvailableTransitions();
  const isLocked = stateMachine.isStructuralEditLocked();
  const lockedFields = stateMachine.getLockedFields();

  const loadCriteriaValidation = React.useCallback(async () => {
    try {
      const validation = await stateMachine.validateAllCompletionCriteria();
      setCriteriaValidation(validation);
    } catch (error) {
      console.error('Erro ao carregar validação:', error);
    }
  }, [stateMachine]);

  // Carregar validação de critérios
  useEffect(() => {
    if (currentStatus === 'in_progress') {
      loadCriteriaValidation();
    }
  }, [currentStatus, deliverable.id, loadCriteriaValidation]);

  const handleTransition = async (transitionType) => {
    if (transitionType === 'MARK_READY_FOR_REVIEW') {
      setShowValidationDialog(true);
      return;
    }

    await executeTransition(transitionType);
  };

  const executeTransition = async (transitionType) => {
    setLoading(true);
    
    try {
      let result;

      switch (transitionType) {
        case 'START':
          result = await stateMachine.start();
          break;
        case 'MARK_READY_FOR_REVIEW':
          result = await stateMachine.markReadyForReview();
          break;
        case 'REQUEST_APPROVAL':
          result = await stateMachine.requestApproval();
          break;
        default:
          throw new Error(`Transição não implementada: ${transitionType}`);
      }

      if (result.success) {
        const actionsList = result.actions?.join(', ') || '';
        toast.success(`Ação executada com sucesso. ${actionsList}`);
        
        if (onDeliverableUpdate) {
          onDeliverableUpdate();
        }
      }

    } catch (error) {
      console.error(`Erro na transição ${transitionType}:`, error);
      toast.error(`Erro: ${error.message}`);
    } finally {
      setLoading(false);
      setShowValidationDialog(false);
    }
  };

  const renderCompletionCriteria = () => {
    const criteria = deliverable.completion_criteria || {};
    
    return (
      <div className="space-y-3">
        <h4 className="font-medium text-sm">Critérios de Conclusão</h4>
        
        {Object.entries(criteria).map(([key, value]) => {
          const Icon = CRITERIA_ICONS[key] || Info;
          let label = '';
          let status = 'unknown';
          let details = '';

          switch (key) {
            case 'all_tasks_completed':
              label = 'Todas as tarefas concluídas';
              status = value ? 'required' : 'optional';
              break;
            case 'required_documents_present':
              label = 'Documentos obrigatórios';
              status = Array.isArray(value) && value.length > 0 ? 'required' : 'optional';
              details = Array.isArray(value) ? value.join(', ') : '';
              break;
            case 'no_blockers':
              label = 'Sem bloqueadores';
              status = value ? 'required' : 'optional';
              break;
          }

          const validation = criteriaValidation?.validations?.find(v => 
            v.includes(label.toLowerCase())
          );

          return (
            <div key={key} className="flex items-start gap-2 text-sm">
              <Icon className={`w-4 h-4 mt-0.5 ${
                status === 'required' ? 'text-orange-500' : 'text-gray-400'
              }`} />
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className={status === 'required' ? 'font-medium' : 'text-gray-600'}>
                    {label}
                  </span>
                  {status === 'required' && (
                    <Badge variant="outline" className="text-xs">
                      Obrigatório
                    </Badge>
                  )}
                  {validation && (
                    <Badge variant={validation.includes('erro') ? 'destructive' : 'default'} className="text-xs">
                      {validation.includes('erro') ? 'Pendente' : 'OK'}
                    </Badge>
                  )}
                </div>
                {details && (
                  <div className="text-xs text-gray-500 mt-1">{details}</div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  const renderApprovalInfo = () => {
    if (currentStatus !== 'ready_for_approval') return null;

    const expiresAt = deliverable.approval_expires_at;
    const daysLeft = expiresAt ? 
      Math.ceil((new Date(expiresAt) - new Date()) / (1000 * 60 * 60 * 24)) : 
      null;

    return (
      <Alert className="mt-3">
        <Clock className="h-4 w-4" />
        <AlertDescription>
          <div className="space-y-1">
            <div className="font-medium">Aguardando aprovação do cliente</div>
            {expiresAt && (
              <div className="text-sm">
                Expira em: {new Date(expiresAt).toLocaleDateString('pt-BR')}
                {daysLeft !== null && (
                  <span className={`ml-2 ${daysLeft <= 2 ? 'text-red-600' : 'text-gray-600'}`}>
                    ({daysLeft} dia(s) restante(s))
                  </span>
                )}
              </div>
            )}
          </div>
        </AlertDescription>
      </Alert>
    );
  };

  const StatusIcon = statusConfig?.icon || Info;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <StatusIcon className="w-5 h-5" />
            <span>Fase {deliverable.phase}: {deliverable.name}</span>
            {isLocked && (
              <Lock className="w-4 h-4 text-orange-500" title="Edição estrutural bloqueada" />
            )}
          </div>
          
          <Badge className={statusConfig?.color || 'bg-gray-100 text-gray-800'}>
            {statusConfig?.label || currentStatus}
          </Badge>
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Descrição e progresso */}
        <div>
          <p className="text-sm text-gray-600 mb-2">
            {deliverable.description}
          </p>
          
          {deliverable.expected_outcome && (
            <div className="text-sm">
              <span className="font-medium">Resultado esperado:</span>{' '}
              <span className="text-gray-600">{deliverable.expected_outcome}</span>
            </div>
          )}
        </div>

        {/* Critérios de conclusão */}
        {deliverable.completion_criteria && (
          <Collapsible open={showCriteriaDetails} onOpenChange={setShowCriteriaDetails}>
            <CollapsibleTrigger asChild>
              <Button variant="ghost" className="p-0 h-auto text-sm">
                <div className="flex items-center gap-1">
                  {showCriteriaDetails ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  Critérios de Conclusão
                  {criteriaValidation && !criteriaValidation.valid && (
                    <Badge variant="destructive" className="text-xs ml-2">
                      {criteriaValidation.errors?.length} pendente(s)
                    </Badge>
                  )}
                </div>
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="mt-3">
              {renderCompletionCriteria()}
            </CollapsibleContent>
          </Collapsible>
        )}

        {/* Info de aprovação */}
        {renderApprovalInfo()}

        {/* Status de bloqueio */}
        {isLocked && (
          <Alert>
            <Lock className="h-4 w-4" />
            <AlertDescription>
              <div className="font-medium">Edição estrutural bloqueada</div>
              <div className="text-sm mt-1">
                Os seguintes campos estão bloqueados até a resolução da aprovação:{' '}
                {lockedFields.join(', ')}
              </div>
            </AlertDescription>
          </Alert>
        )}

        {/* Ações disponíveis */}
        {availableTransitions.length > 0 && (
          <div className="flex gap-2 pt-2">
            {availableTransitions.map((transition) => {
              let buttonText = '';
              let variant = 'default';
              
              switch (transition) {
                case 'START':
                  buttonText = 'Iniciar Fase';
                  break;
                case 'MARK_READY_FOR_REVIEW':
                  buttonText = 'Marcar como Pronta';
                  break;
                case 'REQUEST_APPROVAL':
                  buttonText = 'Solicitar Aprovação';
                  variant = 'default';
                  break;
                case 'MARK_COMPLETED_NO_APPROVAL':
                  buttonText = 'Concluir Fase';
                  break;
                default:
                  buttonText = transition;
              }

              return (
                <Button
                  key={transition}
                  variant={variant}
                  size="sm"
                  onClick={() => handleTransition(transition)}
                  disabled={loading}
                >
                  {loading && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                  {buttonText}
                </Button>
              );
            })}
          </div>
        )}
      </CardContent>

      {/* Dialog de validação */}
      <Dialog open={showValidationDialog} onOpenChange={setShowValidationDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Validar Critérios de Conclusão</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            {criteriaValidation && (
              <div>
                {criteriaValidation.valid ? (
                  <Alert>
                    <CheckCircle className="h-4 w-4" />
                    <AlertDescription>
                      <div className="font-medium text-green-800">
                        Todos os critérios foram atendidos
                      </div>
                      <ul className="text-sm mt-2 space-y-1">
                        {criteriaValidation.validations?.map((validation, index) => (
                          <li key={index} className="flex items-center gap-2">
                            <CheckCircle className="w-3 h-3 text-green-600" />
                            {validation}
                          </li>
                        ))}
                      </ul>
                    </AlertDescription>
                  </Alert>
                ) : (
                  <Alert variant="destructive">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>
                      <div className="font-medium">
                        Critérios pendentes
                      </div>
                      <ul className="text-sm mt-2 space-y-1">
                        {criteriaValidation.errors?.map((error, index) => (
                          <li key={index} className="flex items-center gap-2">
                            <AlertTriangle className="w-3 h-3" />
                            {error}
                          </li>
                        ))}
                      </ul>
                    </AlertDescription>
                  </Alert>
                )}
              </div>
            )}

            <div className="flex justify-end gap-2">
              <Button 
                variant="outline" 
                onClick={() => setShowValidationDialog(false)}
              >
                Cancelar
              </Button>
              {criteriaValidation?.valid && (
                <Button 
                  onClick={() => executeTransition('MARK_READY_FOR_REVIEW')}
                  disabled={loading}
                >
                  {loading && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                  Confirmar
                </Button>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
}