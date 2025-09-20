import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  HelpCircle, Info, CheckCircle, ArrowRight, 
  FileText, Clock, Target, Users
} from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

const PHASE_HELP_CONTENT = {
  'diagnostic': {
    icon: FileText,
    color: 'text-blue-600',
    title: 'Fase de Diagnóstico',
    description: 'Avaliação completa da situação atual da empresa',
    whyImportant: 'Esta análise inicial é fundamental para identificar oportunidades de melhoria e definir estratégias personalizadas para seu negócio.',
    whatHappens: [
      'Análise detalhada dos dados financeiros',
      'Identificação de pontos fortes e fragilidades', 
      'Mapeamento de oportunidades de crescimento',
      'Definição de prioridades estratégicas'
    ],
    yourRole: [
      'Fornecer acesso aos sistemas e relatórios',
      'Disponibilizar documentação financeira',
      'Participar de entrevistas e reuniões',
      'Esclarecer dúvidas sobre processos internos'
    ],
    expectedDuration: '2-3 semanas',
    nextSteps: 'Apresentação dos resultados do diagnóstico e proposta de plano de ação'
  },
  'planning': {
    icon: Target,
    color: 'text-green-600', 
    title: 'Planejamento Estratégico',
    description: 'Desenvolvimento do plano de ação baseado no diagnóstico',
    whyImportant: 'Um planejamento bem estruturado garante que os esforços sejam direcionados para as ações que geram maior impacto nos resultados.',
    whatHappens: [
      'Definição de objetivos específicos e mensuráveis',
      'Criação de cronograma de implementação',
      'Estabelecimento de indicadores de sucesso',
      'Identificação de recursos necessários'
    ],
    yourRole: [
      'Validar objetivos e prioridades',
      'Aprovar cronograma e recursos',
      'Definir responsáveis internos',
      'Alinhar expectativas com a equipe'
    ],
    expectedDuration: '1-2 semanas',
    nextSteps: 'Início da implementação do plano aprovado'
  },
  'implementation': {
    icon: Users,
    color: 'text-purple-600',
    title: 'Implementação',
    description: 'Execução das ações planejadas com acompanhamento contínuo',
    whyImportant: 'A execução eficaz das estratégias definidas é onde os resultados reais começam a aparecer no seu negócio.',
    whatHappens: [
      'Implementação gradual das melhorias',
      'Monitoramento constante dos indicadores',
      'Ajustes conforme necessário',
      'Treinamento da equipe nos novos processos'
    ],
    yourRole: [
      'Apoiar a implementação internamente',
      'Fornecer feedback sobre resultados',
      'Participar de reuniões de acompanhamento',
      'Comunicar mudanças para a equipe'
    ],
    expectedDuration: '4-8 semanas',
    nextSteps: 'Consolidação dos resultados e relatório final'
  },
  'monitoring': {
    icon: Clock,
    color: 'text-orange-600',
    title: 'Monitoramento',
    description: 'Acompanhamento dos resultados e otimizações contínuas',
    whyImportant: 'O monitoramento garante que as melhorias se sustentem no tempo e identifica novas oportunidades de otimização.',
    whatHappens: [
      'Análise periódica dos resultados',
      'Identificação de desvios e correções',
      'Otimização contínua dos processos',
      'Preparação de relatórios de acompanhamento'
    ],
    yourRole: [
      'Fornecer dados atualizados regularmente',
      'Reportar observações e dificuldades',
      'Participar de revisões periódicas',
      'Validar ajustes propostos'
    ],
    expectedDuration: 'Contínuo durante o projeto',
    nextSteps: 'Relatório consolidado de resultados'
  }
};

export function PhaseContextualHelp({ phaseType, compact = false }) {
  const [showDetailed, setShowDetailed] = useState(false);
  
  const helpContent = PHASE_HELP_CONTENT[phaseType];
  
  if (!helpContent) return null;
  
  const HelpIcon = helpContent.icon;

  if (compact) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
              <HelpCircle className="h-3 w-3 text-gray-400" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="top" className="max-w-xs">
            <p className="text-sm">{helpContent.description}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return (
    <Card className="border-l-4 border-l-blue-400 bg-blue-50">
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <HelpIcon className={`w-6 h-6 mt-1 ${helpContent.color}`} />
          
          <div className="flex-1">
            <div className="flex items-center justify-between mb-2">
              <h4 className="font-semibold text-blue-900">{helpContent.title}</h4>
              
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowDetailed(!showDetailed)}
                className="text-blue-600 hover:text-blue-800"
              >
                {showDetailed ? 'Menos detalhes' : 'Mais detalhes'}
                <ArrowRight className={`w-4 h-4 ml-1 transition-transform ${showDetailed ? 'rotate-90' : ''}`} />
              </Button>
            </div>
            
            <p className="text-blue-800 text-sm mb-3">
              {helpContent.description}
            </p>
            
            {showDetailed && (
              <div className="space-y-4">
                {/* Why Important */}
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <Info className="w-4 h-4 text-blue-600" />
                    <h5 className="font-medium text-blue-900">Por que esta etapa é importante?</h5>
                  </div>
                  <p className="text-blue-800 text-sm pl-6">
                    {helpContent.whyImportant}
                  </p>
                </div>
                
                {/* What Happens */}
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <CheckCircle className="w-4 h-4 text-blue-600" />
                    <h5 className="font-medium text-blue-900">O que acontece nesta etapa:</h5>
                  </div>
                  <ul className="text-blue-800 text-sm pl-6 space-y-1">
                    {helpContent.whatHappens.map((item, index) => (
                      <li key={index} className="flex items-start gap-2">
                        <span className="w-1 h-1 bg-blue-600 rounded-full mt-2 flex-shrink-0" />
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
                
                {/* Your Role */}
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <Users className="w-4 h-4 text-blue-600" />
                    <h5 className="font-medium text-blue-900">Sua participação:</h5>
                  </div>
                  <ul className="text-blue-800 text-sm pl-6 space-y-1">
                    {helpContent.yourRole.map((role, index) => (
                      <li key={index} className="flex items-start gap-2">
                        <ArrowRight className="w-3 h-3 mt-1 text-blue-500 flex-shrink-0" />
                        {role}
                      </li>
                    ))}
                  </ul>
                </div>
                
                {/* Duration & Next Steps */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-blue-200">
                  <div>
                    <h5 className="font-medium text-blue-900 mb-1">Duração esperada:</h5>
                    <p className="text-blue-800 text-sm">{helpContent.expectedDuration}</p>
                  </div>
                  <div>
                    <h5 className="font-medium text-blue-900 mb-1">Próximos passos:</h5>
                    <p className="text-blue-800 text-sm">{helpContent.nextSteps}</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function ProcessStepHelp({ title, description, tips = [] }) {
  return (
    <div className="bg-amber-50 border-l-4 border-amber-400 p-4 rounded-r-lg">
      <div className="flex items-start gap-3">
        <Info className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" />
        
        <div>
          <h4 className="font-medium text-amber-900 mb-1">{title}</h4>
          <p className="text-amber-800 text-sm mb-3">{description}</p>
          
          {tips.length > 0 && (
            <div>
              <h5 className="font-medium text-amber-900 mb-2">💡 Dicas importantes:</h5>
              <ul className="space-y-1">
                {tips.map((tip, index) => (
                  <li key={index} className="text-amber-800 text-sm flex items-start gap-2">
                    <CheckCircle className="w-3 h-3 mt-1 text-amber-600 flex-shrink-0" />
                    {tip}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function ContextualHelp({ type, data = {}, className = "" }) {
  switch (type) {
    case 'phase':
      return <PhaseContextualHelp phaseType={data.phaseType} compact={data.compact} />;
    case 'process-step':
      return <ProcessStepHelp title={data.title} description={data.description} tips={data.tips} />;
    default:
      return null;
  }
}