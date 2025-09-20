import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { StatusBadge, StatusIndicator } from '@/components/shared/StatusBadge';
import { 
  CheckCircle2, Circle, AlertTriangle, Clock, 
  Play, Eye, ArrowRight, Info, Target, Zap,
  MapPin, Flag, ChevronRight, User, Calendar
} from 'lucide-react';

/**
 * ProcessStepper sincronizado com estados reais do sistema
 * Mostra progresso de Service → Deliverables → Tasks com "Você está aqui" e "Próximo passo"
 */
export function ProcessStepper({ 
  service, 
  showTasks = true, 
  className = '',
  onDeliverableSelect,
  onTaskSelect 
}) {
  const [currentStep, setCurrentStep] = useState(null);
  const [nextStep, setNextStep] = useState(null);
  const [stepsData, setStepsData] = useState([]);

  useEffect(() => {
    if (service) {
      const processedSteps = processServiceSteps(service);
      setStepsData(processedSteps);
      
      const current = findCurrentStep(processedSteps);
      const next = findNextStep(processedSteps, current);
      
      setCurrentStep(current);
      setNextStep(next);
    }
  }, [service]);

  if (!service || !stepsData.length) {
    return (
      <Card className={className}>
        <CardContent className="p-6">
          <div className="text-center text-gray-500">
            <Target className="w-12 h-12 mx-auto mb-2 opacity-50" />
            <p>Nenhum processo em andamento</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const progressPercentage = calculateProgressPercentage(stepsData);

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Flag className="w-5 h-5" />
            Progresso do Serviço
          </CardTitle>
          <StatusIndicator entity={service} type="service" />
        </div>
        
        <div className="space-y-2">
          <div className="flex justify-between text-sm text-gray-600">
            <span>Progresso geral</span>
            <span>{Math.round(progressPercentage)}%</span>
          </div>
          <Progress value={progressPercentage} className="h-2" />
        </div>
      </CardHeader>

      <CardContent className="p-6">
        {/* Indicadores de Posição */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <CurrentStepCard step={currentStep} />
          <NextStepCard step={nextStep} service={service} />
        </div>

        {/* Steps do Processo */}
        <div className="space-y-4">
          {stepsData.map((step, index) => (
            <StepItem 
              key={step.id}
              step={step}
              index={index}
              isCurrent={currentStep?.id === step.id}
              isNext={nextStep?.id === step.id}
              isLast={index === stepsData.length - 1}
              showTasks={showTasks}
              onDeliverableSelect={onDeliverableSelect}
              onTaskSelect={onTaskSelect}
            />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * Card mostrando onde o usuário está atualmente
 */
function CurrentStepCard({ step }) {
  if (!step) {
    return (
      <Card className="bg-blue-50 border-blue-200">
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
              <CheckCircle2 className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-blue-900">Você está aqui</p>
              <p className="text-xs text-blue-700">Serviço concluído</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-blue-50 border-blue-200">
      <CardContent className="p-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
            <MapPin className="w-5 h-5 text-blue-600" />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <p className="text-sm font-medium text-blue-900">Você está aqui</p>
              <StatusBadge 
                status={step.status} 
                type={step.type} 
                size="sm"
              />
            </div>
            <p className="text-sm text-blue-700">{step.name}</p>
            {step.blockers?.length > 0 && (
              <div className="mt-1">
                <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200 text-xs">
                  <AlertTriangle className="w-3 h-3 mr-1" />
                  {step.blockers.length} bloqueio(s)
                </Badge>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * Card mostrando qual é o próximo passo
 */
function NextStepCard({ step, service }) {
  if (!step) {
    return (
      <Card className="bg-green-50 border-green-200">
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
              <CheckCircle2 className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-green-900">Próximo passo</p>
              <p className="text-xs text-green-700">
                {service.service_status === 'completed' ? 'Processo finalizado!' : 'Aguardando definição'}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-orange-50 border-orange-200">
      <CardContent className="p-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center">
            <Zap className="w-5 h-5 text-orange-600" />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <p className="text-sm font-medium text-orange-900">Próximo passo</p>
              {step.readyToStart ? (
                <Badge className="bg-green-100 text-green-800 text-xs">Pronto</Badge>
              ) : (
                <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200 text-xs">
                  Aguardando
                </Badge>
              )}
            </div>
            <p className="text-sm text-orange-700">{step.name}</p>
            {step.pendingRequirements?.length > 0 && (
              <div className="mt-1">
                <p className="text-xs text-orange-600">
                  Pendente: {step.pendingRequirements.join(', ')}
                </p>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * Item individual do step
 */
function StepItem({ 
  step, 
  index, 
  isCurrent, 
  isNext, 
  isLast, 
  showTasks, 
  onDeliverableSelect, 
  onTaskSelect 
}) {
  const [expanded, setExpanded] = useState(isCurrent || isNext);

  const getStepIcon = () => {
    if (step.status === 'completed') return CheckCircle2;
    if (step.status === 'cancelled') return Circle;
    if (step.blockers?.length > 0) return AlertTriangle;
    if (step.status === 'ready_for_approval') return Clock;
    if (step.status === 'in_progress') return Play;
    return Circle;
  };

  const getStepColor = () => {
    if (isCurrent) return 'text-blue-600 bg-blue-100';
    if (step.status === 'completed') return 'text-green-600 bg-green-100';
    if (step.blockers?.length > 0) return 'text-red-600 bg-red-100';
    if (step.status === 'ready_for_approval') return 'text-orange-600 bg-orange-100';
    if (step.status === 'in_progress') return 'text-blue-600 bg-blue-100';
    return 'text-gray-400 bg-gray-100';
  };

  const StepIcon = getStepIcon();
  const colorClasses = getStepColor();

  return (
    <div className="relative">
      {/* Linha conectora */}
      {!isLast && (
        <div className="absolute left-6 top-12 w-0.5 h-8 bg-gray-200" />
      )}

      <div className={`flex gap-4 p-4 rounded-lg transition-all ${
        isCurrent ? 'bg-blue-50 border border-blue-200' : 
        isNext ? 'bg-orange-50 border border-orange-200' : 
        'hover:bg-gray-50'
      }`}>
        {/* Ícone do Step */}
        <div className={`flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center ${colorClasses}`}>
          <StepIcon className="w-6 h-6" />
        </div>

        {/* Conteúdo do Step */}
        <div className="flex-1">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-3">
              <h4 className="font-medium">{step.name}</h4>
              <StatusBadge 
                status={step.status} 
                type={step.type} 
                size="sm"
                blocked={step.blockers?.length > 0}
                overdue={step.overdue}
              />
              {isCurrent && (
                <Badge className="bg-blue-100 text-blue-800 text-xs">
                  <MapPin className="w-3 h-3 mr-1" />
                  Atual
                </Badge>
              )}
              {isNext && (
                <Badge className="bg-orange-100 text-orange-800 text-xs">
                  <ArrowRight className="w-3 h-3 mr-1" />
                  Próximo
                </Badge>
              )}
            </div>

            {/* Botões de ação */}
            <div className="flex items-center gap-2">
              {step.type === 'deliverable' && onDeliverableSelect && (
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => onDeliverableSelect(step.entity)}
                >
                  <Eye className="w-4 h-4 mr-1" />
                  Ver Fase
                </Button>
              )}
              
              {(step.tasks?.length > 0 || step.blockers?.length > 0) && (
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={() => setExpanded(!expanded)}
                >
                  <ChevronRight className={`w-4 h-4 transition-transform ${expanded ? 'rotate-90' : ''}`} />
                </Button>
              )}
            </div>
          </div>

          {/* Descrição e metadados */}
          <p className="text-sm text-gray-600 mb-2">{step.description}</p>
          
          <div className="flex flex-wrap gap-2 text-xs text-gray-500">
            {step.assignedTo && (
              <span className="flex items-center gap-1">
                <User className="w-3 h-3" />
                {step.assignedTo}
              </span>
            )}
            {step.dueDate && (
              <span className="flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                {new Date(step.dueDate).toLocaleDateString()}
              </span>
            )}
            {step.estimatedHours && (
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {step.estimatedHours}h
              </span>
            )}
          </div>

          {/* Conteúdo expandido */}
          {expanded && (
            <div className="mt-4 space-y-3">
              {/* Bloqueadores */}
              {step.blockers?.length > 0 && (
                <div className="p-3 bg-red-50 border border-red-200 rounded">
                  <h5 className="font-medium text-red-900 text-sm mb-2 flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4" />
                    Bloqueadores ({step.blockers.length})
                  </h5>
                  <ul className="space-y-1">
                    {step.blockers.map((blocker, i) => (
                      <li key={i} className="text-sm text-red-700">
                        • {blocker}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Tarefas */}
              {showTasks && step.tasks?.length > 0 && (
                <div className="p-3 bg-gray-50 border border-gray-200 rounded">
                  <h5 className="font-medium text-gray-900 text-sm mb-2">
                    Tarefas ({step.tasks.length})
                  </h5>
                  <div className="space-y-2">
                    {step.tasks.map((task, i) => (
                      <div key={i} className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2">
                          <StatusBadge 
                            status={task.status} 
                            type="task" 
                            size="sm"
                            showIcon={false}
                          />
                          <span className={task.status === 'completed' ? 'line-through text-gray-500' : ''}>
                            {task.title}
                          </span>
                        </div>
                        {onTaskSelect && (
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => onTaskSelect(task)}
                          >
                            <Eye className="w-3 h-3" />
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Próximos requisitos */}
              {step.pendingRequirements?.length > 0 && (
                <div className="p-3 bg-yellow-50 border border-yellow-200 rounded">
                  <h5 className="font-medium text-yellow-900 text-sm mb-2 flex items-center gap-2">
                    <Info className="w-4 h-4" />
                    Pendências para Prosseguir
                  </h5>
                  <ul className="space-y-1">
                    {step.pendingRequirements.map((req, i) => (
                      <li key={i} className="text-sm text-yellow-700">
                        • {req}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ====== HELPER FUNCTIONS ======

/**
 * Processar dados do serviço em steps estruturados
 */
function processServiceSteps(service) {
  const steps = [];

  // Step do serviço (sempre primeiro)
  steps.push({
    id: `service_${service.id}`,
    name: service.name,
    description: 'Serviço principal',
    type: 'service',
    status: service.service_status || 'draft',
    entity: service,
    phase: 0,
    overdue: service.overdue || isServiceOverdue(service),
    blockers: getServiceBlockers(service),
    pendingRequirements: getServicePendingRequirements(service)
  });

  // Steps dos deliverables
  if (service.deliverables?.length > 0) {
    service.deliverables
      .sort((a, b) => (a.phase || 0) - (b.phase || 0))
      .forEach(deliverable => {
        steps.push({
          id: `deliverable_${deliverable.id}`,
          name: deliverable.name,
          description: deliverable.description || deliverable.expected_outcome,
          type: 'deliverable',
          status: deliverable.status || 'not_started',
          entity: deliverable,
          phase: deliverable.phase || 0,
          overdue: isDeliverableOverdue(deliverable),
          blockers: getDeliverableBlockers(deliverable),
          pendingRequirements: getDeliverablePendingRequirements(deliverable),
          tasks: deliverable.tasks || [],
          assignedTo: getDeliverableAssignees(deliverable),
          dueDate: deliverable.sla_expires_at,
          estimatedHours: deliverable.estimated_hours
        });
      });
  }

  return steps;
}

/**
 * Encontrar step atual (onde o usuário está)
 */
function findCurrentStep(steps) {
  // 1. Primeiro step in_progress
  let current = steps.find(step => step.status === 'in_progress');
  if (current) return current;

  // 2. Primeiro step ready_for_review/ready_for_approval
  current = steps.find(step => ['ready_for_review', 'ready_for_approval'].includes(step.status));
  if (current) return current;

  // 3. Primeiro step não concluído
  current = steps.find(step => !['completed', 'cancelled'].includes(step.status));
  if (current) return current;

  // 4. Se todos concluídos, retorna o último
  return steps[steps.length - 1];
}

/**
 * Encontrar próximo step
 */
function findNextStep(steps, currentStep) {
  if (!currentStep) return null;

  const currentIndex = steps.findIndex(step => step.id === currentStep.id);
  if (currentIndex === -1 || currentIndex === steps.length - 1) return null;

  const nextStep = steps[currentIndex + 1];
  
  // Verificar se está pronto para começar
  nextStep.readyToStart = canStartStep(nextStep, steps);
  
  return nextStep;
}

/**
 * Calcular progresso percentual geral
 */
function calculateProgressPercentage(steps) {
  if (steps.length === 0) return 0;

  const weights = steps.map(step => {
    if (step.type === 'service') return 10; // Service tem peso menor
    return step.estimatedHours || 20; // Deliverables por horas estimadas
  });

  const totalWeight = weights.reduce((sum, weight) => sum + weight, 0);
  
  const completedWeight = steps.reduce((sum, step, index) => {
    const weight = weights[index];
    
    if (step.status === 'completed') return sum + weight;
    if (step.status === 'in_progress') return sum + (weight * 0.5);
    if (['ready_for_review', 'ready_for_approval', 'approved'].includes(step.status)) return sum + (weight * 0.8);
    
    return sum;
  }, 0);

  return totalWeight > 0 ? (completedWeight / totalWeight) * 100 : 0;
}

/**
 * Verificar se step pode ser iniciado
 */
function canStartStep(step, allSteps) {
  const currentIndex = allSteps.findIndex(s => s.id === step.id);
  
  // Verificar se steps anteriores estão concluídos
  for (let i = 0; i < currentIndex; i++) {
    const prevStep = allSteps[i];
    if (!['completed', 'approved'].includes(prevStep.status)) {
      step.pendingRequirements = step.pendingRequirements || [];
      step.pendingRequirements.push(`Aguardando conclusão: ${prevStep.name}`);
      return false;
    }
  }

  // Verificar critérios específicos do deliverable
  if (step.type === 'deliverable') {
    const criteria = step.entity.completion_criteria || {};
    
    // Se tem dependências, verificar se estão resolvidas
    if (step.entity.depends_on?.length > 0) {
      const unresolvedDeps = step.entity.depends_on.filter(depId => {
        const depStep = allSteps.find(s => s.entity.id === depId);
        return depStep && !['completed', 'approved'].includes(depStep.status);
      });
      
      if (unresolvedDeps.length > 0) {
        step.pendingRequirements = step.pendingRequirements || [];
        step.pendingRequirements.push(`Dependências não resolvidas`);
        return false;
      }
    }
  }

  return step.blockers?.length === 0;
}

// ====== BLOCKER AND REQUIREMENT DETECTION ======

function getServiceBlockers(service) {
  const blockers = [];
  
  if (service.service_status === 'paused') {
    blockers.push('Serviço pausado operacionalmente');
  }
  
  if (service.service_status === 'on_hold') {
    blockers.push('Serviço em espera administrativa');
  }

  if (service.deliverables?.some(d => d.has_blockers)) {
    blockers.push('Fases com tarefas bloqueadas');
  }

  return blockers;
}

function getDeliverableBlockers(deliverable) {
  const blockers = [];
  
  if (deliverable.has_blockers) {
    blockers.push('Tarefas críticas bloqueadas');
  }
  
  if (deliverable.structural_edit_locked) {
    blockers.push('Edição bloqueada (aguardando aprovação)');
  }

  return blockers;
}

function getServicePendingRequirements(service) {
  const requirements = [];
  
  if (service.service_status === 'draft') {
    if (!service.clientId) requirements.push('Definir cliente');
    if (!service.start_date) requirements.push('Definir data de início');
    if (!service.deliverables?.length) requirements.push('Configurar fases');
  }

  return requirements;
}

function getDeliverablePendingRequirements(deliverable) {
  const requirements = [];
  
  if (deliverable.status === 'not_started') {
    requirements.push('Aguardando início da fase');
  }

  if (deliverable.status === 'ready_for_approval' && deliverable.sla_expires_at) {
    const daysUntilExpiry = Math.ceil((new Date(deliverable.sla_expires_at) - new Date()) / (1000 * 60 * 60 * 24));
    if (daysUntilExpiry > 0) {
      requirements.push(`Aprovação expira em ${daysUntilExpiry} dia(s)`);
    }
  }

  return requirements;
}

function getDeliverableAssignees(deliverable) {
  if (deliverable.assigned_team?.length > 0) {
    return `${deliverable.assigned_team.length} membro(s)`;
  }
  return null;
}

function isServiceOverdue(service) {
  return service.overdue || 
         (service.end_date && new Date(service.end_date) < new Date() && 
          !['completed', 'cancelled', 'archived'].includes(service.service_status));
}

function isDeliverableOverdue(deliverable) {
  return deliverable.sla_expires_at && 
         new Date(deliverable.sla_expires_at) < new Date() &&
         !['completed', 'approved', 'cancelled'].includes(deliverable.status);
}

export default ProcessStepper;