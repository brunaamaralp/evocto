
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  CheckCircle,
  Circle,
  Briefcase,
  FileText,
  Settings,
  ArrowRight,
  Plus
} from 'lucide-react';
import { createPageUrl } from '@/utils';
import { Link } from 'react-router-dom';
import { isBriefingCompleted, getBriefingCompletionDetails } from '@/components/utils/briefingUtils';

import { Service } from "@/api/entities";
import { Project } from "@/api/entities";
import { Brief } from "@/api/entities";

// Util: carrega briefs de todos os projetos do cliente e calcula o maior completion_score
async function getMaxBriefCompletionForClient(clientId) {
  if (!clientId) return 0;

  // Buscar projetos do cliente
  const projects = await Project.filter({ client_id: clientId }, "-updated_date", 100);
  if (!projects || projects.length === 0) return 0;

  // Buscar briefs por projeto (fallback sem $in para máxima compatibilidade)
  let maxScore = 0;
  for (const p of projects) {
    const briefs = await Brief.filter({ projectId: p.id }, "-updated_date", 10);
    if (Array.isArray(briefs)) {
      for (const b of briefs) {
        const score = typeof b.completion_score === "number" ? b.completion_score : 0;
        if (score > maxScore) maxScore = score;
      }
    }
  }
  return maxScore;
}

// Util: verifica se algum serviço do cliente possui deliverables configurados
async function hasConfiguredDeliverables(clientId) {
  const services = await Service.filter({ clientId, is_template: false }, "-updated_date", 100);
  if (!Array.isArray(services) || services.length === 0) return false;
  return services.some(s => Array.isArray(s.deliverables) && s.deliverables.length > 0);
}

/**
 * Guia de configuração inicial do cliente - USANDO LÓGICA UNIFICADA
 */
export default function ClientSetupGuide(props) {
  const { client, services = [], briefings = [], publicResponses = [], onConcludeBriefing } = props;

  // Extract clientId from props (allowing multiple prop names)
  const clientId = props?.clientId || client?.id || props?.client_id || props?.clientID;

  const [hideSetup, setHideSetup] = React.useState(false);
  const [checking, setChecking] = React.useState(true);

  const evaluateSetupVisibility = React.useCallback(async () => {
    if (!clientId) {
      setHideSetup(false); // If no client ID, default to visible or not applicable for hiding
      setChecking(false);
      return;
    }
    setChecking(true);
    try {
      const [maxBriefScore, deliverablesOk] = await Promise.all([
        getMaxBriefCompletionForClient(clientId),
        hasConfiguredDeliverables(clientId),
      ]);

      // Regra: esconder Setup quando Brief >= 50% E há deliverables configurados
      const shouldHide = (maxBriefScore >= 50) && deliverablesOk;
      setHideSetup(shouldHide);
    } catch (error) {
      // On failure, keep visible to avoid blocking onboarding
      console.error("Error evaluating setup visibility:", error);
      setHideSetup(false);
    } finally {
      setChecking(false);
    }
  }, [clientId]);

  React.useEffect(() => {
    evaluateSetupVisibility();
  }, [evaluateSetupVisibility]);

  // Reevaluate when the Brief is updated (e.g., after saving responses)
  React.useEffect(() => {
    const handler = () => evaluateSetupVisibility();
    window.addEventListener("brief:updated", handler);
    window.addEventListener("brief:progress", handler);
    return () => {
      window.removeEventListener("brief:updated", handler);
      window.removeEventListener("brief:progress", handler);
    };
  }, [evaluateSetupVisibility]);

  // If ready to hide and not checking, don't render anything (removes the setup screen)
  if (!checking && hideSetup) {
    return null;
  }

  // 🔧 SEGURITY CHECK: If no client or client ID, don't render
  // This check is still necessary for the component's internal logic that depends on `client.id`
  if (!client || !client.id) {
    return null;
  }

  // 🎯 USAR LÓGICA UNIFICADA
  const briefingInfo = getBriefingCompletionDetails(briefings, publicResponses);
  const briefingDone = briefingInfo.completed;
  const canConclude = !briefingDone && (briefingInfo.bestPercentage >= 50);

  console.log('🔍 [ClientSetupGuide] Verificação de briefing:', {
    clientId: client.id,
    briefingsLength: briefings.length,
    completed: briefingDone, // Using briefingDone from briefingInfo
    details: briefingInfo // Using briefingInfo for details
  });

  const setupSteps = [
    {
      id: 'client_created',
      title: 'Cliente Cadastrado',
      description: 'Informações básicas do cliente foram registradas',
      completed: true,
      icon: CheckCircle,
      color: 'text-green-600'
    },
    {
      id: 'service_created',
      title: 'Primeiro Serviço',
      description: 'Crie o primeiro contrato/serviço para este cliente',
      completed: Array.isArray(services) && services.length > 0,
      icon: Array.isArray(services) && services.length > 0 ? CheckCircle : Circle,
      color: Array.isArray(services) && services.length > 0 ? 'text-green-600' : 'text-gray-400',
      action: {
        label: 'Criar Serviço',
        href: createPageUrl('client-services') + `?clientId=${client.id}`,
        enabled: !Array.isArray(services) || services.length === 0
      }
    },
    {
      id: 'briefing_completed',
      title: 'Briefing Preenchido',
      description: '50% ou mais do briefing foi completado',
      completed: briefingDone,
      icon: briefingDone ? CheckCircle : Circle,
      color: briefingDone ? 'text-green-600' : 'text-gray-400',
      action: {
        label: briefingDone ? 'Ver Briefing' : 'Preencher Briefing',
        href: createPageUrl('client-briefing') + `?clientId=${client.id}`,
        enabled: true // Always enabled to allow editing/completion
      },
      extraAction: canConclude ? {
        label: 'Concluir Briefing',
        onClick: () => onConcludeBriefing && onConcludeBriefing(briefingInfo),
        enabled: true
      } : null,
      progressHint: `Completude atual: ${Math.round(briefingInfo.bestPercentage)}%`
    },
    {
      id: 'deliverables_configured',
      title: 'Deliverables Configured',
      description: 'Configure the phases and deliverables of the service',
      completed: Array.isArray(services) && services.some(s => s?.deliverables && Array.isArray(s.deliverables) && s.deliverables.length > 0),
      icon: Array.isArray(services) && services.some(s => s?.deliverables && Array.isArray(s.deliverables) && s.deliverables.length > 0) ? CheckCircle : Circle,
      color: Array.isArray(services) && services.some(s => s?.deliverables && Array.isArray(s.deliverables) && s.deliverables.length > 0) ? 'text-green-600' : 'text-gray-400',
      action: {
        label: 'Configurar Fases',
        href: services && services[0]?.id ? createPageUrl('service-detail') + `?serviceId=${services[0].id}` : '#',
        enabled: Array.isArray(services) && services.length > 0 && services[0]?.id
      }
    }
  ];

  const completedSteps = setupSteps.filter(step => step.completed).length;
  const progressPercentage = (completedSteps / setupSteps.length) * 100;

  const getNextAction = () => {
    const nextStep = setupSteps.find(step => !step.completed && step.action && step.action.enabled);
    return nextStep;
  };

  const nextAction = getNextAction();

  return (
    <Card className="mb-6">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Configuração Inicial</CardTitle>
          <Badge variant={completedSteps === setupSteps.length ? "success" : "secondary"}>
            {completedSteps}/{setupSteps.length} concluído
          </Badge>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className="bg-blue-600 h-2 rounded-full transition-all duration-300"
            style={{ width: `${progressPercentage}%` }}
          />
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {setupSteps.map((step) => {
          const StepIcon = step.icon;

          return (
            <div key={step.id} className="flex items-center space-x-3">
              <StepIcon className={`w-5 h-5 ${step.color}`} />
              <div className="flex-1">
                <h4 className={`font-medium ${step.completed ? 'text-gray-900' : 'text-gray-600'}`}>
                  {step.title}
                </h4>
                <p className="text-sm text-gray-500">
                  {step.description}
                  {step.progressHint && <span className="ml-2 text-xs text-gray-400">({step.progressHint})</span>}
                </p>
              </div>

              <div className="flex items-center space-x-2">
                {step.action && step.action.enabled && step.action.href !== '#' && (
                  <Link to={step.action.href}>
                    <Button size="sm" variant="outline">
                      {step.action.label}
                      {step.id === 'service_created' && !step.completed && <Plus className="w-4 h-4 ml-1" />}
                      {step.id === 'briefing_completed' && !step.completed && <ArrowRight className="w-4 h-4 ml-1" />}
                      {step.id === 'deliverables_configured' && !step.completed && <ArrowRight className="w-4 h-4 ml-1" />}
                    </Button>
                  </Link>
                )}

                {step.extraAction && step.extraAction.enabled && (
                  <Button size="sm" variant="secondary" onClick={step.extraAction.onClick}>
                    {step.extraAction.label}
                  </Button>
                )}
              </div>
            </div>
          );
        })}

        {/* Next Step */}
        {nextAction && (
          <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
            <h4 className="font-medium text-blue-900 mb-2">Próximo Passo</h4>
            <p className="text-sm text-blue-700 mb-3">{nextAction.description}</p>
            {nextAction.action.href !== '#' && (
              <Link to={nextAction.action.href}>
                <Button className="bg-blue-600 hover:bg-blue-700">
                  {nextAction.action.label}
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </Link>
            )}
          </div>
        )}

        {/* Total Completion */}
        {completedSteps === setupSteps.length && (
          <div className="mt-6 p-4 bg-green-50 rounded-lg border border-green-200">
            <div className="flex items-center space-x-3">
              <CheckCircle className="w-6 h-6 text-green-600" />
              <div>
                <h4 className="font-medium text-green-900">Configuração Completa!</h4>
                <p className="text-sm text-green-700">
                  Cliente configurado com sucesso. Agora você pode gerenciar os serviços e acompanhar o progresso.
                </p>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
