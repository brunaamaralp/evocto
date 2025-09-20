import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  CheckCircle, Circle, Clock, AlertCircle, 
  ArrowRight, FileText, Users, Target
} from 'lucide-react';

const PHASE_ICONS = {
  'diagnostic': FileText,
  'planning': Target,
  'implementation': Users,
  'monitoring': Clock,
  'closure': CheckCircle
};

const PHASE_DESCRIPTIONS = {
  'diagnostic': {
    title: 'Diagnóstico Inicial',
    description: 'Análise completa da situação atual da empresa',
    context: 'Precisamos entender profundamente seu negócio para criar soluções personalizadas',
    whatToDeliver: ['Documentos financeiros', 'Acesso aos sistemas', 'Histórico de dados']
  },
  'planning': {
    title: 'Planejamento Estratégico',
    description: 'Criação do plano de ação baseado no diagnóstico',
    context: 'Com base no diagnóstico, desenvolvemos estratégias específicas para seus objetivos',
    whatToDeliver: ['Aprovação do plano', 'Validação das prioridades', 'Definição de cronograma']
  },
  'implementation': {
    title: 'Implementação',
    description: 'Execução das ações planejadas com acompanhamento',
    context: 'Colocamos o plano em prática com suporte contínuo e ajustes conforme necessário',
    whatToDeliver: ['Feedback sobre resultados', 'Participação em reuniões', 'Aprovação de mudanças']
  },
  'monitoring': {
    title: 'Monitoramento',
    description: 'Acompanhamento dos resultados e otimizações',
    context: 'Medimos os resultados e fazemos ajustes para maximizar o retorno do investimento',
    whatToDeliver: ['Análise de KPIs', 'Feedback sobre melhorias', 'Relatórios de progresso']
  },
  'closure': {
    title: 'Encerramento',
    description: 'Consolidação dos resultados e entrega final',
    context: 'Documentamos todos os ganhos obtidos e garantimos a sustentabilidade das melhorias',
    whatToDeliver: ['Avaliação final', 'Documentação de processos', 'Plano de continuidade']
  }
};

export default function ClientProgressStepper({ service, currentPhase, onPhaseClick, showContext = true }) {
  const phases = service?.deliverables || [];
  
  const getPhaseStatus = (phase) => {
    if (phase.status === 'completed' || phase.status === 'approved') {
      return 'completed';
    } else if (phase.status === 'in_progress' || phase.status === 'ready_for_review') {
      return 'current';
    } else if (phase.status === 'pending_approval') {
      return 'pending';
    }
    return 'upcoming';
  };

  const getCurrentPhaseIndex = () => {
    return phases.findIndex(p => ['in_progress', 'ready_for_review', 'pending_approval'].includes(p.status));
  };

  const getNextPhase = () => {
    const currentIndex = getCurrentPhaseIndex();
    return currentIndex >= 0 && currentIndex < phases.length - 1 ? phases[currentIndex + 1] : null;
  };

  const currentPhaseIndex = getCurrentPhaseIndex();
  const nextPhase = getNextPhase();
  const currentPhaseData = phases[currentPhaseIndex];

  const getStatusIcon = (status) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-6 h-6 text-green-600" />;
      case 'current':
        return <div className="w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center">
          <div className="w-3 h-3 bg-white rounded-full animate-pulse" />
        </div>;
      case 'pending':
        return <AlertCircle className="w-6 h-6 text-yellow-600" />;
      default:
        return <Circle className="w-6 h-6 text-gray-300" />;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 border-green-300';
      case 'current':
        return 'bg-blue-100 border-blue-300';
      case 'pending':
        return 'bg-yellow-100 border-yellow-300';
      default:
        return 'bg-gray-50 border-gray-200';
    }
  };

  if (!phases || phases.length === 0) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <p className="text-gray-600">Cronograma será disponibilizado em breve</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Progress Stepper */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="w-5 h-5 text-blue-600" />
            Linha do Tempo do Projeto
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <div className="relative">
            {/* Progress Line */}
            <div className="absolute left-6 top-6 bottom-6 w-0.5 bg-gray-200" />
            <div 
              className="absolute left-6 top-6 w-0.5 bg-blue-600 transition-all duration-500"
              style={{ 
                height: currentPhaseIndex >= 0 ? `${((currentPhaseIndex + 0.5) / phases.length) * 100}%` : '0%' 
              }}
            />
            
            {/* Phase Items */}
            <div className="space-y-6">
              {phases.map((phase, index) => {
                const status = getPhaseStatus(phase);
                const PhaseIcon = PHASE_ICONS[phase.category] || FileText;
                const description = PHASE_DESCRIPTIONS[phase.category] || {
                  title: phase.name,
                  description: phase.description || 'Fase do projeto'
                };
                
                return (
                  <div key={phase.id} className="relative flex items-start gap-4">
                    {/* Status Icon */}
                    <div className="relative z-10 flex-shrink-0">
                      {getStatusIcon(status)}
                    </div>
                    
                    {/* Phase Content */}
                    <div className="flex-1 min-w-0">
                      <div className={`p-4 rounded-lg border-2 ${getStatusColor(status)} transition-all`}>
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <PhaseIcon className="w-5 h-5 text-blue-600" />
                            <h3 className="font-semibold text-lg">{phase.name}</h3>
                          </div>
                          
                          <div className="flex items-center gap-2">
                            <Badge variant={status === 'completed' ? 'default' : 'secondary'}>
                              {status === 'completed' ? 'Concluído' :
                               status === 'current' ? 'Em Andamento' :
                               status === 'pending' ? 'Aguardando' : 'Planejado'}
                            </Badge>
                            
                            {phase.duration_days && (
                              <Badge variant="outline">
                                {phase.duration_days} dias
                              </Badge>
                            )}
                          </div>
                        </div>
                        
                        <p className="text-gray-600 mb-2">
                          {description.description}
                        </p>
                        
                        {status === 'current' && showContext && (
                          <div className="mt-4 p-3 bg-blue-50 rounded-lg border-l-4 border-blue-400">
                            <h4 className="font-medium text-blue-900 mb-1">Por que esta etapa importa:</h4>
                            <p className="text-blue-800 text-sm mb-2">{description.context}</p>
                            
                            {description.whatToDeliver && (
                              <>
                                <h4 className="font-medium text-blue-900 mb-1">O que precisamos de você:</h4>
                                <ul className="text-blue-800 text-sm space-y-1">
                                  {description.whatToDeliver.map((item, i) => (
                                    <li key={i} className="flex items-start gap-1">
                                      <ArrowRight className="w-3 h-3 mt-1 flex-shrink-0" />
                                      {item}
                                    </li>
                                  ))}
                                </ul>
                              </>
                            )}
                          </div>
                        )}
                        
                        {phase.completed_at && (
                          <div className="mt-2 text-sm text-green-600">
                            ✓ Concluído em {new Date(phase.completed_at).toLocaleDateString('pt-BR')}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Next Steps Card */}
      {nextPhase && currentPhaseData && (
        <Card className="border-l-4 border-l-blue-500">
          <CardHeader>
            <CardTitle className="text-blue-900">Próximos Passos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0 w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <ArrowRight className="w-6 h-6 text-blue-600" />
              </div>
              
              <div className="flex-1">
                <h3 className="font-semibold mb-2">
                  Após "{currentPhaseData.name}": {nextPhase.name}
                </h3>
                <p className="text-gray-600 mb-3">
                  {PHASE_DESCRIPTIONS[nextPhase.category]?.description || nextPhase.description}
                </p>
                
                {nextPhase.expected_outcome && (
                  <div className="text-sm text-gray-500">
                    <strong>Resultado esperado:</strong> {nextPhase.expected_outcome}
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}